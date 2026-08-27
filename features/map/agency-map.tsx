"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { KakaoMap, type KakaoMapMarker } from "@/features/map/kakao-map";
import { REGION_CENTERS, type LatLng, type RegionId } from "@/features/map/geo";
import type { Agency, AgencyType } from "@/features/map/agency-queries";

const NEARBY_LIMIT = 3;

/** 위치 좌표를 ~1km 정밀도로 낮춰 API 쿼리스트링에 정밀 위치가 남지 않게 한다. */
function roundCoord(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

const regions = [
  { id: "cheongju", translationKey: "cheongju" },
  { id: "chungju", translationKey: "chungju" },
  { id: "jincheon", translationKey: "jincheon" },
  { id: "eumseong", translationKey: "eumseong" },
] as const satisfies readonly { id: RegionId; translationKey: string }[];

const typeFilters = [
  { id: "all", translationKey: "all" },
  { id: "COMMUNITY_CENTER", translationKey: "communityCenter" },
  { id: "ADMINISTRATIVE_AGENCY", translationKey: "administrativeAgency" },
  { id: "UNIVERSITY_DEPT_OFFICE", translationKey: "universityDeptOffice" },
  { id: "FOREIGN_SUPPORT_CENTER", translationKey: "foreignSupportCenter" },
  { id: "OTHER", translationKey: "other" },
] as const satisfies readonly { id: "all" | AgencyType; translationKey: string }[];

type TypeFilter = (typeof typeFilters)[number]["id"];

function kakaoDirectionsUrl(agency: Agency): string {
  const label = encodeURIComponent(agency.name);
  return `https://map.kakao.com/link/to/${label},${agency.position.lat},${agency.position.lng}`;
}

// The current live dataset's CSV import converts empty-string cells to
// `null` before they reach Supabase, so a plain `??` fallback happens to
// work today — but that's an upstream import-behavior assumption, not
// something this component's own code guarantees. Treat both `null` and an
// all-whitespace/empty string as "no value."
function displayOrFallback(value: string | null | undefined, fallback: string): string {
  return value && value.trim() ? value : fallback;
}

function AgencyDetails({
  agency,
  loading,
  loadError,
  mobile = false,
}: {
  agency: Agency | null;
  loading: boolean;
  loadError: string | null;
  mobile?: boolean;
}) {
  const t = useTranslations("Map");
  if (loading || loadError) {
    // The outer loading/error banners already communicate this state; avoid
    // rendering a second, contradictory "no agencies" message underneath.
    return null;
  }

  if (!agency) {
    // Once loading/error are ruled out above, `!agency` only happens when
    // the fetch genuinely succeeded with zero rows — the page-level "이 지역·
    // 유형에 해당하는 기관을 찾지 못했습니다" banner already covers that case,
    // so render nothing here instead of a second, redundant empty message.
    return null;
  }

  const hasPhone = Boolean(agency.phone && agency.phone.trim());

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
      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 font-bold text-[#77827d]">{t("details.address")}</dt>
          <dd className="font-semibold text-[#475a52]">
            {displayOrFallback(agency.roadAddress, t("details.addressUnavailable"))}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 font-bold text-[#77827d]">{t("details.phone")}</dt>
          <dd className="font-semibold text-[#475a52]">
            {displayOrFallback(agency.phone, t("details.phoneUnavailable"))}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 font-bold text-[#77827d]">{t("details.hours")}</dt>
          <dd className="font-semibold text-[#475a52]">
            {displayOrFallback(agency.operatingHours, t("details.hoursUnavailable"))}
          </dd>
        </div>
      </dl>
      <div className={`mt-4 grid grid-cols-2 gap-2 ${mobile ? "" : "lg:mt-auto lg:pt-6"}`}>
        {hasPhone ? (
          <a
            href={`tel:${agency.phone}`}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#2d6d5d] px-3 text-xs font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f36]"
          >
            <Icon name="phone" className="size-4" />
            {t("details.call")}
          </a>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#c9d3ce] px-3 text-xs font-extrabold text-white">
            <Icon name="phone" className="size-4" />
            {t("details.phoneUnavailable")}
          </span>
        )}
        <a
          href={kakaoDirectionsUrl(agency)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#2d6d5d] px-3 text-xs font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f36]"
        >
          <Icon name="navigation" className="size-4" />
          {t("directions")}
        </a>
      </div>
    </div>
  );
}

export function AgencyMap() {
  const t = useTranslations("Map");
  const [selectedRegion, setSelectedRegion] = useState<RegionId>("cheongju");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [locationStatus, setLocationStatus] = useState(t("location.initial"));
  const [locating, setLocating] = useState(false);
  const locationRequestId = useRef(0);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const near = userPosition ?? REGION_CENTERS[selectedRegion];

  useEffect(() => {
    let cancelled = false;

    async function loadAgencies() {
      setLoading(true);
      setLoadError(null);
      // Clear the previous region/filter's results immediately so a stale,
      // still-clickable agency list and map markers never linger under the
      // loading banner while the new fetch is in flight.
      setAgencies([]);
      setSelectedId(null);

      const params = new URLSearchParams();
      if (userPosition) {
        // 정밀 좌표가 캐시 URL·접근 로그에 그대로 남지 않도록 소수 2자리
        // (~1km)로 반올림해 보낸다. 3개 최근접 목록 정렬에는 이 정밀도로 충분하다.
        params.set("lat", roundCoord(userPosition.lat));
        params.set("lng", roundCoord(userPosition.lng));
      } else {
        // A real GPS fix searches across every pilot region; without one the
        // server derives the sort origin from the selected region's center.
        params.set("region", selectedRegion);
      }
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("limit", String(NEARBY_LIMIT));

      try {
        const response = await fetch(`/api/map/agencies?${params.toString()}`);
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(
            response.status === 503
              ? t("errors.notConfigured")
              : t("errors.loadFailed"),
          );
          setAgencies([]);
          setSelectedId(null);
          return;
        }
        const body = (await response.json()) as { agencies: Agency[] };
        if (cancelled) return;
        setAgencies(body.agencies);
        setSelectedId(body.agencies[0]?.id ?? null);
      } catch {
        if (cancelled) return;
        setLoadError(t("errors.loadFailed"));
        setAgencies([]);
        setSelectedId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAgencies();

    return () => {
      cancelled = true;
    };
    // `near` is intentionally tracked via its primitive lat/lng below, not as
    // the object itself, since `near` is a new object reference every render
    // (userPosition ?? REGION_CENTERS[selectedRegion]) and including it
    // directly would refetch on every render instead of only when the
    // underlying coordinates change. `userPosition` itself only changes
    // identity via setUserPosition, so it's safe to depend on directly —
    // it's what decides whether the query filters by `selectedRegion` at all.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, typeFilter, userPosition, near.lat, near.lng]);

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
      setLocationStatus(t("location.unsupported"));
      return;
    }
    const requestId = locationRequestId.current + 1;
    locationRequestId.current = requestId;
    setLocating(true);
    setLocationStatus(t("location.checking"));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestId.current !== requestId) return;
        setLocating(false);
        setUserPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus(t("location.nearby"));
      },
      () => {
        if (locationRequestId.current !== requestId) return;
        setLocating(false);
        // Clear any earlier successful fix so a failed retry doesn't keep
        // querying against stale coordinates while the message tells the
        // user to pick a region manually.
        setUserPosition(null);
        setLocationStatus(t("location.failed"));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }

  function selectRegion(value: string) {
    const region = regions.find((item) => item.id === value);
    if (!region) {
      setLocationStatus(t("location.invalidRegion"));
      return;
    }
    locationRequestId.current += 1;
    setLocating(false);
    setUserPosition(null);
    setSelectedRegion(region.id);
    setLocationStatus(t("location.selectedRegion", { region: t(`regions.${region.translationKey}`) }));
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7974] sm:text-base">
          {t("description")}
        </p>
      </header>

      <section
        className="grid gap-3 rounded-[24px] border border-[#dce5e0] bg-white p-4 sm:grid-cols-[auto_minmax(180px,280px)_1fr] sm:items-center sm:p-5"
        aria-label={t("location.searchLabel")}
      >
        <button
          type="button"
          onClick={requestLocation}
          disabled={locating}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2d6d5d] px-4 text-sm font-extrabold text-white disabled:bg-[#849d93] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] sm:w-fit"
        >
          <Icon name="navigation" className="size-4" />
          {locating ? t("location.checkingButton") : t("location.useCurrent")}
        </button>
        <label className="sr-only" htmlFor="region">
          {t("location.selectRegion")}
        </label>
        <select
          id="region"
          value={selectedRegion}
          onChange={(event) => selectRegion(event.target.value)}
          className="min-h-12 w-full rounded-xl border border-[#d4ddd8] bg-white px-4 text-base font-bold text-[#40534b] outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bdd9ce]"
        >
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
          {t(`regions.${region.translationKey}`)}
            </option>
          ))}
        </select>
        <p className="text-xs leading-5 text-[#71807a] sm:text-sm" aria-live="polite">
          {locationStatus}
        </p>
      </section>

      <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={t("filters.label")}>
        {typeFilters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={typeFilter === item.id}
            onClick={() => setTypeFilter(item.id)}
            className={`min-h-8 shrink-0 rounded-full px-2.5 text-[11px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${
              typeFilter === item.id
                ? "bg-[#173f36]/90 text-white"
                : "border border-[#dce4df] bg-white text-[#5e6d67]"
            }`}
          >
            {t(`filters.${item.translationKey}`)}
          </button>
        ))}
      </div>

      {loading && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-xl bg-[#f4f6f4] px-4 py-3 text-sm font-bold text-[#5e6d67]"
        >
          {t("loading")}
        </p>
      )}

      {!loading && loadError && (
        <p role="alert" className="rounded-xl bg-[#fdecea] px-4 py-3 text-sm font-bold text-[#8a2f24]">
          {loadError}
        </p>
      )}

      {!loading && !loadError && agencies.length === 0 && (
        <p className="rounded-xl bg-[#f4f6f4] px-4 py-3 text-sm font-bold text-[#5e6d67]">
          {t("empty")}
        </p>
      )}

      <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={t("agencyListLabel")}>
        {agencies.map((agency) => (
          <button
            key={agency.id}
            type="button"
            aria-pressed={selectedId === agency.id}
            onClick={() => setSelectedId(agency.id)}
            className={`min-h-8 shrink-0 rounded-full px-2.5 text-[11px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${
              selectedId === agency.id
                ? "bg-[#e59b37]/90 text-white"
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
          aria-label={t("mapLabel")}
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
            <AgencyDetails agency={selectedAgency} loading={loading} loadError={loadError} mobile />
          </div>
        </section>
        <aside className="hidden lg:block">
          <AgencyDetails agency={selectedAgency} loading={loading} loadError={loadError} />
        </aside>
      </div>
    </div>
  );
}
