import { defineStore } from "pinia";
import { getErrorMessage } from "~/utils/api";
import type { OAuthScope } from "~/utils/oauth";

// Active scopes a client may be granted. Readable by any signed-in user;
// create / update / deactivate are superuser-only.
export const useScopesStore = defineStore("scopes", () => {
  const scopes = ref<OAuthScope[]>([]);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const loaded = ref(false);
  const error = ref("");

  function t(key: string) {
    return useNuxtApp().$i18n.t(key);
  }

  async function fetchScopes(force = false) {
    if ((loaded.value && !force) || isLoading.value) {
      return;
    }

    const config = useRuntimeConfig();
    isLoading.value = true;
    error.value = "";

    try {
      scopes.value = await $fetch<OAuthScope[]>(
        `${config.public.apiBaseUrl}/scopes/list`,
        { credentials: "include" },
      );
      loaded.value = true;
    } catch (requestError) {
      error.value = getErrorMessage(requestError, t("scopes.errors.load"));
    } finally {
      isLoading.value = false;
    }
  }

  // The list endpoint only returns active scopes, so it is patched locally from the response.
  async function mutate(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body: object | undefined,
    fallbackKey: string,
  ) {
    const config = useRuntimeConfig();
    isSaving.value = true;
    error.value = "";

    try {
      const scope = await $fetch<OAuthScope>(
        `${config.public.apiBaseUrl}/scopes${path}`,
        { method, body, credentials: "include" },
      );
      const others = scopes.value.filter((item) => item.name !== scope.name);

      scopes.value = scope.is_active
        ? [...others, scope].sort((a, b) => a.name.localeCompare(b.name))
        : others;

      return scope;
    } catch (requestError) {
      error.value = getErrorMessage(requestError, t(fallbackKey));
      return null;
    } finally {
      isSaving.value = false;
    }
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
