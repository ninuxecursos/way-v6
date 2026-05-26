/**
 * Lista de páginas do CMS.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { PageRow } from "@/lib/cms-types";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/pages/")({
  component: PagesList,
});

function PagesList() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("pages")
      .select("id, slug, title, description, status, updated_at")
      .order("updated_at", { ascending: false });
    setPages((data ?? []) as PageRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createPage = async () => {
    const slug = prompt("Slug da nova página (ex: sobre):");
    if (!slug) return;
    const title = prompt("Título:") ?? slug;
    const { error } = await supabase.from("pages").insert({ slug: slug.toLowerCase().trim(), title });
    if (error) { notifyError(error); return; }
    notifySuccess("Página salva");
    load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Páginas</h1>
          <p className="text-muted-foreground mt-1">Gerencie todas as páginas do site público</p>
        </div>
        <Button onClick={createPage}><Plus className="h-4 w-4 mr-2" />Nova página</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Lista</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground">Carregando...</div> : (
            <div className="space-y-2">
              {pages.map((p) => (
                <Link
                  key={p.id}
                  to="/admin/pages/$pageId"
                  params={{ pageId: p.id }}
                  className="flex items-center justify-between p-4 rounded-md border hover:bg-accent transition-colors"
                >
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-muted-foreground">/{p.slug}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </Link>
              ))}
              {pages.length === 0 && <div className="text-muted-foreground text-sm">Nenhuma página ainda.</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}