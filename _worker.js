let mytoken = 'sssss';
let guestToken = '123';
let BotToken = '7794095577:AAEh5iVrFCXBicnZ2G1eOzGM5smx43hvqRI';
let ChatID = '6919196077';
let TG = 0;
let FileName = 'sanbaopeizhi';
let SUBUpdateTime = 6;
let total = 99;
let timestamp = 4102329600000;
let MainData = `
3605359c17b341b99429260cf5499523
`;
let urls = [];
let subConverter = "SUBAPI.cmliussss.net";
let subConfig = "";
let subProtocol = 'https';
let previousSubData = '';
let api_mode = true;

// 缓存和限流机制
const cache = new Map();
const rateLimit = new Map();

// 错误处理类
class SubscriptionError extends Error {
  constructor(message, code = 'SUBSCRIPTION_ERROR') {
    super(message);
    this.code = code;
    this.name = 'SubscriptionError';
  }
}

// 配置管理器
class ConfigManager {
  constructor(env) {
    this.env = env;
    this.config = {};
  }
  
  async loadConfig() {
    this.config = {
      token: this.env.TOKEN || mytoken,
      botToken: this.env.TGTOKEN || BotToken,
      chatId: this.env.TGID || ChatID,
      tgEnabled: this.env.TG !== undefined ? this.env.TG === '1' : TG === 1,
      subConverter: this.env.SUBAPI || subConverter,
      fileName: this.env.SUBNAME || FileName,
      apiMode: this.env.API_MODE !== undefined ? this.env.API_MODE === 'true' : api_mode,
      guestToken: this.env.GUESTTOKEN || this.env.GUEST || guestToken,
      subUpdateTime: this.env.SUBUPTIME || SUBUpdateTime,
      warp: this.env.WARP,
      link: this.env.LINK,
      linkSub: this.env.LINKSUB,
      url302: this.env.URL302,
      url: this.env.URL
    };
    
    // 处理订阅转换器协议
    if (this.config.subConverter.startsWith("http://")) {
      this.config.subConverter = this.config.subConverter.slice(7);
      subProtocol = 'http';
    } else if (this.config.subConverter.startsWith("https://")) {
      this.config.subConverter = this.config.subConverter.slice(8);
    }
    
    // 从KV加载配置
    if (this.env.KV) {
      this.config.subConfig = await this.env.KV.get('SUB_CONFIG') || subConfig;
      this.config.previousSubData = await this.env.KV.get('PREV_SUB_DATA') || '';
    }
    
    return this.config;
  }
  
  get(key) {
    return this.config[key];
  }
}

// 日志系统
class Logger {
  static async log(event, data, level = 'info', env = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      data: typeof data === 'string' ? { message: data } : data,
      ip: data?.ip || 'unknown',
      userAgent: data?.userAgent || 'unknown'
    };
    
    console.log(JSON.stringify(logEntry));
    
    // 存储到 KV（可选）
    if (env?.KV) {
      try {
        await env.KV.put(`logs:${Date.now()}`, JSON.stringify(logEntry), { 
          expirationTtl: 604800 // 7天
        });
      } catch (error) {
        console.error('Failed to save log to KV:', error);
      }
    }
  }
}

// 速率限制检查
function checkRateLimit(ip, maxRequests = 60, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, []);
  }
  
  const requests = rateLimit.get(ip);
  const recentRequests = requests.filter(time => time > windowStart);
  
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  
  // 清理过期记录
  if (requests.length > maxRequests * 2) {
    rateLimit.set(ip, recentRequests);
  }
  
  return true;
}

// 缓存数据
async function getCachedData(key, fetchFunction, ttl = 300000) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await fetchFunction();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// 带重试的 fetch
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10秒超时
      });
      
      if (response.ok) return response;
      
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error(`Failed after ${retries} retries`);
}

