import { beforeEach, describe, expect, it, vi } from "vitest";

const platform = vi.hoisted(() => ({
  deliverFile: vi.fn(),
  appUrl: vi.fn(() => "https://example.com/turncal/"),
}));

vi.mock("../platform/deliverFile", () => platform);
vi.mock("./renderMonthImage", () => ({ renderMonthImage: vi.fn(() => "UE5H") }));

import { DEFAULT_REMINDER } from "../domain/calendarReminder";
import { fromBase64Utf8 } from "../domain/monthExport";
import { DEFAULT_SHIFT_LABELS } from "../domain/shiftLabels";
import { exportMonth, type ExportInput } from "./exportMonth";
import { renderMonthImage } from "./renderMonthImage";

const input: ExportInput = {
  month: { year: 2026, month: 10 },
  weekStart: "SUN",
  timeline: { current: { startDate: "2026-10-11", cycle: ["DAY", "NIGHT", "OFF"] }, history: [] },
  days: {},
  labels: DEFAULT_SHIFT_LABELS,
  scheduleTitle: "병동/3교대 ../",
  primary: "#4F46E5",
  reminder: DEFAULT_REMINDER,
};

const delivered = () => platform.deliverFile.mock.calls.at(-1)! as [{ data: string; fileName: string; mimeType: string }, { share: boolean }];

beforeEach(() => {
  vi.clearAllMocks();
  platform.deliverFile.mockResolvedValue(undefined);
});

describe("exportMonth", () => {
  it("이미지: PNG를 연·월·보낸 시각 파일 이름으로 넘기고 공유 창을 허용한다", async () => {
    expect(await exportMonth("image", input)).toBe("opened");
    expect(delivered()).toEqual([
      { data: "UE5H", fileName: expect.stringMatching(/^turncal-2026-10-\d{14}\.png$/), mimeType: "image/png" },
      { share: true },
    ]);
    expect(vi.mocked(renderMonthImage).mock.calls[0][0].title).toBe("병동/3교대 ../ · 2026년 10월");
  });

  it("캘린더: 웹앱 주소를 넣은 .ics를 공유 창 없이 다운로드한다", async () => {
    expect(await exportMonth("calendar", input)).toBe("opened");
    const [{ data, fileName, mimeType }, options] = delivered();
    expect(fileName).toMatch(/^turncal-2026-10-\d{14}\.ics$/);
    expect(mimeType).toBe("text/calendar");
    expect(options).toEqual({ share: false });
    const ics = fromBase64Utf8(data);
    expect(ics).toContain("URL:https://example.com/turncal/");
    expect(ics).toContain("TRIGGER:-PT3H");
  });

  it("캘린더 알림을 끄면 .ics에 알림이 없다", async () => {
    await exportMonth("calendar", { ...input, reminder: { enabled: false, hour: 20 } });
    expect(fromBase64Utf8(delivered()[0].data)).not.toContain("VALARM");
  });

  it("파일 이름에 근무표 이름이 들어가지 않는다", async () => {
    await exportMonth("calendar", input);
    expect(delivered()[0].fileName).not.toContain("병동");
  });

  it("파일 전달 실패 → failed", async () => {
    platform.deliverFile.mockRejectedValue(new Error("x"));
    expect(await exportMonth("image", input)).toBe("failed");
    expect(await exportMonth("calendar", input)).toBe("failed");
  });
});
