/**
 * Auto-alocação de quartos para grupos Galera.
 *
 * Cria os quartos físicos (`accommodation_rooms` com `kind='galera'` +
 * `group_id`) e os sub-quartos lógicos do grupo
 * (`reservation_group_rooms`) em paralelo, com associação 1:1.
 * Distribui membros pagos em round-robin e propaga `room_id` para
 * o pedido correspondente (para o admin/Quartos exibir o hóspede no
 * quarto físico certo).
 *
 * Idempotente: se o grupo já tem quartos/membros alocados, apenas
 * preenche o que faltar — sem duplicar.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_ROOM_CAPACITY = 8;

export async function autoAssignGroupRooms(groupId: string): Promise<void> {
  const { data: group } = await supabaseAdmin
    .from("reservation_groups")
    .select("id, capacity, coupon_code")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return;

  const { data: members } = await supabaseAdmin
    .from("reservation_group_members")
    .select("id, room_id, order_id, payment_status")
    .eq("group_id", groupId)
    .eq("payment_status", "paid");
  if (!members || members.length === 0) return;

  const capacity = group.capacity ?? members.length;
  const roomsNeeded = Math.max(1, Math.ceil(capacity / DEFAULT_ROOM_CAPACITY));

  // Sub-quartos lógicos do grupo (referenciados por reservation_group_members.room_id)
  const { data: existingLogical } = await supabaseAdmin
    .from("reservation_group_rooms")
    .select("id, room_number")
    .eq("group_id", groupId)
    .order("room_number", { ascending: true });
  const logical = [...(existingLogical ?? [])];
  while (logical.length < roomsNeeded) {
    const { data: id, error } = await supabaseAdmin
      .rpc("reservation_group_room_add", { _group_id: groupId });
    if (error || !id) {
      console.error("[group-allocation] falha reservation_group_room_add:", error);
      break;
    }
    logical.push({ id: id as unknown as string, room_number: logical.length + 1 });
  }
  if (logical.length === 0) return;

  // Quartos físicos (accommodation_rooms) — 1:1 com os lógicos para o painel
  const { data: existingPhysical } = await supabaseAdmin
    .from("accommodation_rooms")
    .select("id, room_number")
    .eq("group_id", groupId)
    .order("room_number", { ascending: true });
  const physical = [...(existingPhysical ?? [])];
  if (physical.length < logical.length) {
    const { data: maxRow } = await supabaseAdmin
      .from("accommodation_rooms")
      .select("room_number")
      .order("room_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextNumber = (maxRow?.room_number ?? 0) + 1;
    for (let i = physical.length; i < logical.length; i += 1) {
      const { data: created, error } = await supabaseAdmin
        .from("accommodation_rooms")
        .insert({
          kind: "galera",
          group_id: groupId,
          capacity: DEFAULT_ROOM_CAPACITY,
          room_number: nextNumber,
          active: true,
          status: "available",
          notes: `Auto-criado para grupo ${group.coupon_code ?? groupId}`,
        })
        .select("id, room_number")
        .single();
      nextNumber += 1;
      if (error || !created) {
        console.error("[group-allocation] falha ao criar quarto físico:", error);
        continue;
      }
      physical.push(created);
    }
  }

  // Round-robin: distribui membros ainda sem room_id
  let cursor = 0;
  for (const m of members) {
    if (m.room_id) continue;
    const idx = cursor % logical.length;
    const logicalRoom = logical[idx];
    const physicalRoom = physical[idx] ?? physical[physical.length - 1] ?? null;
    cursor += 1;

    await supabaseAdmin.rpc("reservation_group_member_set_room", {
      _member_id: m.id,
      _room_id: logicalRoom.id,
    });

    if (m.order_id && physicalRoom) {
      await supabaseAdmin
        .from("orders")
        .update({ room_id: physicalRoom.id, allocation_status: "allocated" })
        .eq("id", m.order_id)
        .is("room_id", null);
    }
  }
}
