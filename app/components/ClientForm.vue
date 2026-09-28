<script setup lang="ts">
import {
  GRANT_TYPES,
  isValidRedirectUri,
  type ClientType,
  type GrantType,
  type OAuthClient,
  type OAuthClientPayload,
} from "~/utils/oauth";

const props = withDefaults(
  defineProps<{
    mode: "create" | "edit";
    initial?: OAuthClient | null;
    loading?: boolean;
    error?: string;
  }>(),
  {
    initial: null,
    loading: false,
    error: "",
  },
);

const emit = defineEmits<{
  submit: [payload: OAuthClientPayload];
  cancel: [];
}>();

const { t } = useI18n();

function toGrantTypes(values: string[] | undefined): GrantType[] {
  return (values || ["authorization_code", "refresh_token"]).filter(
    (value): value is GrantType => (GRANT_TYPES as readonly string[]).includes(value),
  );
}

const name = ref(props.initial?.name || "");
const redirectUris = ref<string[]>(
  props.initial?.redirect_uris.length ? [...props.initial.redirect_uris] : [""],
);
const clientType = ref<ClientType>(props.initial?.client_type || "confidential");
const grantTypes = ref<GrantType[]>(toGrantTypes(props.initial?.grant_types));
const requirePkce = ref(props.initial?.require_pkce ?? true);
const accessTokenTtl = ref(props.initial?.access_token_ttl?.toString() || "");
const refreshTokenTtl = ref(props.initial?.refresh_token_ttl?.toString() || "");
const submitted = ref(false);

const isPublic = computed(() => clientType.value === "public");
const usesAuthorizationCode = computed(() =>
  grantTypes.value.includes("authorization_code"),
);

// Public clients can't keep a secret: PKCE is mandatory and client_credentials is meaningless.
watch(
  isPublic,
  (value) => {
    if (value) {
      requirePkce.value = true;
      grantTypes.value = grantTypes.value.filter(
        (grant) => grant !== "client_credentials",
      );
    }
  },
  { immediate: true },
);

