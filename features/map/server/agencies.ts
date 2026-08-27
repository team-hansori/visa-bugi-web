import "server-only";
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
import { createClient } from "@/lib/supabase/server";

export type AgencyQuery = {
  // `null` = 지역으로 필터하지 않음 (실제 GPS 좌표로 정렬할 때는 모든 시범
  // 지역을 훑고 거리 정렬이 실제로 가장 가까운 곳을 찾게 한다).
  region: RegionId | null;
  agencyType: AgencyType | null;
  near: LatLng;
  limit: number;
};

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function getNearbyAgencies(query: AgencyQuery): Promise<Agency[]> {
  if (!hasSupabaseEnv()) {
    throw new ApiRouteError(
      503,
      "MAP_NOT_CONFIGURED",
      "기관 정보가 아직 연결되지 않았습니다.",
    );
  }

  const supabase = await createClient();
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
    );
  }

  const agencies = (data ?? []).map(toAgency);
  return sortByDistance(agencies, query.near).slice(0, query.limit);
}
