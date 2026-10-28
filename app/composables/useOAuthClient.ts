import { oauthApi } from "~/services/oauth";
import { getErrorStatus } from "~/utils/api";
import type { OAuthClientPublicInfo } from "~/utils/oauth";

// Looks up the app asking for access so the consent screen can name it.
export function useOAuthClient() {
  const client = ref<OAuthClientPublicInfo | null>(null);
  const isLoading = ref(false);
  // The API answers 404 for an unknown app and for a disabled one alike.
  const unavailable = ref(false);

  async function load(clientId: string, redirectUri: string) {
    isLoading.value = true;
    unavailable.value = false;

    try {
      client.value = await oauthApi.clientInfo(clientId, redirectUri);
    } catch (requestError) {
      client.value = null;
      unavailable.value = getErrorStatus(requestError) === 404;
    } finally {
      isLoading.value = false;
    }

    return client.value;
  }

  return { client, isLoading, unavailable, load };
}
