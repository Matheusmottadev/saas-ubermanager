import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  issueEmailVerificationToken,
  sendEmailConfirmationMessage,
} from "@/lib/email-confirmation";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const { token } = await issueEmailVerificationToken(user.id);
    const confirmUrl = new URL("/confirmar-email", request.url);
    confirmUrl.searchParams.set("token", token);

    await sendEmailConfirmationMessage({
      confirmUrl: confirmUrl.toString(),
      email: user.email,
      firstName: user.firstName,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("email confirmation resend failed", error);
    return NextResponse.json(
      { error: "Não foi possível enviar o e-mail agora." },
      { status: 500 },
    );
  }
}
