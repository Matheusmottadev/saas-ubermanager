import { NextResponse } from "next/server";

import {
  buildClearedSessionCookie,
  clearCurrentSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST() {
  try {
    await clearCurrentSession();

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      ...buildClearedSessionCookie(),
    });
    return response;
  } catch (error) {
    console.error("auth logout failed", error);
    return NextResponse.json(
      { error: "Não foi possível sair agora." },
      { status: 500 },
    );
  }
}
