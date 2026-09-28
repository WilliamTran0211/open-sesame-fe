import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  ssr: true,
  devtools: { enabled: true },
  modules: ["@pinia/nuxt", "@nuxtjs/i18n"],
  i18n: {
    defaultLocale: "en",
    locales: [{ code: "en", file: "en.json", name: "English" }],
    langDir: "locales",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  css: ["~/assets/css/main.css"],
  // Auth is only known in the browser, so don't server-render protected pages.
  routeRules: {
    "/dashboard": { ssr: false },
    "/dashboard/**": { ssr: false },
    "/success": { ssr: false },
    // The pending email lives in localStorage, so it's only readable in the browser.
    "/verify": { ssr: false },
    "/oauth/**": { ssr: false },
  },
  runtimeConfig: {
    public: {
      appName: "Open-sesame",
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL || "https://localhost:8000/api/v1",
    },
  },
});
