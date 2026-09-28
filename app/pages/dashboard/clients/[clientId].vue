<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

import type { OAuthClientPayload } from "~/utils/oauth";

type PendingAction = "rotate" | "deactivate" | "activate" | null;

const route = useRoute();
const config = useRuntimeConfig();
const clientsStore = useClientsStore();
const { t } = useI18n();

const clientId = computed(() => String(route.params.clientId));
const client = computed(() => clientsStore.findClient(clientId.value));
const isEditing = ref(false);
const secret = ref<string | null>(null);
const pendingAction = ref<PendingAction>(null);
const notice = ref("");
const loadFailed = ref(false);

const authorizeExample = computed(() => {
  if (!client.value) {
    return "";
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: client.value.client_id,
    redirect_uri: client.value.redirect_uris[0] || "https://app.example.com/callback",
    scope: "openid profile email",
    state: "<random-state>",
  });

  if (client.value.require_pkce) {
    params.set("code_challenge", "<S256-challenge>");
    params.set("code_challenge_method", "S256");
  }

  return `${config.public.apiBaseUrl}/oauth/authorize?${params.toString()}`;
});

const dialog = computed(() => {
  switch (pendingAction.value) {
    case "rotate":
      return {
        title: t("clients.rotate.title"),
        message: t("clients.rotate.message"),
        confirm: t("clients.rotate.confirm"),
        danger: true,
      };
    case "deactivate":
      return {
        title: t("clients.deactivate.title"),
        message: t("clients.deactivate.message"),
        confirm: t("clients.deactivate.confirm"),
        danger: true,
      };
    case "activate":
      return {
        title: t("clients.activate.title"),
        message: t("clients.activate.message"),
        confirm: t("clients.activate.confirm"),
        danger: false,
      };
    default:
      return null;
  }
});

async function save(payload: OAuthClientPayload) {
  // The type is fixed after creation (see ClientForm), so it isn't sent.
  const { client_type: _clientType, ...changes } = payload;
  const updated = await clientsStore.updateClient(clientId.value, changes);

  if (updated) {
    isEditing.value = false;
    notice.value = t("clients.saved");
  }
}

async function confirmAction() {
  const action = pendingAction.value;
  notice.value = "";

  if (action === "rotate") {
    await clientsStore.rotateSecret(clientId.value);
    secret.value = clientsStore.takeRevealedSecret(clientId.value);
  } else if (action === "deactivate" || action === "activate") {
    const updated = await clientsStore.setActive(clientId.value, action === "activate");

    if (updated) {
      notice.value =
        action === "activate" ? t("clients.activate.done") : t("clients.deactivate.done");
    }
  }

  pendingAction.value = null;
}

function startEditing() {
  clientsStore.error = "";
  notice.value = "";
  isEditing.value = true;
}

onMounted(async () => {
  clientsStore.error = "";
  secret.value = clientsStore.takeRevealedSecret(clientId.value);

  // Always refresh: the list may be stale or this may be a direct visit.
  const fresh = await clientsStore.fetchClient(clientId.value);
  loadFailed.value = !fresh && !client.value;
});
</script>