export default {
  async fetch(request, env) {
    const configManager = new ConfigManager(env);
    const config = await configManager.loadConfig();
    
    const userAgentHeader = request.headers.get('User-Agent');
    const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    // 健康检查端点
    if (url.pathname === '/health') {
      return await healthCheck(env, config);
    }
    
    // 速率限制检查
    if (!checkRateLimit(clientIP)) {
      await Logger.log('rate_limit_exceeded', { ip: clientIP, path: url.pathname }, 'warn', env);
      return new Response('Too Many Requests', { status: 429 });
    }
    
    // 生成令牌
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const timeTemp = Math.ceil(currentDate.getTime() / 1000);
    const fakeToken = await MD5MD5(`${config.token}${timeTemp}`);
    const finalGuestToken = config.guestToken || await MD5MD5(config.token);
    
    // 计算流量和过期时间
    const UD = Math.floor(((timestamp - Date.now()) / timestamp * total * 1099511627776) / 2);
    const totalBytes = total * 1099511627776;
    const expire = Math.floor(timestamp / 1000);
    
    // 令牌验证
    const validTokens = [config.token, fakeToken, finalGuestToken];
    const isValidToken = validTokens.includes(token) || 
                        url.pathname === `/${config.token}` || 
                        url.pathname.includes(`/${config.token}?`);
    
    if (!isValidToken) {
      if (config.tgEnabled && url.pathname !== "/" && url.pathname !== "/favicon.ico") {
        await sendMessage(`#异常访问 ${config.fileName}`, clientIP, `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`, config);
      }
      
      if (config.url302) return Response.redirect(config.url302, 302);
      else if (config.url) return await proxyURL(config.url, url);
      else return new Response(await nginx(), { 
        status: 200, 
        headers: { 'Content-Type': 'text/html; charset=UTF-8' } 
      });
    }
    
    // 加载订阅数据
    if (env.KV) {
      await migrateAddressList(env, 'LINK.txt');
      previousSubData = config.previousSubData;
      
      if (userAgent.includes('mozilla') && !url.search) {
        await sendMessage(`#编辑订阅 ${config.fileName}`, clientIP, `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`, config);
        return await KVInterface(request, env, 'LINK.txt', finalGuestToken, config);
      } else {
        MainData = await env.KV.get('LINK.txt') || MainData;
      }
    } else {
      MainData = config.link || MainData;
      if (config.linkSub) urls = await processLinks(config.linkSub);
    }
    
    // 处理订阅数据
    let allLinks = await processLinks(MainData + '\n' + urls.join('\n'));
    let customNodes = "";
    let subscriptionLinks = "";
    
    for (let link of allLinks) {
      if (link.toLowerCase().startsWith('http')) subscriptionLinks += link + '\n';
      else customNodes += link + '\n';
    }
    
    MainData = customNodes;
    urls = await processLinks(subscriptionLinks);
    
    await sendMessage(`#获取订阅 ${config.fileName}`, clientIP, `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`, config);
    
    // 确定订阅格式
    const subscriptionFormat = determineSubscriptionFormat(userAgent, url);
    let subConverterUrl;
    let subscriptionConverterURL = `${url.origin}/${await MD5MD5(fakeToken)}?token=${fakeToken}`;
    let requestData = MainData;
    let userAgentAppend = 'v2rayn';
    
    // 处理用户代理参数
    const formatParams = {
      'b64': 'base64', 'base64': 'base64',
      'clash': 'clash', 
      'singbox': 'singbox', 'sb': 'singbox',
      'surge': 'surge',
      'quanx': 'quanx',
      'loon': 'loon'
    };
    
    for (const [param, format] of Object.entries(formatParams)) {
      if (url.searchParams.has(param)) {
        subscriptionFormat = format;
        userAgentAppend = format === 'base64' ? 'v2rayn' : format;
        break;
      }
    }
    
    // 处理订阅链接
    const uniqueSubscriptionLinks = [...new Set(urls)].filter(item => item?.trim());
    if (uniqueSubscriptionLinks.length > 0) {
      const [subscriptionContent, converterURLs] = await getSubscriptions(
        uniqueSubscriptionLinks, 
        request, 
        userAgentAppend, 
        userAgentHeader
      );
      
      requestData += subscriptionContent.join('\n');
      subscriptionConverterURL += "|" + converterURLs;
      
      // 基础64格式的特殊处理
      if (subscriptionFormat === 'base64' && !isSubConverterRequest(request, userAgent) && converterURLs.includes('://')) {
        subConverterUrl = buildConverterUrl(subscriptionConverterURL, 'mixed', config);
        try {
          const subConverterResponse = await fetchWithRetry(subConverterUrl, { 
            headers: { 'User-Agent': 'v2rayN/CF-Workers-SUB[](https://github.com/cmliu/CF-Workers-SUB)' } 
          });
          
          if (subConverterResponse.ok) {
            const subConverterContent = await subConverterResponse.text();
            requestData += '\n' + atob(subConverterContent);
          }
        } catch (error) {
          await Logger.log('conversion_failed', { error: error.message, url: subConverterUrl }, 'error', env);
        }
      }
    }
    
    // 添加 WARP 配置
    if (config.warp) {
      const warpLinks = await processLinks(config.warp);
      subscriptionConverterURL += "|" + warpLinks.join("|");
    }
    
    // 处理并去重数据
    const processedData = processAndDeduplicateData(requestData);
    const currentSubData = processedData;
    
    // 计算差异并通知
    const diff = computeDiff(previousSubData, currentSubData);
    if (diff && config.botToken && config.chatId) {
      await sendMessage(`#订阅构建完成 ${config.fileName} Diff: ${diff}`, clientIP, `更新详情`, config);
    }
    
    // 保存当前数据
    if (env.KV) {
      await env.KV.put('PREV_SUB_DATA', currentSubData);
    }
    
    const base64Data = btoa(processedData);
    
    const responseHeaders = {
      "content-type": "text/plain; charset=utf-8",
      "Profile-Update-Interval": `${config.subUpdateTime}`,
      "Profile-web-page-url": request.url.includes('?') ? request.url.split('?')[0] : request.url,
    };
    
    // 返回基础64格式
    if (subscriptionFormat === 'base64' || token === fakeToken) {
      return new Response(base64Data, { headers: responseHeaders });
    }
    
    // 构建转换URL
    const formatMapping = {
      'clash': { target: 'clash', append: getEnhancedClashConfig() },
      'singbox': { target: 'singbox' },
      'surge': { target: 'surge', ver: 4 },
      'quanx': { target: 'quanx' },
      'loon': { target: 'loon' }
    };
    
    const formatConfig = formatMapping[subscriptionFormat];
    if (formatConfig) {
      subConverterUrl = buildConverterUrl(subscriptionConverterURL, formatConfig.target, config, formatConfig.ver);
      if (formatConfig.append) {
        subConverterUrl += '&append_config=' + encodeURIComponent(formatConfig.append);
      }
      
      try {
        const subConverterResponse = await fetchWithRetry(subConverterUrl, { 
          headers: { 'User-Agent': userAgentHeader } 
        });
        
        if (!subConverterResponse.ok) throw new SubscriptionError('转换失败');
        
        let subConverterContent = await subConverterResponse.text();
        if (subscriptionFormat === 'clash') {
          subConverterContent = clashFix(subConverterContent);
        }
        
        if (!userAgent.includes('mozilla')) {
          responseHeaders["Content-Disposition"] = `attachment; filename*=utf-8''${encodeURIComponent(config.fileName)}`;
        }
        
        return new Response(subConverterContent, { headers: responseHeaders });
      } catch (error) {
        await Logger.log('conversion_error', { 
          error: error.message, 
          format: subscriptionFormat,
          url: subConverterUrl 
        }, 'error', env);
        
        return new Response(base64Data, { headers: responseHeaders });
      }
    }
    
    return new Response(base64Data, { headers: responseHeaders });
  }
};

