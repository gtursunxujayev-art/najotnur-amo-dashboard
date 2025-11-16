export async function amoRequest(endpoint: string, method = "GET", body?: any) {
  const url = `${process.env.AMO_BASE_URL}/api/v4/${endpoint}`;

  const headers = {
    "Authorization": `Bearer ${process.env.AMO_LONG_LIVED_TOKEN}`,
    "Content-Type": "application/json"
  };

  const options: RequestInit = { method, headers };

  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`AmoCRM error: ${res.status} - ${error}`);
  }

  return res.json();
}
