import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "padel_token";
const USER_CACHE_KEY = "padel_cached_user";

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(USER_CACHE_KEY).catch(() => {}),
  ]);
}

export async function getCachedUser<T = unknown>(): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setCachedUser(user: unknown): Promise<void> {
  try {
    if (user) {
      await SecureStore.setItemAsync(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      await SecureStore.deleteItemAsync(USER_CACHE_KEY);
    }
  } catch {
    // noop
  }
}
