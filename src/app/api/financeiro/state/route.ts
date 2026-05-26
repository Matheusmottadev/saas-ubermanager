import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createInitialDashboardState, normalizeDashboardState } from "@/lib/dashboard-state";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getWorkspaceState(userId: string) {
  const workspace = await prisma.dashboardWorkspace.upsert({
    create: {
      state: createInitialDashboardState(),
      userId,
    },
    update: {},
    where: {
      userId,
    },
  });

  return normalizeDashboardState(workspace.state);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const state = await getWorkspaceState(user.id);
    return NextResponse.json(state);
  } catch (error) {
    console.error("financeiro state GET failed", error);
    return NextResponse.json({ error: "Não foi possível carregar o estado do painel." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const body = await request.json();
    const normalizedState = normalizeDashboardState(body);

    const workspace = await prisma.dashboardWorkspace.upsert({
      create: {
        state: normalizedState,
        userId: user.id,
      },
      update: {
        state: normalizedState,
      },
      where: {
        userId: user.id,
      },
    });

    return NextResponse.json(normalizeDashboardState(workspace.state));
  } catch (error) {
    console.error("financeiro state PUT failed", error);
    return NextResponse.json({ error: "Não foi possível salvar o estado do painel." }, { status: 500 });
  }
}
