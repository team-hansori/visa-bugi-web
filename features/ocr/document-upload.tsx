"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

const maxFileSize = 10 * 1024 * 1024;
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);

export function DocumentUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("JPG, PNG 또는 HEIC/HEIF 이미지 한 장을 선택해 주세요.");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!acceptedImageTypes.has(selectedFile.type)) {
      setMessage("JPG, PNG 또는 HEIC/HEIF 이미지만 선택할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > maxFileSize) {
      setMessage("파일 크기는 10MB 이하여야 합니다.");
      event.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setMessage("사진이 이 기기에서만 미리보기로 열렸습니다. 서버에는 전송되지 않았습니다.");
  }

  function removeFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setMessage("사진을 삭제했습니다. 다른 이미지를 선택할 수 있습니다.");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">개인정보를 저장하지 않는 흐름</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">서류 사진 사전 점검</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7974] sm:text-base">사진 촬영과 미리보기 화면을 먼저 확인할 수 있습니다. OCR 분석과 자동 마스킹은 아직 연결되지 않았습니다.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <section className="rounded-[28px] border border-[#e0e7e2] bg-white p-4 shadow-[0_12px_36px_rgba(52,76,65,0.07)] sm:p-6" aria-labelledby="upload-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">1단계</p>
              <h2 id="upload-title" className="mt-1 text-xl font-black tracking-[-0.035em]">서류 사진 선택</h2>
            </div>
            <span className="rounded-full bg-[#fff0d4] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#8a5910]">미리보기만 제공</span>
          </div>

          <div className="mt-5">
            {previewUrl && file ? (
              <div className="relative min-h-[360px] overflow-hidden rounded-[22px] bg-[#e9eeeb] sm:min-h-[500px]">
                <Image src={previewUrl} alt={`선택한 서류 이미지 ${file.name}`} fill unoptimized className="object-contain p-3 sm:p-5" />
                <button type="button" onClick={removeFile} className="absolute right-3 top-3 z-10 min-h-11 rounded-xl bg-[#27342f]/90 px-4 text-xs font-extrabold text-white shadow-lg backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">사진 삭제</button>
              </div>
            ) : (
              <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#b9cbc2] bg-[#f7faf8] px-6 text-center transition-colors hover:border-[#2d6d5d] hover:bg-[#f0f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] sm:min-h-[500px]">
                <span className="grid size-16 place-items-center rounded-[22px] bg-[#e5f1ec] text-[#2d6d5d]"><Icon name="camera" className="size-8" /></span>
                <strong className="mt-5 text-lg font-black text-[#294038]">사진을 촬영하거나 선택하세요</strong>
                <span className="mt-2 max-w-sm text-sm leading-6 text-[#71807a]">문서 전체가 보이고 글자가 흔들리지 않은 사진이 좋아요.</span>
                <span className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-[#255e4f] shadow-sm"><Icon name="upload" className="size-4" />이미지 선택</span>
              </button>
            )}
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif" capture="environment" onChange={chooseFile} className="sr-only" aria-label="서류 사진 선택" />
            <p className="mt-3 text-sm leading-6 text-[#6c7a74]" aria-live="polite">{message}</p>
          </div>

          {file ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#d8e1dc] bg-white px-4 text-sm font-extrabold text-[#41564d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"><Icon name="camera" className="size-4" />다른 사진 선택</button>
              <button type="button" disabled className="inline-flex min-h-12 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#c9d2ce] px-4 text-sm font-extrabold text-white"><Icon name="check" className="size-4" />OCR 연결 후 점검 가능</button>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[24px] bg-[#173f36] p-5 text-white sm:p-6">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/12 text-[#cce8dd]"><Icon name="shield" className="size-5" /></span>
            <h2 className="mt-4 text-xl font-black tracking-[-0.035em]">사진 처리 원칙</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#d3e2dc]">
              <li className="flex gap-2"><Icon name="check" className="mt-1 size-4 shrink-0 text-[#ffca68]" />현재 미리보기는 서버로 전송하지 않음</li>
              <li className="flex gap-2"><Icon name="check" className="mt-1 size-4 shrink-0 text-[#ffca68]" />화면을 닫으면 미리보기 URL 폐기</li>
              <li className="flex gap-2"><Icon name="check" className="mt-1 size-4 shrink-0 text-[#ffca68]" />OCR 연결 시 민감정보 마스킹 우선 적용</li>
            </ul>
          </section>
          <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 sm:p-6">
            <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">촬영 도움말</p>
            <ol className="mt-4 space-y-4">
              {["문서의 네 모서리가 모두 보이게 촬영하세요.", "빛 반사와 그림자를 피해 글자를 선명하게 찍으세요.", "주민등록번호 등 불필요한 정보는 가린 뒤 촬영하세요."].map((tip, index) => (
                <li key={tip} className="flex gap-3 text-sm leading-6 text-[#5f6d67]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#edf3ef] text-xs font-black text-[#2d6d5d]">{index + 1}</span><span>{tip}</span></li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
