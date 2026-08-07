import "server-only";

import { z } from "zod";

const publicSiteEnvironmentSchema = z.object({
  SITE_CONTACT_EMAIL: z.email().optional(),
  SITE_CBO_SOURCE_URL: z.url().optional(),
  SITE_GITHUB_URL: z.url().optional(),
  SITE_OFFICIAL_SOURCE_URL: z.url().optional(),
});

export type PublicSiteConfiguration = {
  contactEmail?: string;
  cboSourceUrl?: string;
  githubUrl?: string;
  officialSourceUrl?: string;
};

export function getPublicSiteConfiguration(): PublicSiteConfiguration {
  const parsedEnvironment = publicSiteEnvironmentSchema.safeParse(process.env);

  if (!parsedEnvironment.success) {
    throw new Error("Invalid public site configuration");
  }

  const configuration = {
    contactEmail: parsedEnvironment.data.SITE_CONTACT_EMAIL,
    cboSourceUrl: parsedEnvironment.data.SITE_CBO_SOURCE_URL,
    githubUrl: parsedEnvironment.data.SITE_GITHUB_URL,
    officialSourceUrl: parsedEnvironment.data.SITE_OFFICIAL_SOURCE_URL,
  };

  if (
    process.env.NODE_ENV === "production" &&
    (configuration.contactEmail === undefined ||
      configuration.cboSourceUrl === undefined ||
      configuration.githubUrl === undefined ||
      configuration.officialSourceUrl === undefined)
  ) {
    throw new Error("Missing public site configuration");
  }

  return configuration;
}
