import type { Metadata } from "next";
import { AgencyMap } from "@/features/map/agency-map";

export const metadata: Metadata = { title: "주변 기관" };

export default function MapPage() {
  return <AgencyMap />;
}
