import { getCurrentUserTargetVisa } from "@/features/profile/server/target-visa";
import { withApiRoute } from "@/lib/api/errors";

export const GET = withApiRoute(async () => {
  const result = await getCurrentUserTargetVisa();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
});
