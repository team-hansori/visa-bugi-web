# Kakao Map SDK Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake CSS-positioned map in `features/map/agency-map-demo.tsx` with a real Kakao Maps JS SDK map, keeping all existing demo data, category filter, region selector, and geolocation logic unchanged.

**Architecture:** A pure geo-math module (`features/map/geo.ts`) computes region center coordinates and per-marker offsets, independent of any SDK. A thin client component (`features/map/kakao-map.tsx`) loads the Kakao SDK via `next/script` and imperatively drives a `kakao.maps.Map` instance and its markers through refs, exposing a small typed props API. `agency-map-demo.tsx` is modified to consume both, replacing its percentage-positioned `<button>` pins with the real map.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict mode, Kakao Maps JS SDK (loaded via `next/script`, no npm package), Vitest for unit tests.

**Spec:** GitHub issue [#11](https://github.com/team-hansori/visa-bugi-web/issues/11) (decisions: Kakao Maps chosen, JS key vs REST key split, mock-data-first sequencing) and issue [#6](https://github.com/team-hansori/visa-bugi-web/issues/6) (real `agency_contacts` table — out of scope for this plan, tracked separately).

## Prerequisites (outside code, do before Task 2 Step 3)

- `localhost` (with the dev port, e.g. `localhost:3000`) must be registered under the Kakao Developers console → your app → 플랫폼 → Web. Without this the SDK loads but the map silently fails to render (console shows a domain/auth error). Vercel preview and production domains are a separate follow-up (see "Out of scope").

## Global Constraints

- Do not touch call/directions buttons in `AgencyDetails` — they stay disabled ("전화 준비 중" / "길찾기 준비 중") because real agency phone/address data does not exist yet (blocked on issue #6). Wiring them to real behavior against fake data would violate the project rule that buttons must have real function or a clear "준비 중" state.
- Do not add real institution data. All markers stay labeled as example data ("실기관 데이터 연결 전").
- The Kakao JavaScript key is public-safe and must be read from `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`. Never read or reference `KAKAO_REST_API_KEY` (server-only, unrelated to map rendering) from client code.
- TypeScript strict mode is on — no `any`. Kakao's `window.kakao` has no official types, so this plan defines minimal ambient types for only the methods used.
- Preserve keyboard/screen-reader access to agency selection — Kakao markers are canvas-drawn and not natively focusable, so a text-button fallback list must remain.

---

### Task 1: Region geo helper (pure logic, unit tested)

**Files:**
- Create: `features/map/geo.ts`
- Test: `tests/map-geo.test.ts`

**Interfaces:**
- Produces: `type RegionId = "cheongju" | "chungju" | "jincheon" | "eumseong"`, `type LatLng = { lat: number; lng: number }`, `REGION_CENTERS: Record<RegionId, LatLng>`, `getMarkerPosition(region: RegionId, offsetIndex: number): LatLng`
- Consumed by: Task 2 (`kakao-map.tsx` imports `LatLng`) and Task 3 (`agency-map-demo.tsx` imports `RegionId`, `REGION_CENTERS`, `getMarkerPosition`)

- [ ] **Step 1: Write the failing test**

```ts
// tests/map-geo.test.ts
import { describe, expect, it } from "vitest";
import { getMarkerPosition, REGION_CENTERS } from "@/features/map/geo";

describe("getMarkerPosition", () => {
  it("offsets the first marker from the region center", () => {
    const center = REGION_CENTERS.cheongju;
    const position = getMarkerPosition("cheongju", 0);
    expect(position.lat).toBeCloseTo(center.lat + 0.004, 5);
    expect(position.lng).toBeCloseTo(center.lng - 0.003, 5);
  });

  it("wraps the offset index so any marker count is supported", () => {
    const first = getMarkerPosition("chungju", 0);
    const wrapped = getMarkerPosition("chungju", 3);
    expect(wrapped).toEqual(first);
  });

  it("uses a different center per region", () => {
    const cheongju = getMarkerPosition("cheongju", 0);
    const chungju = getMarkerPosition("chungju", 0);
    expect(cheongju).not.toEqual(chungju);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/map-geo.test.ts`
Expected: FAIL with a module-not-found error for `@/features/map/geo`

- [ ] **Step 3: Write minimal implementation**

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

const MARKER_OFFSETS: LatLng[] = [
  { lat: 0.004, lng: -0.003 },
  { lat: -0.003, lng: 0.005 },
  { lat: 0.002, lng: 0.004 },
];

export function getMarkerPosition(region: RegionId, offsetIndex: number): LatLng {
  const center = REGION_CENTERS[region];
  const offset = MARKER_OFFSETS[offsetIndex % MARKER_OFFSETS.length];
  return { lat: center.lat + offset.lat, lng: center.lng + offset.lng };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/map-geo.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add features/map/geo.ts tests/map-geo.test.ts
git commit -m "feat: add region center and marker offset geo helper"
```

---

### Task 2: Kakao SDK types + map component

**Files:**
- Create: `features/map/kakao-sdk-types.ts`
- Create: `features/map/kakao-map.tsx`

**Interfaces:**
- Consumes: `LatLng` from `features/map/geo.ts` (Task 1)
- Produces: `KakaoMap` component with props `{ center: LatLng; markers: KakaoMapMarker[]; onSelectMarker: (id: number) => void }`, and `type KakaoMapMarker = { id: number; position: LatLng }`. Task 3 imports both.

This task has no automated test — it drives a third-party browser SDK and a live DOM `<div>`, which vitest (no jsdom/`@testing-library/react` in this project) cannot exercise meaningfully. Verification is manual in a real browser (see Step 3).

- [ ] **Step 1: Add minimal ambient types for the Kakao SDK**

```ts
// features/map/kakao-sdk-types.ts
export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoMapInstance {
  setCenter(latlng: KakaoLatLng): void;
}

export interface KakaoMarkerInstance {
  setMap(map: KakaoMapInstance | null): void;
}

export interface KakaoMapsNamespace {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMapInstance;
  Marker: new (options: { position: KakaoLatLng; map?: KakaoMapInstance }) => KakaoMarkerInstance;
  event: {
    addListener(target: KakaoMarkerInstance, type: string, handler: () => void): void;
  };
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsNamespace };
  }
}
```

- [ ] **Step 2: Write the map component**

```tsx
// features/map/kakao-map.tsx
"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { KakaoMapInstance, KakaoMarkerInstance } from "@/features/map/kakao-sdk-types";
import type { LatLng } from "@/features/map/geo";

export type KakaoMapMarker = {
  id: number;
  position: LatLng;
};

type KakaoMapProps = {
  center: LatLng;
  markers: KakaoMapMarker[];
  onSelectMarker: (id: number) => void;
};

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? "";

export function KakaoMap({ center, markers, onSelectMarker }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markerRefs = useRef<KakaoMarkerInstance[]>([]);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!sdkReady || !containerRef.current) return;
    const kakao = window.kakao;
    if (!kakao) return;

    kakao.maps.load(() => {
      const container = containerRef.current;
      if (!container) return;
      mapRef.current = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level: 6,
      });
    });
    // Initial creation only depends on the SDK becoming ready;
    // re-centering on prop changes is handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady]);

  useEffect(() => {
    const kakao = window.kakao;
    if (!kakao || !mapRef.current) return;
    mapRef.current.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
  }, [center.lat, center.lng]);

  useEffect(() => {
    const kakao = window.kakao;
    if (!kakao || !mapRef.current) return;
    const map = mapRef.current;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = markers.map((markerData) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(markerData.position.lat, markerData.position.lng),
        map,
      });
      kakao.maps.event.addListener(marker, "click", () => onSelectMarker(markerData.id));
      return marker;
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
    };
  }, [markers, onSelectMarker]);

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`}
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />
      <div ref={containerRef} className="h-full w-full" role="img" aria-label="주변 기관 지도" />
    </>
  );
}
```

