const fetch = require("node-fetch");

exports.handler = async (req) => {
  try {
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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return { statusCode: 500, body: "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY" };
    }

    const url = `${SUPABASE_URL}/rest/v1/events`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: "return=minimal"
      },
      body: JSON.stringify([{ session_id, event, page: page || "/" }]),
    });

    if (!res.ok) {
      const text = await res.text();
      return { statusCode: 500, body: `Supabase error: ${res.status} ${text}` };
    }

    return { statusCode: 204, body: "" };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
