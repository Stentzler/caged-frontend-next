import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSiteUrl } from "@/config/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // The EC2 host supplies SITE_URL at runtime, after the Docker image is built.
  await connection();

  return {
    rules: {
      allow: "/",
      disallow: "/health",
      userAgent: "*",
    },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).toString(),
  };
}
