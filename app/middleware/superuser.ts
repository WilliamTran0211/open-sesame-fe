export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();
  const signedIn = await auth.ensureSession();

  // The server couldn't reach the API to check; let the browser decide.
  if (import.meta.server && !auth.sessionChecked) {
    return;
  }

  if (!signedIn) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }

  if (!auth.user?.is_superuser) {
    return navigateTo("/dashboard");
  }
});
