exports.handler = async (req) => {
  if (req.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    data = JSON.parse(req.body || "{}");
  } catch {
    return { statusCode: 400, body: "Bad JSON" };
  }

  const { session_id, event, page } = data || {};
  if (!session_id || !event) {
    return { statusCode: 400, body: "Missing session_id or event" };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify([{ session_id, event, page: page || "/" }]),
  });

  if (!res.ok) {
    const text = await res.text();
    return { statusCode: 500, body: text };
  }

  return { statusCode: 204, body: "" };
};
