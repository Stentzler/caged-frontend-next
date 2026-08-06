"use client";

import { useTranslations } from "next-intl";

type ErrorPageProps = Readonly<{
  reset: () => void;
}>;

export default function ErrorPage({ reset }: ErrorPageProps) {
  const t = useTranslations("Status");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">{t("errorTitle")}</h1>
      <p className="mt-3 max-w-xl text-[var(--muted-foreground)]">{t("errorDescription")}</p>
      <button className="mt-6 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)]" onClick={reset} type="button">
        {t("retry")}
      </button>
    </div>
  );
}
