async function handleProxyRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (!url.pathname || url.pathname === '/' || url.pathname === '/index.html') {
    return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deno Proxy Server</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f7fa; }
    .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; margin-bottom: 20px; }
    .method { background: white; padding: 20px; border-radius: 12px; margin: 15px 0; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .code { background: #1e1e1e; color: #d4d4d4; padding: 12px 16px; border-radius: 8px; font-family: 'Monaco', 'Consolas', monospace; word-break: break-all; margin: 10px 0; }
    .btn { background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; transition: background 0.3s; }
    .btn:hover { background: #5a6fd6; }
    input[type="text"] { width: calc(100% - 24px); padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; margin: 10px 0; }
    input[type="text"]:focus { border-color: #667eea; outline: none; }
    .warning { background: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .tab { padding: 10px 20px; border: none; border-radius: 8px; background: white; cursor: pointer; transition: all 0.3s; }
    .tab.active { background: #667eea; color: white; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Deno Proxy Server</h1>
    <p>通用代理服务 - 支持多种访问方式</p>
  </div>

  <div class="tabs">
    <button class="tab active" onclick="showTab('url-param')">URL 参数</button>
    <button class="tab" onclick="showTab('path')">路径方式</button>
    <button class="tab" onclick="showTab('browser')">浏览器代理</button>
  </div>

  <div id="url-param" class="tab-content active">
    <div class="method">
      <h3>📡 方法一：URL 参数方式</h3>
      <p>在浏览器中直接访问：</p>
      <div class="code">https://your-domain.deno.dev/proxy?url=https://目标网站.com</div>
      <form action="/proxy" method="get">
        <input type="text" name="url" placeholder="输入目标网址，如 https://www.baidu.com" value="https://www.baidu.com" required>
        <br>
        <button type="submit" class="btn">🚀 开始代理</button>
      </form>
      <div class="success">
        <strong>✅ 使用示例：</strong><br>
        <a href="/proxy?url=https://www.baidu.com" target="_blank">代理百度</a> | 
        <a href="/proxy?url=https://httpbin.org/get" target="_blank">测试 API</a> | 
        <a href="/proxy?url=https://jsonplaceholder.typicode.com/posts" target="_blank">JSON 数据</a>
      </div>
    </div>
  </div>

  <div id="path" class="tab-content">
    <div class="method">
      <h3>🔗 方法二：路径方式</h3>
      <p>直接在路径中指定目标网站：</p>
      <div class="code">https://your-domain.deno.dev/https/目标网站.com/路径</div>
      <div class="code">https://your-domain.deno.dev/http/目标网站.com/路径</div>
      <div class="success">
        <strong>✅ 使用示例：</strong><br>
        <a href="/https/httpbin.org/get" target="_blank">/https/httpbin.org/get</a> | 
        <a href="/http/example.com" target="_blank">/http/example.com</a>
      </div>
    </div>
  </div>

  <div id="browser" class="tab-content">
    <div class="method">
      <h3>🌐 方法三：浏览器代理配置（推荐）</h3>
      <div class="warning">
        <strong>⚠️ 注意：</strong>由于 Deno Deploy 平台限制，传统的 HTTP/HTTPS 代理（CONNECT 方法）在云端部署时可能有限制。建议使用前两种方法，或在本地运行时使用浏览器代理配置。
      </div>
      <div class="config">
        <h4>本地运行配置：</h4>
        <div class="code">deno run --allow-net --allow-env main.ts</div>
        <p><strong>代理地址：</strong> localhost</p>
        <p><strong>代理端口：</strong> 8000</p>
      </div>
    </div>
  </div>

  <script>
    function showTab(tabId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector(`[onclick="showTab('${tabId}')"]`).classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }
  </script>
</body>
</html>
    `, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  let targetUrl: URL;

  if (url.pathname.startsWith('/https/') || url.pathname.startsWith('/http/')) {
    const path = url.pathname.substring(1);
    targetUrl = new URL(`http://${path}${url.search}`);
  } else if (url.pathname === '/proxy' && url.searchParams.has('url')) {
    targetUrl = new URL(url.searchParams.get('url')!);
  } else {
    return new Response(`
<!DOCTYPE html>
<html>
<head><title>Proxy Error</title></head>
<body>
  <h1>代理错误</h1>
  <p>请使用正确的格式访问代理服务：</p>
  <ul>
    <li><a href="/">返回首页</a></li>
    <li>使用 URL 参数: <code>/proxy?url=https://目标网站.com</code></li>
    <li>使用路径方式: <code>/https/目标网站.com</code></li>
  </ul>
</body>
</html>
    `, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const headers = new Headers(req.headers);
  headers.set("Host", targetUrl.host);
  headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8");
  headers.set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8");
  headers.set("Accept-Encoding", "gzip, deflate, br");
  headers.set("Connection", "keep-alive");
  headers.delete("x-forwarded-for");
  headers.delete("x-forwarded-proto");
  headers.delete("proxy-connection");
  headers.delete("connection");

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: req.body,
      redirect: "follow",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-Proxy-By", "Deno-Proxy");
    responseHeaders.set("X-Target-Url", targetUrl.toString());
    responseHeaders.delete("content-security-policy");
    responseHeaders.delete("content-security-policy-report-only");
    responseHeaders.delete("strict-transport-security");
    responseHeaders.delete("location");

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        const newLocation = new URL(location, targetUrl.toString());
        responseHeaders.set("location", `/proxy?url=${encodeURIComponent(newLocation.toString())}`);
      }
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(`
<!DOCTYPE html>
<html>
<head><title>Proxy Error</title></head>
<body>
  <h1>代理错误</h1>
  <p>无法连接到目标网站: ${targetUrl.toString()}</p>
  <p>错误信息: ${error.message}</p>
  <p><a href="/">返回首页</a></p>
</body>
</html>
    `, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

console.log("Deno Proxy Server is running");

Deno.serve(handleProxyRequest);