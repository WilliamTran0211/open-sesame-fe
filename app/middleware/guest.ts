import { resolveLoginRedirect } from "~/utils/oauth";

export default defineNuxtRouteMiddleware(async (to) => {
  // Runs on the server too: it forwards the session cookie to the API, so the first
  // response is already the right page (or a redirect) instead of a guess.
  const auth = useAuthStore();
  const isAuthenticated = await auth.ensureSession();

  // Guests see the landing page at "/"; signed-in users go straight to their workspace.
  if (isAuthenticated && (to.path === "/" || to.path === "/login")) {
    const config = useRuntimeConfig();
    return useAfterSignIn()(resolveLoginRedirect(to.query, config.public.apiBaseUrl));
  }
});
