import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiUser } from "@/lib/auth";
import { deleteProjectById } from "@/lib/projects";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdminApiUser(request);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing project id." },
        { status: 400 },
      );
    }

    const project = await deleteProjectById(id);

    return NextResponse.json({
      ok: true,
      project,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete project.";

    if (message === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
