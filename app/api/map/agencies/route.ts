import { getNearbyAgencies } from "@/features/map/server/agencies";
import { REGION_CENTERS, type LatLng, type RegionId } from "@/features/map/geo";
import { ApiRouteError, withApiRoute } from "@/lib/api/errors";

const REGIONS: RegionId[] = ["cheongju", "chungju", "jincheon", "eumseong"];
const AGENCY_TYPES = [
  "COMMUNITY_CENTER",
  "ADMINISTRATIVE_AGENCY",
  "UNIVERSITY_DEPT_OFFICE",
  "FOREIGN_SUPPORT_CENTER",
  "OTHER",
] as const;

function parseNear(params: URLSearchParams, region: RegionId | null): LatLng {
  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");
  if (latRaw !== null && lngRaw !== null) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < 33 ||
      lat > 39 ||
      lng < 124 ||
      lng > 132
    ) {
      throw new ApiRouteError(400, "INVALID_QUERY", "좌표 값이 올바르지 않습니다.");
    }
    return { lat, lng };
  }
  return REGION_CENTERS[region ?? "cheongju"];
}

export const GET = withApiRoute(async (request) => {
  const params = new URL(request.url).searchParams;

  const regionRaw = params.get("region");
  if (regionRaw !== null && !REGIONS.includes(regionRaw as RegionId)) {
    throw new ApiRouteError(400, "INVALID_QUERY", "지원하지 않는 지역입니다.");
  }
  const region = (regionRaw as RegionId | null) ?? null;

  const typeRaw = params.get("type");
  if (
    typeRaw !== null &&
    typeRaw !== "all" &&
    !AGENCY_TYPES.includes(typeRaw as (typeof AGENCY_TYPES)[number])
  ) {
    throw new ApiRouteError(400, "INVALID_QUERY", "지원하지 않는 기관 유형입니다.");
  }
  const agencyType =
    typeRaw && typeRaw !== "all"
      ? (typeRaw as (typeof AGENCY_TYPES)[number])
      : null;

  let limit = 3;
  const limitRaw = params.get("limit");
  if (limitRaw !== null) {
    limit = Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new ApiRouteError(400, "INVALID_QUERY", "limit은 1~20 사이 정수입니다.");
    }
  }

  const near = parseNear(params, region);
  const agencies = await getNearbyAgencies({ region, agencyType, near, limit });

  return Response.json(
    { agencies },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
});
