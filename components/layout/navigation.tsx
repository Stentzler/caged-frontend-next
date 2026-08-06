"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

const navigationItems = [
  { href: "/", labelKey: "home" },
  { href: "/occupations", labelKey: "occupations" },
  { href: "/about", labelKey: "about" },
] as const;

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Navigation");

  const alternateLocale = locale === "pt-BR" ? "en" : "pt-BR";
  const alternateLanguage =
    alternateLocale === "pt-BR" ? t("portuguese") : t("english");
  const alternateFlag = alternateLocale === "pt-BR" ? "🇧🇷" : "🇬🇧";

  function changeLocale() {
    router.replace(pathname, { locale: alternateLocale });
  }

  return (
    <div className="flex items-center gap-2">
      <nav
        aria-label={t("primaryLabel")}
        id="primary-navigation"
        className={`${
          isMenuOpen ? "flex" : "hidden"
        } absolute inset-x-4 top-20 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg md:static md:flex md:flex-row md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {navigationItems.map(({ href, labelKey }) => (
          <Link
            aria-current={pathname === href ? "page" : undefined}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] transition hover:bg-slate-100 hover:text-[var(--foreground)]"
            href={href}
            key={href}
            onClick={() => setIsMenuOpen(false)}
          >
            {t(labelKey)}
          </Link>
        ))}
        <button
          aria-label={t("switchLocaleLabel", { language: alternateLanguage })}
          className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--primary)] transition hover:bg-blue-50"
          onClick={changeLocale}
          type="button"
        >
          <span aria-hidden="true" className="flex items-center gap-1.5">
            {t("switchLocale", { flag: alternateFlag })}
          </span>
        </button>
      </nav>
      <button
        aria-controls="primary-navigation"
        aria-expanded={isMenuOpen}
        className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--foreground)] md:hidden"
        onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
        type="button"
      >
        {isMenuOpen ? t("closeMenu") : t("openMenu")}
      </button>
    </div>
  );
}
