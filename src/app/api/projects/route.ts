import { bad, body, handle, json } from "@/lib/server/http";
import { createProject, listProjects } from "@/lib/server/projects";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";
export const GET = handle(async () => json(await listProjects()));
export const POST = handle(async (req: Request) => {
  const b = await body<Partial<Project> & { name?: string }>(req);
  if (!b.name?.trim()) return bad("Give the project a name.");
  return json(await createProject({ ...b, name: b.name.trim() }), 201);
});
