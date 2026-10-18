import { bad, handle, json, requestOrigin } from "@/lib/server/http";
import { listReview, REVIEW_STATUSES } from "@/lib/server/review";
import type { ReviewStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The review queue (newest first) and how many videos are in each review status. */
export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "pending") as ReviewStatus | "all";
  if (status !== "all" && !REVIEW_STATUSES.includes(status)) return bad(`status must be one of ${[...REVIEW_STATUSES, "all"].join(", ")}`);
  return json(await listReview({ status, projectId: url.searchParams.get("projectId") || undefined, origin: requestOrigin(req) }));
});
