export class HttpError extends Error {
  constructor(message, response, bodyText) {
    super(message);
    this.name = 'HttpError';
    this.status = response?.status;
    this.statusText = response?.statusText;
    this.bodyText = bodyText;
  }
}

export function basicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

export function urlWithQuery(baseUrl, query = {}) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function requestJson(url, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const bodyText = await response.text();

  if (!response.ok) {
    throw new HttpError(`HTTP ${response.status} ${response.statusText} for ${url}`, response, bodyText);
  }

  if (!bodyText) return null;

  try {
    return JSON.parse(bodyText);
  } catch (error) {
    throw new Error(`Invalid JSON response from ${url}: ${error.message}`);
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
