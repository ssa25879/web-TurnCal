interface Props {
  /** 돌아갈 화면이 있을 때만 뒤로가기 버튼을 보인다. */
  onBack?: () => void;
  /** 달력 화면에서만 설정 버튼을 보인다. */
  onSettings?: () => void;
}

/** 상단 바. 설치된 앱(PWA)에는 브라우저 뒤로가기가 없어 여기서 제공한다. */
export function AppBar({ onBack, onSettings }: Props) {
  return (
    <header className="app-bar">
      <div className="app-bar-inner">
        {onBack ? (
          <button type="button" className="app-bar-button" aria-label="뒤로가기" onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <img className="app-bar-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" />
        )}
        <span className="app-bar-title">턴캘</span>
        {onSettings && (
          <button type="button" className="app-bar-button" aria-label="설정" onClick={onSettings}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.2 14H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.17-2.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.83 10H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
