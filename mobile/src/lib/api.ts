import { getEnv } from "./env";

// Funcion que entrega el token actual; se inyecta para no acoplar el cliente a Supabase.
export type TokenProvider = () => Promise<string | null>;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: TokenProvider;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { apiBaseUrl } = getEnv();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = options.token ? await options.token() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(response.status, `Request failed: ${response.status}`, data);
  }
  return data as T;
}
