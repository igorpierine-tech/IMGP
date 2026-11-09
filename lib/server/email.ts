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

export async function sendWelcomeEmail(
  to: string,
  displayName: string,
  password: string,
  loginUrl: string,
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "[IMGP] Bem-vindo ao Raízes e Riquezas",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#0c4a3e;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;">Bem-vindo ao Raízes e Riquezas</h1>
          <p style="color:#a7f3d0;margin:4px 0 0;font-size:14px;">Gestão Integrada de Projetos</p>
        </div>
        <div style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="color:#374151;line-height:1.6;margin-top:0;">
            Olá <strong>${escapeHtml(displayName)}</strong>,
          </p>
          <p style="color:#374151;line-height:1.6;">
            Sua conta foi criada com sucesso. Use as credenciais abaixo para acessar o sistema:
          </p>
          <div style="background:#f3f4f6;border-radius:8px;padding:16px 20px;margin:16px 0;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Suas credenciais</p>
            <p style="margin:0 0 4px;color:#111827;"><strong>E-mail:</strong> ${escapeHtml(to)}</p>
            <p style="margin:0;color:#111827;"><strong>Senha:</strong> ${escapeHtml(password)}</p>
          </div>
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
            <p style="margin:0;color:#92400e;font-size:14px;">
              <strong>Importante:</strong> Por segurança, você deverá alterar sua senha no primeiro acesso.
            </p>
          </div>
          <p style="text-align:center;margin:24px 0 16px;">
            <a href="${loginUrl}" style="display:inline-block;background:#0c4a3e;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:14px;">
              Acessar o sistema
            </a>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:12px;margin-bottom:0;text-align:center;">
            Raízes e Riquezas — Gestão Integrada de Projetos
          </p>
        </div>
      </div>
    `,
    text: `Olá ${displayName},\n\nSua conta foi criada no Raízes e Riquezas - Gestão Integrada de Projetos.\n\nE-mail: ${to}\nSenha: ${password}\n\nImportante: Por segurança, você deverá alterar sua senha no primeiro acesso.\n\nAcesse: ${loginUrl}`,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
