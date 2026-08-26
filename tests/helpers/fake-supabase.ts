import type { SupabaseClient } from "@supabase/supabase-js";

type Recorded = { table: string; filters: string[] };

/**
 * 체이너블 목: 필터는 문자열로 기록만 하고, 결과는 fixtures[table]을 그대로 반환한다.
 * supabase-js 빌더가 thenable인 점을 이용해 await 지점에서 종료한다.
 */
export function createFakeSupabase(fixtures: Record<string, unknown[]>) {
  const calls: Recorded[] = [];

  function from(table: string) {
    const filters: string[] = [];
    const builder = {
      select: () => builder,
      eq: (col: string, v: unknown) => {
        filters.push(`eq:${col}:${String(v)}`);
        return builder;
      },
      ilike: (col: string, v: unknown) => {
        filters.push(`ilike:${col}:${String(v)}`);
        return builder;
      },
      or: (expr: string) => {
        filters.push(`or:${expr}`);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      then: (resolve: (r: { data: unknown[]; error: null }) => unknown) => {
        calls.push({ table, filters });
        return Promise.resolve({ data: fixtures[table] ?? [], error: null }).then(resolve);
      },
    };
    return builder;
  }

  return { client: { from } as unknown as SupabaseClient, calls };
}
