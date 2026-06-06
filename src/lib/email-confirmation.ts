import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

const EMAIL_CONFIRMATION_TTL_MS = 1000 * 60 * 60 * 24;
const RESEND_API_URL = "https://api.resend.com/emails";

function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createEmailVerificationToken() {
  return randomBytes(32).toString("hex");
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY ?? "";
}

export async function issueEmailVerificationToken(userId: string) {
  const token = createEmailVerificationToken();
  const expiresAt = new Date(Date.now() + EMAIL_CONFIRMATION_TTL_MS);

  await prisma.user.update({
    data: {
      emailVerificationExpiresAt: expiresAt,
      emailVerificationTokenHash: hashEmailVerificationToken(token),
    },
    where: {
      id: userId,
    },
  });

  return {
    expiresAt,
    token,
  };
}

export async function confirmEmailVerificationToken(token: string) {
  const tokenHash = hashEmailVerificationToken(token);

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationExpiresAt: {
        gt: new Date(),
      },
      emailVerificationTokenHash: tokenHash,
    },
  });

  if (!user) {
    return {
      ok: false as const,
    };
  }

  await prisma.user.update({
    data: {
      emailVerificationExpiresAt: null,
      emailVerificationTokenHash: null,
      emailVerifiedAt: new Date(),
    },
    where: {
      id: user.id,
    },
  });

  return {
    ok: true as const,
    user,
  };
}

export async function sendEmailConfirmationMessage(params: {
  confirmUrl: string;
  email: string;
  firstName?: string | null;
}) {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurado.");
  }

  const firstName = params.firstName?.trim() || "motorista";
  const response = await fetch(RESEND_API_URL, {
    body: JSON.stringify({
      from: "Urbann <onboarding@resend.dev>",
      html: `
        <div style="background:#050505;padding:32px 20px;font-family:Arial,sans-serif;color:#f5f4f0">
          <div style="max-width:560px;margin:0 auto;background:#101010;border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:32px">
            <div style="font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:12px">urbann.</div>
            <h1 style="font-size:28px;line-height:1.1;margin:0 0 16px">Confirme seu e-mail</h1>
            <p style="font-size:16px;line-height:1.7;color:#c8c6be;margin:0 0 24px">
              ${firstName}, sua conta já está pronta. Falta só confirmar o e-mail para manter tudo seguro e liberar esse lembrete no painel.
            </p>
            <a href="${params.confirmUrl}" style="display:inline-block;background:#f5f4f0;color:#050505;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700">
              Confirmar e-mail
            </a>
            <p style="font-size:13px;line-height:1.6;color:#8f8b84;margin:24px 0 0">
              Se o botão não abrir, copie este link no navegador:<br />
              <span style="word-break:break-all">${params.confirmUrl}</span>
            </p>
          </div>
        </div>
      `,
      subject: "Confirme seu e-mail na Urbann",
      to: [params.email],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.text()) || "Falha ao enviar e-mail.";
    throw new Error(payload);
  }
}
