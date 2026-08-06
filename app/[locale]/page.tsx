import { useTranslations } from "next-intl";
import { QueryForm } from "@/components/filters/query-form";
import occupationalFamilies from "@/data/cbo-occupational-families.json";
import geography from "@/data/caged-geography.json";

export default function HomePage() {
  const t = useTranslations("Home");

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
      <QueryForm occupationalFamilies={occupationalFamilies} states={geography.states} />
    </section>
  );
}