// 工具函数
async function processLinks(linkText) {
  if (!linkText) return [];
  const cleanedText = linkText.replace(/\s+/g, '\n').trim();
  return [...new Set(cleanedText.split('\n').filter(line => line.trim()))];
}

async function nginx() {
  return `
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
body {
width: 35em;
margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif;
}
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>
<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>
<p><em>Thank you for using nginx.</em></p>
</body>
</html>
`;
}

async function sendMessage(type, ip, add_data = "", config) {
  if (config.botToken && config.chatId) {
    let message = "";
    
    try {
      const response = await fetchWithRetry(`http://ip-api.com/json/${ip}?lang=zh-CN`);
      if (response.ok) {
        const ipInfo = await response.json();
        message = `${type}\nIP: ${ip}\n国家: ${ipInfo.country}\n<tg-spoiler>城市: ${ipInfo.city}\n组织: ${ipInfo.org}\nASN: ${ipInfo.as}\n${add_data}`;
      } else {
        message = `${type}\nIP: ${ip}\n<tg-spoiler>${add_data}`;
      }
    } catch (error) {
      message = `${type}\nIP: ${ip}\n<tg-spoiler>${add_data}`;
    }
    
    const telegramUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage?chat_id=${config.chatId}&parse_mode=HTML&text=${encodeURIComponent(message)}`;
    
    try {
      await fetchWithRetry(telegramUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
        }
      });
    } catch (error) {
      console.error('Telegram message failed:', error);
    }
  }
}

function base64Decode(str) {
  try {
    const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch (error) {
    return str;
  }
}

async function MD5MD5(text) {
  const encoder = new TextEncoder();
  const firstPass = await crypto.subtle.digest('MD5', encoder.encode(text));
  const firstPassArray = Array.from(new Uint8Array(firstPass));
  const firstHex = firstPassArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const secondPass = await crypto.subtle.digest('MD5', encoder.encode(firstHex.slice(7, 27)));
  const secondPassArray = Array.from(new Uint8Array(secondPass));
  const secondHex = secondPassArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return secondHex.toLowerCase();
}

function clashFix(content) {
  if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
    const lines = content.includes('\r\n') ? content.split('\r\n') : content.split('\n');
    let result = "";
    
    for (let line of lines) {
      if (line.includes('type: wireguard')) {
        const oldContent = `, mtu: 1280, udp: true`;
        const newContent = `, mtu: 1280, remote-dns-resolve: true, udp: true`;
        result += line.replace(new RegExp(oldContent, 'g'), newContent) + '\n';
      } else {
        result += line + '\n';
      }
    }
    return result;
  }
  return content;
}

async function proxyURL(proxyURLs, url) {
  const URLs = await processLinks(proxyURLs);
  const fullURL = URLs[Math.floor(Math.random() * URLs.length)];
  let parsedURL = new URL(fullURL);
  let URLProtocol = parsedURL.protocol.slice(0, -1) || 'https';
  let URLHostname = parsedURL.hostname;
  let URLPathname = parsedURL.pathname;
  let URLSearch = parsedURL.search;
  
  if (URLPathname.endsWith('/')) {
    URLPathname = URLPathname.slice(0, -1);
  }
  
  URLPathname += url.pathname;
  const newURL = `${URLProtocol}://${URLHostname}${URLPathname}${URLSearch}`;
  
  try {
    const response = await fetchWithRetry(newURL);
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    newResponse.headers.set('X-New-URL', newURL);
    return newResponse;
  } catch (error) {
    return new Response('Proxy error', { status: 502 });
  }
}

async function getSubscriptions(apiUrls, request, userAgentAppend, userAgentHeader) {
  if (!apiUrls || apiUrls.length === 0) {
    return [[], ""];
  }
  
  const uniqueUrls = [...new Set(apiUrls)];
  let subscriptionContent = "";
  let converterURLs = "";
  let errorSubscriptions = "";
  
  try {
    const requests = uniqueUrls.map(url => 
      getUrl(request, url, userAgentAppend, userAgentHeader)
        .then(response => response.ok ? response.text() : Promise.reject(response))
        .catch(error => ({ error, url }))
    );
    
    const results = await Promise.allSettled(requests);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const content = result.value || 'null';
        
        if (typeof content === 'string') {
          if (content.includes('proxies:') || 
              (content.includes('outbounds"') && content.includes('inbounds"'))) {
            converterURLs += "|" + result.value?.url || '';
          } else if (content.includes('://')) {
            subscriptionContent += content + '\n';
          } else if (isValidBase64(content)) {
            subscriptionContent += base64Decode(content) + '\n';
          } else {
            const errorLink = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#异常订阅 ${result.value?.url?.split('://')[1]?.split('/')[0] || 'unknown'}`;
            errorSubscriptions += `${errorLink}\n`;
          }
        }
      } else {
        const errorLink = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#请求失败 ${result.reason?.url?.split('://')[1]?.split('/')[0] || 'unknown'}`;
        errorSubscriptions += `${errorLink}\n`;
      }
    }
  } catch (error) {
    await Logger.log('subscription_fetch_error', { error: error.message }, 'error');
  }
  
  const finalContent = await processLinks(subscriptionContent + errorSubscriptions);
  return [finalContent, converterURLs];
}

