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
  if (loading || loadError) {
    // The outer loading/error banners already communicate this state; avoid
    // rendering a second, contradictory "no agencies" message underneath.
    return null;
  }

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
      <dl className={`mt-4 space-y-2.5 text-sm ${mobile ? "hidden sm:block" : ""}`}>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 font-bold text-[#77827d]">주소</dt>
          <dd className="font-semibold text-[#475a52]">
            {displayOrFallback(agency.roadAddress, "주소 확인 안됨")}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 font-bold text-[#77827d]">전화</dt>
          <dd className="font-semibold text-[#475a52]">
            {displayOrFallback(agency.phone, "전화번호 확인 안됨")}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 font-bold text-[#77827d]">운영</dt>
          <dd className="font-semibold text-[#475a52]">
            {displayOrFallback(agency.operatingHours, "운영시간 확인 안됨")}
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
            전화하기
          </a>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#c9d3ce] px-3 text-xs font-extrabold text-white">
            <Icon name="phone" className="size-4" />
            전화번호 확인 안됨
          </span>
        )}
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
  const supabase = useMemo(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      return null;
    }
    return createClient();
  }, []);
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

    async function loadAgencies() {
      setLoading(true);
      setLoadError(null);

      if (!supabase) {
        if (cancelled) return;
        setLoadError("기관 정보 설정이 완료되지 않았습니다.");
        setAgencies([]);
        setSelectedId(null);
        setLoading(false);
        return;
      }

      try {
        const result = await fetchNearbyAgencies(
          supabase,
          selectedRegion,
          typeFilter === "all" ? null : typeFilter,
          near,
          NEARBY_LIMIT,
        );
        if (cancelled) return;
        setAgencies(result);
        setSelectedId(result[0]?.id ?? null);
      } catch {
        if (cancelled) return;
        setLoadError("기관 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
    // underlying coordinates change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {loading && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-xl bg-[#f4f6f4] px-4 py-3 text-sm font-bold text-[#5e6d67]"
        >
          기관 정보를 불러오는 중입니다…
        </p>
      )}

      {!loading && loadError && (
        <p role="alert" className="rounded-xl bg-[#fdecea] px-4 py-3 text-sm font-bold text-[#8a2f24]">
          {loadError}
        </p>
      )}

      {!loading && !loadError && agencies.length === 0 && (
        <p className="rounded-xl bg-[#f4f6f4] px-4 py-3 text-sm font-bold text-[#5e6d67]">
          이 지역·유형에 해당하는 기관을 찾지 못했습니다. 다른 지역이나 &quot;전체&quot;를 선택해 보세요.
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
