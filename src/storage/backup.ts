import { loadEntries, parseEntries, removeEntries, saveEntries, type EntriesByDate } from "./entriesStorage";
import { loadSettings, parseSettings, removeSettings, saveSettings, type StoredSettingsV3 } from "./scheduleStorage";

const BACKUP_KIND = "turncal-backup";
const BACKUP_VERSION = 1;

export interface ParsedBackup {
  /** 설정을 저장한 적이 없으면 null */
  settings: StoredSettingsV3 | null;
  days: EntriesByDate;
}

export type ParseBackupResult = { ok: true; backup: ParsedBackup } | { ok: false; reason: string };

const pad = (value: number) => String(value).padStart(2, "0");

/** 파일 이름은 날짜로만 만든다(사용자 입력을 넣지 않는다). */
export function backupFileName(now: Date): string {
  return `turncal-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.json`;
}

/** 저장된 데이터를 백업 JSON으로 만든다. 읽지 못한 데이터가 있으면 빠진 백업을 만들지 않고 예외를 던진다. */
export async function createBackup(now: Date): Promise<string> {
  const [settings, entries] = await Promise.all([loadSettings(), loadEntries()]);
  if (settings.kind === "corrupt" || settings.kind === "error") throw new Error("설정을 읽지 못했어요.");
  if (entries.kind === "corrupt" || entries.kind === "error") throw new Error("세부 내용을 읽지 못했어요.");
  return JSON.stringify({
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings: settings.kind === "ok" ? settings.settings : null,
    entries: { version: 1, days: entries.kind === "ok" ? entries.days : {} },
  });
}

/** 저장소와 같은 검증을 거쳐, 올바른 파일만 복원 대상으로 돌려준다. 저장소에는 쓰지 않는다. */
export function parseBackup(text: string): ParseBackupResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: "턴캘 백업 파일이 아니에요." };
  }
  if (typeof data !== "object" || data === null) return { ok: false, reason: "턴캘 백업 파일이 아니에요." };
  const { kind, version, settings, entries } = data as Record<string, unknown>;
  if (kind !== BACKUP_KIND) return { ok: false, reason: "턴캘 백업 파일이 아니에요." };
  if (version !== BACKUP_VERSION) return { ok: false, reason: "지원하지 않는 버전의 백업 파일이에요." };

  let parsedSettings: StoredSettingsV3 | null = null;
  if (settings !== null) {
    const result = parseSettings(JSON.stringify(settings));
    if (!result.ok) return { ok: false, reason: `백업 파일을 읽지 못했어요. ${result.reason}` };
    parsedSettings = result.settings;
  }
  const parsedEntries = parseEntries(JSON.stringify(entries));
  if (parsedEntries.kind !== "ok") return { ok: false, reason: "백업 파일의 세부 내용이 올바르지 않아요." };
  return { ok: true, backup: { settings: parsedSettings, days: parsedEntries.days } };
}

/** 세부 내용 → 설정 순서로 덮어쓴다. 실패하면 예외를 전달하고 호출자가 저장소를 다시 읽는다. */
export async function restoreBackup({ settings, days }: ParsedBackup): Promise<void> {
  if (Object.keys(days).length > 0) await saveEntries(days);
  else await removeEntries();
  if (settings) await saveSettings(settings);
  else await removeSettings();
}
