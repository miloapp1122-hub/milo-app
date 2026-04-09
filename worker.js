const HGI_BASE = "https://900405097.hginet.com.co/Api";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    if (url.pathname === "/") {
      return new Response(JSON.stringify({ status: "Milo OK", token: Boolean(env.HGI_TOKEN) }), { headers: cors() });
    }

    if (url.pathname.startsWith("/api/")) {
      const ruta = url.pathname.slice(5);
      const query = url.search;
      const hgiUrl = `${HGI_BASE}/${ruta}${query}`;

      // Log para debug
      console.log("→ HGI:", hgiUrl);

      const token = env.HGI_TOKEN;
      if (!token) {
        return new Response(JSON.stringify({ error: "HGI_TOKEN no configurado" }), { status: 401, headers: cors() });
      }

      try {
        const r = await fetch(hgiUrl, {
          method: request.method === "POST" ? "POST" : "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: request.method === "POST" ? await request.text() : undefined
        });

        const body = await r.text();
        console.log("← HGI status:", r.status, "body:", body.slice(0, 100));

        return new Response(body, { status: r.status, headers: cors() });
      } catch(e) {
        console.log("Error fetch:", e.message);
        return new Response(JSON.stringify({ error: e.message, hgiUrl }), { status: 500, headers: cors() });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors() });
  }
};
