"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AddressSuggestion } from "@/lib/address/normalize";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

type Props = {
  value: AddressSuggestion | null;
  onSelect: (suggestion: AddressSuggestion) => void;
  label: string;
};

export function AddressSearchInput({ value, onSelect, label }: Props) {
  const [query, setQuery] = useState(value?.roadAddress ?? "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const inputId = useId();
  const listboxId = useId();
  // 사용자가 방금 목록에서 고른 값은 다시 검색하지 않는다.
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      // 입력 이벤트 핸들러(handleQueryChange)가 이미 화면 상태를 정리했다.
      // 여기서 또 setState를 부르면 렌더 도중 동기 setState로 이어지는
      // cascading render 경고(react-hooks/set-state-in-effect)가 뜬다.
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/address/search?query=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          documents?: AddressSuggestion[];
          message?: string;
        };
        const documents = payload.documents ?? [];
        setSuggestions(documents);
        setActiveIndex(-1);
        setIsOpen(documents.length > 0);
        setMessage(
          payload.message ??
            (documents.length > 0
              ? `검색 결과 ${documents.length}건`
              : "검색 결과가 없습니다."),
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setSuggestions([]);
        setIsOpen(false);
        setMessage("주소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function handleQueryChange(next: string) {
    setQuery(next);
    if (next.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setMessage("");
    }
  }

  function choose(suggestion: AddressSuggestion) {
    skipNextSearch.current = true;
    setQuery(suggestion.roadAddress);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setMessage("");
    onSelect(suggestion);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!isOpen || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const index = activeIndex === -1 ? 0 : activeIndex;
      const picked = suggestions[index];
      if (picked) choose(picked);
    }
  }

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="block text-sm font-extrabold text-[#33453e]"
      >
        {label}
      </label>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="도로명 또는 지번을 입력하세요"
        className="mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
      />

      <p role="status" aria-live="polite" className="mt-2 text-sm text-[#6c7873]">
        {message}
      </p>

      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-[#dfe5e1] bg-white shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.roadAddress}-${suggestion.lat}-${suggestion.lng}`}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(suggestion);
              }}
              className={`cursor-pointer px-4 py-3 text-left text-sm ${
                index === activeIndex ? "bg-[#e9f3ef]" : "bg-white"
              }`}
            >
              <span className="block font-extrabold text-[#33453e]">
                {suggestion.roadAddress}
              </span>
              <span className="block text-[#6c7873]">{suggestion.jibunAddress}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
