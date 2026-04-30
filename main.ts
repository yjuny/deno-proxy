interface ProxyRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

interface ProxyResponse {
  id: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

async function handleWebSocket(ws: WebSocket) {
  console.log("WebSocket tunnel established");

  ws.onmessage = async (event) => {
    try {
      const request: ProxyRequest = JSON.parse(event.data);
      
      const headers = new Headers(request.headers);
      headers.delete("origin");
      headers.delete("referer");

      const response = await fetch(request.url, {
        method: request.method,
        headers,
        body: request.body,
        redirect: "follow",
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const body = await response.text();

      const proxyResponse: ProxyResponse = {
        id: request.id,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
      };

      ws.send(JSON.stringify(proxyResponse));
    } catch (error) {
      ws.send(JSON.stringify({
        id: "",
        status: 500,
        statusText: "Proxy Error",
        headers: {},
        body: error.message,
      }));
    }
  };

  ws.onclose = () => {
    console.log("WebSocket tunnel closed");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

function getClientScript(): string {
  return `
class ProxyClient {
  constructor() {
    this.ws = null;
    this.pendingRequests = new Map();
    this.requestId = 0;
  }

  async connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.ws = new WebSocket(\`\${protocol}//\${host}/ws\`);
    
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => this.handleMessage(event);
    });
  }

  handleMessage(event) {
    const response = JSON.parse(event.data);
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      pending.resolve(response);
      this.pendingRequests.delete(response.id);
    }
  }

  async fetch(url, options = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const id = 'req-' + ++this.requestId;
    
    const headers = {};
    if (options.headers) {
      for (const [key, value] of new Headers(options.headers)) {
        headers[key] = value;
      }
    }

    const request = {
      id,
      method: options.method || 'GET',
      url,
      headers,
      body: options.body,
    };

    this.ws.send(JSON.stringify(request));

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          pending.reject(new Error('Request timeout'));
          this.pendingRequests.delete(id);
        }
      }, 30000);
    });
  }
}

const proxyClient = new ProxyClient();

async function proxyFetch(input, init) {
  const url = typeof input === 'string' ? input : input.url;
  
  const response = await proxyClient.fetch(url, init);
  
  const headers = new Headers();
  for (const [key, value] of Object.entries(response.headers)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

window.fetch = proxyFetch;

function rewriteLinks() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a');
    if (target && target.href) {
      e.preventDefault();
      loadPage(target.href);
    }
  });
}

async function loadPage(url) {
  try {
    const response = await proxyClient.fetch(url);
    const html = response.body;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    document.documentElement.innerHTML = doc.documentElement.innerHTML;
    
    history.pushState({ url }, '', '/proxy?url=' + encodeURIComponent(url));
    
    rewriteLinks();
  } catch (error) {
    console.error('Failed to load page:', error);
  }
}

window.addEventListener('popstate', (e) => {
  if (e.state?.url) {
    loadPage(e.state.url);
  }
});

rewriteLinks();
    `;
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === '/ws') {
    const { socket, response } = Deno.upgradeWebSocket(req);
    handleWebSocket(socket);
    return response;
  }

  if (url.pathname === '/proxy-client.js') {
    return new Response(getClientScript(), {
      headers: { 'Content-Type': 'application/javascript' },
    });
  }

  if (url.pathname === '/proxy' && url.searchParams.has('url')) {
    const targetUrl = url.searchParams.get('url')!;
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    let html = await response.text();
    
    html = html.replace(
      /<\/head>/i,
      `<script src="/proxy-client.js"></script></head>`
    );

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'X-Proxy-By': 'Deno-WebSocket-Proxy',
      },
    });
  }

  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deno WebSocket Proxy</title>
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
    .feature { display: flex; align-items: center; gap: 10px; margin: 10px 0; }
    .feature svg { width: 20px; height: 20px; color: #28a745; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Deno WebSocket Proxy</h1>
    <p>基于 WebSocket 隧道的代理服务</p>
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
    <h3>✨ 功能特性</h3>
    <div class="feature">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
      <span>支持所有 HTTP/HTTPS 请求</span>
    </div>
    <div class="feature">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6m4.22-13.22a4 4 0 015.66 0l4.24 4.24a4 4 0 010 5.66l-4.25 4.25a4 4 0 01-5.66 0l-4.24-4.24a4 4 0 010-5.66z"/>
      </svg>
      <span>WebSocket 加密隧道</span>
    </div>
    <div class="feature">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 21V5a2 2 0 00-2-2H8a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
      </svg>
      <span>支持表单提交和 AJAX 请求</span>
    </div>
    <div class="feature">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <span>支持 Deno Deploy 部署</span>
    </div>
  </div>
</body>
</html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

console.log("Deno WebSocket Proxy Server is running");

Deno.serve(handleRequest);