import { eq, and, desc } from "drizzle-orm";
import { approvalChains, approvalRequests, approvalStepsLog, users } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "chains";

    if (view === "chains") {
      const chains = await ctx.db.select().from(approvalChains).where(eq(approvalChains.active, true)).orderBy(approvalChains.name);
      return Response.json({ chains });
    }

    if (view === "request") {
      const requestId = Number(url.searchParams.get("requestId"));
      if (!requestId) throw new HttpError(400, "requestId é obrigatório.");

      const [req] = await ctx.db.select().from(approvalRequests).where(eq(approvalRequests.id, requestId)).limit(1);
      if (!req) throw new HttpError(404, "Solicitação não encontrada.");

      const [chain] = await ctx.db.select().from(approvalChains).where(eq(approvalChains.id, req.chainId)).limit(1);
      const steps = await ctx.db
        .select({
          id: approvalStepsLog.id,
          stepIndex: approvalStepsLog.stepIndex,
          approverUserId: approvalStepsLog.approverUserId,
          decision: approvalStepsLog.decision,
          comment: approvalStepsLog.comment,
          decidedAt: approvalStepsLog.decidedAt,
          approverName: users.displayName,
        })
        .from(approvalStepsLog)
        .leftJoin(users, eq(approvalStepsLog.approverUserId, users.id))
        .where(eq(approvalStepsLog.requestId, requestId))
        .orderBy(approvalStepsLog.stepIndex);

      return Response.json({ request: req, chain, steps });
    }

    if (view === "pending") {
      const pending = await ctx.db.select().from(approvalRequests).where(eq(approvalRequests.status, "pending")).orderBy(desc(approvalRequests.createdAt));
      return Response.json({ requests: pending });
    }

    throw new HttpError(400, "view inválido. Use: chains, request, pending.");
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "create_chain");

    if (action === "create_chain") {
      checkPermissionOrRole(ctx, "users:update", ["project_coordinator", "it_director"]);

      const name = String(body.name ?? "").trim();
      const entityType = String(body.entityType ?? "").trim();
      const stepsJson = body.steps;

      if (!name || !entityType) throw new HttpError(400, "name e entityType são obrigatórios.");
      if (!Array.isArray(stepsJson) || stepsJson.length === 0) throw new HttpError(400, "steps deve ser um array com pelo menos 1 etapa.");

      for (const step of stepsJson) {
        if (!step.approverUserId && !step.approverRole) {
          throw new HttpError(400, "Cada etapa precisa de approverUserId ou approverRole.");
        }
      }

      const [chain] = await ctx.db.insert(approvalChains).values({
        name,
        entityType,
        stepsJson: JSON.stringify(stepsJson),
        escalationHours: typeof body.escalationHours === "number" ? body.escalationHours : null,
        createdBy: ctx.user.id,
      }).returning();

      await writeAudit({ actor: ctx.user, action: "approval_chain.created", entityType: "approval_chain", entityId: chain.id, requestId: request.headers.get("cf-ray"), after: chain });
      return Response.json({ chain }, { status: 201 });
    }

    if (action === "submit_request") {
      checkPermissionOrRole(ctx, "projects:create", ["project_coordinator", "it_director", "project_analyst", "keyuser", "requester"]);

      const chainId = Number(body.chainId);
      const entityType = String(body.entityType ?? "").trim();
      const entityId = Number(body.entityId);
      if (!chainId || !entityType || !entityId) throw new HttpError(400, "chainId, entityType e entityId são obrigatórios.");

      const [chain] = await ctx.db.select().from(approvalChains).where(eq(approvalChains.id, chainId)).limit(1);
      if (!chain || !chain.active) throw new HttpError(404, "Cadeia de aprovação não encontrada ou inativa.");

      const [req] = await ctx.db.insert(approvalRequests).values({
        chainId,
        entityType,
        entityId,
        requestedBy: ctx.user.id,
      }).returning();

      const steps: Array<{ approverUserId?: string; approverRole?: string }> = JSON.parse(chain.stepsJson);
      for (let i = 0; i < steps.length; i++) {
        await ctx.db.insert(approvalStepsLog).values({
          requestId: req.id,
          stepIndex: i,
          approverUserId: steps[i].approverUserId ?? null,
        });
      }

      return Response.json({ request: req }, { status: 201 });
    }

    if (action === "decide") {
      const stepLogId = Number(body.stepLogId);
      const decision = String(body.decision ?? "").trim();
      if (!stepLogId) throw new HttpError(400, "stepLogId é obrigatório.");
      if (!["approved", "rejected"].includes(decision)) throw new HttpError(400, "decision deve ser 'approved' ou 'rejected'.");

      const [stepLog] = await ctx.db.select().from(approvalStepsLog).where(eq(approvalStepsLog.id, stepLogId)).limit(1);
      if (!stepLog) throw new HttpError(404, "Etapa não encontrada.");
      if (stepLog.decision !== "pending") throw new HttpError(400, "Etapa já decidida.");

      await ctx.db.update(approvalStepsLog).set({
        decision,
        comment: typeof body.comment === "string" ? body.comment.trim() : null,
        approverUserId: ctx.user.id,
        decidedAt: new Date(),
      }).where(eq(approvalStepsLog.id, stepLogId));

      const [req] = await ctx.db.select().from(approvalRequests).where(eq(approvalRequests.id, stepLog.requestId)).limit(1);

      if (decision === "rejected") {
        await ctx.db.update(approvalRequests).set({ status: "rejected", completedAt: new Date() }).where(eq(approvalRequests.id, stepLog.requestId));
        return Response.json({ decision: "rejected", requestStatus: "rejected" });
      }

      const allSteps = await ctx.db.select().from(approvalStepsLog).where(eq(approvalStepsLog.requestId, stepLog.requestId)).orderBy(approvalStepsLog.stepIndex);
      const allApproved = allSteps.every(s => s.id === stepLogId ? true : s.decision === "approved");

      if (allApproved) {
        await ctx.db.update(approvalRequests).set({ status: "approved", completedAt: new Date(), currentStep: allSteps.length }).where(eq(approvalRequests.id, stepLog.requestId));
        return Response.json({ decision: "approved", requestStatus: "approved" });
      }

      const nextPending = allSteps.find(s => s.decision === "pending" && s.id !== stepLogId);
      if (nextPending) {
        await ctx.db.update(approvalRequests).set({ currentStep: nextPending.stepIndex }).where(eq(approvalRequests.id, stepLog.requestId));
      }

      return Response.json({ decision: "approved", requestStatus: "pending", nextStep: nextPending?.stepIndex ?? null });
    }

    throw new HttpError(400, "Ação inválida.");
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "users:update", ["project_coordinator", "it_director"]);
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID inválido.");
    const before = await ctx.db.select().from(approvalChains).where(eq(approvalChains.id, id)).limit(1);
    if (!before[0]) throw new HttpError(404, "Cadeia não encontrada.");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) throw new HttpError(400, "Nome é obrigatório.");
    const escalationHours = typeof body.escalationHours === "number" ? body.escalationHours : before[0].escalationHours;
    const stepsJson = Array.isArray(body.steps) && body.steps.length > 0 ? JSON.stringify(body.steps) : before[0].stepsJson;
    const [updated] = await ctx.db.update(approvalChains).set({ name, escalationHours, stepsJson, updatedAt: new Date() }).where(eq(approvalChains.id, id)).returning();
    await writeAudit({ actor: ctx.user, action: "approval_chain.updated", entityType: "approval_chain", entityId: id, requestId: request.headers.get("cf-ray"), before: before[0], after: updated });
    return Response.json({ chain: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "users:update", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!id) throw new HttpError(400, "ID é obrigatório.");

    await ctx.db.update(approvalChains).set({ active: false }).where(eq(approvalChains.id, id));
    return Response.json({ deactivated: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
