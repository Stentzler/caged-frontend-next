import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt-BR", "en"],
  defaultLocale: "pt-BR",
  localePrefix: "always",
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/occupations": {
      "pt-BR": "/ocupacoes",
      en: "/occupations",
    },
    "/about": {
      "pt-BR": "/sobre",
      en: "/about",
    },
  },
});
