/**
 * api.ts — calling this app's API from the browser.
 *
 * Reaching the server and reading its reply are separate steps, so a dropped
 * connection, an unreadable reply and an honest error from the API each get
 * their own message. The lesson from the assessment app, built in from the start.
 */

export type EventItem = {
  id: string;
  title: string;
  starts_at: string;
  capacity: number;
  spots_left: number;
};

export type Fields = Partial<Record<"name" | "email", string[]>>;

export type Reply<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; fields?: Fields };

export async function callApi<T>(url: string, init?: RequestInit): Promise<Reply<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return { ok: false, status: 0, error: "Could not reach the server. Check your connection and try again." };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, status: res.status, error: "The server sent a reply that could not be read. Try again in a moment." };
  }

  if (!res.ok) {
    const failed = body as { error?: string; fields?: Fields };
    return {
      ok: false,
      status: res.status,
      error: failed.error ?? "Something went wrong. Try again.",
      fields: failed.fields,
    };
  }
  return { ok: true, status: res.status, data: body as T };
}