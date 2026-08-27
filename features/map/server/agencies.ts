import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  PROVINCE_WIDE_TOKEN,
  REGION_QUERY_TOKENS,
  sortByDistance,
  toAgency,
  type Agency,
  type AgencyType,
} from "@/features/map/agency-queries";
import type { LatLng, RegionId } from "@/features/map/geo";
import { ApiRouteError } from "@/lib/api/errors";

export type AgencyQuery = {
  // `null` = 지역으로 필터하지 않음 (실제 GPS 좌표로 정렬할 때는 모든 시범
  // 지역을 훑고 거리 정렬이 실제로 가장 가까운 곳을 찾게 한다).
  region: RegionId | null;
  agencyType: AgencyType | null;
  near: LatLng;
  limit: number;
};

/**
 * `map_visible_agency_contacts`는 visa-data가 소유한 공개 읽기 전용 뷰다.
 * 쿠키(세션) 컨텍스트를 싣지 않는 anon 클라이언트로 조회해, 호출한 사용자와
 * 무관하게 항상 같은 결과가 나오도록 한다 — 그래야 라우트가 응답을 공유 캐시에
 * 안전하게 올릴 수 있다.
 */
function createPublicReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

export async function getNearbyAgencies(query: AgencyQuery): Promise<Agency[]> {
  const supabase = createPublicReadClient();
  if (!supabase) {
    throw new ApiRouteError(
      503,
      "MAP_NOT_CONFIGURED",
      "기관 정보가 아직 연결되지 않았습니다.",
    );
  }

  let request = supabase
    .from("map_visible_agency_contacts")
    .select(
      "agency_id, department_name, agency_type, road_address, latitude, longitude, phone, url, operating_hours",
    );

  if (query.region) {
    const token = REGION_QUERY_TOKENS[query.region];
    request = request.or(`region.eq.${token},region.eq.${PROVINCE_WIDE_TOKEN}`);
  }
  if (query.agencyType) {
    request = request.eq("agency_type", query.agencyType);
  }

  const { data, error } = await request;
  if (error) {
    throw new ApiRouteError(
      502,
      "MAP_QUERY_FAILED",
      "기관 정보를 불러오지 못했습니다.",
      { cause: error },
    );
  }

  const agencies = (data ?? []).map(toAgency);
  return sortByDistance(agencies, query.near).slice(0, query.limit);
}
