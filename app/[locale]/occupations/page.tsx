import { useTranslations } from "next-intl";

export default function OccupationsPage() {
  const t = useTranslations("Occupations");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="max-w-3xl space-y-6">
        <p className="text-sm font-bold tracking-[0.16em] text-[var(--primary)] uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)]">
          {t("title")}
        </h1>
        <p className="text-lg leading-8 text-[var(--muted-foreground)]">
          {t("description")}
        </p>
      </div>
    </section>
  );
}
