"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

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
] as const;

const demoAgencies = [
  { id: 1, category: "admin", name: "행정 지원기관 예시", type: "행정", x: "27%", y: "34%" },
  { id: 2, category: "labor", name: "노동 상담기관 예시", type: "노동", x: "62%", y: "48%" },
  { id: 3, category: "education", name: "교육 지원기관 예시", type: "교육", x: "43%", y: "68%" },
] as const;

type Category = (typeof categories)[number]["id"];
type Region = (typeof regions)[number]["id"];
type DemoAgency = (typeof demoAgencies)[number];

function AgencyDetails({ agency, mobile = false }: { agency: DemoAgency; mobile?: boolean }) {
  return (
    <div className={mobile ? "rounded-[20px] bg-white p-4 shadow-[0_14px_36px_rgba(25,46,37,0.2)]" : "flex h-full flex-col rounded-[24px] border border-[#e0e7e2] bg-white p-6 shadow-[0_10px_32px_rgba(52,76,65,0.06)]"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex min-h-7 items-center rounded-full bg-[#e8f3ee] px-2.5 text-[0.68rem] font-extrabold text-[#215a4b]">{agency.type} · 화면 예시</span>
          <h2 className="mt-2 truncate text-lg font-black tracking-[-0.035em] text-[#263a32]">{agency.name}</h2>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0d4] text-[#8a5910]"><Icon name="map-pin" className="size-5" /></span>
      </div>
      <dl className={`mt-4 space-y-2.5 text-sm ${mobile ? "hidden sm:block" : ""}`}>
        <div className="flex gap-3"><dt className="w-14 shrink-0 font-bold text-[#77827d]">주소</dt><dd className="font-semibold text-[#475a52]">실제 기관 데이터 연결 전</dd></div>
        <div className="flex gap-3"><dt className="w-14 shrink-0 font-bold text-[#77827d]">전화</dt><dd className="font-semibold text-[#475a52]">확인된 번호 없음</dd></div>
        <div className="flex gap-3"><dt className="w-14 shrink-0 font-bold text-[#77827d]">운영</dt><dd className="font-semibold text-[#475a52]">출처 및 확인일 연결 전</dd></div>
      </dl>
      <div className={`mt-4 grid grid-cols-2 gap-2 ${mobile ? "" : "lg:mt-auto lg:pt-6"}`}>
        <span aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-[#eef1ef] px-3 text-xs font-extrabold text-[#929b97]"><Icon name="phone" className="size-4" />전화 준비 중</span>
        <span aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-[#eef1ef] px-3 text-xs font-extrabold text-[#929b97]"><Icon name="navigation" className="size-4" />길찾기 준비 중</span>
      </div>
    </div>
  );
}

export function AgencyMapDemo() {
  const [category, setCategory] = useState<Category>("all");
  const [selectedId, setSelectedId] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState<Region>("cheongju");
  const [locationStatus, setLocationStatus] = useState("위치 권한을 허용하거나 지역을 직접 선택하세요.");
  const [locating, setLocating] = useState(false);
  const selectedAgency = demoAgencies.find((agency) => agency.id === selectedId) ?? demoAgencies[0];
  const visibleAgencies = category === "all" ? demoAgencies : demoAgencies.filter((agency) => agency.category === category);

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory);
    const first = nextCategory === "all" ? demoAgencies[0] : demoAgencies.find((agency) => agency.category === nextCategory);
    if (first) setSelectedId(first.id);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("이 브라우저에서는 위치 기능을 사용할 수 없습니다. 지역을 직접 선택해 주세요.");
      return;
    }
    setLocating(true);
    setLocationStatus("현재 위치를 확인하고 있어요…");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocating(false);
        setLocationStatus("현재 위치를 확인했습니다. 좌표는 저장하지 않으며, 기관 데이터 연결 전에는 지도 예시가 변경되지 않습니다.");
      },
      () => {
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
    setSelectedRegion(region.id);
    setLocationStatus(`선택 지역: ${region.label}. 기관 데이터 연결 전에는 지도 예시와 기관 정보가 변경되지 않습니다.`);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">위치 기반 기관 안내</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">주변 기관</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7974] sm:text-base">현재 위치는 화면을 벗어나면 폐기하며 저장하지 않습니다. 위치를 거부해도 지역을 직접 선택할 수 있습니다.</p>
      </header>

      <section className="grid gap-3 rounded-[24px] border border-[#dce5e0] bg-white p-4 sm:grid-cols-[auto_minmax(180px,280px)_1fr] sm:items-center sm:p-5" aria-label="검색 위치 설정">
        <button type="button" onClick={requestLocation} disabled={locating} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2d6d5d] px-4 text-sm font-extrabold text-white disabled:bg-[#849d93] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] sm:w-fit"><Icon name="navigation" className="size-4" />{locating ? "확인 중" : "현재 위치 사용"}</button>
        <label className="sr-only" htmlFor="region">지역 직접 선택</label>
        <select id="region" value={selectedRegion} onChange={(event) => selectRegion(event.target.value)} className="min-h-12 w-full rounded-xl border border-[#d4ddd8] bg-white px-4 text-base font-bold text-[#40534b] outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bdd9ce]">
          {regions.map((region) => <option key={region.id} value={region.id}>{region.label}</option>)}
        </select>
        <p className="text-xs leading-5 text-[#71807a] sm:text-sm" aria-live="polite">{locationStatus}</p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="기관 유형 필터">
        {categories.map((item) => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => selectCategory(item.id)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${category === item.id ? "bg-[#173f36] text-white" : "border border-[#dce4df] bg-white text-[#5e6d67]"}`}>{item.label}</button>)}
      </div>

      <div className="grid min-h-[560px] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="map-grid relative min-h-[68dvh] overflow-hidden rounded-[24px] border border-[#cedbd2] lg:min-h-[560px]" aria-label="기관 지도 화면 예시">
          <div className="absolute left-3 top-3 z-20 rounded-xl bg-[#2f3c37]/85 px-3 py-2 text-[0.68rem] font-bold text-white backdrop-blur sm:left-4 sm:top-4">지도 SDK·실기관 데이터 연결 전</div>
          <div className="absolute inset-x-[12%] top-[15%] h-5 rotate-12 rounded-full bg-white/80" aria-hidden="true" />
          <div className="absolute bottom-[22%] left-[-5%] h-5 w-[75%] -rotate-12 rounded-full bg-white/80" aria-hidden="true" />
          {visibleAgencies.map((agency) => <button key={agency.id} type="button" onClick={() => setSelectedId(agency.id)} style={{ left: agency.x, top: agency.y }} aria-label={`${agency.name} 선택`} aria-pressed={selectedId === agency.id} className={`absolute z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white shadow-[0_8px_20px_rgba(42,67,55,0.28)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#173f36] ${selectedId === agency.id ? "bg-[#e59b37] text-white" : "bg-[#2d6d5d] text-white"}`}><Icon name="map-pin" className="size-5" /></button>)}
          <div className="absolute inset-x-3 bottom-3 z-20 lg:hidden"><AgencyDetails agency={selectedAgency} mobile /></div>
        </section>
        <aside className="hidden lg:block"><AgencyDetails agency={selectedAgency} /></aside>
      </div>
    </div>
  );
}
