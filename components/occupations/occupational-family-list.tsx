"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type OccupationalFamilyListProps = {
  familyTitles: readonly string[];
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

export function OccupationalFamilyList({
  familyTitles,
}: OccupationalFamilyListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const t = useTranslations("Occupations");

  const matchingTitles = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm.trim());

    if (normalizedSearchTerm.length === 0) {
      return familyTitles;
    }

    return familyTitles.filter((title) =>
      normalizeSearchText(title).includes(normalizedSearchTerm),
    );
  }, [familyTitles, searchTerm]);

  return (
    <section aria-labelledby="occupational-family-list-title" className="mt-10">
      <h2 className="sr-only" id="occupational-family-list-title">
        {t("listTitle")}
      </h2>
      <div className="max-w-2xl">
        <label
          className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
          htmlFor="occupational-family-search"
        >
          {t("searchLabel")}
        </label>
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
          id="occupational-family-search"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t("searchPlaceholder")}
          type="search"
          value={searchTerm}
        />
      </div>

      <p aria-live="polite" className="mt-4 text-sm text-[var(--muted-foreground)]">
        {t("resultCount", { count: matchingTitles.length })}
      </p>

      {matchingTitles.length > 0 ? (
        <ul className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {matchingTitles.map((title) => (
            <li className="px-4 py-3 text-sm leading-6 text-[var(--foreground)]" key={title}>
              {title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-[var(--muted-foreground)]">
          {t("emptyState")}
        </p>
      )}
    </section>
  );
}
