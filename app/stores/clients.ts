import { defineStore } from "pinia";
import { clientsApi } from "~/services/clients";
import { trackRequest } from "~/utils/api";
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

  function load<T>(action: () => Promise<T>, fallbackKey: string) {
    return trackRequest({ pending: isLoading, error }, action, fallbackKey);
  }

  function mutate<T>(action: () => Promise<T>, fallbackKey: string) {
    return trackRequest({ pending: isSaving, error }, action, fallbackKey);
  }

  async function fetchClients() {
    const list = await load(clientsApi.list, "clients.errors.load");

    if (list) {
      clients.value = list;
    }
  }

  async function fetchClient(clientId: string) {
    const client = await load(() => clientsApi.get(clientId), "clients.errors.loadOne");

    if (client) {
      upsert(client);
    }

    return client;
  }

  function createClient(payload: OAuthClientPayload) {
    return mutate(async () => {
      const { client_secret: secret, ...client } = await clientsApi.create(payload);

      upsert(client);

      if (secret) {
        revealedSecret.value = { clientId: client.client_id, secret };
      }

      return client;
    }, "clients.errors.create");
  }

  function updateClient(clientId: string, payload: Partial<OAuthClientPayload>) {
    return mutate(async () => {
      const client = await clientsApi.update(clientId, payload);
      upsert(client);
      return client;
    }, "clients.errors.update");
  }

  function rotateSecret(clientId: string) {
    return mutate(async () => {
      const { client_secret: secret } = await clientsApi.rotateSecret(clientId);
      revealedSecret.value = { clientId, secret };
      return secret;
    }, "clients.errors.rotate");
  }

  function setActive(clientId: string, active: boolean) {
    return mutate(async () => {
      const client = active
        ? await clientsApi.activate(clientId)
        : await clientsApi.deactivate(clientId);
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
