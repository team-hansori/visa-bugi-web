export type RegionId = "cheongju" | "chungju" | "jincheon" | "eumseong";

export type LatLng = { lat: number; lng: number };

export const REGION_CENTERS: Record<RegionId, LatLng> = {
  cheongju: { lat: 36.6424, lng: 127.489 },
  chungju: { lat: 36.991, lng: 127.9259 },
  jincheon: { lat: 36.8556, lng: 127.4356 },
  eumseong: { lat: 36.9397, lng: 127.69 },
};
