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

type NearResult = { near: LatLng; fromCoords: boolean };

function parseNear(params: URLSearchParams, region: RegionId | null): NearResult {
  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");
  if (latRaw === null && lngRaw === null) {
    return { near: REGION_CENTERS[region ?? "cheongju"], fromCoords: false };
  }
  if (latRaw === null || lngRaw === null) {
    throw new ApiRouteError(400, "INVALID_QUERY", "lat과 lng는 함께 보내야 합니다.");
  }

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
  return { near: { lat, lng }, fromCoords: true };
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

  const { near, fromCoords } = parseNear(params, region);
  const agencies = await getNearbyAgencies({ region, agencyType, near, limit });

  // 좌표가 실린 요청(사용자 위치 기반)은 공유 캐시에 올리지 않는다. 좌표 없는
  // region 조회만 개인화되지 않으므로 짧은 public 캐시를 허용한다.
  const cacheControl = fromCoords
    ? "private, max-age=30"
    : "public, max-age=60";

  return Response.json({ agencies }, { headers: { "Cache-Control": cacheControl } });
});
