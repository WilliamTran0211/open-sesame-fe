import { defineStore } from "pinia";
import { apiFetch, trackRequest } from "~/utils/api";
import type { OAuthScope } from "~/utils/oauth";

// Active scopes a client may be granted. Readable by any signed-in user;
// create / update / deactivate are superuser-only.
export const useScopesStore = defineStore("scopes", () => {
  const scopes = ref<OAuthScope[]>([]);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const loaded = ref(false);
  const error = ref("");

  async function fetchScopes(force = false) {
    if ((loaded.value && !force) || isLoading.value) {
      return;
    }

    const list = await trackRequest(
      { pending: isLoading, error },
      () => apiFetch<OAuthScope[]>("/scopes/list"),
      "scopes.errors.load",
    );

    if (list) {
      scopes.value = list;
      loaded.value = true;
    }
  }

  // The list endpoint only returns active scopes, so it is patched locally from the response.
  async function mutate(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body: object | undefined,
    fallbackKey: string,
  ) {
    const scope = await trackRequest(
      { pending: isSaving, error },
      () => apiFetch<OAuthScope>(`/scopes${path}`, { method, body }),
      fallbackKey,
    );

    if (scope) {
      const others = scopes.value.filter((item) => item.name !== scope.name);

      scopes.value = scope.is_active
        ? [...others, scope].sort((a, b) => a.name.localeCompare(b.name))
        : others;
    }

    return scope;
  }

  function createScope(name: string, description: string) {
    return mutate("/", "POST", { name, description }, "scopes.errors.create");
  }

  function updateScope(name: string, description: string) {
    return mutate(
      `/${encodeURIComponent(name)}`,
      "PATCH",
      { description },
      "scopes.errors.update",
    );
  }

  function deactivateScope(name: string) {
    return mutate(
      `/${encodeURIComponent(name)}`,
      "DELETE",
      undefined,
      "scopes.errors.deactivate",
    );
  }

  function findScope(name: string) {
    return scopes.value.find((scope) => scope.name === name) || null;
  }

  return {
    scopes,
    isLoading,
    isSaving,
    loaded,
    error,
    fetchScopes,
    createScope,
    updateScope,
    deactivateScope,
    findScope,
  };
});
