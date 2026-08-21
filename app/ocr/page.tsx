import type { Metadata } from "next";
import { DocumentUpload } from "@/features/ocr/document-upload";

export const metadata: Metadata = { title: "서류 사전 점검" };

export default function OcrPage() {
  return <DocumentUpload />;
}
