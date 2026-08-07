import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("Status");

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <p className="sr-only">{t("loading")}</p>
      <div aria-hidden="true" className="animate-pulse space-y-10 motion-reduce:animate-none">
        <div className="max-w-3xl space-y-5">
          <div className="h-4 w-44 rounded bg-[var(--border)]" />
          <div className="h-12 w-full max-w-2xl rounded bg-[var(--border)]" />
          <div className="space-y-3">
            <div className="h-5 w-full rounded bg-[var(--border)]" />
            <div className="h-5 w-4/5 rounded bg-[var(--border)]" />
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-12 rounded-lg bg-[var(--border)]" />
            <div className="h-12 rounded-lg bg-[var(--border)]" />
            <div className="h-12 rounded-lg bg-[var(--border)]" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-24 rounded bg-[var(--border)]" />
            <div className="h-11 w-full rounded-lg bg-[var(--border)]" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-[var(--border)]" />
            <div className="h-11 w-full rounded-lg bg-[var(--border)]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-11 rounded-lg bg-[var(--border)]" />
            <div className="h-11 rounded-lg bg-[var(--border)]" />
          </div>
          <div className="mx-auto h-11 w-36 rounded-lg bg-[var(--border)]" />
        </div>
      </div>
    </div>
  );
}
