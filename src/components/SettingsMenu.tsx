import { MenuList } from "../ui";
import { THEMES, type ThemeId } from "../domain/theme";
import type { WeekStart } from "../domain/types";

interface Props {
  /** 근무 패턴이 없으면(패턴 초기화 뒤) null */
  cycleLength: number | null;
  theme: ThemeId;
  weekStart: WeekStart;
  scheduleName: string | null;
  /** 기본값과 다르게 바꾼 근무 유형 수 */
  customizedShiftCount: number;
  /** "전날 21:00" 또는 "끔" */
  reminderLabel: string;
  onOpenNames(): void;
  onOpenPattern(): void;
  onOpenShiftLabels(): void;
  onOpenDisplay(): void;
  onOpenReminder(): void;
  onOpenBackup(): void;
  onOpenReset(): void;
}

/** 설정 목록: 이름 · 근무 패턴(draft + [저장]) · 근무 유형(draft + [저장]) · 화면 설정·캘린더 알림(즉시 저장) · 초기화 */
export function SettingsMenu({
  cycleLength,
  theme,
  weekStart,
  scheduleName,
  customizedShiftCount,
  reminderLabel,
  onOpenNames,
  onOpenPattern,
  onOpenShiftLabels,
  onOpenDisplay,
  onOpenReminder,
  onOpenBackup,
  onOpenReset,
}: Props) {
  const rows = [
    { top: "이름", bottom: scheduleName ?? "설정 안 함", onClick: onOpenNames },
    { top: "근무 패턴", bottom: cycleLength === null ? "등록되지 않음" : `${cycleLength}일 주기`, onClick: onOpenPattern },
    {
      top: "근무 유형",
      bottom: customizedShiftCount === 0 ? "기본값" : `${customizedShiftCount}개 바꿈`,
      onClick: onOpenShiftLabels,
    },
    {
      top: "화면 설정",
      bottom: `${THEMES[theme].name} · ${weekStart === "SUN" ? "일요일" : "월요일"} 시작`,
      onClick: onOpenDisplay,
    },
    { top: "캘린더 알림", bottom: reminderLabel, onClick: onOpenReminder },
    { top: "데이터 백업", bottom: "파일로 받기·복원하기", onClick: onOpenBackup },
    { top: "초기화", bottom: "전체 데이터 지우기", onClick: onOpenReset },
  ];

  return (
    <section className="settings-menu">
      <h1 className="page-title">설정</h1>
      <MenuList rows={rows} />
      <p className="settings-links">
        <a href={`${import.meta.env.BASE_URL}privacy.html`}>개인정보 처리 안내</a>
      </p>
    </section>
  );
}
