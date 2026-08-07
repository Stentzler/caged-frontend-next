import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { getPublicSiteConfiguration } from "@/config/public-site";

export async function Footer() {
  await connection();

  const t = await getTranslations("Footer");
  const publicSite = getPublicSiteConfiguration();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-7 px-4 py-8 text-center text-sm text-[var(--muted-foreground)] sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-1">
          <p>{t("disclaimerIntro")}</p>
          <p>{t("disclaimerSource")}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {publicSite.officialSourceUrl !== undefined ? (
            <a className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline" href={publicSite.officialSourceUrl} rel="noreferrer" target="_blank">
              {t("officialSource")}
            </a>
          ) : null}
          {publicSite.githubUrl !== undefined ? (
            <a className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline" href={publicSite.githubUrl} rel="noreferrer" target="_blank">
              {t("github")}
            </a>
          ) : null}
          {publicSite.contactEmail !== undefined ? (
            <a className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline" href={`mailto:${publicSite.contactEmail}`}>
              {t("contact")}
            </a>
          ) : null}
        </div>
        <p className="font-bold text-[var(--foreground)]">{t("copyright", { year: currentYear })}</p>
      </div>
    </footer>
  );
}
