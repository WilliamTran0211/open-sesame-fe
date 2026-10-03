import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";

// The API runs on https://localhost and sets a Secure, SameSite=Lax session cookie.
// The app has to be served over https too: http and https on the same host count
// as different sites, so the browser would drop that cookie.
const devSslKey = process.env.DEV_SSL_KEY;
const devSslCert = process.env.DEV_SSL_CERT;

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  ssr: true,
  devtools: { enabled: true },
  devServer:
    devSslKey && devSslCert
      ? { https: { key: resolve(devSslKey), cert: resolve(devSslCert) } }
      : {},
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
  // Components are grouped in folders by role; their names stay the file names.
  components: [{ path: "~/components", pathPrefix: false }],
  // Auth is only known in the browser, so don't server-render protected pages.
  routeRules: {
    "/**": {
      headers: {
        // No page may be framed: an embedded consent screen could be clickjacked into "Allow".
        // No plugins, no <base> hijacking, and forms may only post back to this site.
        "Content-Security-Policy":
          "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
        "X-Frame-Options": "DENY",
        // Authorize URLs carry state and PKCE values; don't leak them to other sites.
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        // Pages this app opens can't script it back through window.opener.
        "Cross-Origin-Opener-Policy": "same-origin",
        // HSTS belongs on the production proxy; on localhost it would pin every local app to https.
      },
    },
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
