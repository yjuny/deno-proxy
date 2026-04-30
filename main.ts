const TARGET_URL = Deno.env.get("TARGET_URL") || "https://example.com";

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = new URL(url.pathname + url.search, TARGET_URL);

  const headers = new Headers(req.headers);
  headers.set("Host", targetUrl.host);
  headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8");
  headers.set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8");
  headers.set("Accept-Encoding", "gzip, deflate, br");
  headers.set("Connection", "keep-alive");
  headers.delete("x-forwarded-for");
  headers.delete("x-forwarded-proto");

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: req.body,
      redirect: "follow",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-Proxy-By", "Deno-Proxy");
    responseHeaders.set("X-Target-Url", TARGET_URL);
    responseHeaders.delete("content-security-policy");
    responseHeaders.delete("content-security-policy-report-only");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

console.log(`Target URL: ${TARGET_URL}`);

Deno.serve(handleRequest);