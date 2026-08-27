export type RegionId = "cheongju" | "chungju" | "jincheon" | "eumseong";

export type LatLng = { lat: number; lng: number };

export const REGION_CENTERS: Record<RegionId, LatLng> = {
  cheongju: { lat: 36.6424, lng: 127.489 },
  chungju: { lat: 36.991, lng: 127.9259 },
  jincheon: { lat: 36.8556, lng: 127.4356 },
  eumseong: { lat: 36.9397, lng: 127.69 },
};

const MARKER_OFFSETS: LatLng[] = [
  { lat: 0.004, lng: -0.003 },
  { lat: -0.003, lng: 0.005 },
  { lat: 0.002, lng: 0.004 },
];

export function getMarkerPosition(region: RegionId, offsetIndex: number): LatLng {
  const center = REGION_CENTERS[region];
  const offset = MARKER_OFFSETS[offsetIndex % MARKER_OFFSETS.length];
  return { lat: center.lat + offset.lat, lng: center.lng + offset.lng };
}
