 import { createServerFn } from "@tanstack/react-start";
 import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
 import { assertAdmin } from "./admin-guards";
 import JSZip from "jszip";
 
 // List of tables to backup in dependency order (approximate)
 const TABLES_TO_BACKUP = [
   "site_settings",
   "profiles",
   "user_roles",
   "products",
   "pages",
   "page_sections",
   "page_versions",
   "blog_categories",
   "blog_category_translations",
   "blog_posts",
   "blog_post_translations",
   "blog_post_categories",
   "blog_comments",
   "blog_comment_reactions",
   "promo_coupons",
   "customer_segments",
   "customer_segment_members",
   "customer_notes",
   "orders",
   "order_items",
   "participants",
   "accommodation_rooms",
   "reservation_groups",
   "reservation_drafts",
   "event_reviews",
   "fiscal_company",
   "fiscal_providers",
   "fiscal_invoices",
   "fiscal_invoice_events",
   "payment_gateways",
   "payment_intents",
   "ai_providers",
   "email_providers",
   "email_templates",
   "email_outbox",
   "media_assets",
   "notifications",
   "audit_logs",
   "terms_acceptance",
   "webhook_events"
 ];
 
 export const exportBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
   .inputValidator((i: { includeAudit?: boolean; includeOutbox?: boolean; mediaOnly?: boolean }) => i)
  .handler(async ({ data: opts, context }) => {
  const adminId = await assertAdmin(context.supabase);
  console.log(JSON.stringify({ level: "info", scope: "backup.export", actor: adminId, opts }));
 
   const zip = new JSZip();
   const manifest: any = {
     version: "1.0",
     timestamp: new Date().toISOString(),
     tables: {},
     media: {}
   };
 
   if (!opts.mediaOnly) {
     const dataFolder = zip.folder("data");
     for (const table of TABLES_TO_BACKUP) {
       if (table === "audit_logs" && !opts.includeAudit) continue;
       if (table === "email_outbox" && !opts.includeOutbox) continue;
 
       console.log(`Exporting table: ${table}`);
       let allData: any[] = [];
       let page = 0;
       const pageSize = 1000;
 
       while (true) {
         const { data, error } = await supabaseAdmin
           .from(table as never)
           .select("*")
           .range(page * pageSize, (page + 1) * pageSize - 1);
 
         if (error) {
           console.error(`Error exporting ${table}:`, error);
           break;
         }
         if (!data || data.length === 0) break;
         allData = [...allData, ...data];
         if (data.length < pageSize) break;
         page++;
       }
 
       if (allData.length > 0) {
         dataFolder?.file(`${table}.json`, JSON.stringify(allData, null, 2));
         manifest.tables[table] = allData.length;
       }
     }
   }
 
   // Media Export
   const mediaFolder = zip.folder("media");
   const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
   
   if (!bucketError && buckets) {
     for (const bucket of buckets) {
       console.log(`Exporting bucket: ${bucket.name}`);
       const bucketZipFolder = mediaFolder?.folder(bucket.name);
       
       // Recursive file listing
       const listAllFiles = async (path: string) => {
         const { data: files, error } = await supabaseAdmin.storage.from(bucket.name).list(path);
         if (error || !files) return;
 
         for (const file of files) {
           const fullPath = path ? `${path}/${file.name}` : file.name;
           if (file.id === undefined) { // It's a directory (id is undefined in list)
             await listAllFiles(fullPath);
           } else {
             const { data: blob, error: downloadError } = await supabaseAdmin.storage.from(bucket.name).download(fullPath);
             if (!downloadError && blob) {
               const arrayBuffer = await blob.arrayBuffer();
               bucketZipFolder?.file(fullPath, arrayBuffer);
               manifest.media[bucket.name] = (manifest.media[bucket.name] || 0) + 1;
             }
           }
         }
       };
 
       await listAllFiles("");
     }
   }
 
   zip.file("manifest.json", JSON.stringify(manifest, null, 2));
 
   const base64 = await zip.generateAsync({ type: "base64" });
   return { base64, filename: `wayhome-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip` };
 });
 
 export const restoreBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
   .inputValidator((i: { zipBase64: string }) => i)
  .handler(async ({ data: opts, context }) => {
  const adminId = await assertAdmin(context.supabase);
  console.log(JSON.stringify({ level: "warn", scope: "backup.restore", actor: adminId, size: opts.zipBase64?.length ?? 0 }));
 
   const zip = await JSZip.loadAsync(opts.zipBase64, { base64: true });
   const manifestFile = zip.file("manifest.json");
   if (!manifestFile) throw new Error("Arquivo manifest.json não encontrado no ZIP.");
 
   const manifest = JSON.parse(await manifestFile.async("string"));
   const logs: string[] = [];
 
   // 1. Restore Media Buckets
   if (manifest.media) {
     for (const bucketName in manifest.media) {
       const { data: existingBuckets } = await supabaseAdmin.storage.listBuckets();
       if (!existingBuckets?.find(b => b.name === bucketName)) {
         await supabaseAdmin.storage.createBucket(bucketName, { public: true });
         logs.push(`Bucket '${bucketName}' criado.`);
       }
 
       const bucketFolder = zip.folder(`media/${bucketName}`);
       if (bucketFolder) {
         const files: string[] = [];
         bucketFolder.forEach((relativePath, file) => {
           if (!file.dir) files.push(relativePath);
         });
 
         for (const filePath of files) {
           const file = bucketFolder.file(filePath);
           if (file) {
             const content = await file.async("arraybuffer");
             await supabaseAdmin.storage.from(bucketName).upload(filePath, content, { upsert: true });
           }
         }
         logs.push(`Restaurados ${files.length} arquivos no bucket '${bucketName}'.`);
       }
     }
   }
 
   // 2. Restore Tables (Order matters for Foreign Keys)
   if (manifest.tables) {
     for (const table of TABLES_TO_BACKUP) {
       if (!manifest.tables[table]) continue;
       
       const tableFile = zip.file(`data/${table}.json`);
       if (!tableFile) continue;
 
       const data = JSON.parse(await tableFile.async("string"));
       
       // Batch upsert (Supabase handles upsert via primary keys)
       const { error } = await supabaseAdmin.from(table as never).upsert(data as never);
       
       if (error) {
         logs.push(`Erro ao restaurar ${table}: ${error.message}`);
       } else {
         logs.push(`Tabela '${table}' restaurada (${data.length} registros).`);
       }
     }
   }
 
   return { success: true, logs };
 });