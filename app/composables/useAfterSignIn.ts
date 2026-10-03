import { signInDestination } from "~/utils/oauth";

// Leaves the sign-in flow for `target` (an in-app path from resolveLoginRedirect),
// or `fallback` when there is none. OAuth consent requests go back through the API.
export function useAfterSignIn() {
  const config = useRuntimeConfig();

  return (target: string | null | undefined, fallback = "/dashboard") => {
    const { url, external } = signInDestination(
      target || fallback,
      config.public.apiBaseUrl,
    );
    return navigateTo(url, { external });
  };
}
