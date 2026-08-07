import type { ReactNode } from "react";

type SearchableOption = {
  label: string;
  value: string;
};

type SearchableSelectProps = {
  disabled?: boolean;
  emptyMessage: string;
  id: string;
  invalidMessage?: string;
  inputValue: string;
  isInvalid?: boolean;
  label: string;
  labelAction?: ReactNode;
  onBlur?: () => void;
  options: readonly SearchableOption[];
  placeholder: string;
  onInputValueChange: (value: string) => void;
  onSelectionChange: (value: string | undefined) => void;
};

export function SearchableSelect({
  disabled = false,
  emptyMessage,
  id,
  invalidMessage,
  inputValue,
  isInvalid = false,
  label,
  labelAction,
  onBlur,
  options,
  placeholder,
  onInputValueChange,
  onSelectionChange,
}: SearchableSelectProps) {
  const errorId = `${id}-error`;
  const listId = `${id}-options`;
  const normalizedInput = normalizeSearchValue(inputValue);
  const matchingOptions = options.filter((option) =>
    normalizeSearchValue(option.label).includes(normalizedInput),
  );
  const hasNoMatchingOptions = inputValue.length > 0 && matchingOptions.length === 0;

  function handleChange(value: string) {
    onInputValueChange(value);
    onSelectionChange(options.find((option) => option.label === value)?.value);
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor={id}>
          {label}
        </label>
        {labelAction}
      </div>
      <input
        aria-describedby={isInvalid ? errorId : undefined}
        aria-invalid={isInvalid || undefined}
        className={`w-full rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] disabled:cursor-not-allowed disabled:bg-slate-100 ${
          isInvalid ? "border-red-500" : "border-[var(--border)]"
        }`}
        disabled={disabled}
        id={id}
        list={listId}
        onBlur={onBlur}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={inputValue}
      />
      <datalist id={listId}>
        {matchingOptions.map((option) => (
          <option key={option.value} value={option.label} />
        ))}
      </datalist>
      {isInvalid && invalidMessage !== undefined ? (
        <p aria-live="polite" className="mt-2 text-sm text-red-700" id={errorId}>
          {invalidMessage}
        </p>
      ) : null}
      {options.length === 0 || hasNoMatchingOptions ? (
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{emptyMessage}</p>
      ) : null}
    </div>
  );
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}