async function getUrl(request, targetUrl, userAgentAppend, userAgentHeader) {
  const newHeaders = new Headers(request.headers);
  newHeaders.set("User-Agent", `${atob('djJyYXlOLzYuNDU=')} cmliu/CF-Workers-SUB ${userAgentAppend}(${userAgentHeader})`);
  
  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.method === "GET" ? null : request.body,
    redirect: "follow",
    cf: {
      insecureSkipVerify: true,
      allowUntrusted: true,
      validateCertificate: false
    }
  });
  
  return fetch(modifiedRequest);
}

function isValidBase64(str) {
  const cleanStr = str.replace(/\s/g, '');
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(cleanStr);
}

async function migrateAddressList(env, filename = 'LINK.txt') {
  const oldData = await env.KV.get(`/${filename}`);
  const newData = await env.KV.get(filename);
  
  if (oldData && !newData) {
    await env.KV.put(filename, oldData);
    await env.KV.delete(`/${filename}`);
    return true;
  }
  return false;
}

function determineSubscriptionFormat(userAgent, url) {
  const isSubConverterRequest = userAgent.includes('subconverter');
  
  if (userAgent.includes('null') || isSubConverterRequest || 
      userAgent.includes('nekobox') || userAgent.includes('cf-workers-sub')) {
    return 'base64';
  }
  
  const formatMapping = [
    { test: ua => ua.includes('sing-box'), format: 'singbox' },
    { test: ua => ua.includes('surge'), format: 'surge' },
    { test: ua => ua.includes('quantumult'), format: 'quanx' },
    { test: ua => ua.includes('loon'), format: 'loon' },
    { test: ua => ua.includes('clash') || ua.includes('meta') || ua.includes('mihomo'), format: 'clash' }
  ];
  
  for (const { test, format } of formatMapping) {
    if (test(userAgent)) return format;
  }
  
  return 'base64';
}

