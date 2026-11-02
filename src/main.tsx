import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyTheme, DEFAULT_THEME, type ThemeId } from "./domain/theme";
import "./style.css";

function Root() {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);

  return <App onThemeChange={setTheme} />;
}

const container = document.getElementById("app");

if (!container) {
  throw new Error("#app 요소를 찾을 수 없어요.");
}

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

// 개발 서버에서는 캐시가 수정 확인을 방해하므로 배포 빌드에서만 등록한다.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}