- [ ] **Step 3: Manual verification (no automated test possible)**

Run: `npm run dev`, open `http://localhost:3000/ko/map` (or whichever locale route resolves) in a real browser.
Expected: a real Kakao map tile background renders inside the map panel (not the old white curved-line placeholder). If it fails, open browser devtools console — a Kakao 401/domain error means `localhost` isn't registered in the Kakao Developers console's allowed Web domains for this app; check that before assuming the code is wrong.

- [ ] **Step 4: Commit**

```bash
git add features/map/kakao-sdk-types.ts features/map/kakao-map.tsx
git commit -m "feat: add Kakao Maps SDK wrapper component"
```

---

### Task 3: Wire KakaoMap into the map page, keep an accessible fallback list

**Files:**
- Modify: `features/map/agency-map-demo.tsx`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `KakaoMap`, `KakaoMapMarker` from Task 2; `RegionId`, `REGION_CENTERS`, `getMarkerPosition` from Task 1

- [ ] **Step 1: Add the env var placeholder**

Add to `.env.example` (near the Supabase block, top of file):

```bash
# Kakao Maps JavaScript key — safe to expose (protected by domain allowlist in Kakao console)
# Do NOT put the REST API key here; that one must stay server-only.
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=
```

- [ ] **Step 2: Import the new modules and type the region list against `RegionId`**

