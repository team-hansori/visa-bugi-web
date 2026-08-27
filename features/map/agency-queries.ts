import type { SupabaseClient } from "@supabase/supabase-js";
import type { LatLng, RegionId } from "@/features/map/geo";

export type AgencyType =
  | "COMMUNITY_CENTER"
  | "ADMINISTRATIVE_AGENCY"
  | "UNIVERSITY_DEPT_OFFICE"
  | "FOREIGN_SUPPORT_CENTER"
  | "OTHER";

export type Agency = {
  id: string;
  name: string;
  agencyType: AgencyType;
  roadAddress: string | null;
  position: LatLng;
  phone: string;
  url: string | null;
  operatingHours: string | null;
};

// `map_visible_agency_contacts.region` stores short tokens ("청주", "충주",
// "진천", "음성"), not the full 시/군 display name ("청주시" etc.) shown in
// this app's UI. Verified against visa-data's reference/agency_contacts.csv
// on 2026-08-27 (visa-data issue #51) — re-check the source CSV before
// changing this, don't "fix" it to match the display labels.
export const REGION_QUERY_TOKENS: Record<RegionId, string> = {
  cheongju: "청주",
  chungju: "충주",
  jincheon: "진천",
  eumseong: "음성",
};

const PROVINCE_WIDE_TOKEN = "충청북도";

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

export function sortByDistance(agencies: Agency[], from: LatLng): Agency[] {
  return [...agencies].sort(
    (a, b) => haversineDistanceKm(from, a.position) - haversineDistanceKm(from, b.position),
  );
}

type AgencyRow = {
  agency_id: string;
  department_name: string;
  agency_type: AgencyType;
  road_address: string | null;
  latitude: number;
  longitude: number;
  phone: string;
  url: string | null;
  operating_hours: string | null;
};

function toAgency(row: AgencyRow): Agency {
  return {
    id: row.agency_id,
    name: row.department_name,
    agencyType: row.agency_type,
    roadAddress: row.road_address,
    position: { lat: row.latitude, lng: row.longitude },
    phone: row.phone,
    url: row.url,
    operatingHours: row.operating_hours,
  };
}

export async function fetchNearbyAgencies(
  supabase: SupabaseClient,
  region: RegionId,
  agencyType: AgencyType | null,
  near: LatLng,
  limit: number,
): Promise<Agency[]> {
  const regionToken = REGION_QUERY_TOKENS[region];
  // Plain equality is correct for the current map-visible dataset — none of
  // its rows use the legacy table's "|"-delimited multi-region format
  // (e.g. "옥천|영동"). Revisit if that ever changes.
  let query = supabase
    .from("map_visible_agency_contacts")
    .select(
      "agency_id, department_name, agency_type, road_address, latitude, longitude, phone, url, operating_hours",
    )
    .or(`region.eq.${regionToken},region.eq.${PROVINCE_WIDE_TOKEN}`);

  if (agencyType) {
    query = query.eq("agency_type", agencyType);
  }

  const { data, error } = await query;
  if (error) throw error;

  const agencies = (data ?? []).map(toAgency);
  return sortByDistance(agencies, near).slice(0, limit);
}
