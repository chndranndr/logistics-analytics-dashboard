// Answers to repeated questions, kept in memory per server instance.
// The key includes the dataset version, so a changed CSV never serves an old answer.

const MAX_ENTRIES = 200;

const cache = new Map<string, unknown>();

export function normalizeQuestion(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?.!\s]+$/, "");
}

function cacheKey(question: string, dataVersion: string): string {
  return `${dataVersion}:${normalizeQuestion(question)}`;
}

export function getCachedAnswer<T>(
  question: string,
  dataVersion: string,
): T | undefined {
  return cache.get(cacheKey(question, dataVersion)) as T | undefined;
}

export function setCachedAnswer<T>(
  question: string,
  dataVersion: string,
  answer: T,
): void {
  const key = cacheKey(question, dataVersion);
  cache.delete(key);
  cache.set(key, answer);
  // A Map keeps insertion order, so the first key is the oldest entry.
  if (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value as string);
  }
}

export function clearAnswerCache(): void {
  cache.clear();
}
