import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getSiteUrl } from "@/config/seo";
import { routing } from "@/i18n/routing";
import "../globals.css";

export const instant = false;

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: getSiteUrl(),
    icons: {
      icon: {
        type: "image/svg+xml",
        url: "/favicon.svg",
      },
    },
    openGraph: {
      siteName: t("title"),
      type: "website",
    },
    robots: {
      follow: true,
      index: true,
    },
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
    description: t("description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const siteUrl = getSiteUrl();
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    description: t("description"),
    inLanguage: locale,
    name: t("title"),
    url: siteUrl.toString(),
  }).replace(/</g, "\\u003c");

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <script dangerouslySetInnerHTML={{ __html: structuredData }} type="application/ld+json" />
        <NextIntlClientProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
