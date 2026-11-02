import type { YearMonth } from "../domain/calendar";
import type { ReminderSetting } from "../domain/calendarReminder";
import type { DayRecord } from "../domain/dayEntries";
import { buildIcs, buildMonthShifts, exportFileName, toBase64Utf8 } from "../domain/monthExport";
import type { PatternTimeline } from "../domain/patternHistory";
import type { ShiftLabels } from "../domain/shiftLabels";
import type { WeekStart } from "../domain/types";
import { appUrl, deliverFile } from "../platform/deliverFile";
import { renderMonthImage } from "./renderMonthImage";

export type ExportKind = "image" | "calendar";
export type ExportResult = "opened" | "failed";

export interface ExportInput {
  month: YearMonth;
  weekStart: WeekStart;
  timeline: PatternTimeline;
  days: Record<string, DayRecord>;
  labels: ShiftLabels;
  /** 근무표 이름(없으면 기본 제목) */
  scheduleTitle: string;
  primary: string;
  reminder: ReminderSetting;
}

/** 보고 있는 달을 PNG 또는 .ics 파일로 만들어 넘긴다. */
export async function exportMonth(kind: ExportKind, input: ExportInput): Promise<ExportResult> {
  const { month, weekStart, timeline, days, labels, scheduleTitle, primary, reminder } = input;
  const shifts = buildMonthShifts(month, timeline, days);
  const monthTitle = `${month.year}년 ${month.month}월`;
  const now = new Date();
  try {
    if (kind === "image") {
      const data = renderMonthImage({ month, weekStart, shifts, labels, primary, title: `${scheduleTitle} · ${monthTitle}` });
      await deliverFile({ data, fileName: exportFileName(month, "png", now), mimeType: "image/png" }, { share: true });
    } else {
      const ics = buildIcs({ month, shifts, labels, link: appUrl(), reminder, title: `${scheduleTitle} ${monthTitle}`, now });
      await deliverFile({ data: toBase64Utf8(ics), fileName: exportFileName(month, "ics", now), mimeType: "text/calendar" }, { share: false });
    }
    return "opened";
  } catch {
    return "failed";
  }
}
