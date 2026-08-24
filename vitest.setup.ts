import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// RTL의 자동 cleanup은 전역 `afterEach`를 감지해 등록되는데, 이 프로젝트는
// vitest globals를 켜지 않아 감지되지 않는다. 한 테스트 파일 안에서 render()를
// 여러 번 호출하면 이전 렌더링 DOM이 쌓여 쿼리가 중복 매치되므로 직접 등록한다.
afterEach(() => {
  cleanup();
});
