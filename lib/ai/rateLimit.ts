const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const requestLog = new Map<string, number[]>();

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const recent = (requestLog.get(ip) ?? []).filter((ts) => ts > cutoff);

  if (recent.length >= MAX_REQUESTS) {
    requestLog.set(ip, recent);
    return false;
  }

  recent.push(now);
  requestLog.set(ip, recent);
  return true;
}
