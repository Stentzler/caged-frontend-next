import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { getPublicSiteConfiguration } from "@/config/public-site";
import occupationalFamilies from "@/data/cbo-occupational-families.json";
import { OccupationalFamilyList } from "@/components/occupations/occupational-family-list";

export const instant = false;

export default async function OccupationsPage() {
  await connection();

  const t = await getTranslations("Occupations");
  const publicSite = getPublicSiteConfiguration();
  const familyTitles = occupationalFamilies.map(({ familyTitle }) => familyTitle);

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
        <p className="leading-7 text-[var(--muted-foreground)]">
          <strong className="font-semibold text-[var(--foreground)]">{t("noteLabel")}</strong>{" "}
          {t("note")}
        </p>
        {publicSite.cboSourceUrl !== undefined ? (
          <p className="leading-7 text-[var(--muted-foreground)]">
            {t("sourcePrefix")}{" "}
            <a
              className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
              href={publicSite.cboSourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              {t("sourceLink")}
            </a>
          </p>
        ) : null}
      </div>
      <OccupationalFamilyList familyTitles={familyTitles} />
    </section>
  );
}