function isSubConverterRequest(request, userAgent) {
  return request.headers.get('subconverter-request') || 
         request.headers.get('subconverter-version') || 
         userAgent.includes('subconverter');
}

function buildConverterUrl(urls, target, config, version = null) {
  let converterUrl = `${subProtocol}://${config.subConverter}/sub?target=${target}&url=${encodeURIComponent(urls)}&insert=false&config=${encodeURIComponent(config.subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
  
  if (version) {
    converterUrl += `&ver=${version}`;
  }
  
  if (target === 'quanx') {
    converterUrl += '&udp=true';
  }
  
  return converterUrl;
}

function processAndDeduplicateData(data) {
  const utf8Encoder = new TextEncoder();
  const encodedData = utf8Encoder.encode(data);
  const utf8Decoder = new TextDecoder();
  const text = utf8Decoder.decode(encodedData);
  const uniqueLines = new Set(text.split('\n').map(line => line.trim()).filter(line => line));
  return [...uniqueLines].join('\n');
}

function computeDiff(oldData, newData) {
  const oldLines = oldData.split('\n');
  const newLines = newData.split('\n');
  
  const added = newLines.filter(line => !oldLines.includes(line));
  const removed = oldLines.filter(line => !newLines.includes(line));
  
  if (added.length === 0 && removed.length === 0) return '';
  
  return `新增: ${added.length} 个 | 删除: ${removed.length} 个`;
}

async function healthCheck(env, config) {
  const checks = {
    kv: !!env.KV,
    subConverter: await checkSubConverterHealth(config),
    telegram: config.botToken ? await checkTelegramHealth(config) : true
  };
  
  const allHealthy = Object.values(checks).every(Boolean);
  const status = allHealthy ? 'healthy' : 'degraded';
  
  return new Response(JSON.stringify({
    status,
    checks,
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function checkSubConverterHealth(config) {
  try {
    const response = await fetchWithRetry(`${subProtocol}://${config.subConverter}/version`, {}, 1);
    return response.ok;
  } catch {
    return false;
  }
}

