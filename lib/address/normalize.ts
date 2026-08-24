/**
 * Kakao Local API의 `region_2depth_name`을 앱에서 쓰는 시·군 단위로 정규화한다.
 * 광역시·특별시의 자치구까지 포함된 경우("청주시 흥덕구") 시 단위만 남긴다.
 */
export function normalizeSigungu(regionDepth2: string): string {
  const trimmed = regionDepth2.trim();
  if (trimmed === "") return "";
  return trimmed.split(/\s+/)[0];
}

/** Kakao Local API 주소 검색 응답의 문서 1건. 필요한 필드만 선언한다. */
export type KakaoAddressDocument = {
  address_name: string;
  x: string;
  y: string;
  address: { address_name: string; region_2depth_name: string } | null;
  road_address: { address_name: string; region_2depth_name: string } | null;
};

/** 화면과 DB가 쓰는 주소 표현. */
export type AddressSuggestion = {
  roadAddress: string;
  jibunAddress: string;
  regionSigungu: string;
  lat: number;
  lng: number;
};

/** Kakao 문서를 앱 도메인 표현으로 바꾼다. 좌표가 없으면 null을 반환한다. */
export function mapKakaoDocument(
  doc: KakaoAddressDocument,
): AddressSuggestion | null {
  const lat = Number(doc.y);
  const lng = Number(doc.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (doc.x.trim() === "" || doc.y.trim() === "") return null;

  const jibunAddress = doc.address?.address_name ?? doc.address_name;
  const roadAddress = doc.road_address?.address_name ?? jibunAddress;
  const rawSigungu =
    doc.road_address?.region_2depth_name ??
    doc.address?.region_2depth_name ??
    "";

  return {
    roadAddress,
    jibunAddress,
    regionSigungu: normalizeSigungu(rawSigungu),
    lat,
    lng,
  };
}
