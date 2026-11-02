import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  decideBackAction,
  registerBackHandler,
  type BackState,
  type BackWindow,
  type Screen,
} from "./useBackHandler";

beforeEach(() => {
  vi.clearAllMocks();
});

function state(screen: Screen, hasSavedSettings: boolean, isDirty = false, hasOverlay = false): BackState {
  return { screen, hasSavedSettings, isDirty, hasOverlay };
}

describe("decideBackAction", () => {
  it.each<[Screen, boolean, boolean, string]>([
    ["calendar", true, false, "close"],
    ["load-error", false, false, "close"],
    ["loading", false, false, "close"],
    ["pattern", false, false, "close"],
    ["pattern", false, true, "close"],
    ["pattern", true, false, "to-settings-menu"],
    ["pattern", true, true, "confirm-discard"],
    ["display", true, false, "to-settings-menu"],
    ["reminder", true, false, "to-settings-menu"],
    ["backup", true, false, "to-settings-menu"],
    ["settings-menu", true, false, "to-calendar"],
    ["names", true, false, "to-settings-menu"],
    ["names", true, true, "confirm-discard"],
    ["shift-labels", true, false, "to-settings-menu"],
    ["shift-labels", true, true, "confirm-discard"],
    ["reset", true, false, "to-settings-menu"],
    ["day", true, false, "to-calendar"],
    ["entry", true, false, "to-day"],
    ["entry", true, true, "confirm-discard"],
    ["names", false, false, "close"],
    ["day", false, false, "close"],
  ])("%s (저장됨=%s, 변경=%s) → %s", (screen, hasSavedSettings, isDirty, expected) => {
    expect(decideBackAction(state(screen, hasSavedSettings, isDirty))).toBe(expected);
  });

  it("오버레이가 열려 있으면 화면과 무관하게 오버레이를 먼저 닫는다", () => {
    for (const screen of ["calendar", "pattern", "display", "settings-menu", "names", "reset", "day", "entry"] as Screen[]) {
      expect(decideBackAction(state(screen, true, true, true))).toBe("close-overlay");
    }
  });
});

describe("registerBackHandler", () => {
  function setup(initial: BackState, historyState: unknown = null) {
    const listeners = new Map<string, (event: { state?: unknown }) => void>();
    const history = {
      state: historyState,
      pushState: vi.fn(),
      back: vi.fn(),
    };
    const win: BackWindow = {
      history,
      addEventListener: (type, listener) => void listeners.set(type, listener),
      removeEventListener: (type) => void listeners.delete(type),
    };
    const handlers = {
      closeOverlay: vi.fn(),
      toCalendar: vi.fn(),
      toSettingsMenu: vi.fn(),
      toDay: vi.fn(),
      confirmDiscard: vi.fn(),
    };
    let current = initial;
    const registered = registerBackHandler(() => current, () => handlers, win);
    return {
      ...registered,
      history,
      handlers,
      listeners,
      input: () => listeners.get("pointerdown")!({}),
      pop: (popped: unknown = null) => listeners.get("popstate")!({ state: popped }),
      setState: (next: BackState) => {
        current = next;
      },
    };
  }

  it("첫 입력 때 기록 항목을 한 번만 추가한다", () => {
    const { input, history } = setup(state("calendar", true));
    expect(history.pushState).not.toHaveBeenCalled();
    input();
    input();
    expect(history.pushState).toHaveBeenCalledTimes(1);
  });

  it("새로고침해 이미 항목 위에 있으면 다시 추가하지 않는다", () => {
    const { input, history } = setup(state("calendar", true), { turncalBackTrap: true });
    input();
    expect(history.pushState).not.toHaveBeenCalled();
  });

  it("앱 안에서 처리한 뒤로가기는 항목을 다시 둔다", () => {
    const { pop, handlers, history } = setup(state("settings-menu", true));
    pop();
    expect(handlers.toCalendar).toHaveBeenCalledTimes(1);
    expect(history.pushState).toHaveBeenCalledTimes(1);
    expect(history.back).not.toHaveBeenCalled();
  });

  it("최초 화면의 뒤로가기는 실제로 사이트를 떠난다", () => {
    const { input, pop, history } = setup(state("calendar", true));
    input();
    pop();
    expect(history.back).toHaveBeenCalledTimes(1);
    expect(history.pushState).toHaveBeenCalledTimes(1);
  });

  it("앞으로 가기로 항목에 돌아오면 아무 동작도 하지 않는다", () => {
    const { pop, handlers, history } = setup(state("settings-menu", true));
    pop({ turncalBackTrap: true });
    expect(handlers.toCalendar).not.toHaveBeenCalled();
    expect(history.back).not.toHaveBeenCalled();
  });

  it("이벤트 시점의 최신 상태로 동작한다", () => {
    const { pop, handlers, setState } = setup(state("calendar", true));
    setState(state("pattern", true));
    pop();
    expect(handlers.toSettingsMenu).toHaveBeenCalledTimes(1);
    setState(state("entry", true));
    pop();
    expect(handlers.toDay).toHaveBeenCalledTimes(1);
    setState(state("pattern", true, true));
    pop();
    expect(handlers.confirmDiscard).toHaveBeenCalledTimes(1);
    setState(state("calendar", true, false, true));
    pop();
    expect(handlers.closeOverlay).toHaveBeenCalledTimes(1);
  });

  it("상단 바 goBack은 기록을 건드리지 않고 같은 동작을 한다", () => {
    const { goBack, handlers, history } = setup(state("day", true));
    goBack();
    expect(handlers.toCalendar).toHaveBeenCalledTimes(1);
    expect(history.pushState).not.toHaveBeenCalled();
    expect(history.back).not.toHaveBeenCalled();
  });

  it("stop이 구독을 해제한다", () => {
    const { stop, listeners } = setup(state("calendar", true));
    stop();
    expect(listeners.size).toBe(0);
  });
});
