export default defineNuxtRouteMiddleware(async (to) => {
  // The session cookie belongs to the API origin, so only the browser can check it.
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();

  if (!(await auth.ensureSession())) {
    // Remember where the user was headed (e.g. an OAuth consent) for after sign-in.
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
