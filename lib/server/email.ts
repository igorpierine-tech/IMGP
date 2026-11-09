import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type EmailConfig = {
  from: string;
  apiKey: string;
  apiUrl: string;
};

function getEmailConfig(): EmailConfig | null {
  try {
    const from = (globalThis as Record<string, unknown>).EMAIL_FROM as string | undefined;
    const apiKey = (globalThis as Record<string, unknown>).EMAIL_API_KEY as string | undefined;
    const apiUrl = (globalThis as Record<string, unknown>).EMAIL_API_URL as string | undefined;
    if (!from || !apiKey || !apiUrl) return null;
    return { from, apiKey, apiUrl };
  } catch {
    return null;
  }
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const config = getEmailConfig();
  if (!config) {
    console.warn("[email] Configuração de e-mail não encontrada. E-mail não enviado:", payload.subject);
    return false;
  }

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      console.error("[email] Falha ao enviar:", response.status, await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Erro ao enviar:", err);
    return false;
  }
}

export async function sendNotificationEmail(
  to: string,
  title: string,
  body: string,
  entityUrl?: string,
): Promise<boolean> {
  const linkHtml = entityUrl
    ? `<p><a href="${entityUrl}" style="color:#2563eb;text-decoration:underline;">Ver detalhes</a></p>`
    : "";

  return sendEmail({
    to,
    subject: `[IMGP] ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1e40af;">${escapeHtml(title)}</h2>
        <p style="color:#374151;line-height:1.6;">${escapeHtml(body)}</p>
        ${linkHtml}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:12px;">
          Raízes e Riquezas — Gestão Integrada de Projetos
        </p>
      </div>
    `,
    text: `${title}\n\n${body}${entityUrl ? `\n\nVer: ${entityUrl}` : ""}`,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
