"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/ensure-anonymous-session";
import {
  type ClientImageIssue,
  inspectApplicationFormImage,
} from "./image-quality";
import { OcrHelpChat } from "./ocr-help-chat";
import { ChatLauncher } from "@/features/chat/chat-launcher";
import type {
  ApplicationFormAnalysis,
  ApplicationFormCatalog,
  ApplicationFormOption,
  FormFieldKind,
  FormFieldOwner,
  FormReviewStatus,
  ImageQuality,
  OcrApiError,
  ReviewedFormField,
  SaveOcrResultRequest,
  SaveOcrResultResponse,
} from "./types";

const maxUploadFileSize = 4 * 1024 * 1024;
const maxSourceFileSize = 16 * 1024 * 1024;
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const attachmentAccept = [
  "image/jpeg",
  "image/png",
  "image/webp",
  ".pdf",
  "application/pdf",
  ".hwpx",
  "application/vnd.hancom.hwpx",
  "application/haansofthwpx",
].join(",");

type DocumentUploadProps = {
  forms: ApplicationFormOption[];
  catalogSource: ApplicationFormCatalog["source"];
};

function groupForms(forms: ApplicationFormOption[]) {
  const groups = new Map<
    string,
    { key: string; label: string; forms: ApplicationFormOption[] }
  >();

  for (const form of forms) {
    const key = `${form.visaCode}:${form.visaNameKr}`;
    const group = groups.get(key) ?? {
      key,
      label: `${form.visaCode} · ${form.visaNameKr}`,
      forms: [],
    };
    group.forms.push(form);
    groups.set(key, group);
  }

  return [...groups.values()];
}

