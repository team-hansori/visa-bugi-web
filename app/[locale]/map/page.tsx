import type { Metadata } from "next";
import { AgencyMapDemo } from "@/features/map/agency-map-demo";

export const metadata: Metadata = { title: "주변 기관" };

export default function MapPage() {
  return <AgencyMapDemo />;
}