In `features/map/agency-map-demo.tsx`, change the top imports and the `regions` constant:

```tsx
"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { KakaoMap, type KakaoMapMarker } from "@/features/map/kakao-map";
import { REGION_CENTERS, getMarkerPosition, type RegionId } from "@/features/map/geo";

const categories = [
  { id: "all", label: "전체" },
  { id: "admin", label: "행정" },
  { id: "labor", label: "노동" },
  { id: "education", label: "교육" },
] as const;

const regions = [
  { id: "cheongju", label: "청주시" },
  { id: "chungju", label: "충주시" },
  { id: "jincheon", label: "진천군" },
  { id: "eumseong", label: "음성군" },
] as const satisfies readonly { id: RegionId; label: string }[];

const demoAgencies = [
  { id: 1, category: "admin", name: "행정 지원기관 예시", type: "행정" },
  { id: 2, category: "labor", name: "노동 상담기관 예시", type: "노동" },
  { id: 3, category: "education", name: "교육 지원기관 예시", type: "교육" },
] as const;
```

(This removes the old `x`/`y` percentage fields from `demoAgencies` — positions now come from `getMarkerPosition`.)

- [ ] **Step 3: Compute the map center and markers inside the component**

Inside `AgencyMapDemo`, after `visibleAgencies` is computed, add:

```tsx
const mapCenter = REGION_CENTERS[selectedRegion];
const mapMarkers: KakaoMapMarker[] = visibleAgencies.map((agency, index) => ({
  id: agency.id,
  position: getMarkerPosition(selectedRegion, index),
}));
```

- [ ] **Step 4: Replace the fake map markup with the real map, plus an accessible text-button list**

Replace the whole `<section className="map-grid ...">...</section>` block with:

```tsx
<section
  className="map-grid relative min-h-[68dvh] overflow-hidden rounded-[24px] border border-[#cedbd2] lg:min-h-[560px]"
  aria-label="기관 지도"
>
  <div className="absolute left-3 top-3 z-20 rounded-xl bg-[#2f3c37]/85 px-3 py-2 text-[0.68rem] font-bold text-white backdrop-blur sm:left-4 sm:top-4">
    실기관 데이터 연결 전 · 예시 위치
  </div>
  <KakaoMap center={mapCenter} markers={mapMarkers} onSelectMarker={setSelectedId} />
  <div className="absolute inset-x-3 bottom-3 z-20 lg:hidden">
    <AgencyDetails agency={selectedAgency} mobile />
  </div>
</section>
```

Then, directly below the category filter `<div>` (before the map/aside grid), add an accessible list so keyboard and screen-reader users can select an agency without clicking the canvas map (Kakao markers are not natively focusable):

```tsx
<div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="지도 위 기관 목록">
  {visibleAgencies.map((agency) => (
    <button
      key={agency.id}
      type="button"
      role="listitem"
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
```

- [ ] **Step 5: Run lint, typecheck, and the full test suite**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all three pass. If `typecheck` complains about `Region` vs `RegionId`, confirm the `regions` array's `satisfies` clause matches Task 1's `RegionId` union exactly (same four string ids).

- [ ] **Step 6: Manual browser verification**

Run: `npm run dev`, visit the map page.
Expected:
- Real Kakao map tiles render and re-center when switching the region `<select>`.
- Category filter still narrows which markers/list items show.
- Clicking a marker on the map AND clicking an item in the new text-button list both update the info panel (`AgencyDetails`).
- Tab-key navigation can reach and activate every agency via the text-button list without touching the map.
- Call/directions buttons remain visibly disabled ("전화 준비 중" / "길찾기 준비 중").

- [ ] **Step 7: Commit**

```bash
git add features/map/agency-map-demo.tsx .env.example
git commit -m "feat: render agency map demo with real Kakao Maps SDK"
```

---

## Out of scope (tracked elsewhere)

- Real `agency_contacts` data and its Supabase schema — issue [#6](https://github.com/team-hansori/visa-bugi-web/issues/6), handed off to the `visa-data` side.
- Enabling the call/directions buttons with real phone numbers and directions deep links — blocked on the same data.
- "위험 키워드 감지 → 기관 강조" routing — no detection source exists yet (chatbot risk routing is a separate track); revisit once `features/chat/risk-routing.ts` (already on `main`) has a natural hook point.
- Non-`localhost` Kakao domain registration (Vercel preview/production) — an operational step in the Kakao Developers console, not code.
- Any UI notice about the map background being Korean-only (issue #11, point 1) — the team hasn't decided whether/how to surface this, so no notice is added here. Revisit once that discussion point is resolved.