function parseTtl(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function ttlIsValid(value: string) {
  const ttl = parseTtl(value);
  return ttl === null || (Number.isInteger(ttl) && ttl > 0);
}

const cleanedUris = computed(() =>
  redirectUris.value.map((uri) => uri.trim()).filter(Boolean),
);

const errors = computed(() => ({
  name: !name.value.trim()
    ? t("clients.form.nameRequired")
    : name.value.trim().length > 255
      ? t("clients.form.nameTooLong")
      : "",
  redirects:
    usesAuthorizationCode.value && cleanedUris.value.length === 0
      ? t("clients.form.redirectsRequired")
      : "",
  redirectRows:
    redirectUris.value.some((uri) => uri.trim() && !isValidRedirectUri(uri.trim())) ||
    new Set(cleanedUris.value).size !== cleanedUris.value.length,
  grants: grantTypes.value.length === 0 ? t("clients.form.grantsRequired") : "",
  accessTtl: ttlIsValid(accessTokenTtl.value) ? "" : t("clients.form.ttlInvalid"),
  refreshTtl: ttlIsValid(refreshTokenTtl.value) ? "" : t("clients.form.ttlInvalid"),
}));

const hasErrors = computed(() => Object.values(errors.value).some(Boolean));

function submit() {
  submitted.value = true;

  // Blank rows are just unused slots; drop them before validating.
  redirectUris.value = cleanedUris.value.length ? [...cleanedUris.value] : [""];

  if (hasErrors.value) {
    return;
  }

  emit("submit", {
    name: name.value.trim(),
    redirect_uris: cleanedUris.value,
    grant_types: grantTypes.value,
    client_type: clientType.value,
    require_pkce: isPublic.value ? true : requirePkce.value,
    access_token_ttl: parseTtl(accessTokenTtl.value),
    refresh_token_ttl: parseTtl(refreshTokenTtl.value),
  });
}
</script>

<template>
  <form class="dash-form" novalidate @submit.prevent="submit">
    <div class="dash-field">
      <label for="client-name">{{ t("clients.form.name") }}</label>
      <input
        id="client-name"
        v-model="name"
        type="text"
        class="input w-full"
        :class="{ 'input-error': submitted && errors.name }"
        :placeholder="t('clients.form.namePlaceholder')"
        maxlength="255"
        autocomplete="off"
      />
      <p v-if="submitted && errors.name" class="dash-field-error">
        {{ errors.name }}
      </p>
    </div>

    <fieldset class="dash-field">
      <legend>{{ t("clients.form.type") }}</legend>
      <div class="client-type-options">
        <label
          v-for="type in (['confidential', 'public'] as const)"
          :key="type"
          class="client-type-option"
          :class="{ 'is-selected': clientType === type }"
        >
          <input
            v-model="clientType"
            type="radio"
            name="client-type"
            class="radio radio-primary radio-sm"
            :value="type"
            :disabled="mode === 'edit'"
          />
          <span>
            <strong>{{ t(`clients.types.${type}.title`) }}</strong>
            <small>{{ t(`clients.types.${type}.description`) }}</small>
          </span>
        </label>
      </div>
      <p v-if="mode === 'edit'" class="dash-field-hint">
        {{ t("clients.form.typeLocked") }}
      </p>
    </fieldset>

    <div class="dash-field">
      <span class="dash-label">{{ t("clients.form.redirects") }}</span>
      <p class="dash-field-hint">{{ t("clients.form.redirectsHint") }}</p>
      <RedirectUriList v-model="redirectUris" :show-errors="submitted" />
      <p v-if="submitted && errors.redirects" class="dash-field-error">
        {{ errors.redirects }}
      </p>
    </div>

    <fieldset class="dash-field">
      <legend>{{ t("clients.form.grants") }}</legend>
      <label
        v-for="grant in GRANT_TYPES"
        :key="grant"
        class="dash-check"
        :class="{ 'is-disabled': isPublic && grant === 'client_credentials' }"
      >
        <input
          v-model="grantTypes"
          type="checkbox"
          class="checkbox checkbox-primary checkbox-sm"
          :value="grant"
          :disabled="isPublic && grant === 'client_credentials'"
        />
        <span>
          <code>{{ grant }}</code>
          <small>{{ t(`clients.grants.${grant}`) }}</small>
        </span>
      </label>
      <p v-if="submitted && errors.grants" class="dash-field-error">
        {{ errors.grants }}
      </p>
    </fieldset>

    <label class="dash-check">
      <input
        v-model="requirePkce"
        type="checkbox"
        class="toggle toggle-primary toggle-sm"
        :disabled="isPublic"
      />
      <span>
        <strong>{{ t("clients.form.pkce") }}</strong>
        <small>
          {{ isPublic ? t("clients.form.pkcePublic") : t("clients.form.pkceHint") }}
        </small>
      </span>
    </label>

    <details class="dash-advanced" :open="!!(accessTokenTtl || refreshTokenTtl)">
      <summary>{{ t("clients.form.advanced") }}</summary>
      <div class="dash-ttl-grid">
        <div class="dash-field">
          <label for="access-ttl">{{ t("clients.form.accessTtl") }}</label>
          <input
            id="access-ttl"
            v-model="accessTokenTtl"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            class="input w-full"
            :class="{ 'input-error': submitted && errors.accessTtl }"
            :placeholder="t('clients.form.ttlPlaceholder')"
          />
          <p v-if="submitted && errors.accessTtl" class="dash-field-error">
            {{ errors.accessTtl }}
          </p>
        </div>
        <div class="dash-field">
          <label for="refresh-ttl">{{ t("clients.form.refreshTtl") }}</label>
          <input
            id="refresh-ttl"
            v-model="refreshTokenTtl"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            class="input w-full"
            :class="{ 'input-error': submitted && errors.refreshTtl }"
            :placeholder="t('clients.form.ttlPlaceholder')"
          />
          <p v-if="submitted && errors.refreshTtl" class="dash-field-error">
            {{ errors.refreshTtl }}
          </p>
        </div>
      </div>
      <p class="dash-field-hint">
        {{ mode === "edit" ? t("clients.form.ttlEditHint") : t("clients.form.ttlHint") }}
      </p>
    </details>

    <div v-if="error" role="alert" class="alert alert-error py-2 text-xs">
      {{ error }}
    </div>

    <div class="dash-form-actions">
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="loading"
        @click="emit('cancel')"
      >
        {{ t("clients.cancel") }}
      </button>
      <button type="submit" class="btn btn-primary" :disabled="loading">
        <span v-if="loading" class="loading loading-spinner loading-xs" />
        {{ mode === "create" ? t("clients.form.create") : t("clients.form.save") }}
      </button>
    </div>
  </form>
</template>
