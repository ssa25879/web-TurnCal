import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => new Map<string, string>());
vi.mock("../platform/storage", () => ({
  Storage: {
    getItem: async (key: string) => memory.get(key) ?? null,
    setItem: async (key: string, value: string) => void memory.set(key, value),
    removeItem: async (key: string) => void memory.delete(key),
  },
}));

import { backupFileName, createBackup, parseBackup, restoreBackup } from "./backup";
import { ENTRIES_KEY } from "./entriesStorage";
import { SETTINGS_KEY, type StoredSettingsV3 } from "./scheduleStorage";

const settings: StoredSettingsV3 = {
  version: 3,
  pattern: { startDate: "2026-10-13", cycle: ["DAY", "OFF"] },
  weekStart: "MON",
  theme: "TEAL",
  userName: "지수",
  scheduleName: "병동",
};
const days = { "2026-10-14": { items: [{ id: "a", name: "연차", createdAt: 1, memo: "메모" }] } };
const now = new Date(2026, 10, 2, 9, 5);

beforeEach(() => {
  memory.clear();
});

describe("백업", () => {
  it("저장한 데이터를 백업했다가 그대로 복원한다", async () => {
    memory.set(SETTINGS_KEY, JSON.stringify(settings));
    memory.set(ENTRIES_KEY, JSON.stringify({ version: 1, days }));
    const text = await createBackup(now);

    memory.clear();
    const parsed = parseBackup(text);
    expect(parsed).toEqual({ ok: true, backup: { settings, days } });
    if (parsed.ok) await restoreBackup(parsed.backup);

    expect(JSON.parse(memory.get(SETTINGS_KEY)!)).toEqual(settings);
    expect(JSON.parse(memory.get(ENTRIES_KEY)!)).toEqual({ version: 1, days });
  });

  it("빈 저장소의 백업을 복원하면 기존 데이터가 지워진다", async () => {
    const parsed = parseBackup(await createBackup(now));
    memory.set(SETTINGS_KEY, JSON.stringify(settings));
    memory.set(ENTRIES_KEY, JSON.stringify({ version: 1, days }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) await restoreBackup(parsed.backup);
    expect(memory.size).toBe(0);
  });

  it("저장 데이터가 손상됐으면 빠진 백업을 만들지 않는다", async () => {
    memory.set(ENTRIES_KEY, "{broken");
    await expect(createBackup(now)).rejects.toThrow();
  });

  it.each([
    ["JSON이 아닌 파일", "not json", "턴캘 백업 파일이 아니에요."],
    ["null", "null", "턴캘 백업 파일이 아니에요."],
    ["다른 JSON", '{"a":1}', "턴캘 백업 파일이 아니에요."],
    ["미래 버전", '{"kind":"turncal-backup","version":2}', "지원하지 않는 버전의 백업 파일이에요."],
  ])("%s는 거부한다", (_name, text, reason) => {
    expect(parseBackup(text)).toEqual({ ok: false, reason });
  });

  it("값이 잘못된 설정·세부 내용은 거부한다", () => {
    const base = { kind: "turncal-backup", version: 1, settings, entries: { version: 1, days } };
    expect(parseBackup(JSON.stringify({ ...base, settings: { ...settings, theme: "NOPE" } })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...base, entries: { version: 1, days: { nope: {} } } })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ kind: base.kind, version: 1, settings }))).toMatchObject({ ok: false });
  });

  it("파일 이름에는 날짜만 들어간다", () => {
    expect(backupFileName(now)).toBe("turncal-backup-20261102.json");
  });
});
