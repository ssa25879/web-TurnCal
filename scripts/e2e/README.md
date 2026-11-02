# 브라우저 스모크 테스트

빌드 결과물을 Edge로 실행해 주요 흐름(패턴 등록·달력·뒤로가기·세부 내용·내보내기·백업 복원·오프라인·360px)을 확인해요. 실기기 확인을 대신하지는 않아요.

```bash
npm run build -- --base=/web-TurnCal/
```

```bash
npx vite preview --base=/web-TurnCal/ --port 4179 --strictPort
```

저장소 의존성을 늘리지 않도록 `playwright-core`는 임시 폴더에 설치하고, 스크립트를 그 폴더로 복사해 실행해요. Edge는 직접 띄워 CDP로 연결해요.

```powershell
mkdir $env:TEMP\turncal-e2e; cd $env:TEMP\turncal-e2e
npm init -y; npm install playwright-core@1.49.1
Copy-Item D:\work\web-TurnCal\scripts\e2e\smoke.mjs .
msedge --headless=new --hide-scrollbars --disable-gpu --remote-debugging-port=9333 --user-data-dir=$env:TEMP\edge-cdp about:blank
$env:CDP_URL="http://127.0.0.1:9333"; node smoke.mjs
```

앱 주소는 `APP_URL` 환경 변수로 바꿀 수 있어요.
