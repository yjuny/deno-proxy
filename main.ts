async function handleConnect(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetHost = url.hostname;
  const targetPort = url.port ? parseInt(url.port) : 443;

  try {
    const socket = await Deno.connect({ hostname: targetHost, port: targetPort });
    const httpConn = Deno.serveHttp(socket);

    const response = new Response(null, {
      status: 200,
      headers: { "Connection": "keep-alive" },
    });

    const { readable, writable } = response.body as ReadableStream;
    const clientWritable = socket.writable;

    readable?.pipeTo(clientWritable);

    (async () => {
      for await (const requestEvent of httpConn) {
        const targetUrl = new URL(requestEvent.request.url);
        const target = `${targetUrl.protocol}//${targetHost}${targetUrl.pathname}${targetUrl.search}`;

        const headers = new Headers(requestEvent.request.headers);
        headers.set("Host", targetHost);
        headers.delete("proxy-connection");
        headers.delete("connection");

        try {
          const upstreamResponse = await fetch(target, {
            method: requestEvent.request.method,
            headers,
            body: requestEvent.request.body,
            redirect: "manual",
          });

          const responseHeaders = new Headers(upstreamResponse.headers);
          responseHeaders.set("X-Proxy-By", "Deno-Proxy");
          responseHeaders.delete("connection");
          responseHeaders.delete("transfer-encoding");

          await requestEvent.respondWith(new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            headers: responseHeaders,
          }));
        } catch {
          await requestEvent.respondWith(new Response("Proxy error", { status: 503 }));
        }
      }
    })();

    return response;
  } catch {
    return new Response(`Failed to connect to ${targetHost}:${targetPort}`, { status: 503 });
  }
}

async function handleHttpRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (!url.hostname) {
    return new Response(`
<!DOCTYPE html>
<html>
<head>
  <title>Deno Forward Proxy</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .config { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; }
    .warning { background: #fff3cd; padding: 15px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Deno Forward Proxy Server</h1>
  <p>已启动正向代理服务</p>

  <div class="config">
    <h3>配置浏览器代理：</h3>
    <p><strong>代理类型：</strong> HTTP/HTTPS</p>
    <p><strong>代理地址：</strong> <code>localhost</code> 或 <code>your-domain.deno.dev</code></p>
    <p><strong>代理端口：</strong> <code>8080</code>（Deno Deploy 自动分配）</p>
  </div>

  <div class="warning">
    <strong>注意：</strong> 在 Deno Deploy 上部署时，由于平台限制，HTTPS 代理可能有限制。建议使用支持 WebSocket 的代理方案。
  </div>

  <h3>使用方法：</h3>
  <ol>
    <li>在浏览器设置中配置代理服务器</li>
    <li>设置代理地址为您的 Deno Deploy 域名</li>
    <li>访问任意网站即可通过代理</li>
  </ol>
</body>
</html>
    `, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  const headers = new Headers(req.headers);
  headers.set("Host", url.host);
  headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  headers.delete("proxy-connection");
  headers.delete("connection");
  headers.delete("x-forwarded-for");

  try {
    const response = await fetch(url.toString(), {
      method: req.method,
      headers,
      body: req.body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-Proxy-By", "Deno-Proxy");
    responseHeaders.delete("content-security-policy");
    responseHeaders.delete("content-security-policy-report-only");
    responseHeaders.delete("connection");
    responseHeaders.delete("transfer-encoding");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "CONNECT") {
    return await handleConnect(req);
  }
  
  return await handleHttpRequest(req);
}

console.log("Deno Forward Proxy Server is running");

Deno.serve(handleRequest);