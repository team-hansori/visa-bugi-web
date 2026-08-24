import { type KakaoAddressDocument, mapKakaoDocument } from "@/lib/address/normalize";

const KAKAO_ENDPOINT = "https://dapi.kakao.com/v2/local/search/address.json";
const MIN_QUERY_LENGTH = 2;
const RESULT_SIZE = 10;

/**
 * Kakao Local API 주소 검색 프록시.
 *
 * REST 키를 브라우저에 노출하지 않기 위해 서버에서 대신 호출한다.
 * 키가 없거나 Kakao가 실패해도 throw하지 않고 빈 결과를 반환한다 —
 * 환경변수 없이도 빌드·기본 화면이 동작해야 한다는 AGENTS.md 요구사항 때문이다.
 */
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return Response.json({ documents: [] });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        documents: [],
        message: "주소 검색이 준비 중입니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 503 },
    );
  }

  const url = `${KAKAO_ENDPOINT}?query=${encodeURIComponent(query)}&size=${RESULT_SIZE}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      // 같은 검색어는 1시간 동안 캐시한다. 주소 데이터는 자주 바뀌지 않는다.
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return Response.json(
        {
          documents: [],
          message: "주소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as { documents?: KakaoAddressDocument[] };
    const documents = (payload.documents ?? [])
      .map(mapKakaoDocument)
      .filter((item) => item !== null);

    return Response.json({ documents });
  } catch {
    return Response.json(
      {
        documents: [],
        message: "주소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 502 },
    );
  }
}
