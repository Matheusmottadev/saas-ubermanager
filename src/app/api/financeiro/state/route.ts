import { NextResponse } from "next/server";

import { createInitialDashboardState, normalizeDashboardState } from "@/lib/dashboard-state";
import { prisma } from "@/lib/prisma";

const WORKSPACE_KEY = "default";

async function getWorkspaceState() {
  const workspace = await prisma.dashboardWorkspace.upsert({
    create: {
      key: WORKSPACE_KEY,
      state: createInitialDashboardState(),
    },
    update: {},
    where: {
      key: WORKSPACE_KEY,
    },
  });

  return normalizeDashboardState(workspace.state);
}

export async function GET() {
  try {
    const state = await getWorkspaceState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("financeiro state GET failed", error);
    return NextResponse.json({ error: "Nao foi possivel carregar o estado do painel." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const normalizedState = normalizeDashboardState(body);

    const workspace = await prisma.dashboardWorkspace.upsert({
      create: {
        key: WORKSPACE_KEY,
        state: normalizedState,
      },
      update: {
        state: normalizedState,
      },
      where: {
        key: WORKSPACE_KEY,
      },
    });

    return NextResponse.json(normalizeDashboardState(workspace.state));
  } catch (error) {
    console.error("financeiro state PUT failed", error);
    return NextResponse.json({ error: "Nao foi possivel salvar o estado do painel." }, { status: 500 });
  }
}
