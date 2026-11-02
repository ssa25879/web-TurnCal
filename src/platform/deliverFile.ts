export interface DeliverableFile {
  /** base64 */
  data: string;
  fileName: string;
  mimeType: string;
}

function toFile({ data, fileName, mimeType }: DeliverableFile): File {
  const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
  return new File([bytes], fileName, { type: mimeType });
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * 파일을 사용자에게 넘긴다. share면 터치 기기에서 공유 창을 먼저 쓰고(취소는 실패가 아니다),
 * 그 외에는 다운로드한다. 캘린더 파일은 공유 창에 캘린더 앱이 없어 항상 다운로드한다.
 */
export async function deliverFile(input: DeliverableFile, { share }: { share: boolean }): Promise<void> {
  const file = toFile(input);
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (share && touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  download(file);
}

/** 이 웹앱의 주소. .ics 설명에 넣는다. */
export function appUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.href).href;
}
