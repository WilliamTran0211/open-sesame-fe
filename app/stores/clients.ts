import { defineStore } from "pinia";
import {
  apiFetch,
  getErrorStatus,
  trackRequest,
  type ApiRequestOptions,
} from "~/utils/api";
import type { OAuthClient, OAuthClientPayload } from "~/utils/oauth";

type RevealedSecret = {
  clientId: string;
  secret: string;
};

export const useClientsStore = defineStore("clients", () => {
  const clients = ref<OAuthClient[]>([]);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const error = ref("");
  // A plaintext secret is only returned once (create / rotate); keep it until the
  // detail page has shown it, then drop it.
  const revealedSecret = ref<RevealedSecret | null>(null);

  async function request<T>(path: string, options: ApiRequestOptions = {}) {
    try {
      return await apiFetch<T>(`/clients${path}`, options);
    } catch (requestError) {
      // Client management is session-only; an expired session means signing in again.
      if (getErrorStatus(requestError) === 401) {
        useAuthStore().user = null;
        await navigateTo({
          path: "/login",
          query: { redirect: useRoute().fullPath },
        });
      }

      throw requestError;
    }
  }

  function upsert(client: OAuthClient) {
    const index = clients.value.findIndex(
      (item) => item.client_id === client.client_id,
    );

    if (index === -1) {
      clients.value.unshift(client);
    } else {
      clients.value[index] = client;
    }
  }

  function findClient(clientId: string) {
    return clients.value.find((item) => item.client_id === clientId) || null;
  }

  async function fetchClients() {
    const list = await trackRequest(
      { pending: isLoading, error },
      () => request<OAuthClient[]>("/"),
      "clients.errors.load",
    );

    if (list) {
      clients.value = list;
    }
  }

  async function fetchClient(clientId: string) {
    const client = await trackRequest(
      { pending: isLoading, error },
      () => request<OAuthClient>(`/${encodeURIComponent(clientId)}`),
      "clients.errors.loadOne",
    );

    if (client) {
      upsert(client);
    }

    return client;
  }

  function mutate<T>(action: () => Promise<T>, fallbackKey: string) {
    return trackRequest({ pending: isSaving, error }, action, fallbackKey);
  }

  function createClient(payload: OAuthClientPayload) {
    return mutate(async () => {
      const created = await request<OAuthClient & { client_secret: string | null }>(
        "/",
        { method: "POST", body: payload },
      );
      const { client_secret: secret, ...client } = created;

      upsert(client);

      if (secret) {
        revealedSecret.value = { clientId: client.client_id, secret };
      }

      return client;
    }, "clients.errors.create");
  }

  function updateClient(clientId: string, payload: Partial<OAuthClientPayload>) {
    return mutate(async () => {
      const client = await request<OAuthClient>(
        `/${encodeURIComponent(clientId)}`,
        { method: "PATCH", body: payload },
      );
      upsert(client);
      return client;
    }, "clients.errors.update");
  }

  function rotateSecret(clientId: string) {
    return mutate(async () => {
      const { client_secret: secret } = await request<{ client_secret: string }>(
        `/${encodeURIComponent(clientId)}/rotate-secret`,
        { method: "POST" },
      );
      revealedSecret.value = { clientId, secret };
      return secret;
    }, "clients.errors.rotate");
  }

  function setActive(clientId: string, active: boolean) {
    return mutate(async () => {
      const client = await request<OAuthClient>(
        active
          ? `/${encodeURIComponent(clientId)}/activate`
          : `/${encodeURIComponent(clientId)}`,
        { method: active ? "POST" : "DELETE" },
      );
      upsert(client);
      return client;
    }, active ? "clients.errors.activate" : "clients.errors.deactivate");
  }

  function takeRevealedSecret(clientId: string) {
    if (revealedSecret.value?.clientId !== clientId) {
      return null;
    }

    const { secret } = revealedSecret.value;
    revealedSecret.value = null;
    return secret;
  }

  return {
    clients,
    isLoading,
    isSaving,
    error,
    findClient,
    fetchClients,
    fetchClient,
    createClient,
    updateClient,
    rotateSecret,
    setActive,
    takeRevealedSecret,
  };
});
