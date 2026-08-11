import type { MetadataRoute } from "next";
import { connection } from "next/server";
import {
  getLocalizedPageAlternates,
  getLocalizedPagePath,
  getSiteUrl,
  seoPages,
  type SeoLocale,
} from "@/config/seo";

const seoLocales: SeoLocale[] = ["pt-BR", "en"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The EC2 host supplies SITE_URL at runtime, after the Docker image is built.
  await connection();

  const siteUrl = getSiteUrl();

  return seoPages.flatMap((page) =>
    seoLocales.map((locale) => ({
      alternates: { languages: getLocalizedPageAlternates(page) },
      url: new URL(getLocalizedPagePath(locale, page), siteUrl).toString(),
    })),
  );
}
