export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();

  if (!(await auth.ensureSession())) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }

  if (!auth.user?.is_superuser) {
    return navigateTo("/dashboard");
  }
});
