# Agency Map Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock/demo agency data in the map feature with real `agency_contacts` data from Supabase, now that `visa-data` has deployed the schema and loaded the 15-row MVP dataset (visa-data issue #51, closed 2026-08-27).

**Architecture:** A new pure/query module (`features/map/agency-queries.ts`) owns the Supabase query against the `map_visible_agency_contacts` view and the client-side nearest-N sort (haversine distance — pure and unit-tested). The map component (renamed from `agency-map-demo.tsx`/`AgencyMapDemo` to `agency-map.tsx`/`AgencyMap`, since it no longer shows demo data) calls this module, replaces the fake `전체/행정/노동/교육` category chips with the real `agency_type` enum, and enables the previously-disabled call/directions buttons using real phone numbers and addresses.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, `@supabase/supabase-js` (already a dependency), Vitest.

**Spec:** [visa-data issue #51](https://github.com/team-hansori/visa-data/issues/51) and its contract doc `docs/map-agency-schema.md` in the `visa-data` repo (fetched and quoted below) are the schema authority. This repo's own [issue #11](https://github.com/team-hansori/visa-bugi-web/issues/11) and the prior plan `docs/superpowers/plans/2026-08-27-kakao-map-sdk-integration.md` are the map-feature authority for everything the contract doc doesn't cover (region UI, SDK choice, "nearest 3" rule).

## Global Constraints

- **`region` column ground truth (verified against the live CSV on 2026-08-27, not assumed):** the `map_visible_agency_contacts.region` values for the 4 pilot regions are the SHORT forms `청주`, `충주`, `진천`, `음성` — NOT the full display labels (`청주시`, `충주시`, `진천군`, `음성군`) already used in this codebase's UI. Do not "correct" this mapping to the display labels without re-verifying against `visa-data`'s `reference/agency_contacts.csv`.
- Query the `map_visible_agency_contacts` VIEW, never `agency_contacts` directly, for map-pin listings — the view already encodes "is this row map-visible" (`agency_type IS NOT NULL AND latitude/longitude IS NOT NULL AND is_active AND is_user_facing`); duplicating that condition risks drifting from the contract.
- Region matching for the current live dataset uses plain equality (`region = token OR region = '충청북도'`) — every one of the 15 MVP rows has a single-token `region` value (confirmed by inspecting the CSV), so the general `|`-tokenized-array matching the contract doc describes for the legacy 97-row table is not needed here. Do not build the general tokenizer; a comment referencing this decision is sufficient if the dataset ever grows a multi-region map-visible row.
- `agency_type` enum values are exactly: `COMMUNITY_CENTER`, `ADMINISTRATIVE_AGENCY`, `UNIVERSITY_DEPT_OFFICE`, `FOREIGN_SUPPORT_CENTER`, `OTHER`. These replace the old fake categories (`행정`/`노동`/`교육`) entirely — there is no real-data equivalent of "노동" in this enum.
- `operating_hours`, `road_address`, and `url` are nullable — never invent a value when null; show an explicit "확인 안됨"-style message instead (matches this repo's data-honesty rule and `visa-data`'s own "확인되지 않은 값은 추정하지 않는다" principle).
- No network access to Supabase exists in this sandboxed environment (confirmed: same restriction as the Kakao SDK's `dapi.kakao.com`). No task in this plan can run the actual query against live data — implementers verify via `npm run typecheck`, `npm run lint`, `npm run test`, and careful manual code reading; real-data verification in an actual browser is the user's job after this plan's code lands.
- Do not touch `features/map/kakao-map.tsx` or `features/map/kakao-sdk-types.ts` — those are unaffected by this plan.

---

### Task 1: Agency query module (Supabase fetch + pure distance sort, unit tested)

**Files:**
- Create: `features/map/agency-queries.ts`
- Test: `tests/agency-queries.test.ts`

**Interfaces:**
- Produces: `type AgencyType`, `type Agency`, `REGION_QUERY_TOKENS: Record<RegionId, string>`, `haversineDistanceKm(a: LatLng, b: LatLng): number`, `sortByDistance(agencies: Agency[], from: LatLng): Agency[]`, `fetchNearbyAgencies(supabase: SupabaseClient, region: RegionId, agencyType: AgencyType | null, near: LatLng, limit: number): Promise<Agency[]>`
- Consumes: `RegionId`, `LatLng` from `features/map/geo.ts` (existing, from the prior plan)
- Consumed by: Task 2 (`agency-map.tsx` imports `Agency`, `AgencyType`, `fetchNearbyAgencies`)

- [ ] **Step 1: Write the failing tests for the pure functions**

```ts
// tests/agency-queries.test.ts
import { describe, expect, it } from "vitest";
import {
  haversineDistanceKm,
  sortByDistance,
  REGION_QUERY_TOKENS,
  type Agency,
} from "@/features/map/agency-queries";

describe("REGION_QUERY_TOKENS", () => {
  it("maps each region to its short DB token, not the display label", () => {
    expect(REGION_QUERY_TOKENS.cheongju).toBe("청주");
    expect(REGION_QUERY_TOKENS.chungju).toBe("충주");
    expect(REGION_QUERY_TOKENS.jincheon).toBe("진천");
    expect(REGION_QUERY_TOKENS.eumseong).toBe("음성");
  });
});

describe("haversineDistanceKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistanceKm({ lat: 36.64, lng: 127.48 }, { lat: 36.64, lng: 127.48 })).toBe(0);
  });

  it("returns a larger distance for farther points", () => {
    const origin = { lat: 36.6424, lng: 127.489 };
    const near = { lat: 36.645, lng: 127.49 };
    const far = { lat: 36.991, lng: 127.9259 };
    expect(haversineDistanceKm(origin, near)).toBeLessThan(haversineDistanceKm(origin, far));
  });
});

describe("sortByDistance", () => {
  const makeAgency = (id: string, position: Agency["position"]): Agency => ({
    id,
    name: id,
    agencyType: "OTHER",
    roadAddress: null,
    position,
    phone: "",
    url: null,
    operatingHours: null,
  });

  it("sorts nearest-first without mutating the input array", () => {
    const from = { lat: 0, lng: 0 };
    const far = makeAgency("far", { lat: 10, lng: 10 });
    const near = makeAgency("near", { lat: 1, lng: 1 });
    const input = [far, near];
    const sorted = sortByDistance(input, from);
    expect(sorted.map((a) => a.id)).toEqual(["near", "far"]);
    expect(input.map((a) => a.id)).toEqual(["far", "near"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/agency-queries.test.ts`
Expected: FAIL with a module-not-found error for `@/features/map/agency-queries`

- [ ] **Step 3: Write the implementation**

```ts
// features/map/agency-queries.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/agency-queries.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add features/map/agency-queries.ts tests/agency-queries.test.ts
git commit -m "feat: add real agency query module with distance sorting"
```

---

### Task 2: Replace demo agencies with real data in the map component (rename demo → real)

**Files:**
- Create: `features/map/agency-map.tsx` (new file — the renamed/rewritten component)
- Delete: `features/map/agency-map-demo.tsx` (superseded by the above; it showed only fake data)
- Modify: `app/[locale]/map/page.tsx` (must switch its import in the SAME commit as the delete above — see note below)

**Interfaces:**
- Consumes: `Agency`, `AgencyType`, `fetchNearbyAgencies` from Task 1; `RegionId`, `REGION_CENTERS`, `LatLng` from `features/map/geo.ts`; `KakaoMap`, `KakaoMapMarker` from `features/map/kakao-map.tsx` (unchanged); `createClient` from `@/lib/supabase/client`
- Produces: `export function AgencyMap()` (default export removed — matches the existing named-export convention from the prior demo component)

**Why `page.tsx` is updated here, not in Task 3:** `app/[locale]/map/page.tsx` is the only consumer of `agency-map-demo.tsx`. If this task deleted that file without also updating its one import site, this task's own commit would fail `npm run typecheck` (a dangling import to a deleted file) — the task would not be independently verifiable, violating this plan's own task-boundary rule. Task 3 only touches `features/map/geo.ts` and its test file, which are unrelated to the page/component swap.

- [ ] **Step 1: Read the current file first**

Read `features/map/agency-map-demo.tsx` in full before writing the replacement — this brief's code below is the target end-state, but confirm the current file (styling classes, exact JSX structure for the location/region controls, the accessible fallback list from the prior plan, the mobile/desktop `AgencyDetails` split) matches what's assumed here. If it has changed since this plan was written, adapt precisely rather than pasting blindly — the geolocation request logic, region `<select>`, and category-chip-row *pattern* (not its category *data*) must be preserved exactly as they exist now.

- [ ] **Step 2: Write the new component**

```tsx
// features/map/agency-map.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/client";
import { KakaoMap, type KakaoMapMarker } from "@/features/map/kakao-map";
import { REGION_CENTERS, type LatLng, type RegionId } from "@/features/map/geo";
import { fetchNearbyAgencies, type Agency, type AgencyType } from "@/features/map/agency-queries";

const NEARBY_LIMIT = 3;

const regions = [
  { id: "cheongju", label: "청주시" },
  { id: "chungju", label: "충주시" },
  { id: "jincheon", label: "진천군" },
  { id: "eumseong", label: "음성군" },
] as const satisfies readonly { id: RegionId; label: string }[];

const typeFilters = [
  { id: "all", label: "전체" },
  { id: "COMMUNITY_CENTER", label: "주민센터" },
  { id: "ADMINISTRATIVE_AGENCY", label: "행정기관" },
  { id: "UNIVERSITY_DEPT_OFFICE", label: "대학 과사무실" },
  { id: "FOREIGN_SUPPORT_CENTER", label: "외국인지원기관" },
  { id: "OTHER", label: "기타" },
] as const satisfies readonly { id: "all" | AgencyType; label: string }[];

type TypeFilter = (typeof typeFilters)[number]["id"];

function kakaoDirectionsUrl(agency: Agency): string {
  const label = encodeURIComponent(agency.name);
  return `https://map.kakao.com/link/to/${label},${agency.position.lat},${agency.position.lng}`;
}

function AgencyDetails({ agency, mobile = false }: { agency: Agency | null; mobile?: boolean }) {
  if (!agency) {
    return (
      <div
        className={
          mobile
            ? "rounded-[20px] bg-white p-4 shadow-[0_14px_36px_rgba(25,46,37,0.2)]"
            : "flex h-full flex-col items-center justify-center rounded-[24px] border border-[#e0e7e2] bg-white p-6 text-center text-sm font-bold text-[#77827d] shadow-[0_10px_32px_rgba(52,76,65,0.06)]"
        }
      >
        표시할 기관이 없습니다. 지역이나 필터를 바꿔보세요.
      </div>
    );
  }

  return (
    <div
      className={
        mobile
          ? "rounded-[20px] bg-white p-4 shadow-[0_14px_36px_rgba(25,46,37,0.2)]"
          : "flex h-full flex-col rounded-[24px] border border-[#e0e7e2] bg-white p-6 shadow-[0_10px_32px_rgba(52,76,65,0.06)]"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="mt-2 truncate text-lg font-black tracking-[-0.035em] text-[#263a32]">
            {agency.name}
          </h2>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0d4] text-[#8a5910]">
          <Icon name="map-pin" className="size-5" />
        </span>
      </div>
      <dl className={`mt-4 space-y-2.5 text-sm ${mobile ? "hidden sm:block" : ""}`}>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 font-bold text-[#77827d]">주소</dt>
          <dd className="font-semibold text-[#475a52]">{agency.roadAddress ?? "주소 확인 안됨"}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 font-bold text-[#77827d]">전화</dt>
          <dd className="font-semibold text-[#475a52]">{agency.phone}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 font-bold text-[#77827d]">운영</dt>
          <dd className="font-semibold text-[#475a52]">
            {agency.operatingHours ?? "운영시간 확인 안됨"}
          </dd>
        </div>
      </dl>
      <div className={`mt-4 grid grid-cols-2 gap-2 ${mobile ? "" : "lg:mt-auto lg:pt-6"}`}>
        <a
          href={`tel:${agency.phone}`}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#2d6d5d] px-3 text-xs font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f36]"
        >
          <Icon name="phone" className="size-4" />
          전화하기
        </a>
        <a
          href={kakaoDirectionsUrl(agency)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#2d6d5d] px-3 text-xs font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f36]"
        >
          <Icon name="navigation" className="size-4" />
          길찾기
        </a>
      </div>
    </div>
  );
}

export function AgencyMap() {
  const supabase = useMemo(() => createClient(), []);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>("cheongju");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [locationStatus, setLocationStatus] = useState(
    "위치 권한을 허용하거나 지역을 직접 선택하세요.",
  );
  const [locating, setLocating] = useState(false);
  const locationRequestId = useRef(0);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const near = userPosition ?? REGION_CENTERS[selectedRegion];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchNearbyAgencies(
      supabase,
      selectedRegion,
      typeFilter === "all" ? null : typeFilter,
      near,
      NEARBY_LIMIT,
    )
      .then((result) => {
        if (cancelled) return;
        setAgencies(result);
        setSelectedId(result[0]?.id ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("기관 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setAgencies([]);
        setSelectedId(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, selectedRegion, typeFilter, near.lat, near.lng]);

  const selectedAgency = agencies.find((agency) => agency.id === selectedId) ?? null;
  // KakaoMapMarker.id is a number (from the prior plan's KakaoMap component,
  // which this plan must not modify), but real agency ids are UUID strings.
  // Use each agency's array index as the marker id, and map back via that
  // index in onSelectMarker below.
  const mapMarkers: KakaoMapMarker[] = agencies.map((agency, index) => ({
    id: index,
    position: agency.position,
  }));

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("이 브라우저에서는 위치 기능을 사용할 수 없습니다. 지역을 직접 선택해 주세요.");
      return;
    }
    const requestId = locationRequestId.current + 1;
    locationRequestId.current = requestId;
    setLocating(true);
    setLocationStatus("현재 위치를 확인하고 있어요…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestId.current !== requestId) return;
        setLocating(false);
        setUserPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("현재 위치 기준으로 가까운 기관을 보여드려요.");
      },
      () => {
        if (locationRequestId.current !== requestId) return;
        setLocating(false);
        setLocationStatus("위치를 확인하지 못했습니다. 아래에서 지역을 직접 선택해 주세요.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }

  function selectRegion(value: string) {
    const region = regions.find((item) => item.id === value);
    if (!region) {
      setLocationStatus("지원하지 않는 지역입니다. 목록에서 지역을 다시 선택해 주세요.");
      return;
    }
    locationRequestId.current += 1;
    setLocating(false);
    setUserPosition(null);
    setSelectedRegion(region.id);
    setLocationStatus(`선택 지역: ${region.label} 기준으로 가까운 기관을 보여드려요.`);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">주변 기관</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7974] sm:text-base">
          현재 위치는 화면을 벗어나면 폐기하며 저장하지 않습니다. 위치를 거부해도 지역을 직접
          선택할 수 있습니다.
        </p>
      </header>

      <section
        className="grid gap-3 rounded-[24px] border border-[#dce5e0] bg-white p-4 sm:grid-cols-[auto_minmax(180px,280px)_1fr] sm:items-center sm:p-5"
        aria-label="검색 위치 설정"
      >
        <button
          type="button"
          onClick={requestLocation}
          disabled={locating}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2d6d5d] px-4 text-sm font-extrabold text-white disabled:bg-[#849d93] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] sm:w-fit"
        >
          <Icon name="navigation" className="size-4" />
          {locating ? "확인 중" : "현재 위치 사용"}
        </button>
        <label className="sr-only" htmlFor="region">
          지역 직접 선택
        </label>
        <select
          id="region"
          value={selectedRegion}
          onChange={(event) => selectRegion(event.target.value)}
          className="min-h-12 w-full rounded-xl border border-[#d4ddd8] bg-white px-4 text-base font-bold text-[#40534b] outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bdd9ce]"
        >
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.label}
            </option>
          ))}
        </select>
        <p className="text-xs leading-5 text-[#71807a] sm:text-sm" aria-live="polite">
          {locationStatus}
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="기관 유형 필터">
        {typeFilters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={typeFilter === item.id}
            onClick={() => setTypeFilter(item.id)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${
              typeFilter === item.id
                ? "bg-[#173f36] text-white"
                : "border border-[#dce4df] bg-white text-[#5e6d67]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loadError && (
        <p role="alert" className="rounded-xl bg-[#fdecea] px-4 py-3 text-sm font-bold text-[#8a2f24]">
          {loadError}
        </p>
      )}

      {!loading && !loadError && agencies.length === 0 && (
        <p className="rounded-xl bg-[#f4f6f4] px-4 py-3 text-sm font-bold text-[#5e6d67]">
          이 지역·유형에 해당하는 기관을 찾지 못했습니다. 다른 지역이나 "전체"를 선택해 보세요.
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="지도 위 기관 목록">
        {agencies.map((agency) => (
          <button
            key={agency.id}
            type="button"
            aria-pressed={selectedId === agency.id}
            onClick={() => setSelectedId(agency.id)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${
              selectedId === agency.id
                ? "bg-[#e59b37] text-white"
                : "border border-[#dce4df] bg-white text-[#5e6d67]"
            }`}
          >
            {agency.name}
          </button>
        ))}
      </div>

      <div className="grid min-h-[560px] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section
          className="map-grid relative min-h-[68dvh] overflow-hidden rounded-[24px] border border-[#cedbd2] lg:min-h-[560px]"
          aria-label="기관 지도"
        >
          <KakaoMap
            center={near}
            markers={mapMarkers}
            onSelectMarker={(markerIndex) => {
              const agency = agencies[markerIndex];
              if (agency) setSelectedId(agency.id);
            }}
          />
          <div className="absolute inset-x-3 bottom-3 z-20 lg:hidden">
            <AgencyDetails agency={selectedAgency} mobile />
          </div>
        </section>
        <aside className="hidden lg:block">
          <AgencyDetails agency={selectedAgency} />
        </aside>
      </div>
    </div>
  );
}
```

**Why the marker id is an array index, not the agency's UUID:** `KakaoMap`'s `onSelectMarker` callback (from the prior plan/task, already reviewed) is typed `(id: number) => void`, matching its original numeric demo-agency ids. Real agency ids are UUID strings. Using each agency's array index as the marker's synthetic id and mapping back via `agencies[markerIndex]` in `onSelectMarker` (already done in the component code above) avoids widening `KakaoMap`'s public prop type. Do not change `KakaoMap`'s `KakaoMapMarker.id` type to `string` — that touches a file this plan's Global Constraints says not to modify.

- [ ] **Step 3: Update the page import (same commit as the delete in Step 4 — see the note above)**

In `app/[locale]/map/page.tsx`, replace:

```tsx
import { AgencyMapDemo } from "@/features/map/agency-map-demo";
```

with:

```tsx
import { AgencyMap } from "@/features/map/agency-map";
```

and replace the JSX `<AgencyMapDemo />` with `<AgencyMap />`. Read the current file first — the exact metadata/title lines around it should stay untouched.

- [ ] **Step 4: Delete the old demo file**

```bash
git rm features/map/agency-map-demo.tsx
```

- [ ] **Step 5: Run lint and typecheck to confirm the swap is self-contained**

Run: `npm run lint && npm run typecheck`
Expected: both clean — no dangling import to the deleted `agency-map-demo.tsx` anywhere.

- [ ] **Step 6: Commit**

```bash
git add features/map/agency-map.tsx app/\[locale\]/map/page.tsx
git commit -m "feat: replace demo agencies with real Supabase data in map component"
```

---

### Task 3: Clean up now-dead demo geo code

**Files:**
- Modify: `features/map/geo.ts` (remove now-unused `MARKER_OFFSETS`/`getMarkerPosition` — they existed only to fake marker positions for demo agencies that no longer exist)
- Modify: `tests/map-geo.test.ts` (remove tests for the removed function; keep a minimal sanity check on `REGION_CENTERS`)

**Interfaces:**
- None — this task only removes dead code. `RegionId`, `LatLng`, `REGION_CENTERS` (still used by Tasks 1 and 2) are untouched.

- [ ] **Step 1: Remove the now-dead mock-marker code from `geo.ts`**

Read `features/map/geo.ts`. Remove the `MARKER_OFFSETS` constant and the `getMarkerPosition` function entirely (they positioned fake markers around a region center for the removed demo data; real agencies carry their own `latitude`/`longitude` now). Keep `RegionId`, `LatLng`, and `REGION_CENTERS` exactly as they are — Task 1 and Task 2 both still depend on them for the map's center point.

The file should end up as just:

```ts
// features/map/geo.ts
export type RegionId = "cheongju" | "chungju" | "jincheon" | "eumseong";

export type LatLng = { lat: number; lng: number };

export const REGION_CENTERS: Record<RegionId, LatLng> = {
  cheongju: { lat: 36.6424, lng: 127.489 },
  chungju: { lat: 36.991, lng: 127.9259 },
  jincheon: { lat: 36.8556, lng: 127.4356 },
  eumseong: { lat: 36.9397, lng: 127.69 },
};
```

- [ ] **Step 2: Update the geo test file to match**

Replace `tests/map-geo.test.ts`'s contents entirely (the old file tested `getMarkerPosition`, which no longer exists):

```ts
// tests/map-geo.test.ts
import { describe, expect, it } from "vitest";
import { REGION_CENTERS, type RegionId } from "@/features/map/geo";

describe("REGION_CENTERS", () => {
  const regionIds: RegionId[] = ["cheongju", "chungju", "jincheon", "eumseong"];

  it("has a center for every pilot region", () => {
    for (const id of regionIds) {
      expect(REGION_CENTERS[id]).toBeDefined();
    }
  });

  it("keeps every center within plausible South Korea bounds", () => {
    for (const id of regionIds) {
      const { lat, lng } = REGION_CENTERS[id];
      expect(lat).toBeGreaterThan(33);
      expect(lat).toBeLessThan(39);
      expect(lng).toBeGreaterThan(124);
      expect(lng).toBeLessThan(132);
    }
  });
});
```

- [ ] **Step 3: Run lint, typecheck, and the full test suite**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all three pass.

- [ ] **Step 4: Commit**

```bash
git add features/map/geo.ts tests/map-geo.test.ts
git commit -m "chore: remove dead demo marker-offset code from geo.ts"
```

---

## Final manual browser verification (after all 3 tasks — cannot be done in this sandbox, no Supabase/Kakao network access)

Run: `npm run dev`, visit the map page in a real browser with the real `.env.local` keys already configured.
Expected:
- Each of the 4 regions shows real agency names (음성군청, 음성읍행정복지센터, 음성군외국인지원센터, etc. for 음성군) — NOT "예시" placeholder text.
- Switching the type filter chips actually narrows results using the real `agency_type` values.
- Clicking "현재 위치 사용" and granting permission re-sorts by real distance from the browser's geolocation.
- "전화하기" opens the phone dialer with a real number; "길찾기" opens Kakao Map in a new tab centered on the agency.
- An empty-result region/filter combination shows the "찾지 못했습니다" message, not a crash.

---

## Out of scope (tracked elsewhere)

- `risk_routing_table`/`risk_keyword_messages` — no risk-keyword detection source exists yet in this app; deferred exactly as the prior plan deferred it.
- Multi-region (`region` containing `|`) matching logic — not present in any of the 15 live map-visible rows today; add it only if `visa-data` ever adds such a row to the map-visible set.
- `last_verified_at`/`source_url`/`geocoded_at` display in the UI — not selected by this plan's query; add if a future design calls for showing data provenance to the user.
- Non-`localhost` Kakao domain registration — unchanged from the prior plan, still an operational Kakao console step.
