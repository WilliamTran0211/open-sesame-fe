export default defineNuxtRouteMiddleware(async (to) => {
  // Runs on the server too: it forwards the session cookie to the API, so the first
  // response is already the right page (or a redirect) instead of a guess.
  const auth = useAuthStore();
  const signedIn = await auth.ensureSession();

  // The server couldn't reach the API to check; let the browser decide.
  if (import.meta.server && !auth.sessionChecked) {
    return;
  }

  if (!signedIn) {
    // Remember where the user was headed (e.g. an OAuth consent) for after sign-in.
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
