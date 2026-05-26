import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminDeleteReservations } from "@/lib/admin-reservations.functions";
import { notifyError, notifySuccess } from "@/lib/notify";

export function BulkDeleteBar({
  selectedIds,
  onClear,
}: {
  selectedIds: string[];
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const qc = useQueryClient();
  const fn = useServerFn(adminDeleteReservations);

  const mutation = useMutation({
    mutationFn: (vars: { ids: string[]; password: string }) =>
      fn({ data: vars }),
    onSuccess: (res) => {
      notifySuccess(`${res.deleted} reserva(s) excluída(s).`);
      qc.invalidateQueries({ queryKey: ["admin", "reservations"] });
      setOpen(false);
      setPassword("");
      onClear();
    },
    onError: (e) => notifyError(e),
  });

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-medium">{selectedIds.length} selecionada(s)</span>
          <Button size="sm" variant="ghost" onClick={onClear} className="h-7 px-2">
            <X className="h-3.5 w-3.5 mr-1" /> Limpar
          </Button>
        </div>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setOpen(true)}
          className="h-8"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Excluir selecionadas
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!mutation.isPending) setOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Você está prestes a excluir <strong>{selectedIds.length}</strong> reserva(s).
              Esta ação é irreversível. Digite sua senha de administrador para confirmar.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!password) return;
              mutation.mutate({ ids: selectedIds, password });
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="admin-pw" className="text-xs">Senha do administrador</Label>
              <Input
                id="admin-pw"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                disabled={mutation.isPending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!password || mutation.isPending}
              >
                {mutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Excluindo…</>
                ) : (
                  <><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Confirmar exclusão</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}