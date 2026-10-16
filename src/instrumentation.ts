export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureWorkspace } = await import("@/lib/server/store");
  const { ensureFrameworkDocs } = await import("@/lib/server/tasks");
  const { startScheduler } = await import("@/lib/server/posts");
  await ensureWorkspace();
  await ensureFrameworkDocs().catch((e) => console.error("[shipreel] framework docs", e));
  startScheduler();
}
