import { useTranslations } from "next-intl";

export default function AboutPage() {
  const t = useTranslations("About");
  const statements = [
    "dataset",
    "grouping",
    "movements",
    "salary",
    "revisions",
    "independence",
  ] as const;

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="space-y-8">
        <div className="space-y-4">
          <p className="text-sm font-bold tracking-[0.16em] text-[var(--primary)] uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)]">
            {t("title")}
          </h1>
          <p className="text-lg leading-8 text-[var(--muted-foreground)]">
            {t("introduction")}
          </p>
        </div>
        <div className="space-y-4 text-base leading-7 text-[var(--muted-foreground)]">
          {statements.map((statement) => (
            <p key={statement}>{t(statement)}</p>
          ))}
        </div>
        <a className="inline-flex rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)]" href="https://pdet.mte.gov.br/novo-caged" rel="noreferrer" target="_blank">
          {t("officialSource")}
        </a>
      </div>
    </section>
  );
}
