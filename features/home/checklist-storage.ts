"use client";

export function readStoredChecks(visaCode: string): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(checklistStorageKey(visaCode));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) return null;
    return new Set(parsed);
  } catch {
    return null;
  }
}

export function writeStoredChecks(visaCode: string, checkedIds: ReadonlySet<string>) {
  window.localStorage.setItem(
    checklistStorageKey(visaCode),
    JSON.stringify([...checkedIds]),
  );
}

export function readStoredJourneyStage(visaCode: string) {
  try {
    const value = Number(window.localStorage.getItem(journeyStageStorageKey(visaCode)));
    return value >= 2 && value <= 4 ? value : 2;
  } catch {
    return 2;
  }
}

export function writeStoredJourneyStage(visaCode: string, stage: number) {
  window.localStorage.setItem(journeyStageStorageKey(visaCode), String(stage));
}

export function getOrCreateSampleSeed(visaCode: string) {
  const key = sampleSeedStorageKey(visaCode);
  try {
    const stored = Number(window.localStorage.getItem(key));
    if (Number.isInteger(stored) && stored > 0) return stored;
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    const seed = values[0] || 1;
    window.localStorage.setItem(key, String(seed));
    return seed;
  } catch {
    return 1;
  }
}

function checklistStorageKey(visaCode: string) {
  return `visa-bugi-home-checklist:v1:${visaCode}`;
}

function journeyStageStorageKey(visaCode: string) {
  return `visa-bugi-home-stage:v1:${visaCode}`;
}

function sampleSeedStorageKey(visaCode: string) {
  return `visa-bugi-home-sample-seed:v1:${visaCode}`;
}

