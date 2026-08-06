import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-[var(--muted-foreground)] sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
        <div className="max-w-2xl space-y-2">
          <p>{t("disclaimer")}</p>
          <p>{t("copyright", { year: currentYear })}</p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <a className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline" href="https://pdet.mte.gov.br/novo-caged" rel="noreferrer" target="_blank">
            {t("officialSource")}
          </a>
          <a className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline" href="https://github.com/Stentzler" rel="noreferrer" target="_blank">
            {t("github")}
          </a>
        </div>
      </div>
    </footer>
  );
}
