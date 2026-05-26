/**
 * Server-only: helpers de notificação para o fluxo Galera.
 *
 * Quando um grupo é fechado (todos pagaram + auto-assign criou os quartos),
 * dispara para cada membro:
 *   - notification in-app (tabela `notifications`)
 *   - e-mail via template `group_complete_room_assigned`
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTemplateEmail } from "./mailer.server";

/**
 * Idempotente: pode ser chamado várias vezes; usa metadata.notified_complete_at
 * no grupo como flag.
 */
export async function notifyGroupCompleteIfReady(groupId: string): Promise<void> {
  const { data: group } = await supabaseAdmin
    .from("reservation_groups")
    .select("id, coupon_code, status, capacity, notified_complete_at")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return;
  if (group.notified_complete_at) return; // já enviado

  const { data: members } = await supabaseAdmin
    .from("reservation_group_members")
    .select("id, user_id, full_name, email, room_id, payment_status")
    .eq("group_id", groupId);
  if (!members || members.length === 0) return;

  const paid = members.filter((m) => m.payment_status === "paid");
  if (paid.length < group.capacity) return;
  if (paid.some((m) => !m.room_id)) return; // auto-assign ainda não rodou

  const { data: rooms } = await supabaseAdmin
    .from("reservation_group_rooms")
    .select("id, room_number")
    .eq("group_id", groupId);
  const roomMap = new Map<string, number>();
  for (const r of rooms ?? []) roomMap.set(r.id, r.room_number);

  const byRoom = new Map<string, typeof paid>();
  for (const m of paid) {
    if (!m.room_id) continue;
    const arr = byRoom.get(m.room_id) ?? [];
    arr.push(m);
    byRoom.set(m.room_id, arr);
  }

  for (const m of paid) {
    if (!m.room_id) continue;
    const roomNumber = roomMap.get(m.room_id) ?? 0;
    const roommates = (byRoom.get(m.room_id) ?? []).filter((x) => x.id !== m.id);
    const roommatesHtml = roommates.map((r) => `<li>${escapeHtml(r.full_name)}</li>`).join("") || "<li>(você está sozinho neste quarto)</li>";

    // notificação in-app
    if (m.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: m.user_id,
        type: "success",
        title: `Seu grupo está completo! Quarto ${roomNumber}`,
        body: `Cupom ${group.coupon_code}. Confira seus colegas de quarto na sua área.`,
        link: "/conta/grupos",
      });
    }

    // e-mail
    if (m.email) {
      try {
        await enqueueTemplateEmail({
          slug: "group_complete_room_assigned",
          to: m.email,
          toName: m.full_name,
          userId: m.user_id ?? undefined,
          variables: {
            customer_name: m.full_name,
            coupon_code: group.coupon_code,
            room_number: roomNumber,
            roommates_html: roommatesHtml,
          },
        });
      } catch (e) {
        console.error("[group-notifications] enqueue failed", e);
      }
    }
  }

  await supabaseAdmin
    .from("reservation_groups")
    .update({ notified_complete_at: new Date().toISOString() })
    .eq("id", groupId);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}