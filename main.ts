function rewriteHtmlContent(html: string, targetUrl: URL): string {
  let result = html;
  
  const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;

  result = result.replace(
    /<a\s+([^>]*)href\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, href, after) => {
      let newHref = href;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        newHref = `/proxy?url=${encodeURIComponent(href)}`;
      } else if (href.startsWith('//')) {
        newHref = `/proxy?url=${encodeURIComponent('https:' + href)}`;
      } else if (href.startsWith('/')) {
        newHref = `/proxy?url=${encodeURIComponent(baseUrl + href)}`;
      } else if (!href.startsWith('#') && !href.startsWith('javascript:')) {
        const currentPath = targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf('/') + 1);
        newHref = `/proxy?url=${encodeURIComponent(baseUrl + currentPath + href)}`;
      }
      return `<a ${before}href="${newHref}" ${after}>`;
    }
  );

  result = result.replace(
    /<img\s+([^>]*)src\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      let newSrc = src;
      if (src.startsWith('http://') || src.startsWith('https://')) {
        newSrc = `/proxy?url=${encodeURIComponent(src)}`;
      } else if (src.startsWith('//')) {
        newSrc = `/proxy?url=${encodeURIComponent('https:' + src)}`;
      } else if (src.startsWith('/')) {
        newSrc = `/proxy?url=${encodeURIComponent(baseUrl + src)}`;
      }
      return `<img ${before}src="${newSrc}" ${after}>`;
    }
  );

  result = result.replace(
    /<script\s+([^>]*)src\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      let newSrc = src;
      if (src.startsWith('http://') || src.startsWith('https://')) {
        newSrc = `/proxy?url=${encodeURIComponent(src)}`;
      } else if (src.startsWith('//')) {
        newSrc = `/proxy?url=${encodeURIComponent('https:' + src)}`;
      } else if (src.startsWith('/')) {
        newSrc = `/proxy?url=${encodeURIComponent(baseUrl + src)}`;
      }
      return `<script ${before}src="${newSrc}" ${after}>`;
    }
  );

  result = result.replace(
    /<link\s+([^>]*)href\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, href, after) => {
      let newHref = href;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        newHref = `/proxy?url=${encodeURIComponent(href)}`;
      } else if (href.startsWith('//')) {
        newHref = `/proxy?url=${encodeURIComponent('https:' + href)}`;
      } else if (href.startsWith('/')) {
        newHref = `/proxy?url=${encodeURIComponent(baseUrl + href)}`;
      }
      return `<link ${before}href="${newHref}" ${after}>`;
    }
  );

  result = result.replace(
    /<form\s+([^>]*)action\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, action, after) => {
      let newAction = action;
      if (action.startsWith('http://') || action.startsWith('https://')) {
        newAction = `/proxy?url=${encodeURIComponent(action)}`;
      } else if (action.startsWith('//')) {
        newAction = `/proxy?url=${encodeURIComponent('https:' + action)}`;
      } else if (action.startsWith('/')) {
        newAction = `/proxy?url=${encodeURIComponent(baseUrl + action)}`;
      } else if (!action.startsWith('#')) {
        const currentPath = targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf('/') + 1);
        newAction = `/proxy?url=${encodeURIComponent(baseUrl + currentPath + action)}`;
      }
      return `<form ${before}action="${newAction}" ${after}>`;
    }
  );

  result = result.replace(
    /url\(['"]?([^'")]+)['"]?\)/gi,
    (match, url) => {
      let newUrl = url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        newUrl = `/proxy?url=${encodeURIComponent(url)}`;
      } else if (url.startsWith('//')) {
        newUrl = `/proxy?url=${encodeURIComponent('https:' + url)}`;
      } else if (url.startsWith('/')) {
        newUrl = `/proxy?url=${encodeURIComponent(baseUrl + url)}`;
      }
      return `url(${newUrl})`;
    }
  );

  return result;
}

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
    .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Deno Proxy Server</h1>
    <p>通用代理服务 - 支持链接自动中转</p>
  </div>

  <div class="method">
    <h3>📡 使用方法</h3>
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

  <div class="method">
    <h3>🔗 路径方式</h3>
    <div class="code">https://your-domain.deno.dev/https/目标网站.com/路径</div>
    <div class="success">
      <a href="/https/httpbin.org/get" target="_blank">/https/httpbin.org/get</a>
    </div>
  </div>
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
  headers.set("Accept-Encoding", "identity");
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
    responseHeaders.delete("content-encoding");

    let responseBody = response.body;
    const contentType = responseHeaders.get("content-type") || "";
    
    if (contentType.includes("text/html")) {
      const htmlText = await response.text();
      const rewrittenHtml = rewriteHtmlContent(htmlText, targetUrl);
      responseBody = new Blob([rewrittenHtml], { type: "text/html; charset=utf-8" });
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        const newLocation = new URL(location, targetUrl.toString());
        responseHeaders.set("location", `/proxy?url=${encodeURIComponent(newLocation.toString())}`);
      }
    }

    return new Response(responseBody, {
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