/**
 * Comentários em tempo real para um post.
 * - Realtime via Supabase channel.
 * - Apenas usuários autenticados E que tenham pedido pago podem comentar (RLS).
 * - Suporte a respostas em árvore (parent_id).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Trash2, Reply } from "lucide-react";
import type { BlogCommentRow } from "@/lib/blog-types";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";

interface CommentNode extends BlogCommentRow {
  author?: { display_name: string | null; avatar_url: string | null };
  children: CommentNode[];
}

export function CommentsSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const confirmDelete = useConfirmDelete();
  const [isBuyer, setIsBuyer] = useState(false);
  const [comments, setComments] = useState<BlogCommentRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!user) { setIsBuyer(false); return; }
    supabase.from("orders").select("id").eq("user_id", user.id).eq("status", "paid").limit(1)
      .then(({ data }) => setIsBuyer(!!data?.length));
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("blog_comments").select("*").eq("post_id", postId).eq("status", "approved")
        .order("created_at", { ascending: true });
      if (!mounted) return;
      const rows = (data ?? []) as BlogCommentRow[];
      setComments(rows);
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
        const map: typeof profiles = {};
        (profs ?? []).forEach((p) => { map[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
        setProfiles(map);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [postId]);

  useEffect(() => {
    const ch = supabase.channel(`comments:${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_comments", filter: `post_id=eq.${postId}` }, (payload) => {
        setComments((prev) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as BlogCommentRow;
            if (row.status !== "approved" || prev.some((c) => c.id === row.id)) return prev;
            supabase.from("profiles").select("id, display_name, avatar_url").eq("id", row.user_id).maybeSingle()
              .then(({ data }) => data && setProfiles((m) => ({ ...m, [data.id]: { display_name: data.display_name, avatar_url: data.avatar_url } })));
            return [...prev, row];
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as BlogCommentRow;
            return prev.map((c) => c.id === row.id ? row : c);
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((c) => c.id !== (payload.old as BlogCommentRow).id);
          }
          return prev;
        });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId]);

  const tree: CommentNode[] = (() => {
    const map = new Map<string, CommentNode>();
    comments.forEach((c) => map.set(c.id, { ...c, children: [], author: profiles[c.user_id] }));
    const roots: CommentNode[] = [];
    map.forEach((node) => {
      if (node.parent_id && map.has(node.parent_id)) map.get(node.parent_id)!.children.push(node);
      else roots.push(node);
    });
    return roots;
  })();

  async function submit() {
    if (!user || !content.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("blog_comments").insert({
      post_id: postId, user_id: user.id, parent_id: replyTo, content: content.trim(),
    });
    setPosting(false);
    if (error) { notifyError(error); return; }
    setContent(""); setReplyTo(null);
  }

  async function remove(id: string) {
    const ok = await confirmDelete({
      title: "Excluir comentário?",
      description: "O comentário será removido permanentemente.",
    });
    if (!ok) return;
    await supabase.from("blog_comments").delete().eq("id", id);
  }

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <MessageCircle className="h-6 w-6" /> Comentários ({comments.length})
      </h2>

      {!user ? (
        <div className="rounded-md bg-muted p-4 text-sm">
          <Link to="/login" className="underline font-medium">Entre</Link> para participar dos comentários.
        </div>
      ) : !isBuyer ? (
        <div className="rounded-md bg-muted p-4 text-sm">
          Apenas hóspedes que já reservaram pelo Way Home podem comentar.
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {replyTo && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              Respondendo a um comentário <button onClick={() => setReplyTo(null)} className="underline">cancelar</button>
            </div>
          )}
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Compartilhe sua experiência..." rows={3} maxLength={5000} />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={posting || !content.trim()}>{posting ? "Enviando..." : "Comentar"}</Button>
          </div>
        </div>
      )}

      {loading ? <p className="text-muted-foreground text-sm">Carregando...</p> : tree.length === 0 ? (
        <p className="text-muted-foreground text-sm">Seja o primeiro a comentar.</p>
      ) : (
        <ul className="space-y-6">
          {tree.map((c) => (
            <CommentItem key={c.id} node={c} currentUserId={user?.id ?? null} canReply={isBuyer} onReply={setReplyTo} onRemove={remove} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentItem({ node, currentUserId, canReply, onReply, onRemove }: {
  node: CommentNode; currentUserId: string | null; canReply: boolean;
  onReply: (id: string) => void; onRemove: (id: string) => void;
}) {
  const name = node.author?.display_name ?? "Hóspede";
  return (
    <li className="space-y-2">
      <div className="flex gap-3">
        <div className="h-9 w-9 rounded-full bg-muted shrink-0 overflow-hidden">
          {node.author?.avatar_url && <img src={node.author.avatar_url} alt={name} className="h-full w-full object-cover" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{name}</span>
            <span className="text-muted-foreground text-xs">{new Date(node.created_at).toLocaleString("pt-BR")}</span>
          </div>
          <p className="mt-1 text-sm whitespace-pre-wrap">{node.content}</p>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            {canReply && <button onClick={() => onReply(node.id)} className="hover:text-foreground inline-flex items-center gap-1"><Reply className="h-3 w-3" /> Responder</button>}
            {currentUserId === node.user_id && <button onClick={() => onRemove(node.id)} className="hover:text-destructive inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Excluir</button>}
          </div>
        </div>
      </div>
      {node.children.length > 0 && (
        <ul className="ml-12 space-y-4 border-l pl-4">
          {node.children.map((child) => (
            <CommentItem key={child.id} node={child} currentUserId={currentUserId} canReply={canReply} onReply={onReply} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </li>
  );
}