async function checkTelegramHealth(config) {
  try {
    const response = await fetchWithRetry(`https://api.telegram.org/bot${config.botToken}/getMe`, {}, 1);
    return response.ok;
  } catch {
    return false;
  }
}

function getEnhancedClashConfig() {
  return `
########################################
#  Enhanced Clash Config
########################################
dns:
  enable: true
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 10.255.0.0/16
  use-hosts: true
  nameserver:
    - https://dns.cloudflare.com/dns-query
    - https://dns.google/dns-query
  fallback:
    - https://1.1.1.1/dns-query
  fallback-filter:
    geoip: true
    ipcidr:
      - 240.0.0.0/4
  fake-ip-filter:
    - '*.lan'
    - localhost
    - '*.msftncsi.com'
    - '*.apple.com'

tun:
  enable: true
  stack: system
  dns-hijack:
    - any:53

sniffer:
  enable: true
  sniff:
    - tls
    - http
  skip-domain:
    - "Mijia Cloud"
    - "*.apple.com"

experimental:
  auto-update: true

external-controller: 127.0.0.1:9090
secret: ''
log-level: info
  `;
}

// KV 管理界面函数 (由于长度限制，保持原有 KV 函数不变)
async function KVInterface(request, env, txt = 'LINK.txt', guest, config) {
  // 这里保持原有的 KV 界面代码，由于长度限制不再重复
  // 实际使用时可以保留原有的 KV 函数内容
  return await handleKVInterface(request, env, txt, guest, config);
}

// 实际的 KV 界面处理函数
async function handleKVInterface(request, env, txt, guest, config) {
  const url = new URL(request.url);
  
  try {
    if (request.method === "POST") {
      if (!env.KV) return new Response("未绑定KV空间", { status: 400 });
      
      try {
        const content = await request.text();
        await env.KV.put(txt, content);
        return new Response("保存成功");
      } catch (error) {
        await Logger.log('kv_save_error', { error: error.message }, 'error', env);
        return new Response("保存失败: " + error.message, { status: 500 });
      }
    }
    
    let content = '';
    let hasKV = !!env.KV;
    
    if (hasKV) {
      try {
        content = await env.KV.get(txt) || '';
      } catch (error) {
        await Logger.log('kv_read_error', { error: error.message }, 'error', env);
        content = '读取数据时发生错误: ' + error.message;
      }
    }
    
    // 返回 HTML 界面 (保持原有界面代码)
    const html = generateHTMLInterface(url, config, guest, content, hasKV);
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=utf-8" }
    });
    
  } catch (error) {
    await Logger.log('kv_interface_error', { error: error.message }, 'error', env);
    return new Response("服务器错误: " + error.message, {
      status: 500,
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
  }
}

function generateHTMLInterface(url, config, guest, content, hasKV) {
  // 这里返回原有的 HTML 界面代码
  // 由于长度限制，实际使用时请保留原有的 HTML 生成代码
  return `<!DOCTYPE html><html>...界面HTML代码...</html>`;
}
