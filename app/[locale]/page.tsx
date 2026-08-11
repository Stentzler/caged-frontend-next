import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { QueryForm } from "@/components/filters/query-form";
import { createPageMetadata } from "@/config/seo";
import occupationalFamilies from "@/data/cbo-occupational-families.json";
import geography from "@/data/caged-geography.json";
import { routing } from "@/i18n/routing";
import { loadDatasetCatalog } from "@/server/caged/dataset-catalog-service";

type HomePageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  return createPageMetadata({
    description: t("homeDescription"),
    locale,
    page: "home",
    title: t("homeTitle"),
  });
}

export default async function HomePage() {
  const [t, catalogResult] = await Promise.all([
    getTranslations("Home"),
    loadDatasetCatalog(),
  ]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="max-w-3xl space-y-6">
        <p className="text-sm font-bold tracking-[0.16em] text-[var(--primary)] uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
          {t("description")}
        </p>
      </div>
      <QueryForm
        initialCatalog={catalogResult.ok ? catalogResult.data : undefined}
        occupationalFamilies={occupationalFamilies}
        states={geography.states}
      />
    </section>
  );
}
