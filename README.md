# 턴캘 웹 (web-TurnCal)

교대근무 패턴을 등록하면 달력에 근무를 보여 주는 웹앱이에요. 가입과 서버 없이 동작하고, 데이터는 사용자 브라우저에만 저장돼요.

- 서비스 주소: https://ssa25879.github.io/web-TurnCal/
- 설치(PWA)와 오프라인 실행을 지원해요.

앱인토스 미니앱 [ait-TurnCal](https://github.com/ssa25879/ait-TurnCal)의 커밋 `85d4005`에서 코드를 가져와 시작했어요. 두 저장소는 데이터와 코드를 공유하지 않아요. 새 기능은 이 저장소에서 개발하고, ait-TurnCal은 유지보수만 해요.

## 미니앱과 다른 점

| 기능 | 미니앱 | 웹 |
|---|---|---|
| UI | TDS | 자체 컴포넌트 (`src/ui`) |
| 저장 | 토스 SDK Storage | `localStorage` + 백업·복원 파일 |
| 뒤로가기 | 토스 내비 바·`backEvent` | 상단 바 + History API |
| 내보내기 | `saveBase64Data` | 공유 창(터치 기기의 이미지) 또는 다운로드 |
| 광고·분석·리뷰 요청 | 있음 | 없음 |

TDS 자료의 이용 범위는 앱인토스 서비스로 제한돼요. 이 저장소에 `@toss/*`, `@apps-in-toss/*` 패키지를 추가하거나 TDS 자료를 복제하지 마세요.

## 개발

```bash
npm install
npm run dev
```

```bash
npm run test:tz
```

```bash
npm run build
```

브라우저 스모크 테스트는 [scripts/e2e/README.md](scripts/e2e/README.md)를 참고하세요.

## 배포

`main`에 푸시하면 GitHub Actions가 테스트·빌드 후 GitHub Pages에 배포해요(`.github/workflows/deploy.yml`). 저장소 Settings > Pages의 Source는 **GitHub Actions**여야 해요.

자체 도메인으로 옮기면 워크플로의 `--base`를 `/`로 바꾸세요. 배포 주소(origin)가 바뀌면 브라우저 저장소가 분리되어 사용자가 백업 파일로 옮겨야 해요.

## 유지 관리

- 공휴일은 `src/domain/holidays.ts` 머리 주석을 따라 갱신해요.
- 서비스 워커 동작을 바꾸면 `public/sw.js`의 `CACHE` 값을 올려요.
