export default async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    headers: { Accept: "application/json", ...(opts.headers || {}) },
    credentials: "include",
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "API error");
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}
