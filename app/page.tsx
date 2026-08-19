export default function Home() {
  return (
    <main className="min-h-screen bg-[#fffaf2] px-6 py-12 text-[#263238] sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffcc66] text-2xl shadow-sm">
              🐢
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">비자부기</p>
              <p className="text-sm text-[#6b777c]">내 비자 여정의 동반자</p>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#6b777c] shadow-sm">
            준비 중
          </span>
        </header>

        <section className="rounded-3xl bg-[#fff0c7] p-8 shadow-sm sm:p-12">
          <p className="mb-4 text-sm font-semibold text-[#a05a00]">충북살이 서비스</p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            내 비자 요건과
            <br />
            다음 단계를 한눈에
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#58656a]">
            공식 요건을 바탕으로 현재 진행상황을 확인하고, 준비해야 할 서류와
            기한을 놓치지 않도록 도와드려요.
          </p>
          <button className="mt-8 rounded-full bg-[#263238] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#405158]">
            내 여정 시작하기
          </button>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-[#a05a00]">핵심 기능</p>
              <h2 className="mt-1 text-2xl font-bold">지금 준비할 것부터 알려드려요</h2>
            </div>
            <span className="hidden text-sm text-[#6b777c] sm:block">MVP 화면</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["📋", "비자 요건 확인", "내 정보와 공식 요건을 비교해요"],
              ["📅", "일정 추적", "신청 기한과 다음 단계를 관리해요"],
              ["🗺️", "기관 안내", "필요한 기관을 가까운 순서로 찾아요"],
            ].map(([icon, title, description]) => (
              <article key={title} className="rounded-2xl bg-white p-5 shadow-sm">
                <span className="text-2xl">{icon}</span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6b777c]">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      </main>
  );
}
