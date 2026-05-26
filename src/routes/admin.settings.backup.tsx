 import { createFileRoute } from "@tanstack/react-router";
 import { useState } from "react";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Download, Upload, Loader2, Database, FileJson, Image, AlertCircle, CheckCircle2 } from "lucide-react";
 import { exportBackup, restoreBackup } from "@/lib/backup.functions";
 import { notifyError, notifySuccess } from "@/lib/notify";
 import { useMutation } from "@tanstack/react-query";
 
 export const Route = createFileRoute("/admin/settings/backup")({
   component: BackupPage,
 });
 
 function BackupPage() {
   const [includeAudit, setIncludeAudit] = useState(false);
   const [includeOutbox, setIncludeOutbox] = useState(true);
   const [mediaOnly, setMediaOnly] = useState(false);
   const [restoreLogs, setRestoreLogs] = useState<string[]>([]);
 
   const exportMutation = useMutation({
     mutationFn: exportBackup,
     onSuccess: (res) => {
       const link = document.createElement("a");
       link.href = `data:application/zip;base64,${res.base64}`;
       link.download = res.filename;
       link.click();
       notifySuccess("Backup gerado e download iniciado.");
     },
     onError: (err: any) => notifyError(err),
   });
 
   const restoreMutation = useMutation({
     mutationFn: restoreBackup,
     onSuccess: (res) => {
       setRestoreLogs(res.logs);
       notifySuccess("Restauração concluída!");
     },
     onError: (err: any) => notifyError(err),
   });
 
   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     if (!confirm("Isso irá substituir dados existentes pelas informações do backup. Deseja continuar?")) {
       e.target.value = "";
       return;
     }
 
     const reader = new FileReader();
     reader.onload = async () => {
       const base64 = (reader.result as string).split(",")[1];
       setRestoreLogs([]);
        restoreMutation.mutate({ data: { zipBase64: base64 } });
     };
     reader.readAsDataURL(file);
   };
 
   return (
     <div className="p-8 space-y-8 max-w-4xl mx-auto">
       <div>
         <h2 className="text-2xl font-bold tracking-tight">Backup e Restauração</h2>
         <p className="text-muted-foreground">
           Exporte seus dados e mídia para migração entre projetos ou cópia de segurança.
         </p>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* EXPORT CARD */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Download className="h-5 w-5" />
               Exportar
             </CardTitle>
             <CardDescription>Gere um arquivo .zip com tudo o que há no banco e storage.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
             <div className="space-y-4">
               <div className="flex items-center space-x-2">
                 <Checkbox id="mediaOnly" checked={mediaOnly} onCheckedChange={(v) => setMediaOnly(!!v)} />
                 <Label htmlFor="mediaOnly" className="text-sm font-medium leading-none cursor-pointer">
                   Apenas Mídia (Imagens/Documentos)
                 </Label>
               </div>
               {!mediaOnly && (
                 <>
                   <div className="flex items-center space-x-2 pl-6">
                     <Checkbox id="audit" checked={includeAudit} onCheckedChange={(v) => setIncludeAudit(!!v)} />
                     <Label htmlFor="audit" className="text-sm font-medium leading-none cursor-pointer">
                       Incluir Histórico de Auditoria (Pode ser lento)
                     </Label>
                   </div>
                   <div className="flex items-center space-x-2 pl-6">
                     <Checkbox id="outbox" checked={includeOutbox} onCheckedChange={(v) => setIncludeOutbox(!!v)} />
                     <Label htmlFor="outbox" className="text-sm font-medium leading-none cursor-pointer">
                       Incluir Histórico de E-mails Enviados
                     </Label>
                   </div>
                 </>
               )}
             </div>
 
             <Button 
               className="w-full" 
                onClick={() => exportMutation.mutate({ data: { includeAudit, includeOutbox, mediaOnly } })}
               disabled={exportMutation.isPending}
             >
               {exportMutation.isPending ? (
                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
               ) : (
                 <Database className="h-4 w-4 mr-2" />
               )}
               {mediaOnly ? "Exportar Mídia" : "Exportar Backup Completo"}
             </Button>
 
             <p className="text-[11px] text-muted-foreground text-center">
               Nota: Secrets (API Keys) do Mercado Pago, IA e SMTP não são incluídos por segurança.
             </p>
           </CardContent>
         </Card>
 
         {/* RESTORE CARD */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Upload className="h-5 w-5" />
               Restaurar
             </CardTitle>
             <CardDescription>Faça upload de um arquivo .zip de backup para restaurar no projeto atual.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="grid w-full max-w-sm items-center gap-1.5">
               <Label htmlFor="restore-file">Arquivo de Backup (.zip)</Label>
               <Input 
                 id="restore-file" 
                 type="file" 
                 accept=".zip" 
                 onChange={handleFileChange}
                 disabled={restoreMutation.isPending}
               />
             </div>
 
             {restoreMutation.isPending && (
               <div className="flex items-center justify-center p-4 border rounded-md bg-muted/30 animate-pulse">
                 <Loader2 className="h-5 w-5 mr-2 animate-spin text-primary" />
                 <span className="text-sm font-medium">Restaurando... não feche a janela.</span>
               </div>
             )}
 
             {restoreLogs.length > 0 && (
               <div className="space-y-2">
                 <Label className="text-xs uppercase text-muted-foreground">Progresso da Restauração</Label>
                 <ScrollArea className="h-[150px] w-full border rounded-md p-2 bg-slate-950">
                   {restoreLogs.map((log, i) => (
                     <div key={i} className="text-[10px] font-mono text-emerald-400 mb-1 leading-tight">
                       {log.startsWith("Erro") ? (
                         <span className="text-rose-400">✖ {log}</span>
                       ) : (
                         <span>✔ {log}</span>
                       )}
                     </div>
                   ))}
                 </ScrollArea>
               </div>
             )}
 
             <div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
               <div className="flex gap-2">
                 <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                 <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                   <strong>Cuidado:</strong> A restauração irá sobrescrever registros se os IDs coincidirem. 
                   Certifique-se de que as tabelas de destino já existam (aplique as migrações primeiro).
                 </div>
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="p-4 border rounded-lg flex items-center gap-3">
           <div className="bg-primary/10 p-2 rounded-full"><FileJson className="h-5 w-5 text-primary" /></div>
           <div>
             <p className="text-sm font-semibold">Tabelas</p>
             <p className="text-[11px] text-muted-foreground">Todos os produtos, pedidos e páginas.</p>
           </div>
         </div>
         <div className="p-4 border rounded-lg flex items-center gap-3">
           <div className="bg-primary/10 p-2 rounded-full"><Image className="h-5 w-5 text-primary" /></div>
           <div>
             <p className="text-sm font-semibold">Mídia</p>
             <p className="text-[11px] text-muted-foreground">Logos, fotos de experiências e posts.</p>
           </div>
         </div>
         <div className="p-4 border rounded-lg flex items-center gap-3">
           <div className="bg-primary/10 p-2 rounded-full"><CheckCircle2 className="h-5 w-5 text-primary" /></div>
           <div>
             <p className="text-sm font-semibold">Fácil Migração</p>
             <p className="text-[11px] text-muted-foreground">Perfeito para trocar de banco Supabase.</p>
           </div>
         </div>
       </div>
     </div>
   );
 }