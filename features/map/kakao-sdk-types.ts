export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoMapInstance {
  setCenter(latlng: KakaoLatLng): void;
}

export interface KakaoMarkerInstance {
  setMap(map: KakaoMapInstance | null): void;
}

export interface KakaoMapsNamespace {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMapInstance;
  Marker: new (options: { position: KakaoLatLng; map?: KakaoMapInstance }) => KakaoMarkerInstance;
  event: {
    addListener(target: KakaoMarkerInstance, type: string, handler: () => void): void;
  };
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsNamespace };
  }
}
