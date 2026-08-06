import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("Status");

  return (
    <div aria-live="polite" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">{t("loading")}</p>
    </div>
  );
}
