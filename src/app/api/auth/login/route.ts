import { NextResponse } from "next/server";

import {
  authenticateUser,
  buildSessionCookie,
  createUserSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Informe e-mail e senha." },
        { status: 400 },
      );
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 },
      );
    }

    const session = await createUserSession(user.id);
    const response = NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        id: user.id,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      ...buildSessionCookie(session.token, session.expiresAt),
    });
    return response;
  } catch (error) {
    console.error("auth login failed", error);
    return NextResponse.json(
      { error: "Não foi possível entrar agora." },
      { status: 500 },
    );
  }
}
