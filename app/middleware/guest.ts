import { resolveLoginRedirect } from "~/utils/oauth";

export default defineNuxtRouteMiddleware(async (to) => {
  // The session cookie belongs to the API origin, so only the browser can check it.
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();
  const isAuthenticated = await auth.ensureSession();

  // Guests see the landing page at "/"; signed-in users go straight to their workspace.
  if (isAuthenticated && (to.path === "/" || to.path === "/login")) {
    const config = useRuntimeConfig();
    return navigateTo(
      resolveLoginRedirect(to.query, config.public.apiBaseUrl) || "/dashboard",
    );
  }
});