<template>
  <DashboardShell>
    <NuxtLink to="/dashboard/clients" class="dash-back">
      ← {{ t("clients.back") }}
    </NuxtLink>

    <div v-if="loadFailed" class="dash-empty">
      <p class="dash-empty-title">{{ t("clients.notFound") }}</p>
      <p>{{ clientsStore.error }}</p>
    </div>

    <div
      v-else-if="!client"
      class="dash-empty"
      role="status"
    >
      <span class="loading loading-spinner loading-md text-primary" />
    </div>

    <template v-else>
      <div class="dash-page-header">
        <div class="dashboard-intro">
          <p class="eyebrow">{{ t(`clients.types.${client.client_type}.title`) }}</p>
          <h1>{{ client.name }}</h1>
          <p>
            <span
              class="badge badge-sm"
              :class="client.is_active ? 'badge-success' : 'badge-neutral'"
            >
              {{ client.is_active ? t("clients.status.active") : t("clients.status.inactive") }}
            </span>
            {{ t("clients.createdOn", { date: new Date(client.created_at).toLocaleDateString() }) }}
          </p>
        </div>
      </div>

      <div v-if="notice" role="status" class="alert alert-success mb-4 py-2 text-sm">
        {{ notice }}
      </div>
      <div
        v-if="clientsStore.error && !isEditing"
        role="alert"
        class="alert alert-error mb-4 py-2 text-sm"
      >
        {{ clientsStore.error }}
      </div>

      <SecretReveal v-if="secret" :secret="secret" @dismiss="secret = null" />

      <section class="dash-card">
        <h2 class="dash-card-title">{{ t("clients.credentials") }}</h2>
        <CopyField :label="t('clients.clientId')" :value="client.client_id" />
        <p class="dash-field-hint">
          {{
            client.client_type === "confidential"
              ? t("clients.secretHidden")
              : t("clients.noSecret")
          }}
        </p>
      </section>

      <section class="dash-card">
        <div class="dash-card-header">
          <h2 class="dash-card-title">{{ t("clients.settings") }}</h2>
          <button
            v-if="!isEditing"
            type="button"
            class="btn btn-ghost btn-sm"
            @click="startEditing"
          >
            {{ t("clients.edit") }}
          </button>
        </div>

        <ClientForm
          v-if="isEditing"
          mode="edit"
          :initial="client"
          :loading="clientsStore.isSaving"
          :error="clientsStore.error"
          @submit="save"
          @cancel="isEditing = false"
        />

        <dl v-else class="dash-details">
          <dt>{{ t("clients.form.redirects") }}</dt>
          <dd>
            <code v-for="uri in client.redirect_uris" :key="uri">{{ uri }}</code>
            <span v-if="!client.redirect_uris.length" class="opacity-60">—</span>
          </dd>
          <dt>{{ t("clients.form.grants") }}</dt>
          <dd>
            <code v-for="grant in client.grant_types" :key="grant">{{ grant }}</code>
          </dd>
          <dt>{{ t("clients.form.pkce") }}</dt>
          <dd>{{ client.require_pkce ? t("clients.yes") : t("clients.no") }}</dd>
          <dt>{{ t("clients.form.accessTtl") }}</dt>
          <dd>{{ client.access_token_ttl ?? t("clients.serverDefault") }}</dd>
          <dt>{{ t("clients.form.refreshTtl") }}</dt>
          <dd>{{ client.refresh_token_ttl ?? t("clients.serverDefault") }}</dd>
        </dl>
      </section>

      <section v-if="client.grant_types.includes('authorization_code')" class="dash-card">
        <h2 class="dash-card-title">{{ t("clients.integration.title") }}</h2>
        <p class="dash-field-hint">{{ t("clients.integration.description") }}</p>
        <CopyField :label="t('clients.integration.authorizeUrl')" :value="authorizeExample" />
      </section>

      <section class="dash-card dash-danger">
        <h2 class="dash-card-title">{{ t("clients.danger") }}</h2>

        <div v-if="client.client_type === 'confidential'" class="dash-danger-row">
          <div>
            <strong>{{ t("clients.rotate.title") }}</strong>
            <p>{{ t("clients.rotate.description") }}</p>
          </div>
          <button
            type="button"
            class="btn btn-outline btn-error btn-sm"
            :disabled="!client.is_active"
            @click="pendingAction = 'rotate'"
          >
            {{ t("clients.rotate.confirm") }}
          </button>
        </div>

        <div class="dash-danger-row">
          <div>
            <strong>
              {{ client.is_active ? t("clients.deactivate.title") : t("clients.activate.title") }}
            </strong>
            <p>
              {{
                client.is_active
                  ? t("clients.deactivate.description")
                  : t("clients.activate.description")
              }}
            </p>
          </div>
          <button
            v-if="client.is_active"
            type="button"
            class="btn btn-error btn-sm"
            @click="pendingAction = 'deactivate'"
          >
            {{ t("clients.deactivate.confirm") }}
          </button>
          <button
            v-else
            type="button"
            class="btn btn-primary btn-sm"
            @click="pendingAction = 'activate'"
          >
            {{ t("clients.activate.confirm") }}
          </button>
        </div>
      </section>
    </template>

    <ConfirmDialog
      :open="!!dialog"
      :title="dialog?.title || ''"
      :message="dialog?.message || ''"
      :confirm-label="dialog?.confirm || ''"
      :danger="dialog?.danger"
      :loading="clientsStore.isSaving"
      @confirm="confirmAction"
      @cancel="pendingAction = null"
    />
  </DashboardShell>
</template>
