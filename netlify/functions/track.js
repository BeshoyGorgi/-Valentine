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

    const { session_id, event, page, client_time, client_tz } = data || {};
    if (!session_id || !event) {
      return { statusCode: 400, body: "Missing session_id or event" };
    }

    const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || "").trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return { statusCode: 500, body: "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY" };
    }

    // client_time should be ISO string; we store it as timestamptz if provided
    const row = {
      session_id,
      event,
      page: page || "/",
      client_time: client_time || null,
      client_tz: client_tz || null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify([row]),
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
