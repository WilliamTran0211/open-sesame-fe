import { apiFetch } from "~/utils/api";
import type { OAuthClientInfo } from "~/utils/oauth";

// Looks up the app asking for access so the consent screen can name it.
// The API only exposes clients to their owner today, so a failed lookup is
// expected: the screen falls back to the raw client_id and marks it unverified.
export function useOAuthClient() {
  const client = ref<OAuthClientInfo | null>(null);
  const isLoading = ref(false);

  async function load(clientId: string) {
    isLoading.value = true;

    try {
      client.value = await apiFetch<OAuthClientInfo>(
        `/clients/${encodeURIComponent(clientId)}`,
      );
    } catch {
      client.value = null;
    } finally {
      isLoading.value = false;
    }

    return client.value;
  }

  return { client, isLoading, load };
}
