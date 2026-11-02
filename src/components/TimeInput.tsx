interface Props {
  label: string;
  value: string;
  onChange(value: string): void;
  hasError?: boolean;
}

/**
 * 시간(HH:MM) 입력. 브라우저 기본 시간 선택을 쓴다.
 */
export function TimeInput({ label, value, onChange, hasError }: Props) {
  return (
    <label className={`time-input${hasError ? " has-error" : ""}`}>
      <span className="time-input-label">{label}</span>
      <input type="time" value={value} onChange={(event) => onChange(event.target.value)} />
      {value && (
        <button type="button" className="time-clear" onClick={() => onChange("")}>
          지우기
        </button>
      )}
    </label>
  );
}
