import "server-only";

import type { Metadata } from "next";
import { z } from "zod";

const defaultSiteUrl = "https://dataempregos.stentzler.com.br";

const seoEnvironmentSchema = z.object({
  SITE_URL: z.url().optional(),
});

export const seoPages = ["home", "occupations", "about"] as const;

export type SeoPage = (typeof seoPages)[number];
export type SeoLocale = "pt-BR" | "en";

const localizedPagePaths: Record<SeoLocale, Record<SeoPage, string>> = {
  "pt-BR": {
    about: "/pt-BR/sobre",
    home: "/pt-BR",
    occupations: "/pt-BR/ocupacoes",
  },
  en: {
    about: "/en/about",
    home: "/en",
    occupations: "/en/occupations",
  },
};

export function getSiteUrl(): URL {
  const parsedEnvironment = seoEnvironmentSchema.safeParse(process.env);

  if (!parsedEnvironment.success) {
    throw new Error("Invalid SEO configuration");
  }

  return new URL(parsedEnvironment.data.SITE_URL ?? defaultSiteUrl);
}

export function getLocalizedPagePath(locale: SeoLocale, page: SeoPage): string {
  return localizedPagePaths[locale][page];
}

export function getLocalizedPageAlternates(page: SeoPage): Record<string, string> {
  const siteUrl = getSiteUrl();
  const portuguesePath = getLocalizedPagePath("pt-BR", page);

  return {
    en: new URL(getLocalizedPagePath("en", page), siteUrl).toString(),
    "pt-BR": new URL(portuguesePath, siteUrl).toString(),
    "x-default": new URL(page === "home" ? "/" : portuguesePath, siteUrl).toString(),
  };
}

type PageMetadataInput = {
  description: string;
  locale: SeoLocale;
  page: SeoPage;
  title: string;
};

export function createPageMetadata({
  description,
  locale,
  page,
  title,
}: PageMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const path = getLocalizedPagePath(locale, page);
  const url = new URL(path, siteUrl).toString();

  return {
    alternates: {
      canonical: url,
      languages: getLocalizedPageAlternates(page),
    },
    description,
    openGraph: {
      description,
      locale: locale === "pt-BR" ? "pt_BR" : "en_US",
      siteName: "DataEmpregos",
      title,
      type: "website",
      url,
    },
    title,
    twitter: {
      card: "summary",
      description,
      title,
    },
  };
}
