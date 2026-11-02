import { useEffect, useRef } from "react";

export type Screen =
  | "loading"
  | "load-error"
  | "calendar"
  | "settings-menu"
  | "names"
  | "shift-labels"
  | "pattern"
  | "display"
  | "reminder"
  | "backup"
  | "reset"
  | "day"
  | "entry";

export interface BackState {
  screen: Screen;
  /** 저장된 설정이 있는지(패턴이 없어도 true). 없으면(첫 실행) 설정 화면도 최초 흐름이다. */
  hasSavedSettings: boolean;
  isDirty: boolean;
  /** 바텀시트·다이얼로그가 열려 있는지. */
  hasOverlay: boolean;
}

export type BackAction =
  | "close-overlay"
  | "close"
  | "to-calendar"
  | "to-settings-menu"
  | "to-day"
  | "confirm-discard";

/**
 * 브라우저·기기 뒤로가기와 상단 바 뒤로가기 버튼에 대한 동작을 정한다.
 * 열린 오버레이가 있으면 먼저 닫는다. 저장된 설정이 있으면 화면 계층을 한 단계씩 올라가고
 * (설정 상세 → 설정 목록 → 달력, 세부 내용 편집 → 날짜 → 달력), 나머지 최초 화면은 사이트를 떠난다.
 * 편집 중인 변경이 있으면 폐기 확인을 먼저 띄운다(목적지는 호출자가 화면별로 정한다).
 */
export function decideBackAction({
  screen,
  hasSavedSettings,
  isDirty,
  hasOverlay,
}: BackState): BackAction {
  if (hasOverlay) return "close-overlay";
  if (!hasSavedSettings) return "close";
  switch (screen) {
    case "pattern":
    case "names":
    case "shift-labels":
      return isDirty ? "confirm-discard" : "to-settings-menu";
    case "display":
    case "reminder":
    case "backup":
    case "reset":
      return "to-settings-menu";
    case "settings-menu":
    case "day":
      return "to-calendar";
    case "entry":
      return isDirty ? "confirm-discard" : "to-day";
    default:
      return "close";
  }
}

export interface BackHandlers {
  closeOverlay(): void;
  toCalendar(): void;
  toSettingsMenu(): void;
  toDay(): void;
  confirmDiscard(): void;
}

/** 테스트할 수 있게 window에서 쓰는 부분만 받는다. */
export interface BackWindow {
  history: {
    readonly state: unknown;
    pushState(state: unknown, unused: string): void;
    back(): void;
  };
  addEventListener(type: "popstate" | "pointerdown" | "keydown", listener: (event: { state?: unknown }) => void): void;
  removeEventListener(type: "popstate" | "pointerdown" | "keydown", listener: (event: { state?: unknown }) => void): void;
}

const TRAP_KEY = "turncalBackTrap";
const isTrap = (state: unknown) => typeof state === "object" && state !== null && TRAP_KEY in state;

/**
 * 화면 전환은 URL을 바꾸지 않으므로 기록에 항목을 하나 더 두어 브라우저 뒤로가기를 받는다.
 * 브라우저는 사용자 동작 없이 추가된 항목을 건너뛸 수 있어 첫 입력 때 추가한다.
 * 받은 뒤 앱 안에서 처리했으면 항목을 다시 두고, 처리할 것이 없으면(최초 화면) 실제로 뒤로 간다.
 */
export function registerBackHandler(
  getState: () => BackState,
  handlers: () => BackHandlers,
  win: BackWindow = window as unknown as BackWindow,
): { stop(): void; goBack(): void } {
  let armed = isTrap(win.history.state);

  const arm = () => {
    if (armed) return;
    armed = true;
    win.history.pushState({ [TRAP_KEY]: true }, "");
  };

  /** 처리했으면 true, 앱 안에서 더 돌아갈 곳이 없으면 false */
  const run = (): boolean => {
    switch (decideBackAction(getState())) {
      case "close-overlay":
        handlers().closeOverlay();
        return true;
      case "close":
        return false;
      case "to-calendar":
        handlers().toCalendar();
        return true;
      case "to-settings-menu":
        handlers().toSettingsMenu();
        return true;
      case "to-day":
        handlers().toDay();
        return true;
      case "confirm-discard":
        handlers().confirmDiscard();
        return true;
    }
  };

  const onPopState = (event: { state?: unknown }) => {
    // 앞으로 가기로 항목에 다시 올라온 경우다.
    if (isTrap(event.state)) {
      armed = true;
      return;
    }
    armed = false;
    if (run()) arm();
    else win.history.back();
  };

  win.addEventListener("popstate", onPopState);
  win.addEventListener("pointerdown", arm);
  win.addEventListener("keydown", arm);

  return {
    stop() {
      win.removeEventListener("popstate", onPopState);
      win.removeEventListener("pointerdown", arm);
      win.removeEventListener("keydown", arm);
    },
    goBack() {
      run();
    },
  };
}

/** getState는 이벤트 시점에 호출되므로 렌더 이후 바뀐 값(열린 오버레이 등)도 반영된다. 돌려준 함수는 상단 바 버튼이 쓴다. */
export function useBackHandler(getState: () => BackState, handlers: BackHandlers): () => void {
  const getStateRef = useRef(getState);
  const handlersRef = useRef(handlers);
  getStateRef.current = getState;
  handlersRef.current = handlers;
  const goBackRef = useRef<() => void>(() => {});

  useEffect(() => {
    const registered = registerBackHandler(() => getStateRef.current(), () => handlersRef.current);
    goBackRef.current = registered.goBack;
    return registered.stop;
  }, []);

  return () => goBackRef.current();
}
