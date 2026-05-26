import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportMyData, requestAccountDeletion } from "@/lib/dsar.functions";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useT } from "@/components/i18n/LocaleProvider";

export const Route = createFileRoute("/conta/privacidade")({
  component: PrivacyAccountPage,
});

function PrivacyAccountPage() {
  const t = useT();
  const exportFn = useServerFn(exportMyData);
  const deleteFn = useServerFn(requestAccountDeletion);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState("");

  const onExport = async () => {
    setExporting(true);
    try {
      const data = await exportFn();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wayhome-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notifySuccess(t("account.privacy.exportStarted"));
    } catch (e) { notifyError(e); } finally { setExporting(false); }
  };

  const onDelete = async () => {
    if (confirm.trim().toUpperCase() !== t("account.privacy.deleteKeyword").toUpperCase()) {
      notifyError(t("account.privacy.deleteRequireConfirm"));
      return;
    }
    setDeleting(true);
    try {
      await deleteFn();
      notifySuccess(t("account.privacy.deleteRegistered"));
      setConfirm("");
    } catch (e) { notifyError(e); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold">{t("account.privacy.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("account.privacy.subtitle")}</p>
      </header>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Download className="text-brand mt-1" size={20} />
          <div className="flex-1">
            <h2 className="font-bold">{t("account.privacy.exportTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("account.privacy.exportDesc")}</p>
            <Button onClick={onExport} disabled={exporting} className="mt-4">
              {exporting ? <Loader2 className="animate-spin" size={16} /> : t("account.privacy.exportCta")}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5 border-destructive/40">
        <div className="flex items-start gap-3">
          <Trash2 className="text-destructive mt-1" size={20} />
          <div className="flex-1">
            <h2 className="font-bold">{t("account.privacy.deleteTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("account.privacy.deleteDesc")}</p>
            <div className="mt-4 space-y-3">
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("account.privacy.deletePlaceholder")}
                className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div>
                <Button variant="destructive" onClick={onDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="animate-spin" size={16} /> : t("account.privacy.deleteCta")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}