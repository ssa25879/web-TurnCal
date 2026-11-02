// 사용법은 README.md 참고. 빌드 결과물(vite preview)을 대상으로 주요 흐름을 확인한다.
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const APP_URL = process.env.APP_URL ?? "http://localhost:4179/web-TurnCal/";
const CDP_URL = process.env.CDP_URL;
const SHOT_DIR = process.env.SHOT_DIR;

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? ` (${detail})` : ""}`);
}

const browser = CDP_URL
  ? await chromium.connectOverCDP(CDP_URL)
  : await chromium.launch({ executablePath: process.env.EDGE_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const page = await context.newPage();

const errors = [];
const offsite = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("ERR_INTERNET_DISCONNECTED")) errors.push(message.text());
});
page.on("request", (request) => {
  if (!request.url().startsWith(new URL(APP_URL).origin) && !request.url().startsWith("data:") && !request.url().startsWith("blob:")) offsite.push(request.url());
});

const title = () => page.locator("h1").first().innerText();
const button = (name) => page.getByRole("button", { name, exact: true });
const shot = async (name) => {
  if (!SHOT_DIR) return;
  await page.waitForTimeout(300); // 모달 등장 애니메이션이 끝난 뒤 찍는다.
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
};
const noHorizontalScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const pattern = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("turncal.settings") ?? "null")?.pattern?.cycle?.length ?? 0);

await page.goto(APP_URL);

// ---------- 첫 실행 ----------
await page.getByText("근무 패턴이 없어요").waitFor();
check("첫 실행은 빈 달력", true);
check("첫 화면에는 뒤로가기가 없다", (await button("뒤로가기").count()) === 0);
check("설정 버튼이 상단 바에 있다", (await button("설정").count()) === 1);
await shot("01-empty");

// ---------- 패턴 등록 ----------
await button("근무 패턴 등록하기").click();
check("패턴 화면", (await title()) === "근무 패턴 설정");
const shiftButtons = page.locator(".shift-button");
await shiftButtons.nth(0).click();
await shiftButtons.nth(2).click();
await shiftButtons.nth(5).click();
check("근무 순서 3칸", (await page.locator(".cycle-item").count()) === 3);

// 칸 바꾸기 시트: 선택·Esc·배경 클릭
await page.locator(".cycle-item").nth(2).click();
await page.locator("dialog.ui-sheet").waitFor();
await shot("02-sheet");
await page.keyboard.press("Escape");
check("Esc로 시트가 닫힌다", (await page.locator("dialog[open]").count()) === 0);
await page.locator(".cycle-item").nth(2).click();
await page.locator(".ui-sheet-option").nth(3).click();
check("시트에서 근무를 바꾼다", (await page.locator("dialog[open]").count()) === 0);

// 날짜로 지정
await page.locator(".today-cell").first().click();
await button("패턴 첫째 날을 날짜로 지정하기").click();
await page.locator('dialog input[type="date"]').waitFor();
check("날짜 시트에 기본값이 있다", (await page.locator('dialog input[type="date"]').inputValue()) !== "");
await button("이 날짜로 지정").click();
check("날짜 시트가 닫힌다", (await page.locator("dialog[open]").count()) === 0);

// 변경이 있을 때 뒤로가기는 폐기 확인(브라우저 뒤로가기)
await page.goBack();
const firstRunDialog = await page.locator("dialog[open]").count();
if (firstRunDialog > 0) await page.getByRole("button", { name: "계속 편집하기" }).click();
await button("저장").click();
await page.locator(".calendar").waitFor();
check("저장 후 달력에 근무가 표시된다", (await page.locator(".calendar-shift").count()) > 20);
check("패턴이 저장됐다", (await pattern()) === 3);
await shot("03-calendar");
check("390px 가로 스크롤 없음", await noHorizontalScroll());

// ---------- 뒤로가기 ----------
const urlBefore = page.url();
await button("설정").click();
check("설정 목록", (await title()) === "설정");
await page.goBack();
await page.waitForFunction(() => document.querySelector(".calendar"));
check("브라우저 뒤로가기로 달력에 돌아온다", page.url() === urlBefore);

await button("설정").click();
await page.getByRole("button", { name: /화면 설정/ }).click();
check("화면 설정", (await title()) === "화면 설정");
await page.getByRole("radio", { name: "월요일 시작" }).click();
check("주 시작 요일 선택", (await page.getByRole("radio", { name: "월요일 시작" }).getAttribute("aria-checked")) === "true");
await page.getByRole("radio", { name: "일요일 시작" }).click();
await shot("04-display");
await button("뒤로가기").click();
check("상단 바 뒤로가기는 설정 목록으로", (await title()) === "설정");
await shot("05-menu");
await page.goBack();
await page.waitForFunction(() => document.querySelector(".calendar"));
check("이어서 브라우저 뒤로가기도 동작한다", (await page.locator(".calendar").count()) === 1);

// ---------- 세부 내용 ----------
await page.locator(".calendar-cell.is-today").click();
await button("세부 내용 추가").click();
await page.getByLabel("이름").fill("병원 예약");
await page.getByLabel("내용").fill("메모 내용");
await shot("06-entry");
await button("뒤로가기").click();
check("작성 중 뒤로가기는 폐기 확인", (await page.getByText("변경한 내용을 버릴까요?").count()) === 1);
await shot("07-dialog");
await page.getByRole("button", { name: "계속 편집하기" }).click();
await button("저장").click();
check("세부 내용이 목록에 보인다", (await page.getByText("병원 예약").count()) === 1);
await button("뒤로가기").click();

await page.reload();
await page.locator(".calendar").waitFor();
check("새로고침 후 패턴이 유지된다", (await page.locator(".calendar-shift").count()) > 20);
await page.locator(".calendar-cell.is-today").click();
check("새로고침 후 세부 내용이 유지된다", (await page.getByText("병원 예약").count()) === 1);
await button("뒤로가기").click();

// ---------- 내보내기 ----------
await button("이번 달 내보내기").click();
await shot("08-export");
let downloadPromise = page.waitForEvent("download");
await page.locator(".export-option").nth(0).click();
const png = await downloadPromise;
check("이미지 파일 이름", /^turncal-\d{4}-\d{2}-\d{14}\.png$/.test(png.suggestedFilename()), png.suggestedFilename());
const pngBytes = readFileSync(await png.path());
check("PNG 내용", pngBytes.subarray(1, 4).toString() === "PNG" && pngBytes.length > 1000);

await button("이번 달 내보내기").click();
await page.locator(".export-option").nth(1).click();
downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "받기", exact: true }).click();
const ics = await downloadPromise;
const icsText = readFileSync(await ics.path(), "utf8");
check("캘린더 파일 이름", /^turncal-\d{4}-\d{2}-\d{14}\.ics$/.test(ics.suggestedFilename()));
check("캘린더 파일 내용", icsText.startsWith("BEGIN:VCALENDAR") && icsText.includes("VEVENT"));
check("캘린더 파일에 메모가 없다", !icsText.includes("병원"));
check("캘린더 파일에 웹앱 주소가 있다", icsText.replace(/\r\n /g, "").includes(`URL:${APP_URL}`));

// ---------- 백업·복원 ----------
await button("설정").click();
await page.getByRole("button", { name: /데이터 백업/ }).click();
await shot("09-backup");
downloadPromise = page.waitForEvent("download");
await button("백업 파일 받기").click();
const backup = await downloadPromise;
const backupPath = await backup.path();
const backupText = readFileSync(backupPath, "utf8");
check("백업에 메모가 들어 있다", backupText.includes("메모 내용"));

await page.locator(".backup-file-input").setInputFiles({ name: "wrong.json", mimeType: "application/json", buffer: Buffer.from('{"a":1}') });
await page.getByText("턴캘 백업 파일이 아니에요.").waitFor();
check("잘못된 파일은 거부한다", (await page.locator("dialog[open]").count()) === 0);

await button("뒤로가기").click();
await page.getByRole("button", { name: /초기화/ }).click();
await page.getByRole("button", { name: /전체/ }).first().click();
await page.getByRole("button", { name: "초기화하기" }).click();
await page.getByText("근무 패턴이 없어요").waitFor();
check("전체 초기화 후 저장소가 비었다", await page.evaluate(() => localStorage.getItem("turncal.settings") === null));

await button("설정").click();
await page.getByRole("button", { name: /데이터 백업/ }).click();
await page.locator(".backup-file-input").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(backupText) });
await page.getByRole("button", { name: "복원하기", exact: true }).click();
await page.locator(".calendar").waitFor();
check("복원 후 근무가 돌아온다", (await page.locator(".calendar-shift").count()) > 20);
await page.locator(".calendar-cell.is-today").click();
check("복원 후 세부 내용이 돌아온다", (await page.getByText("병원 예약").count()) === 1);
await button("뒤로가기").click();

// ---------- 360px·큰 화면 ----------
await page.setViewportSize({ width: 360, height: 740 });
check("360px 가로 스크롤 없음", await noHorizontalScroll());
await shot("10-360");
await page.setViewportSize({ width: 1280, height: 800 });
check("1280px 가로 스크롤 없음", await noHorizontalScroll());
await shot("11-desktop");
await page.setViewportSize({ width: 390, height: 844 });

// ---------- PWA ----------
const manifest = await page.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]').href;
  const data = await (await fetch(href)).json();
  const icons = await Promise.all(data.icons.map(async (icon) => (await fetch(new URL(icon.src, href))).ok));
  return { name: data.short_name, icons };
});
check("매니페스트와 아이콘", manifest.name === "턴캘" && manifest.icons.every(Boolean));
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
await context.setOffline(true);
await page.reload();
await page.locator(".calendar").waitFor();
check("오프라인에서 다시 열린다", (await page.locator(".calendar-shift").count()) > 20);
await context.setOffline(false);

const privacy = await page.request.get(new URL("privacy.html", APP_URL).href);
check("개인정보 안내 페이지", privacy.ok());
check("외부 요청 없음", offsite.length === 0, offsite.join(", "));
check("콘솔·페이지 오류 없음", errors.length === 0, errors.join(" | "));

// CDP 연결을 닫을 때 Playwright가 오류를 낼 수 있어 결과를 먼저 출력하고 그대로 종료한다.
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
