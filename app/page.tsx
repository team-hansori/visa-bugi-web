import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const stages = [
  { label: "요건 확인", state: "done" },
  { label: "서류 준비", state: "current" },
  { label: "기관 방문", state: "upcoming" },
  { label: "결과 확인", state: "upcoming" },
] as const;

const sampleTasks = [
  { label: "여권 사본 상태 확인", meta: "서류 준비 · 예시 항목" },
  { label: "방문 일정 직접 추가", meta: "캘린더 · 날짜 미정" },
  { label: "가까운 지원기관 확인", meta: "기관 지도 · 위치 사용 선택" },
];

function ProgressRing() {
  return (
    <div className="relative grid size-36 shrink-0 place-items-center sm:size-40" role="img" aria-label="전체 요건 충족률 예시 68퍼센트">
      <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="51" fill="none" stroke="#e5ebe7" strokeWidth="10" />
        <circle cx="60" cy="60" r="51" fill="none" pathLength="100" stroke="#2d6d5d" strokeDasharray="68 32" strokeLinecap="round" strokeWidth="10" />
      </svg>
      <div className="absolute text-center">
        <strong className="block text-3xl font-black tracking-[-0.06em] text-[#173f36] sm:text-4xl">68%</strong>
        <span className="mt-1 block text-xs font-semibold text-[#73807b]">예시 진행률</span>
      </div>
    </div>
  );
}
export default function Home() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-col gap-5 rounded-[28px] bg-[#173f36] px-5 py-7 text-white shadow-[0_18px_50px_rgba(23,63,54,0.18)] sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div className="max-w-2xl">
          <span className="inline-flex min-h-8 items-center rounded-full bg-white/12 px-3 text-xs font-bold text-[#d9eee5]">로그인 없이 둘러보는 데모</span>
          <h1 className="mt-4 text-[clamp(1.75rem,7vw,3.25rem)] font-black leading-[1.12] tracking-[-0.055em]">
            오늘 준비할 일을<br className="sm:hidden" /> 한눈에 확인하세요
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#d1dfda] sm:text-base sm:leading-7">
            현재 화면은 반응형 UI 확인용 예시입니다. 공식 비자 요건과 사용자 진행상황은 검수된 데이터 연결 후 표시됩니다.
          </p>
        </div>
        <Link href="/onboarding" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffca68] px-5 text-sm font-extrabold text-[#173f36] shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-fit">
          내 정보 설정하기
          <Icon name="arrow-right" className="size-4" />
        </Link>
      </section>

      <section className="grid gap-5 xl:grid-cols-12" aria-label="비자 진행 현황">
        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 xl:col-span-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">전체 요건 충족률</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#20332c]">준비 현황</h2>
            </div>
            <span className="rounded-full bg-[#fff1d4] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#8a5910]">DEMO</span>
          </div>
          <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center xl:flex-col">
            <ProgressRing />
            <div className="w-full rounded-2xl bg-[#f5f7f4] p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-[#64716c]">선택 비자</span>
                <strong className="text-[#20332c]">E-7-4R 예시</strong>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-[#64716c]">기준일</span>
                <strong className="text-[#8a5910]">아직 설정되지 않음</strong>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 xl:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">비자 여정</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">현재 단계</h2>
            </div>
            <span className="text-sm font-bold text-[#2d6d5d]">2단계 · 서류 준비</span>
          </div>

          <ol className="relative mt-7 grid gap-0 md:grid-cols-4" aria-label="비자 진행 단계 예시">
            {stages.map((stage, index) => {
              const done = stage.state === "done";
              const current = stage.state === "current";
              return (
                <li key={stage.label} className="relative flex min-h-[76px] gap-3 pb-4 last:pb-0 md:block md:min-h-0 md:pb-0 md:text-center">
                  {index < stages.length - 1 ? (
                    <span aria-hidden="true" className={`absolute left-[18px] top-9 h-[calc(100%-1rem)] w-0.5 md:left-1/2 md:top-[18px] md:h-0.5 md:w-full ${done ? "bg-[#2d6d5d]" : "bg-[#dce4df]"}`} />
                  ) : null}
                  <span className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 text-xs font-black md:mx-auto ${done ? "border-[#2d6d5d] bg-[#2d6d5d] text-white" : current ? "border-[#2d6d5d] bg-[#e5f1ec] text-[#245d4f]" : "border-[#dce4df] bg-white text-[#87908c]"}`}>
                    {done ? <Icon name="check" className="size-4" /> : index + 1}
                  </span>
                  <div className="pt-1 md:mt-3 md:pt-0">
                    <span className={`block text-sm font-extrabold ${current ? "text-[#205848]" : done ? "text-[#354b43]" : "text-[#7d8883]"}`}>{stage.label}</span>
                    <span className="mt-1 block text-xs text-[#8a938f]">{done ? "완료" : current ? "진행 중" : "예정"}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 rounded-2xl border border-[#dce8e2] bg-[#edf6f2] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="font-extrabold text-[#1d5748]">상대 일정은 자동으로 추정하지 않아요</p>
              <p className="mt-1 text-sm leading-6 text-[#5d7068]">기준일이 정해지면 캘린더에 직접 추가할 수 있습니다.</p>
            </div>
            <Link href="/calendar" className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-extrabold text-[#205848] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] sm:mt-0">
              일정 보기
              <Icon name="chevron-right" className="size-4" />
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 lg:col-span-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">다음 할 일</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">서류 준비 체크</h2>
            </div>
            <Icon name="document" className="size-6 text-[#2d6d5d]" />
          </div>
          <ul className="mt-5 divide-y divide-[#edf0ee]">
            {sampleTasks.map((task, index) => (
              <li key={task.label} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${index === 0 ? "bg-[#fff0cf] text-[#8a5910]" : "bg-[#edf2ef] text-[#65716c]"}`}>{index + 1}</span>
                <div className="min-w-0">
                  <p className="font-extrabold text-[#2a3c35]">{task.label}</p>
                  <p className="mt-1 text-sm text-[#76817c]">{task.meta}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="overflow-hidden rounded-[24px] bg-[#f1e8d7] lg:col-span-2">
          <div className="p-5 sm:p-7">
            <span className="grid size-11 place-items-center rounded-2xl bg-white text-[#2d6d5d] shadow-sm"><Icon name="map-pin" className="size-5" /></span>
            <p className="mt-5 text-xs font-extrabold tracking-[0.08em] text-[#76582d]">주변 기관</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#352d22]">도움받을 곳을 찾아보세요</h2>
            <p className="mt-2 text-sm leading-6 text-[#6f6454]">GPS는 저장하지 않으며, 위치를 허용하지 않아도 지역을 직접 선택할 수 있습니다.</p>
            <Link href="/map" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#352d22] px-4 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#352d22]">
              기관 지도 열기
              <Icon name="arrow-right" className="size-4" />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
