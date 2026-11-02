import { useEffect, useId, useRef, useState, type ChangeEventHandler, type MouseEventHandler, type ReactNode } from "react";

// ---------- 버튼 ----------
interface ButtonProps {
  children: ReactNode;
  size?: "small" | "medium" | "large" | "xlarge";
  variant?: "fill" | "weak";
  color?: "primary" | "danger" | "dark";
  display?: "inline" | "full";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function Button({
  children,
  size = "medium",
  variant = "fill",
  color = "primary",
  display = "inline",
  loading = false,
  disabled = false,
  className,
  onClick,
}: ButtonProps) {
  const classes = ["ui-button", `is-${size}`, `is-${variant}`, `is-${color}`, display === "full" && "is-full", className];
  return (
    <button
      type="button"
      className={classes.filter(Boolean).join(" ")}
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading ? <span className="ui-spinner" aria-label="처리 중" /> : children}
    </button>
  );
}

export function TextButton({ children, disabled, onClick }: { children: ReactNode; size?: "small"; disabled?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className="ui-text-button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

// ---------- 모달 ----------
/** 네이티브 dialog로 포커스 가두기·Esc를 처리한다. 뒤로가기 처리는 쓰는 쪽의 useCloseOnBack이 맡는다. */
function Modal({
  open,
  onClose,
  className,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose(): void;
  className: string;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // 내용은 안쪽 요소가 채우므로 dialog 자체를 누른 경우가 바깥(배경)을 누른 경우다.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ui-modal-body">{children}</div>
    </dialog>
  );
}

function DialogActionButton({ color, children, onClick }: { color?: "primary" | "danger"; children: ReactNode; onClick(): void }) {
  return (
    <Button size="large" display="full" color={color} onClick={onClick}>
      {children}
    </Button>
  );
}

function DialogCancelButton({ children, onClick }: { children: ReactNode; onClick(): void }) {
  return (
    <Button size="large" display="full" variant="weak" color="dark" onClick={onClick}>
      {children}
    </Button>
  );
}

function ConfirmDialogRoot({
  open,
  title,
  description,
  onClose,
  cancelButton,
  confirmButton,
}: {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  onClose(): void;
  cancelButton: ReactNode;
  confirmButton: ReactNode;
}) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={onClose} className="ui-dialog" labelledBy={titleId}>
      <h2 id={titleId} className="ui-dialog-title">
        {title}
      </h2>
      <div className="ui-dialog-description">{description}</div>
      <div className="ui-dialog-actions">
        {cancelButton}
        {confirmButton}
      </div>
    </Modal>
  );
}

export const ConfirmDialog = Object.assign(ConfirmDialogRoot, {
  CancelButton: DialogCancelButton,
  ConfirmButton: DialogActionButton,
});

function BottomSheetRoot({
  open,
  onClose,
  header,
  children,
}: {
  open: boolean;
  onClose(): void;
  header: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={onClose} className="ui-sheet" labelledBy={titleId}>
      <div id={titleId}>{header}</div>
      {children}
    </Modal>
  );
}

function SheetSelect<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: ReadonlyArray<{ name: string; value: T }>;
  value: T;
  onSelect(value: T): void;
}) {
  return (
    <div className="ui-sheet-select" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={`ui-sheet-option${option.value === value ? " is-selected" : ""}`}
          onClick={() => onSelect(option.value)}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Header: ({ children }: { children: ReactNode }) => <h2 className="ui-sheet-title">{children}</h2>,
  Select: SheetSelect,
});

/** 날짜 하나를 고르는 시트. min·max는 YYYY-MM-DD 문자열이다. */
export function DateSheet({
  open,
  title,
  description,
  initial,
  min,
  max,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  description: string;
  initial: string;
  min: string;
  max: string;
  onClose(): void;
  onPick(value: string): void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);
  return (
    <BottomSheet open={open} onClose={onClose} header={<BottomSheet.Header>{title}</BottomSheet.Header>}>
      <div className="ui-date-sheet">
        <p className="section-desc">{description}</p>
        <input
          type="date"
          className="ui-input"
          aria-label={title}
          value={value}
          min={min}
          max={max}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button size="large" display="full" disabled={!value} onClick={() => onPick(value)}>
          이 날짜로 지정
        </Button>
      </div>
    </BottomSheet>
  );
}

// ---------- 입력 ----------
interface FieldProps<E> {
  label: string;
  "aria-label"?: string;
  placeholder?: string;
  value: string;
  maxLength?: number;
  hasError?: boolean;
  help?: ReactNode;
  onChange: ChangeEventHandler<E>;
}

function Field({ id, label, helpId, hasError, help, children }: { id: string; label: string; helpId: string; hasError?: boolean; help?: ReactNode; children: ReactNode }) {
  return (
    <div className={`ui-field${hasError ? " has-error" : ""}`}>
      <label className="ui-field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {help !== undefined && (
        <p id={helpId} className="ui-field-help">
          {help}
        </p>
      )}
    </div>
  );
}

export function TextField({ label, "aria-label": ariaLabel, placeholder, value, maxLength, hasError, help, onChange }: FieldProps<HTMLInputElement>) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <Field id={id} label={label} helpId={helpId} hasError={hasError} help={help}>
      <input
        id={id}
        type="text"
        className="ui-input"
        aria-label={ariaLabel}
        aria-invalid={hasError}
        aria-describedby={help !== undefined ? helpId : undefined}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={onChange}
      />
    </Field>
  );
}

export function TextArea({
  label,
  "aria-label": ariaLabel,
  placeholder,
  value,
  height,
  hasError,
  help,
  onChange,
}: FieldProps<HTMLTextAreaElement> & { height?: number }) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <Field id={id} label={label} helpId={helpId} hasError={hasError} help={help}>
      <textarea
        id={id}
        className="ui-input ui-textarea"
        style={{ height }}
        aria-label={ariaLabel}
        aria-invalid={hasError}
        aria-describedby={help !== undefined ? helpId : undefined}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </Field>
  );
}

export function Switch({ checked, "aria-label": ariaLabel, onChange }: { checked: boolean; "aria-label": string; onChange(checked: boolean): void }) {
  return (
    <label className="ui-switch">
      <input type="checkbox" role="switch" checked={checked} aria-label={ariaLabel} onChange={(event) => onChange(event.target.checked)} />
      <span className="ui-switch-track" aria-hidden="true" />
    </label>
  );
}

export function SegmentedControl<T extends string>({
  "aria-label": ariaLabel,
  value,
  options,
  onChange,
}: {
  "aria-label": string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange(value: T): void;
}) {
  return (
    <div className="ui-segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={`ui-segment${option.value === value ? " is-selected" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ---------- 목록 ----------
export function MenuList({ rows }: { rows: ReadonlyArray<{ top: string; bottom: string; onClick(): void }> }) {
  return (
    <ul className="ui-menu">
      {rows.map((row) => (
        <li key={row.top}>
          <button type="button" className="ui-menu-row" onClick={row.onClick}>
            <span className="ui-menu-text">
              <span className="ui-menu-top">{row.top}</span>
              <span className="ui-menu-bottom">{row.bottom}</span>
            </span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
