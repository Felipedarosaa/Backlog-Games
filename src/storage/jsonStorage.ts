import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getJson<T>(key: string) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    await AsyncStorage.removeItem(key);
    return undefined;
  }
}

export async function setJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