export function DocumentUpload({ forms, catalogSource }: DocumentUploadProps) {
  const t = useTranslations("Ocr");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState("auto");
  const [analysis, setAnalysis] = useState<ApplicationFormAnalysis | null>(null);
  const [message, setMessage] = useState(t("upload.types"));
  const [photoIssue, setPhotoIssue] = useState<ClientImageIssue | null>(null);
  const [error, setError] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selectedFile = input.files?.[0];
    if (!selectedFile) return;

    setPhotoIssue(null);
    setError("");
    setSaveState("idle");
    setSaveError("");

    const imageFile = acceptedImageTypes.has(selectedFile.type);
    const pdfFile = isPdfFile(selectedFile);
    const hwpxFile = isHwpxFile(selectedFile);
    if (!imageFile && !pdfFile && !hwpxFile) {
      setMessage(t("errors.fileType"));
      input.value = "";
      return;
    }

    if (selectedFile.size > maxSourceFileSize) {
      setMessage(t("errors.fileSize"));
      input.value = "";
      return;
    }

    try {
      setIsPreparing(true);
      if (pdfFile || hwpxFile) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(selectedFile);
        setPreviewUrl(null);
        setAnalysis(null);
        setPhotoIssue(null);
        setMessage(
          t(pdfFile ? "upload.pdfReady" : "upload.hwpxReady", {
            name: selectedFile.name,
          }),
        );
        return;
      }

      const shouldOptimize = selectedFile.size > maxUploadFileSize;
      setMessage(
        shouldOptimize ? t("upload.optimizing") : t("upload.checking"),
      );
      const uploadFile = shouldOptimize
        ? await optimizeImageForUpload(selectedFile)
        : selectedFile;
      if (shouldOptimize) setMessage(t("upload.checking"));

      const inspection = await inspectApplicationFormImage(uploadFile);
      if (!inspection.accepted) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(null);
        setPreviewUrl(null);
        setAnalysis(null);
        setPhotoIssue(inspection.issue);
        setMessage(t("upload.retakeHint"));
        input.value = "";
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(uploadFile);
      setPreviewUrl(URL.createObjectURL(uploadFile));
      setAnalysis(null);
      setError("");
      setPhotoIssue(null);
      setMessage(
        shouldOptimize
          ? t("upload.optimized", { name: selectedFile.name })
          : t("upload.ready", { name: selectedFile.name }),
      );
    } catch {
      input.value = "";
      setMessage(t("errors.optimize"));
    } finally {
      setIsPreparing(false);
    }
  }

  function openFileInput(input: HTMLInputElement | null) {
    if (!input) return;
    input.value = "";
    input.click();
  }

  function openCamera() {
    openFileInput(cameraInputRef.current);
  }

  function openGallery() {
    openFileInput(galleryInputRef.current);
  }

  function removeFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setAnalysis(null);
    setError("");
    setPhotoIssue(null);
    setSaveState("idle");
    setSaveError("");
    setMessage(t("upload.removed"));
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  function retakePhoto() {
    removeFile();
    openCamera();
  }

  async function analyzeFile() {
    if (!file || isAnalyzing) return;

    setIsAnalyzing(true);
    setError("");
    setAnalysis(null);
    setSaveState("idle");
    setSaveError("");

    try {
      const selectedForm = forms.find(
        (form) => form.documentRequirementId === selectedFormId,
      );
      const formData = new FormData();
      formData.set("file", file);
      formData.set("templateKey", selectedForm?.templateKey ?? "auto");
      formData.set("documentName", selectedForm?.documentName ?? "");
      formData.set("visaCode", selectedForm?.visaCode ?? "");
      formData.set("allowDemo", "true");

      const response = await fetch("/api/ocr/application-form", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as ApplicationFormAnalysis | OcrApiError;

      if (!response.ok || "error" in body) {
        throw new Error(
          "error" in body ? apiErrorMessage(body.code, t) : t("errors.generic"),
        );
      }

      setAnalysis(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function saveAnalysisResult() {
    if (!analysis || analysis.mode !== "live" || saveState === "saving") return;

    const requiredMissingCount = analysis.fields.filter(
      (field) => field.required && field.status === "missing",
    ).length;
    if (requiredMissingCount > 0) {
      setSaveError(t("save.requiredMissing", { count: requiredMissingCount }));
      return;
    }

    setSaveState("saving");
    setSaveError("");

    try {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ) {
        throw new Error(t("save.notConfigured"));
      }

      const supabase = createClient();
      const user = await ensureAnonymousSession(supabase);
      if (!user) throw new Error(t("save.sessionError"));

      const payload: SaveOcrResultRequest = {
        documentRequirementId:
          selectedFormId === "auto" || !isUuid(selectedFormId)
            ? null
            : selectedFormId,
        sourceKind: getSourceKind(file),
        analysis: {
          mode: analysis.mode,
          templateKey: analysis.templateKey,
          documentTitle: analysis.documentTitle,
          visaCode: analysis.visaCode,
          pageNumber: analysis.pageNumber,
          imageQuality: analysis.imageQuality,
          warnings: analysis.warnings,
          fields: analysis.fields.map((field) => ({
            fieldIdentifier: field.fieldIdentifier,
            status: field.status,
            confidence: field.confidence,
            required: field.required,
          })),
        },
      };
      const response = await fetch("/api/ocr/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as SaveOcrResultResponse | OcrApiError;
      if (!response.ok || "error" in body) {
        throw new Error(
          "error" in body
            ? saveApiErrorMessage(body.code, t)
            : t("save.error"),
        );
      }

      setSaveState("saved");
    } catch (caught) {
      setSaveState("idle");
      setSaveError(caught instanceof Error ? caught.message : t("save.error"));
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("eyebrow")}</p>
          <span className="rounded-full bg-[#edf3ef] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#3d6256]">
            {catalogSource === "supabase_v2" ? t("catalog.supabase") : t("catalog.builtIn")}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6d7974] sm:text-base">{t("description")}</p>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-[#72807a]">{t("languageNotice")}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-[28px] border border-[#e0e7e2] bg-white p-4 shadow-[0_12px_36px_rgba(52,76,65,0.07)] sm:p-6" aria-labelledby="upload-title">
          <div>
            <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("upload.step")}</p>
            <h2 id="upload-title" className="mt-1 text-xl font-black tracking-[-0.035em]">{t("upload.title")}</h2>
          </div>

          <label className="mt-5 block text-sm font-extrabold text-[#40554c]" htmlFor="form-template">
            {t("form.label")}
          </label>
          <select
            id="form-template"
            value={selectedFormId}
            onChange={(event) => {
              setSelectedFormId(event.target.value);
              setAnalysis(null);
              setSaveState("idle");
              setSaveError("");
            }}
            className="mt-2 min-h-12 w-full rounded-2xl border border-[#cfdad4] bg-white px-4 text-sm font-bold text-[#31463d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          >
            <option value="auto">{t("form.auto")}</option>
            {groupForms(forms).map((group) => (
              <optgroup key={group.key} label={group.label}>
                {group.forms.map((form) => (
                  <option key={form.documentRequirementId} value={form.documentRequirementId}>
                    {form.documentName}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-[#71807a]">
            {t("form.count", { count: forms.length })} {t("form.hint")}
          </p>

          <div className="mt-5">
            {file ? (
              previewUrl ? (
                <div className="relative min-h-[360px] overflow-hidden rounded-[22px] bg-[#e9eeeb] sm:min-h-[500px]">
                  <Image src={previewUrl} alt={t("upload.previewAlt", { name: file.name })} fill unoptimized className="object-contain p-3 sm:p-5" />
                  <button type="button" onClick={removeFile} className="absolute right-3 top-3 z-10 min-h-11 rounded-xl bg-[#27342f]/90 px-4 text-xs font-extrabold text-white shadow-lg backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    {t("upload.remove")}
                  </button>
                </div>
              ) : (
                <div className="relative flex min-h-[260px] flex-col items-center justify-center rounded-[22px] border border-[#cddbd4] bg-[#f3f8f5] px-6 text-center sm:min-h-[320px]">
                  <span className="grid size-16 place-items-center rounded-[22px] bg-white text-[#2d6d5d] shadow-sm"><Icon name="document" className="size-8" /></span>
                  <strong className="mt-5 max-w-xl break-all text-base font-black text-[#294038]">{file.name}</strong>
                  <span className="mt-2 rounded-full bg-[#dcece5] px-3 py-1 text-xs font-extrabold text-[#2d6d5d]">{isPdfFile(file) ? "PDF" : "HWPX"}</span>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-[#66756e]">
                    {t(isPdfFile(file) ? "upload.pdfDescription" : "upload.hwpxDescription")}
                  </p>
                  <button type="button" onClick={removeFile} className="absolute right-3 top-3 min-h-11 rounded-xl bg-[#27342f] px-4 text-xs font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    {t("upload.remove")}
                  </button>
                </div>
              )
            ) : (
              <div className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#b9cbc2] bg-[#f7faf8] px-6 text-center sm:min-h-[500px]">
                <span className="grid size-16 place-items-center rounded-[22px] bg-[#e5f1ec] text-[#2d6d5d]"><Icon name="camera" className="size-8" /></span>
                <strong className="mt-5 text-lg font-black text-[#294038]">{t("upload.chooseTitle")}</strong>
                <span className="mt-2 max-w-sm text-sm leading-6 text-[#71807a]">{t("upload.chooseDescription")}</span>
                <div className="mt-5 grid w-full max-w-md gap-3 sm:grid-cols-2">
                  <button type="button" onClick={openCamera} disabled={isPreparing} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#266452] px-4 text-sm font-extrabold text-white transition-colors hover:bg-[#1f5546] disabled:cursor-wait disabled:bg-[#91aaa1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"><Icon name="camera" className="size-5" />{t("upload.capture")}</button>
                  <button type="button" onClick={openGallery} disabled={isPreparing} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#cddbd4] bg-white px-4 text-sm font-extrabold text-[#255e4f] transition-colors hover:bg-[#edf5f1] disabled:cursor-wait disabled:text-[#91aaa1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"><Icon name="upload" className="size-5" />{t("upload.select")}</button>
                </div>
              </div>
            )}
            <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={chooseFile} className="sr-only" aria-label={t("upload.cameraInputLabel")} />
            <input ref={galleryInputRef} type="file" accept={attachmentAccept} onChange={chooseFile} className="sr-only" aria-label={t("upload.galleryInputLabel")} />
            <p className="mt-3 text-sm leading-6 text-[#6c7a74]" aria-live="polite">{message}</p>
          </div>

          {photoIssue ? (
            <div role="alert" className="mt-4 rounded-2xl border border-[#f0c7bf] bg-[#fff0ed] p-4 text-[#8b392f]">
              <p className="font-black">{t("imageCheck.title")}</p>
              <p className="mt-1 text-sm font-bold leading-6">{t(`imageCheck.${photoIssue}`)}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={openCamera} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#8f3e34] px-4 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f3e34]"><Icon name="camera" className="size-4" />{t("upload.capture")}</button>
                <button type="button" onClick={openGallery} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d7a9a1] bg-white px-4 text-sm font-extrabold text-[#824037] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f3e34]"><Icon name="upload" className="size-4" />{t("upload.select")}</button>
              </div>
            </div>
          ) : null}

          {file ? (
            <div className={`mt-5 grid gap-3 ${isDocumentFile(file) ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {!isDocumentFile(file) ? (
                <button type="button" onClick={openCamera} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#d8e1dc] bg-white px-4 text-sm font-extrabold text-[#41564d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"><Icon name="camera" className="size-4" />{t("upload.retake")}</button>
              ) : null}
              <button type="button" onClick={openGallery} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#d8e1dc] bg-white px-4 text-sm font-extrabold text-[#41564d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"><Icon name="upload" className="size-4" />{t("upload.replace")}</button>
              <button
                type="button"
                onClick={analyzeFile}
                disabled={isAnalyzing}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#266452] px-4 text-sm font-extrabold text-white transition-colors hover:bg-[#1f5546] disabled:cursor-wait disabled:bg-[#91aaa1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
              >
                <Icon name={isAnalyzing ? "clock" : "check"} className="size-4" />
                {isAnalyzing ? t("actions.analyzing") : t("actions.analyze")}
              </button>
            </div>
          ) : null}

          {error ? <p role="alert" className="mt-4 rounded-2xl bg-[#fff0ed] px-4 py-3 text-sm font-bold leading-6 text-[#9a3f33]">{error}</p> : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[24px] bg-[#173f36] p-5 text-white sm:p-6">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/12 text-[#cce8dd]"><Icon name="shield" className="size-5" /></span>
            <h2 className="mt-4 text-xl font-black tracking-[-0.035em]">{t("privacy.title")}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#d3e2dc]">
              {[t("privacy.temporary"), t("privacy.noDatabase"), t("privacy.reviewFirst")].map((item) => (
                <li key={item} className="flex gap-2"><Icon name="check" className="mt-1 size-4 shrink-0 text-[#ffca68]" />{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 sm:p-6">
            <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("tips.eyebrow")}</p>
            <ol className="mt-4 space-y-4">
              {[t("tips.edges"), t("tips.light"), t("tips.onePage")].map((tip, index) => (
                <li key={tip} className="flex gap-3 text-sm leading-6 text-[#5f6d67]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#edf3ef] text-xs font-black text-[#2d6d5d]">{index + 1}</span><span>{tip}</span></li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {analysis ? (
        <AnalysisResult
          analysis={analysis}
          onRetake={retakePhoto}
          allowRetake={!file || !isDocumentFile(file)}
          onSave={saveAnalysisResult}
          saveState={saveState}
          saveError={saveError}
        />
      ) : null}
      <ChatLauncher surface="ocr" />
    </div>
  );
}

function AnalysisResult({
  analysis,
  onRetake,
  allowRetake,
  onSave,
  saveState,
  saveError,
}: {
  analysis: ApplicationFormAnalysis;
  onRetake: () => void;
  allowRetake: boolean;
  onSave: () => void;
  saveState: "idle" | "saving" | "saved";
  saveError: string;
}) {
  const t = useTranslations("Ocr");
  const [chatOpen, setChatOpen] = useState(false);
  const requiredMissingCount = analysis.fields.filter(
    (field) => field.required && field.status === "missing",
  ).length;
  const summaryCards = [
    { key: "complete", value: analysis.summary.complete, tone: "bg-[#e8f4ee] text-[#27624f]" },
    { key: "review", value: analysis.summary.review, tone: "bg-[#fff2d9] text-[#80520d]" },
    { key: "missing", value: analysis.summary.missing, tone: "bg-[#fff0ed] text-[#923c32]" },
    { key: "manual", value: analysis.summary.manual, tone: "bg-[#edf0f7] text-[#4f5876]" },
  ] as const;
  const shouldRetake =
    allowRetake &&
    (analysis.imageQuality !== "clear" ||
      analysis.warnings.some((warning) =>
        [
          "FORM_NOT_CONFIRMED",
          "FORM_MISMATCH",
          "IMAGE_BLURRED",
          "IMAGE_CROPPED",
          "IMAGE_GLARE",
        ].includes(warning),
      ));

  function openChat() {
    setChatOpen(true);
    window.setTimeout(() => {
      document.getElementById("ocr-help-chat")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  return (
    <section className="rounded-[28px] border border-[#dce5e0] bg-white p-4 shadow-[0_12px_36px_rgba(52,76,65,0.07)] sm:p-6" aria-labelledby="analysis-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("result.eyebrow")}</p>
          <h2 id="analysis-title" className="mt-1 text-2xl font-black tracking-[-0.04em]">{t("result.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-[#66756f]">{analysis.visaCode} · {analysis.documentTitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {analysis.mode === "demo" ? (
            <span className="w-fit rounded-full bg-[#fff0d4] px-3 py-1.5 text-xs font-extrabold text-[#82530c]">
              {t("result.demo")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={openChat}
            aria-expanded={chatOpen}
            aria-controls="ocr-help-chat"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#bfd4ca] bg-[#f0f8f4] px-3.5 text-xs font-extrabold text-[#266452] hover:bg-[#e5f2ec] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          >
            <Icon name="message-circle" className="size-4" />
            {t("chat.open")}
          </button>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.key} className={`rounded-2xl p-4 ${card.tone}`}>
            <dt className="text-xs font-extrabold">{t(`summary.${card.key}`)}</dt>
            <dd className="mt-1 text-2xl font-black">{card.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#596b63]">
        <span className="rounded-full bg-[#f1f4f2] px-3 py-1.5">{t("result.page")}: {analysis.pageNumber ?? "-"}</span>
        <span className="rounded-full bg-[#f1f4f2] px-3 py-1.5">{t("result.imageQuality")}: {imageQualityLabel(analysis.imageQuality, t)}</span>
      </div>

      {analysis.warnings.length ? (
        <div className="mt-5 space-y-2" aria-live="polite">
          {analysis.warnings.map((warning) => (
            <p key={warning} className="rounded-2xl bg-[#fff6e6] px-4 py-3 text-sm font-bold leading-6 text-[#79501a]">
              {warningLabel(warning, t)}
            </p>
          ))}
        </div>
      ) : null}

      {shouldRetake ? (
        <div role="alert" className="mt-5 flex flex-col gap-4 rounded-2xl border border-[#efc2ba] bg-[#fff0ed] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-[#8a382f]">{t("retake.title")}</p>
            <p className="mt-1 text-sm font-bold leading-6 text-[#985148]">{t("retake.description")}</p>
          </div>
          <button type="button" onClick={onRetake} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#8f3e34] px-4 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f3e34]"><Icon name="camera" className="size-4" />{t("retake.action")}</button>
        </div>
      ) : null}

      {chatOpen ? (
        <OcrHelpChat
          analysis={analysis}
          selectedField={null}
          onClose={() => setChatOpen(false)}
        />
      ) : null}

      <div className={`mt-5 rounded-2xl border p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 ${requiredMissingCount > 0 ? "border-[#efc2ba] bg-[#fff3f0]" : "border-[#d7e4de] bg-[#f1f7f4]"}`}>
        <div>
          <p className={`font-black ${requiredMissingCount > 0 ? "text-[#8a382f]" : "text-[#245c4d]"}`}>{t("save.title")}</p>
          <p className={`mt-1 text-sm leading-6 ${requiredMissingCount > 0 ? "font-bold text-[#985148]" : "text-[#5e7169]"}`}>
            {analysis.mode === "live"
              ? requiredMissingCount > 0
                ? t("save.requiredMissing", { count: requiredMissingCount })
                : t("save.description")
              : t("save.demoDescription")}
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={
            analysis.mode !== "live" ||
            requiredMissingCount > 0 ||
            saveState !== "idle"
          }
          className="mt-3 inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#266452] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#9cafA7] sm:mt-0 sm:w-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        >
          <Icon name={saveState === "saving" ? "clock" : "check"} className="size-4" />
          {saveState === "saving"
            ? t("save.saving")
            : saveState === "saved"
              ? t("save.saved")
              : requiredMissingCount > 0
                ? t("save.blocked")
                : t("save.action")}
        </button>
      </div>
      {saveError ? (
        <p role="alert" className="mt-3 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-bold leading-6 text-[#9a3f33]">
          {saveError}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {analysis.fields.map((field) => (
          <FieldReviewCard key={field.fieldIdentifier} field={field} />
        ))}
      </div>
    </section>
  );
}

function FieldReviewCard({ field }: { field: ReviewedFormField }) {
  const t = useTranslations("Ocr");

  return (
    <article className="rounded-[20px] border border-[#e1e8e4] bg-[#fbfcfb] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black tracking-[-0.02em] text-[#293b34]">{field.labelKr}</h3>
          <p className="mt-1 text-xs font-bold text-[#718079]">
            {ownerLabel(field.filledBy, t)}
            {!field.required ? ` · ${t("field.optional")}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${statusTone(field.status)}`}>
            {statusLabel(field.status, t)}
          </span>
          {field.required ? (
            <span className="rounded-full bg-[#913a30] px-3 py-1.5 text-xs font-black text-white shadow-sm">
              {t("field.required")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white px-3.5 py-3 text-sm font-bold text-[#3f514a] ring-1 ring-[#e3e9e6]">
        {field.rawValue || <span className="font-medium text-[#929d98]">{t("field.empty")}</span>}
      </div>

      <p className="mt-3 text-sm leading-6 text-[#627069]">
        {field.manualOnly ? t("guide.manual") : kindGuide(field.kind, t)}
        {field.example ? ` ${t("field.example", { value: field.example })}` : ""}
      </p>
      {field.status === "review" ? <p className="mt-2 text-xs font-extrabold text-[#895b13]">{t("field.lowConfidence", { percent: Math.round(field.confidence * 100) })}</p> : null}
    </article>
  );
}

type Translator = ReturnType<typeof useTranslations<"Ocr">>;

function ownerLabel(owner: FormFieldOwner, t: Translator) {
  const labels: Record<FormFieldOwner, string> = {
    APPLICANT: t("owner.applicant"),
    EMPLOYER: t("owner.employer"),
    SCHOOL: t("owner.school"),
    OFFICIAL: t("owner.official"),
    SIGNER: t("owner.signer"),
  };
  return labels[owner];
}

function kindGuide(kind: FormFieldKind, t: Translator) {
  const guides: Record<FormFieldKind, string> = {
    text: t("guide.text"),
    date: t("guide.date"),
    number: t("guide.number"),
    choice: t("guide.choice"),
    checkbox: t("guide.checkbox"),
    address: t("guide.address"),
    identifier: t("guide.identifier"),
    signature: t("guide.manual"),
  };
  return guides[kind];
}

function statusLabel(status: FormReviewStatus, t: Translator) {
  const labels: Record<FormReviewStatus, string> = {
    complete: t("status.complete"),
    review: t("status.review"),
    missing: t("status.missing"),
    manual: t("status.manual"),
    optional: t("status.optional"),
  };
  return labels[status];
}

function statusTone(status: FormReviewStatus) {
  const tones: Record<FormReviewStatus, string> = {
    complete: "bg-[#dff0e8] text-[#28604f]",
    review: "bg-[#ffedc7] text-[#80500b]",
    missing: "bg-[#ffe3de] text-[#913a30]",
    manual: "bg-[#e7eaf3] text-[#4d5674]",
    optional: "bg-[#edf1ef] text-[#67756f]",
  };
  return tones[status];
}

function imageQualityLabel(quality: ImageQuality, t: Translator) {
  const labels: Record<ImageQuality, string> = {
    clear: t("quality.clear"),
    blurred: t("quality.blurred"),
    cropped: t("quality.cropped"),
    glare: t("quality.glare"),
    unknown: t("quality.unknown"),
  };
  return labels[quality];
}

function warningLabel(warning: string, t: Translator) {
  const labels: Record<string, string> = {
    FORM_NOT_CONFIRMED: t("warnings.formNotConfirmed"),
    FORM_MISMATCH: t("warnings.formMismatch"),
    IMAGE_BLURRED: t("warnings.imageBlurred"),
    IMAGE_CROPPED: t("warnings.imageCropped"),
    IMAGE_GLARE: t("warnings.imageGlare"),
    HANDWRITING_UNCLEAR: t("warnings.handwritingUnclear"),
    MULTIPLE_PAGES_REQUIRED: t("warnings.multiplePages"),
    DEMO_DATA: t("warnings.demoData"),
  };
  return labels[warning] ?? t("warnings.unknown");
}

function apiErrorMessage(code: string, t: Translator) {
  if (code === "UNSUPPORTED_FILE_TYPE") return t("errors.fileType");
  if (code === "FILE_TOO_LARGE") return t("errors.fileSize");
  if (code === "INVALID_HWPX") return t("errors.hwpx");
  if (code === "INVALID_PDF") return t("errors.pdf");
  if (code === "TOO_MANY_REQUESTS") return t("errors.rateLimit");
  return t("errors.generic");
}

function saveApiErrorMessage(code: string, t: Translator) {
  if (code === "STORAGE_NOT_CONFIGURED") return t("save.notConfigured");
  if (code === "AUTH_REQUIRED") return t("save.sessionError");
  if (code === "REQUIRED_FIELDS_MISSING") return t("save.requiredMissingServer");
  return t("save.error");
}

function isHwpxFile(file: File) {
  return file.name.toLocaleLowerCase().endsWith(".hwpx");
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLocaleLowerCase().endsWith(".pdf");
}

function isDocumentFile(file: File) {
  return isPdfFile(file) || isHwpxFile(file);
}

function getSourceKind(file: File | null): SaveOcrResultRequest["sourceKind"] {
  if (file && isPdfFile(file)) return "pdf";
  if (file && isHwpxFile(file)) return "hwpx";
  return "image";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function optimizeImageForUpload(source: File) {
  const bitmap = await createImageBitmap(source);

  try {
    for (const maxDimension of [2400, 2000, 1600]) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.86, 0.72, 0.58]) {
        const blob = await canvasToBlob(canvas, quality);
        if (blob.size <= maxUploadFileSize) {
          const fileName = source.name.replace(/\.[^.]+$/, "") || "application-form";
          return new File([blob], `${fileName}-ocr.jpg`, {
            type: "image/jpeg",
            lastModified: source.lastModified,
          });
        }
      }
    }
  } finally {
    bitmap.close();
  }

  throw new Error("Image could not be optimized");
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image conversion failed"))),
      "image/jpeg",
      quality,
    );
  });
}
