import { Link } from "@tanstack/react-router";
import { Eye } from "lucide-react";

import { EmptyHint } from "@/components/admin/dashboard/DashboardSection";

export function TopPostsCard({
  posts,
}: {
  posts: { id: string; slug: string; views: number; comments: number }[];
}) {
  return (
    <div className="admin-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Posts mais lidos</div>
        <Eye className="h-4 w-4 text-muted-foreground" />
      </div>
      {posts.length === 0 ? (
        <EmptyHint>Nenhum post publicado ainda.</EmptyHint>
      ) : (
        <ul className="divide-y divide-border">
          {posts.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5">
              <Link
                to="/admin/blog/$postId"
                params={{ postId: p.id }}
                className="text-sm font-medium truncate hover:text-foreground/80"
              >
                /{p.slug}
              </Link>
              <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {p.views}
                </span>
                <span>{p.comments} coment.</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}