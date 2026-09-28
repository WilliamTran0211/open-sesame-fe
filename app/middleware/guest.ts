import { resolveLoginRedirect } from "~/utils/oauth";

export default defineNuxtRouteMiddleware(async (to) => {
  // The session cookie belongs to the API origin, so only the browser can check it.
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();
  const isAuthenticated = await auth.ensureSession();

  if (!isAuthenticated && to.path === "/") {
    return navigateTo("/login");
  }

  if (isAuthenticated && (to.path === "/" || to.path === "/login")) {
    const config = useRuntimeConfig();
    return navigateTo(
      resolveLoginRedirect(to.query, config.public.apiBaseUrl) || "/dashboard",
    );
  }
});
