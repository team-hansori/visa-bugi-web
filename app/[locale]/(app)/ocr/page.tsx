import type { Metadata } from "next";
import { DocumentUpload } from "@/features/ocr/document-upload";
import { getApplicationFormCatalog } from "@/features/ocr/visa-data";

export const metadata: Metadata = { title: "서류 사전 점검" };

export default async function OcrPage() {
  const catalog = await getApplicationFormCatalog();

  return <DocumentUpload forms={catalog.forms} />;
}
