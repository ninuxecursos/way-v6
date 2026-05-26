/**
 * Shell mobile-native do admin: app bar fixa, conteúdo rolável,
 * bottom nav fixa, drawer lateral e bottom-sheet "Mais".
 */
import { useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { MobileAppBar } from "./MobileAppBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { MobileMoreSheet } from "./MobileMoreSheet";

export function AdminMobileShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileAppBar onOpenMenu={() => setDrawerOpen(true)} />

      {/* Espaço inferior: 64px bottom-nav + safe-area */}
      <main
        className="flex-1 min-w-0"
        style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 8px)" }}
      >
        <div className="px-4 py-4">{children}</div>
      </main>

      <MobileBottomNav currentPath={path} onOpenMore={() => setMoreOpen(true)} />

      <MobileNavDrawer open={drawerOpen} onOpenChange={setDrawerOpen} currentPath={path} />
      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} currentPath={path} />
    </div>
  );
}