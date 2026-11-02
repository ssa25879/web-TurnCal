import { useRef, useState } from "react";
import { toBase64Utf8 } from "../domain/monthExport";
import { deliverFile } from "../platform/deliverFile";
import { useCloseOnBack } from "../platform/overlayBack";
import { backupFileName, createBackup, parseBackup, type ParsedBackup } from "../storage/backup";
import { Button, ConfirmDialog } from "../ui";

interface Props {
  /** 복원한 내용을 저장하고 화면 상태를 맞춘다. */
  onRestore(backup: ParsedBackup): Promise<void>;
}

/** 데이터는 이 브라우저에만 있으므로 파일로 받아 두고 다른 기기나 브라우저에서 되살린다. */
export function BackupScreen({ onRestore }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useCloseOnBack(pending !== null, () => setPending(null));

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = toBase64Utf8(await createBackup(new Date()));
      await deliverFile({ data, fileName: backupFileName(new Date()), mimeType: "application/json" }, { share: true });
    } catch {
      setError("백업 파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const parsed = parseBackup(await file.text());
    if (parsed.ok) setPending(parsed.backup);
    else setError(parsed.reason);
  };

  const restore = async () => {
    if (!pending) return;
    const backup = pending;
    setPending(null);
    setBusy(true);
    setError(null);
    try {
      await onRestore(backup);
    } catch {
      setError("복원하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  return (
    <section className="backup-screen">
      <h1 className="page-title">데이터 백업</h1>
      <p className="section-desc">
        턴캘의 데이터는 이 브라우저에만 저장돼요. 브라우저 데이터를 지우거나 기기를 바꾸면 사라지니 파일로 받아 두세요.
      </p>

      <section className="section">
        <h2 className="section-title">백업 파일 받기</h2>
        <p className="section-desc">근무 패턴·이름·설정·메모가 모두 들어 있으니 보관에 유의해 주세요.</p>
        <Button size="large" display="full" loading={busy} onClick={() => void download()}>
          백업 파일 받기
        </Button>
      </section>

      <section className="section">
        <h2 className="section-title">복원하기</h2>
        <p className="section-desc">받아 둔 백업 파일을 고르면 지금 데이터를 파일 내용으로 바꿔요.</p>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="backup-file-input"
          aria-label="백업 파일 선택"
          onChange={(event) => {
            void pickFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button size="large" variant="weak" display="full" disabled={busy} onClick={() => fileInput.current?.click()}>
          백업 파일 고르기
        </Button>
      </section>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="이 백업으로 복원할까요?"
        description="지금 브라우저에 있는 데이터가 백업 파일의 내용으로 바뀌어요. 되돌릴 수 없어요."
        onClose={() => setPending(null)}
        cancelButton={<ConfirmDialog.CancelButton onClick={() => setPending(null)}>취소</ConfirmDialog.CancelButton>}
        confirmButton={<ConfirmDialog.ConfirmButton onClick={() => void restore()}>복원하기</ConfirmDialog.ConfirmButton>}
      />
    </section>
  );
}
