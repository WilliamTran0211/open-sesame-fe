import type { Ref } from "vue";

export type ApiError = {
  error?: string;
  error_description?: string;
  detail?: Array<{ msg?: string }> | string;
};

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  method?: ApiMethod;
  body?: object;
};

// Translation keys for statuses that deserve a specific message, e.g. { 429: "auth.errors.resendLimited" }.
export type StatusMessageKeys = Partial<Record<number, string>>;

export type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export function getErrorMessage(error: unknown, fallback: string) {
  // A 5xx body only says "something broke"; the caller's message says what failed.
  if ((getErrorStatus(error) ?? 0) >= 500) {
    return fallback;
  }

  const data = (error as { data?: ApiError })?.data;
  const detail = Array.isArray(data?.detail)
    ? data.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(" ")
    : data?.detail;

  return data?.error_description || detail || fallback;
}

export function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status;
}

// Every API call sends the session cookie, which lives on the API origin.
export function apiFetch<T>(path: string, options: ApiRequestOptions = {}) {
  const config = useRuntimeConfig();

  return $fetch<T>(`${config.public.apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    body: options.body,
    credentials: "include",
  });
}

export function apiErrorMessage(
  error: unknown,
  fallbackKey: string,
  statusKeys: StatusMessageKeys = {},
) {
  const { t } = useNuxtApp().$i18n;
  const statusKey = statusKeys[getErrorStatus(error) ?? 0];

  return statusKey ? t(statusKey) : getErrorMessage(error, t(fallbackKey));
}

// Runs a request and hands back either its data or a message ready to show.
export async function tryApi<T>(
  action: () => Promise<T>,
  fallbackKey: string,
  statusKeys?: StatusMessageKeys,
): Promise<ApiResult<T>> {
  try {
    return { data: await action(), error: null };
  } catch (requestError) {
    return {
      data: null,
      error: apiErrorMessage(requestError, fallbackKey, statusKeys),
    };
  }
}

// tryApi for store actions: raises the store's busy flag and writes its error message.
export async function trackRequest<T>(
  state: { pending: Ref<boolean>; error: Ref<string> },
  action: () => Promise<T>,
  fallbackKey: string,
  statusKeys?: StatusMessageKeys,
) {
  state.pending.value = true;
  state.error.value = "";

  try {
    const result = await tryApi(action, fallbackKey, statusKeys);
    state.error.value = result.error ?? "";
    return result.data;
  } finally {
    state.pending.value = false;
  }
}
