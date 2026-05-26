/**
 * Admin → Lista de posts do blog.
 * - Filtro por status, busca por slug.
 * - Botão "Novo post" cria draft e abre o editor.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Pencil } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/blog")({
  head: () => ({ meta: [{ title: "Blog — Admin Way Home" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminBlogList,
});

function AdminBlogList() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "draft" | "published" | "scheduled" | "archived">("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    let q = supabase.from("blog_posts").select("*, blog_post_translations(title, locale)").order("updated_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    if (search.trim()) q = q.ilike("slug", `%${search.trim()}%`);
    const { data } = await q;
    setPosts(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [filter]);

  async function createNew() {
    const slug = `novo-post-${Date.now()}`;
    const { data, error } = await supabase.from("blog_posts").insert({ slug, status: "draft" }).select().single();
    if (error) { notifyError(error); return; }
    // criar traduções vazias para os 3 idiomas
    await supabase.from("blog_post_translations").insert([
      { post_id: data.id, locale: "pt", title: "Novo post", slug: `${slug}-pt`, content_markdown: "" },
      { post_id: data.id, locale: "en", title: "New post", slug: `${slug}-en`, content_markdown: "" },
      { post_id: data.id, locale: "es", title: "Nuevo post", slug: `${slug}-es`, content_markdown: "" },
    ]);
    navigate({ to: "/admin/blog/$postId", params: { postId: data.id } });
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Blog</h1>
          <p className="text-muted-foreground text-sm mt-1">Artigos multi-idioma (PT/EN/ES) com GEO.</p>
        </div>
        <Button onClick={createNew}><Plus className="h-4 w-4 mr-2" /> Novo post</Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "draft", "scheduled", "published", "archived"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {({ all: "Todos", draft: "Rascunhos", scheduled: "Agendados", published: "Publicados", archived: "Arquivados" } as const)[s]}
          </Button>
        ))}
        <Input className="max-w-xs ml-auto" placeholder="Buscar slug..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Título (PT)</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Atualizado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum post.</td></tr>
            ) : posts.map((p) => {
              const pt = (p.blog_post_translations ?? []).find((t: any) => t.locale === "pt");
              return (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2">{pt?.title ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.slug}</td>
                  <td className="px-4 py-2"><span className="text-xs px-2 py-1 rounded bg-muted">{p.status}</span></td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(p.updated_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {p.status === "published" && (
                      <Link to="/blog/$slug" params={{ slug: p.slug }} search={{ lang: "pt" }} target="_blank" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
                        <Eye className="h-3 w-3 mr-1" /> Ver
                      </Link>
                    )}
                    <Link to="/admin/blog/$postId" params={{ postId: p.id }} className="inline-flex items-center text-xs text-primary hover:underline">
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
