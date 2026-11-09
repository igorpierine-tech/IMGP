import { eq, and } from "drizzle-orm";
import { attachments } from "../../db/schema";
import type { ApiContext } from "./api-context";
import { HttpError } from "./errors";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
  "application/zip", "application/x-7z-compressed",
]);

function getR2Bucket(): R2Bucket | null {
  try {
    return (globalThis as Record<string, unknown>).ATTACHMENTS as R2Bucket ?? null;
  } catch {
    return null;
  }
}

export function validateUpload(fileName: string, fileSize: number, contentType: string): void {
  if (!fileName || fileName.length > 255) throw new HttpError(400, "Nome do arquivo inválido.");
  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) throw new HttpError(400, `Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
  if (!ALLOWED_TYPES.has(contentType)) throw new HttpError(400, "Tipo de arquivo não permitido.");
}

export async function uploadFile(
  ctx: ApiContext,
  entityType: string,
  entityId: number,
  file: File,
): Promise<typeof attachments.$inferSelect> {
  const bucket = getR2Bucket();
  if (!bucket) throw new HttpError(503, "Armazenamento de arquivos não configurado.");

  validateUpload(file.name, file.size, file.type);
  const storageKey = `${entityType}/${entityId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  await bucket.put(storageKey, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { originalName: file.name, uploadedBy: ctx.user.id },
  });

  const [record] = await ctx.db.insert(attachments).values({
    entityType,
    entityId,
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
    storageKey,
    uploadedBy: ctx.user.id,
  }).returning();

  return record;
}

export async function getFileStream(
  ctx: ApiContext,
  attachmentId: number,
): Promise<{ body: ReadableStream; contentType: string; fileName: string }> {
  const bucket = getR2Bucket();
  if (!bucket) throw new HttpError(503, "Armazenamento de arquivos não configurado.");

  const [record] = await ctx.db
    .select()
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (!record) throw new HttpError(404, "Arquivo não encontrado.");

  const object = await bucket.get(record.storageKey);
  if (!object?.body) throw new HttpError(404, "Arquivo não encontrado no armazenamento.");

  return {
    body: object.body as unknown as ReadableStream,
    contentType: record.contentType,
    fileName: record.fileName,
  };
}

export async function deleteFile(ctx: ApiContext, attachmentId: number): Promise<void> {
  const bucket = getR2Bucket();
  if (!bucket) throw new HttpError(503, "Armazenamento de arquivos não configurado.");

  const [record] = await ctx.db
    .select()
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (!record) throw new HttpError(404, "Arquivo não encontrado.");

  await bucket.delete(record.storageKey);
  await ctx.db.delete(attachments).where(eq(attachments.id, attachmentId));
}

export async function listAttachments(ctx: ApiContext, entityType: string, entityId: number) {
  return ctx.db
    .select()
    .from(attachments)
    .where(and(eq(attachments.entityType, entityType), eq(attachments.entityId, entityId)))
    .orderBy(attachments.createdAt);
}
