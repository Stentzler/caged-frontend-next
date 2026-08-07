import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { getPublicSiteConfiguration } from "@/config/public-site";

export const instant = false;

export default async function AboutPage() {
  await connection();

  const t = await getTranslations("About");
  const publicSite = getPublicSiteConfiguration();
  const statements = [
    "dataset",
    "grouping",
    "movements",
    "cltCoverage",
    "salary",
    "revisions",
  ] as const;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
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
        <ul className="list-disc space-y-4 pl-5 text-base leading-7 text-[var(--muted-foreground)]">
          {statements.map((statement) => (
            <li key={statement}>{t(statement)}</li>
          ))}
        </ul>
        <p className="font-bold text-[var(--foreground)] uppercase">{t("independence")}</p>
        {publicSite.officialSourceUrl !== undefined ? (
          <div className="flex justify-center">
            <a className="inline-flex rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)]" href={publicSite.officialSourceUrl} rel="noreferrer" target="_blank">
              {t("officialSource")}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
