export type ApiError = {
  error?: string;
  error_description?: string;
  detail?: Array<{ msg?: string }> | string;
};

export function getErrorMessage(error: unknown, fallback: string) {
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
