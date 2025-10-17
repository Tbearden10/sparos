export const fetchBungieData = async (path: string, method: 'GET' | 'POST', body?: object) => {
  const apiPath = "https://www.bungie.net/Platform"
  const apiKey = import.meta.env.VITE_BUNGIE_API_KEY;
  if (!apiPath || !apiKey) {
    throw new Error("API path or key is not defined! Check your environment variables.");
  }
  const url = `${apiPath}${path}`;
  const headers = {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  // Check content-type before parsing as JSON
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.Message || response.statusText);
    }
    return data;
  } else {
    const text = await response.text();
    throw new Error(`Expected JSON, got: ${text.slice(0, 80)}`);
  }
};