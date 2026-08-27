"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { KakaoMapInstance, KakaoMarkerInstance } from "@/features/map/kakao-sdk-types";
import type { LatLng } from "@/features/map/geo";

export type KakaoMapMarker = {
  id: number;
  position: LatLng;
};

type KakaoMapProps = {
  center: LatLng;
  markers: KakaoMapMarker[];
  onSelectMarker: (id: number) => void;
};

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? "";

export function KakaoMap({ center, markers, onSelectMarker }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markerRefs = useRef<KakaoMarkerInstance[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!sdkReady || !containerRef.current) return;
    const kakao = window.kakao;
    if (!kakao) return;

    let cancelled = false;
    kakao.maps.load(() => {
      const container = containerRef.current;
      if (cancelled || !container) return;
      mapRef.current = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level: 6,
      });
      setMapReady(true);
    });

    return () => {
      cancelled = true;
    };
    // Initial creation only depends on the SDK becoming ready;
    // re-centering on prop changes is handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady]);

  useEffect(() => {
    const kakao = window.kakao;
    if (!kakao || !mapRef.current) return;
    mapRef.current.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
  }, [center.lat, center.lng, mapReady]);

  useEffect(() => {
    const kakao = window.kakao;
    if (!kakao || !mapRef.current) return;
    const map = mapRef.current;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = markers.map((markerData) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(markerData.position.lat, markerData.position.lng),
        map,
      });
      kakao.maps.event.addListener(marker, "click", () => onSelectMarker(markerData.id));
      return marker;
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
    };
  }, [markers, onSelectMarker, mapReady]);

  if (!KAKAO_APP_KEY) {
    return (
      <div className="grid h-full w-full place-items-center p-6 text-center text-sm font-bold text-[#5e6d67]">
        지도 키가 설정되지 않아 지도를 표시할 수 없습니다. 아래 목록에서 기관을 선택해 주세요.
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`}
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />
      <div ref={containerRef} className="absolute inset-0" />
    </>
  );
}
