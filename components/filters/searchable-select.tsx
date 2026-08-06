type SearchableOption = {
  label: string;
  value: string;
};

type SearchableSelectProps = {
  disabled?: boolean;
  emptyMessage: string;
  id: string;
  inputValue: string;
  label: string;
  options: readonly SearchableOption[];
  placeholder: string;
  onInputValueChange: (value: string) => void;
  onSelectionChange: (value: string | undefined) => void;
};

export function SearchableSelect({
  disabled = false,
  emptyMessage,
  id,
  inputValue,
  label,
  options,
  placeholder,
  onInputValueChange,
  onSelectionChange,
}: SearchableSelectProps) {
  const listId = `${id}-options`;

  function handleChange(value: string) {
    onInputValueChange(value);
    onSelectionChange(options.find((option) => option.label === value)?.value);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]" htmlFor={id}>
        {label}
      </label>
      <input
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] disabled:cursor-not-allowed disabled:bg-slate-100"
        disabled={disabled}
        id={id}
        list={listId}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={inputValue}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.value} value={option.label} />
        ))}
      </datalist>
      {options.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{emptyMessage}</p>
      ) : null}
    </div>
  );
}
