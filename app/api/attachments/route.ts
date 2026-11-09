import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { uploadFile, getFileStream, deleteFile, listAttachments } from "@/lib/server/storage";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType") ?? "";
    const entityId = Number(url.searchParams.get("entityId"));
    const attachmentId = Number(url.searchParams.get("id"));

    if (attachmentId) {
      const { body, contentType, fileName } = await getFileStream(ctx, attachmentId);
      return new Response(body, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        },
      });
    }

    if (!entityType || !entityId) throw new HttpError(400, "entityType e entityId são obrigatórios.");
    const files = await listAttachments(ctx, entityType, entityId);
    return Response.json({ attachments: files });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", [
      "project_coordinator", "it_director", "project_analyst", "keyuser",
    ]);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;
    const entityId = Number(formData.get("entityId"));

    if (!file) throw new HttpError(400, "Arquivo é obrigatório.");
    if (!entityType) throw new HttpError(400, "entityType é obrigatório.");
    if (!Number.isInteger(entityId) || entityId <= 0) throw new HttpError(400, "entityId inválido.");

    const record = await uploadFile(ctx, entityType, entityId, file);

    await writeAudit({
      actor: ctx.user,
      action: "attachment.uploaded",
      entityType,
      entityId,
      requestId: request.headers.get("cf-ray"),
      after: { fileName: record.fileName, fileSize: record.fileSize },
    });

    return Response.json({ attachment: record }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:delete", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID do anexo inválido.");

    await deleteFile(ctx, id);

    await writeAudit({
      actor: ctx.user,
      action: "attachment.deleted",
      entityType: "attachment",
      entityId: id,
      requestId: request.headers.get("cf-ray"),
    });

    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
