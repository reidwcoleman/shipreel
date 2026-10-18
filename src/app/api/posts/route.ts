import { handle, json } from "@/lib/server/http";
import { allPosts, syncPostbox } from "@/lib/server/posts";

export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await syncPostbox().catch(() => undefined);
  return json(await allPosts());
});
