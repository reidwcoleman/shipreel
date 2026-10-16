import { handle, json } from "@/lib/server/http";
import { allPosts } from "@/lib/server/posts";

export const dynamic = "force-dynamic";
export const GET = handle(async () => json(await allPosts()));
