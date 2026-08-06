import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Navigation } from "./navigation";

export function Header() {
  const t = useTranslations("Brand");

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="text-lg font-bold tracking-tight text-[var(--foreground)]" href="/">
          {t("name")}
        </Link>
        <Navigation />
      </div>
    </header>
  );
}
