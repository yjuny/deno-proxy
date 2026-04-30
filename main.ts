function rewriteUrl(url: string, baseUrl: URL): string {
  if (!url || url.startsWith('#') || url.startsWith('javascript:')) {
    return url;
  }
  
  let targetUrl: URL;
  
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      targetUrl = new URL(url);
    } else if (url.startsWith('//')) {
      targetUrl = new URL('https:' + url);
    } else if (url.startsWith('/')) {
      targetUrl = new URL(baseUrl.origin + url);
    } else {
      const currentPath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
      targetUrl = new URL(baseUrl.origin + currentPath + url);
    }
    
    return `/proxy?url=${encodeURIComponent(targetUrl.toString())}`;
  } catch {
    return url;
  }
}

function rewriteHtml(html: string, baseUrl: URL): string {
  let result = html;
  
  result = result.replace(
    /<a\s+([^>]*)href\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, href, after) => {
      const newHref = rewriteUrl(href, baseUrl);
      return `<a ${before}href="${newHref}" ${after}>`;
    }
  );
  
  result = result.replace(
    /<form\s+([^>]*)action\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, action, after) => {
      const newAction = rewriteUrl(action, baseUrl);
      return `<form ${before}action="${newAction}" ${after}>`;
    }
  );
  
  result = result.replace(
    /<img\s+([^>]*)src\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      if (src.startsWith('data:')) return match;
      const newSrc = rewriteUrl(src, baseUrl);
      return `<img ${before}src="${newSrc}" ${after}>`;
    }
  );
  
  result = result.replace(
    /<script\s+([^>]*)src\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      if (src.startsWith('data:') || src.startsWith('blob:')) return match;
      const newSrc = rewriteUrl(src, baseUrl);
      return `<script ${before}src="${newSrc}" ${after}>`;
    }
  );
  
  result = result.replace(
    /<link\s+([^>]*)href\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, href, after) => {
      if (href.startsWith('data:')) return match;
      const newHref = rewriteUrl(href, baseUrl);
      return `<link ${before}href="${newHref}" ${after}>`;
    }
  );
  
  result = result.replace(
    /<video\s+([^>]*)src\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      const newSrc = rewriteUrl(src, baseUrl);
      return `<video ${before}src="${newSrc}" ${after}>`;
    }
  );
  
  result = result.replace(
    /<audio\s+([^>]*)src\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      const newSrc = rewriteUrl(src, baseUrl);
      return `<audio ${before}src="${newSrc}" ${after}>`;
    }
  );
  
  result = result.replace(
    /<source\s+([^>]*)src\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      const newSrc = rewriteUrl(src, baseUrl);
      return `<source ${before}src="${newSrc}" ${after}>`;
    }
  );
  
  result = result.replace(
    /<iframe\s+([^>]*)src\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      const newSrc = rewriteUrl(src, baseUrl);
      return `<iframe ${before}src="${newSrc}" ${after}>`;
    }
  );
  
  result = result.replace(
    /url\(['"]?([^'")]+)['"]?\)/gi,
    (match, url) => {
      if (url.startsWith('data:')) return match;
      const newUrl = rewriteUrl(url, baseUrl);
      return `url(${newUrl})`;
    }
  );
  
  const baseTag = `<base href="/proxy?url=${encodeURIComponent(baseUrl.origin)}/">`;
  result = result.replace(/<head>/i, `<head>${baseTag}`);
  
  return result;
}

async function fetchAndRewrite(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('text/html')) {
    const html = await response.text();
    const baseUrl = new URL(url);
    return rewriteHtml(html, baseUrl);
  }
  
  const buffer = await response.arrayBuffer();
  return buffer.toString('base64');
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deno Proxy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f7fa; }
    .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; margin-bottom: 20px; }
    .method { background: white; padding: 20px; border-radius: 12px; margin: 15px 0; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .code { background: #1e1e1e; color: #d4d4d4; padding: 12px 16px; border-radius: 8px; font-family: 'Monaco', 'Consolas', monospace; word-break: break-all; }
    .btn { background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }
    .btn:hover { background: #5a6fd6; }
    input[type="text"] { width: calc(100% - 24px); padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; margin: 10px 0; }
    input[type="text"]:focus { border-color: #667eea; outline: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Deno Proxy</h1>
    <p>简单可靠的网页代理服务</p>
  </div>
  
  <div class="method">
    <h3>📡 使用方法</h3>
    <div class="code">https://your-domain.deno.dev/proxy?url=https://目标网站.com</div>
    <form action="/proxy" method="get">
      <input type="text" name="url" placeholder="输入目标网址" value="https://www.baidu.com" required>
      <br>
      <button type="submit" class="btn">🚀 开始代理</button>
    </form>
  </div>
  
  <div class="method">
    <h3>✨ 功能特性</h3>
    <ul>
      <li>✅ 所有链接自动通过代理</li>
      <li>✅ 支持多层级网页导航</li>
      <li>✅ 支持图片、脚本、样式加载</li>
      <li>✅ 支持表单提交</li>
      <li>✅ 支持 Deno Deploy 部署</li>
    </ul>
  </div>
</body>
</html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  
  if (url.pathname === '/proxy' && url.searchParams.has('url')) {
    const targetUrl = url.searchParams.get('url')!;
    
    try {
      const result = await fetchAndRewrite(targetUrl);
      const target = new URL(targetUrl);
      const contentType = target.pathname.includes('.css') ? 'text/css' : 
                         target.pathname.includes('.js') ? 'application/javascript' :
                         target.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image/jpeg' :
                         'text/html';
      
      return new Response(result, {
        headers: {
          'Content-Type': contentType,
          'X-Proxy-By': 'Deno-Proxy',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      return new Response(`
<!DOCTYPE html>
<html>
<head><title>Proxy Error</title></head>
<body>
  <h1>代理错误</h1>
  <p>无法访问目标网站: ${targetUrl}</p>
  <p>错误信息: ${error.message}</p>
  <p><a href="/">返回首页</a></p>
</body>
</html>
      `, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
  }
  
  return new Response('Not Found', { status: 404 });
}

console.log("Deno Proxy Server is running");

Deno.serve(handleRequest);