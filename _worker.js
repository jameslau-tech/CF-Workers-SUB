
// 部署完成后在网址后面加上这个，获取自建节点和机场聚合节点，/?token=auto或/auto或

let mytoken = 'auto';
let guestToken = ''; //可以随便取，或者uuid生成，https://1024tools.com/uuid
let BotToken = ''; //可以为空，或者@BotFather中输入/start，/newbot，并关注机器人
let ChatID = ''; //可以为空，或者@userinfobot中获取，/start
let TG = 0; //小白勿动， 开发者专用，1 为推送所有的访问信息，0 为不推送订阅转换后端的访问信息与异常访问
let FileName = 'CF-Workers-SUB';
let SUBUpdateTime = 6; //自定义订阅更新时间，单位小时
let total = 99;//TB
let timestamp = 4102329600000;//2099-12-31

//节点链接 + 订阅链接
let MainData = `
https://cfxr.eu.org/getSub
`;

let urls = [];
let subConverter = "SUBAPI.cmliussss.net"; //在线订阅转换后端，目前使用CM的订阅转换功能。支持自建psub 可自行搭建https://github.com/bulianglin/psub
let subConfig = "https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini"; //订阅配置文件
let subProtocol = 'https';

export default {
	async fetch(request, env) {
		const userAgentHeader = request.headers.get('User-Agent');
		const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
		const url = new URL(request.url);
		const token = url.searchParams.get('token');
		mytoken = env.TOKEN || mytoken;
		BotToken = env.TGTOKEN || BotToken;
		ChatID = env.TGID || ChatID;
		TG = env.TG || TG;
		subConverter = env.SUBAPI || subConverter;
		if (subConverter.includes("http://")) {
			subConverter = subConverter.split("//")[1];
			subProtocol = 'http';
		} else {
			subConverter = subConverter.split("//")[1] || subConverter;
		}
		subConfig = env.SUBCONFIG || subConfig;
		FileName = env.SUBNAME || FileName;

		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);
		const timeTemp = Math.ceil(currentDate.getTime() / 1000);
		const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);
		guestToken = env.GUESTTOKEN || env.GUEST || guestToken;
		if (!guestToken) guestToken = await MD5MD5(mytoken);
		const 访客订阅 = guestToken;
		//console.log(`${fakeUserID}\n${fakeHostName}`); // 打印fakeID

		let UD = Math.floor(((timestamp - Date.now()) / timestamp * total * 1099511627776) / 2);
		total = total * 1099511627776;
		let expire = Math.floor(timestamp / 1000);
		SUBUpdateTime = env.SUBUPTIME || SUBUpdateTime;

		if (!([mytoken, fakeToken, 访客订阅].includes(token) || url.pathname == ("/" + mytoken) || url.pathname.includes("/" + mytoken + "?"))) {
			if (TG == 1 && url.pathname !== "/" && url.pathname !== "/favicon.ico") await sendMessage(`#异常访问 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgent}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
			if (env.URL302) return Response.redirect(env.URL302, 302);
			else if (env.URL) return await proxyURL(env.URL, url);
			else return new Response(await nginx(), {
				status: 200,
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
			} else {
				if (env.KV) {
					await 迁移地址列表(env, 'LINK.txt');
					if (userAgent.includes('mozilla') && !url.search) {
						await sendMessage(`#编辑订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
						return await KV(request, env, 'LINK.txt', 访客订阅);
					} else {
						MainData = await env.KV.get('LINK.txt', { cacheTtl: 3600 }) || MainData;
					}
				} else {
					MainData = env.LINK || MainData;
					if (env.LINKSUB) urls = await ADD(env.LINKSUB);
				}

				// 提前检测订阅格式（仅依赖 UA 和 URL 参数，不依赖数据内容）
				const isSubConverterRequest = request.headers.get('subconverter-request') || request.headers.get('subconverter-version') || userAgent.includes('subconverter');
				let 订阅格式 = 'base64';
				let 追加UA = 'v2rayn';
				if (!(userAgent.includes('null') || isSubConverterRequest || userAgent.includes('nekobox') || userAgent.includes(('CF-Workers-SUB').toLowerCase()))) {
					if (userAgent.includes('sing-box') || userAgent.includes('singbox') || url.searchParams.has('sb') || url.searchParams.has('singbox')) {
						订阅格式 = 'singbox';
					} else if (userAgent.includes('surge') || url.searchParams.has('surge')) {
						订阅格式 = 'surge';
					} else if (userAgent.includes('quantumult') || url.searchParams.has('quanx')) {
						订阅格式 = 'quanx';
					} else if (userAgent.includes('loon') || url.searchParams.has('loon')) {
						订阅格式 = 'loon';
					} else if (userAgent.includes('clash') || userAgent.includes('meta') || userAgent.includes('mihomo') || url.searchParams.has('clash')) {
						订阅格式 = 'clash';
					}
				}
				if (url.searchParams.has('b64') || url.searchParams.has('base64')) 订阅格式 = 'base64';
				else if (url.searchParams.has('clash')) 追加UA = 'clash';
				else if (url.searchParams.has('singbox')) 追加UA = 'singbox';
				else if (url.searchParams.has('surge')) 追加UA = 'surge';
				else if (url.searchParams.has('quanx')) 追加UA = 'Quantumult%20X';
				else if (url.searchParams.has('loon')) 追加UA = 'Loon';

				// Cache API: 检查订阅缓存（跳过内部 subconverter 回调和 fakeToken 请求）
				const cache = caches.default;
				const cacheKey = new Request(`https://${url.hostname}/__sub_cache__/${订阅格式}/${token || mytoken}`);
				const shouldCache = token != fakeToken && !isSubConverterRequest;
				if (shouldCache) {
					const cached = await cache.match(cacheKey);
					if (cached) return cached;
				}

				// 以下为缓存未命中时的完整计算流程
				let 重新汇总所有链接 = await ADD(MainData + '\n' + urls.join('\n'));
				let 自建节点 = "";
				let 订阅链接 = "";
				for (let x of 重新汇总所有链接) {
					if (x.toLowerCase().startsWith('http')) {
						订阅链接 += x + '\n';
					} else {
						自建节点 += x + '\n';
					}
				}
				MainData = 自建节点;
				urls = await ADD(订阅链接);
				await sendMessage(`#获取订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);

				let subConverterUrl;
				let 订阅转换URL = `${url.origin}/${await MD5MD5(fakeToken)}?token=${fakeToken}`;
				let req_data = MainData;

				const 订阅链接数组 = [...new Set(urls)].filter(item => item?.trim?.()); // 去重
				if (订阅链接数组.length > 0) {
					const 请求订阅响应内容 = await getSUB(订阅链接数组, request, 追加UA, userAgentHeader);
					console.log(请求订阅响应内容);
					req_data += 请求订阅响应内容[0].join('\n');
					订阅转换URL += "|" + 请求订阅响应内容[1];
					if (订阅格式 == 'base64' && !isSubConverterRequest && 请求订阅响应内容[1].includes('://')) {
						subConverterUrl = `${subProtocol}://${subConverter}/sub?target=mixed&url=${encodeURIComponent(请求订阅响应内容[1])}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
						try {
							const subConverterResponse = await fetch(subConverterUrl, { headers: { 'User-Agent': 'v2rayN/CF-Workers-SUB  (https://github.com/cmliu/CF-Workers-SUB)' } });
							if (subConverterResponse.ok) {
								const subConverterContent = await subConverterResponse.text();
								req_data += '\n' + atob(subConverterContent);
							}
						} catch (error) {
							console.log('订阅转换请回base64失败，检查订阅转换后端是否正常运行');
						}
					}
				}

				if (env.WARP) 订阅转换URL += "|" + (await ADD(env.WARP)).join("|");
				//修复中文错误
				const utf8Encoder = new TextEncoder();
				const encodedData = utf8Encoder.encode(req_data);
				const utf8Decoder = new TextDecoder();
				const text = utf8Decoder.decode(encodedData);

				//去重
				const uniqueLines = new Set(text.split('\n'));
				const result = [...uniqueLines].join('\n');

				let base64Data;
				try {
					base64Data = btoa(result);
				} catch (e) {
					function encodeBase64(data) {
						const binary = new TextEncoder().encode(data);
						let base64 = '';
						const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

						for (let i = 0; i < binary.length; i += 3) {
							const byte1 = binary[i];
							const byte2 = binary[i + 1] || 0;
							const byte3 = binary[i + 2] || 0;

							base64 += chars[byte1 >> 2];
							base64 += chars[((byte1 & 3) << 4) | (byte2 >> 4)];
							base64 += chars[((byte2 & 15) << 2) | (byte3 >> 6)];
							base64 += chars[byte3 & 63];
						}

						const padding = 3 - (binary.length % 3 || 3);
						return base64.slice(0, base64.length - padding) + '=='.slice(0, padding);
					}

					base64Data = encodeBase64(result)
				}

				// 构建响应头对象
				const responseHeaders = {
					"content-type": "text/plain; charset=utf-8",
					"Profile-Update-Interval": `${SUBUpdateTime}`,
					"Profile-web-page-url": request.url.includes('?') ? request.url.split('?')[0] : request.url,
				};

				if (订阅格式 == 'base64' || token == fakeToken) {
					const response = new Response(base64Data, { headers: responseHeaders });
					if (shouldCache) {
						responseHeaders["Cache-Control"] = `s-maxage=${SUBUpdateTime * 3600}`;
						await cache.put(cacheKey, response.clone());
					}
					return response;
				} else if (订阅格式 == 'clash') {
					subConverterUrl = `${subProtocol}://${subConverter}/sub?target=clash&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
				} else if (订阅格式 == 'singbox') {
					subConverterUrl = `${subProtocol}://${subConverter}/sub?target=singbox&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
				} else if (订阅格式 == 'surge') {
					subConverterUrl = `${subProtocol}://${subConverter}/sub?target=surge&ver=4&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
				} else if (订阅格式 == 'quanx') {
					subConverterUrl = `${subProtocol}://${subConverter}/sub?target=quanx&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&udp=true`;
				} else if (订阅格式 == 'loon') {
					subConverterUrl = `${subProtocol}://${subConverter}/sub?target=loon&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false`;
				}
				try {
					const subConverterResponse = await fetch(subConverterUrl, { headers: { 'User-Agent': userAgentHeader } });//订阅转换
					if (!subConverterResponse.ok) {
						const response = new Response(base64Data, { headers: responseHeaders });
						return response;
					}
					let subConverterContent = await subConverterResponse.text();
					if (订阅格式 == 'clash') subConverterContent = await clashFix(subConverterContent);
					if (!userAgent.includes('mozilla')) responseHeaders["Content-Disposition"] = `attachment; filename*=utf-8''${encodeURIComponent(FileName)}`;
					responseHeaders["Cache-Control"] = `s-maxage=${SUBUpdateTime * 3600}`;
					const response = new Response(subConverterContent, { headers: responseHeaders });
					if (shouldCache) await cache.put(cacheKey, response.clone());
					return response;
				} catch (error) {
					const response = new Response(base64Data, { headers: responseHeaders });
					return response;
				}
			}

	}
};

async function ADD(envadd) {
	var addtext = envadd.replace(/[	"'|\r\n]+/g, '\n').replace(/\n+/g, '\n');	// 替换为换行
	//console.log(addtext);
	if (addtext.charAt(0) == '\n') addtext = addtext.slice(1);
	if (addtext.charAt(addtext.length - 1) == '\n') addtext = addtext.slice(0, addtext.length - 1);
	const add = addtext.split('\n');
	//console.log(add);
	return add;
}

async function nginx() {
	const text = `
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
	`
	return text;
}

async function sendMessage(type, ip, add_data = "") {
	if (BotToken !== '' && ChatID !== '') {
		let msg = "";
		const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
		if (response.status == 200) {
			const ipInfo = await response.json();
			msg = `${type}\nIP: ${ip}\n国家: ${ipInfo.country}\n<tg-spoiler>城市: ${ipInfo.city}\n组织: ${ipInfo.org}\nASN: ${ipInfo.as}\n${add_data}`;
		} else {
			msg = `${type}\nIP: ${ip}\n<tg-spoiler>${add_data}`;
		}

		let url = "https://api.telegram.org/bot" + BotToken + "/sendMessage?chat_id=" + ChatID + "&parse_mode=HTML&text=" + encodeURIComponent(msg);
		return fetch(url, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
			}
		});
	}
}

function base64Decode(str) {
	const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
	const decoder = new TextDecoder('utf-8');
	return decoder.decode(bytes);
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
		let lines;
		if (content.includes('\r\n')) {
			lines = content.split('\r\n');
		} else {
			lines = content.split('\n');
		}

		let result = "";
		for (let line of lines) {
			if (line.includes('type: wireguard')) {
				const 备改内容 = `, mtu: 1280, udp: true`;
				const 正确内容 = `, mtu: 1280, remote-dns-resolve: true, udp: true`;
				result += line.replace(new RegExp(备改内容, 'g'), 正确内容) + '\n';
			} else {
				result += line + '\n';
			}
		}

		content = result;
	}
	return content;
}

async function proxyURL(proxyURL, url) {
	const URLs = await ADD(proxyURL);
	const fullURL = URLs[Math.floor(Math.random() * URLs.length)];

	// 解析目标 URL
	let parsedURL = new URL(fullURL);
	console.log(parsedURL);
	// 提取并可能修改 URL 组件
	let URLProtocol = parsedURL.protocol.slice(0, -1) || 'https';
	let URLHostname = parsedURL.hostname;
	let URLPathname = parsedURL.pathname;
	let URLSearch = parsedURL.search;

	// 处理 pathname
	if (URLPathname.charAt(URLPathname.length - 1) == '/') {
		URLPathname = URLPathname.slice(0, -1);
	}
	URLPathname += url.pathname;

	// 构建新的 URL
	let newURL = `${URLProtocol}://${URLHostname}${URLPathname}${URLSearch}`;

	// 反向代理请求
	let response = await fetch(newURL);

	// 创建新的响应
	let newResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});

	// 添加自定义头部，包含 URL 信息
	//newResponse.headers.set('X-Proxied-By', 'Cloudflare Worker');
	//newResponse.headers.set('X-Original-URL', fullURL);
	newResponse.headers.set('X-New-URL', newURL);

	return newResponse;
}

async function getSUB(api, request, 追加UA, userAgentHeader) {
	if (!api || api.length === 0) {
		return [];
	} else api = [...new Set(api)]; // 去重
	let newapi = "";
	let 订阅转换URLs = "";
	let 异常订阅 = "";
	const controller = new AbortController(); // 创建一个AbortController实例，用于取消请求
	const timeout = setTimeout(() => {
		controller.abort(); // 2秒后取消所有请求
	}, 2000);

	try {
		// 使用Promise.allSettled等待所有API请求完成，无论成功或失败
		const responses = await Promise.allSettled(api.map(apiUrl => getUrl(request, apiUrl, 追加UA, userAgentHeader).then(response => response.ok ? response.text() : Promise.reject(response))));

		// 遍历所有响应
		const modifiedResponses = responses.map((response, index) => {
			// 检查是否请求成功
			if (response.status === 'rejected') {
				const reason = response.reason;
				if (reason && reason.name === 'AbortError') {
					return {
						status: '超时',
						value: null,
						apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
					};
				}
				console.error(`请求失败: ${api[index]}, 错误信息: ${reason.status} ${reason.statusText}`);
				return {
					status: '请求失败',
					value: null,
					apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
				};
			}
			return {
				status: response.status,
				value: response.value,
				apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
			};
		});

		console.log(modifiedResponses); // 输出修改后的响应数组

		for (const response of modifiedResponses) {
			// 检查响应状态是否为'fulfilled'
			if (response.status === 'fulfilled') {
				const content = await response.value || 'null'; // 获取响应的内容
				if (content.includes('proxies:')) {
					//console.log('Clash订阅: ' + response.apiUrl);
					订阅转换URLs += "|" + response.apiUrl; // Clash 配置
				} else if (content.includes('outbounds"') && content.includes('inbounds"')) {
					//console.log('Singbox订阅: ' + response.apiUrl);
					订阅转换URLs += "|" + response.apiUrl; // Singbox 配置
				} else if (content.includes('://')) {
					//console.log('明文订阅: ' + response.apiUrl);
					newapi += content + '\n'; // 追加内容
				} else if (isValidBase64(content)) {
					//console.log('Base64订阅: ' + response.apiUrl);
					newapi += base64Decode(content) + '\n'; // 解码并追加内容
				} else {
					const 异常订阅LINK = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#%E5%BC%82%E5%B8%B8%E8%AE%A2%E9%98%85%20${response.apiUrl.split('://')[1].split('/')[0]}`;
					console.log('异常订阅: ' + 异常订阅LINK);
					异常订阅 += `${异常订阅LINK}\n`;
				}
			}
		}
	} catch (error) {
		console.error(error); // 捕获并输出错误信息
	} finally {
		clearTimeout(timeout); // 清除定时器
	}

	const 订阅内容 = await ADD(newapi + 异常订阅); // 将处理后的内容转换为数组
	// 返回处理后的结果
	return [订阅内容, 订阅转换URLs];
}

async function getUrl(request, targetUrl, 追加UA, userAgentHeader) {
	// 设置自定义 User-Agent
	const newHeaders = new Headers(request.headers);
	newHeaders.set("User-Agent", `${atob('djJyYXlOLzYuNDU=')} cmliu/CF-Workers-SUB ${追加UA}(${userAgentHeader})`);

	// 构建新的请求对象
	const modifiedRequest = new Request(targetUrl, {
		method: request.method,
		headers: newHeaders,
		body: request.method === "GET" ? null : request.body,
		redirect: "follow",
		cf: {
			// 忽略SSL证书验证
			insecureSkipVerify: true,
			// 允许自签名证书
			allowUntrusted: true,
			// 禁用证书验证
			validateCertificate: false
		}
	});

	// 输出请求的详细信息
	console.log(`请求URL: ${targetUrl}`);
	console.log(`请求头: ${JSON.stringify([...newHeaders])}`);
	console.log(`请求方法: ${request.method}`);
	console.log(`请求体: ${request.method === "GET" ? null : request.body}`);

	// 发送请求并返回响应
	return fetch(modifiedRequest);
}

function isValidBase64(str) {
	// 先移除所有空白字符(空格、换行、回车等)
	const cleanStr = str.replace(/\s/g, '');
	const base64Regex = /^[A-Za-z0-9+/=]+$/;
	return base64Regex.test(cleanStr);
}

async function 迁移地址列表(env, txt = 'ADD.txt') {
	const 旧数据 = await env.KV.get(`/${txt}`);
	const 新数据 = await env.KV.get(txt);

	if (旧数据 && !新数据) {
		// 写入新位置
		await env.KV.put(txt, 旧数据);
		// 删除旧数据
		await env.KV.delete(`/${txt}`);
		return true;
	}
	return false;
}

async function KV(request, env, txt = 'ADD.txt', guest) {
	const url = new URL(request.url);
	try {
		// POST请求处理
		if (request.method === "POST") {
			if (!env.KV) return new Response("未绑定KV空间", { status: 400 });
			try {
				const content = await request.text();
				await env.KV.put(txt, content);
				// 清除所有格式的订阅缓存
				try {
					const cache = caches.default;
					for (const fmt of ['base64','clash','singbox','surge','quanx','loon']) {
						await cache.delete(new Request(`https://${url.hostname}/__sub_cache__/${fmt}/${env.TOKEN || 'auto'}`));
					}
				} catch (e) { console.log('清除缓存失败:', e); }
				return new Response("保存成功");
			} catch (error) {
				console.error('保存KV时发生错误:', error);
				return new Response("保存失败: " + error.message, { status: 500 });
			}
		}

		// GET请求部分
		let content = '';
		let hasKV = !!env.KV;

		if (hasKV) {
			try {
				content = await env.KV.get(txt) || '';
			} catch (error) {
				console.error('读取KV时发生错误:', error);
				content = '读取数据时发生错误: ' + error.message;
			}
		}

		const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${FileName} | foxai</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
<style>
:root {
	--bg-deep: #f0f4fa;
	--bg-surface: #ffffff;
	--bg-card: rgba(255, 255, 255, 0.92);
	--bg-card-hover: rgba(255, 255, 255, 0.98);
	--accent: #0891b2;
	--accent-dim: rgba(8, 145, 178, 0.1);
	--accent-warm: #e85d2a;
	--accent-green: #059669;
	--accent-purple: #6366f1;
	--text: #1e293b;
	--text-bright: #0f172a;
	--text-muted: #94a3b8;
	--border: rgba(8, 145, 178, 0.12);
	--border-active: rgba(8, 145, 178, 0.35);
	--radius: 12px;
	--font-display: 'Orbitron', sans-serif;
	--font-mono: 'JetBrains Mono', monospace;
}
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
	background: var(--bg-deep);
	color: var(--text);
	font-family: var(--font-mono);
	font-size: 13px;
	line-height: 1.6;
	min-height: 100vh;
	overflow-x: hidden;
	position: relative;
}
/* Animated grid background */
.bg-grid {
	position: fixed; inset: 0;
	background-image:
		linear-gradient(rgba(8,145,178,0.06) 1px, transparent 1px),
		linear-gradient(90deg, rgba(8,145,178,0.06) 1px, transparent 1px);
	background-size: 50px 50px;
	animation: gridMove 25s linear infinite;
	z-index: 0;
	pointer-events: none;
}
@keyframes gridMove {
	0% { transform: translate(0, 0); }
	100% { transform: translate(50px, 50px); }
}
/* Glow orbs */
.glow-orb {
	position: fixed;
	border-radius: 50%;
	filter: blur(80px);
	opacity: 0.12;
	z-index: 0;
	pointer-events: none;
	animation: orbFloat 12s ease-in-out infinite;
}
.orb-1 {
	width: 400px; height: 400px;
	background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
	top: -100px; right: -100px;
}
.orb-2 {
	width: 350px; height: 350px;
	background: radial-gradient(circle, var(--accent-purple) 0%, transparent 70%);
	bottom: -80px; left: -80px;
	animation-delay: -6s;
}
@keyframes orbFloat {
	0%, 100% { transform: translate(0, 0) scale(1); }
	50% { transform: translate(30px, -20px) scale(1.1); }
}
/* Container */
.container {
	position: relative;
	z-index: 1;
	max-width: 860px;
	margin: 0 auto;
	padding: 20px 16px 40px;
}
/* Header */
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24px 0 32px;
	border-bottom: 1px solid var(--border);
	margin-bottom: 32px;
}
.logo-area {
	display: flex;
	align-items: center;
	gap: 16px;
}
.fox-logo {
	width: 48px;
	height: 44px;
	flex-shrink: 0;
	filter: drop-shadow(0 0 8px rgba(8, 145, 178, 0.3));
}
.brand {
	font-family: var(--font-display);
	font-weight: 900;
	font-size: 22px;
	letter-spacing: 3px;
	background: linear-gradient(135deg, var(--accent), var(--accent-purple), var(--accent-warm));
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
	text-transform: uppercase;
}
.subtitle {
	font-size: 11px;
	color: var(--text-muted);
	letter-spacing: 1px;
	margin-top: 2px;
}
.status-badge {
	font-size: 10px;
	padding: 4px 12px;
	border-radius: 20px;
	border: 1px solid var(--accent-dim);
	color: var(--accent);
	font-family: var(--font-display);
	letter-spacing: 1px;
	text-transform: uppercase;
}
/* Section */
.section {
	margin-bottom: 28px;
}
.section-title {
	font-family: var(--font-display);
	font-size: 13px;
	font-weight: 700;
	letter-spacing: 2px;
	text-transform: uppercase;
	color: var(--text-bright);
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 6px;
}
.title-accent {
	display: inline-block;
	width: 3px;
	height: 16px;
	background: linear-gradient(180deg, var(--accent), var(--accent-purple));
	border-radius: 2px;
}
.section-desc {
	font-size: 11px;
	color: var(--text-muted);
	margin-bottom: 16px;
	padding-left: 15px;
}
/* Card grid */
.card-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 12px;
}
.sub-card {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 16px;
	transition: all 0.3s ease;
	position: relative;
	overflow: hidden;
	animation: cardIn 0.5s ease both;
}
.sub-card::before {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: var(--radius);
	padding: 1px;
	background: linear-gradient(135deg, transparent 40%, var(--accent-dim) 100%);
	-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
	-webkit-mask-composite: xor;
	mask-composite: exclude;
	pointer-events: none;
	opacity: 0;
	transition: opacity 0.3s;
}
.sub-card:hover {
	background: var(--bg-card-hover);
	border-color: var(--border-active);
	transform: translateY(-2px);
	box-shadow: 0 8px 32px rgba(8, 145, 178, 0.08);
}
.sub-card:hover::before { opacity: 1; }
@keyframes cardIn {
	from { opacity: 0; transform: translateY(16px); }
	to { opacity: 1; transform: translateY(0); }
}
.card-badge {
	display: inline-block;
	font-family: var(--font-display);
	font-size: 9px;
	font-weight: 700;
	letter-spacing: 1.5px;
	text-transform: uppercase;
	color: var(--accent);
	background: var(--accent-dim);
	padding: 2px 8px;
	border-radius: 4px;
	margin-bottom: 8px;
}
.card-label {
	font-size: 12px;
	color: var(--text-muted);
	margin-bottom: 8px;
}
.card-link {
	display: block;
	font-size: 11px;
	color: var(--text-bright);
	text-decoration: none;
	word-break: break-all;
	cursor: pointer;
	padding: 6px 8px;
	background: rgba(241, 245, 249, 0.7);
	border-radius: 6px;
	border: 1px solid rgba(0,0,0,0.06);
	transition: all 0.2s;
}
.card-link:hover {
	background: rgba(8, 145, 178, 0.06);
	border-color: var(--accent-dim);
	color: var(--accent);
}
.qr-wrap {
	margin-top: 10px;
	display: flex;
	justify-content: center;
	min-height: 0;
}
.qr-wrap img, .qr-wrap canvas {
	border-radius: 6px !important;
}
/* Toggle bar */
.toggle-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
	margin: 24px 0;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	cursor: pointer;
	transition: all 0.3s;
	color: var(--text);
	font-size: 12px;
	font-weight: 500;
}
.toggle-bar:hover {
	border-color: var(--border-active);
	background: var(--bg-card-hover);
}
.toggle-arrow {
	color: var(--accent);
	font-size: 14px;
	transition: transform 0.3s;
}
.toggle-bar.active .toggle-arrow {
	transform: rotate(180deg);
}
/* Guest section */
.guest-info {
	background: rgba(99, 102, 241, 0.08);
	border: 1px solid rgba(99, 102, 241, 0.15);
	border-radius: var(--radius);
	padding: 12px 16px;
	margin: 12px 0;
	font-size: 12px;
	color: var(--text-muted);
}
.guest-info strong {
	color: var(--accent-purple);
}
.guest-section .card-grid {
	margin-top: 12px;
}
/* Config section */
.config-section {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 16px 20px;
	margin: 24px 0;
}
.config-row {
	display: flex;
	align-items: baseline;
	gap: 12px;
	padding: 6px 0;
	font-size: 11px;
}
.config-row + .config-row {
	border-top: 1px solid rgba(0,0,0,0.05);
	padding-top: 10px;
	margin-top: 4px;
}
.config-key {
	font-family: var(--font-display);
	font-size: 9px;
	font-weight: 700;
	letter-spacing: 1.5px;
	color: var(--accent);
	text-transform: uppercase;
	min-width: 80px;
	flex-shrink: 0;
}
.config-val {
	color: var(--text-muted);
	word-break: break-all;
	font-size: 11px;
}
/* Editor */
.editor {
	width: 100%;
	min-height: 260px;
	background: rgba(241, 245, 249, 0.8);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	color: var(--text);
	font-family: var(--font-mono);
	font-size: 12px;
	line-height: 1.7;
	padding: 16px;
	resize: vertical;
	transition: border-color 0.3s, box-shadow 0.3s;
}
.editor:focus {
	outline: none;
	border-color: var(--accent);
	box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.1), inset 0 0 20px rgba(8, 145, 178, 0.03);
}
.editor::placeholder { color: var(--text-muted); opacity: 0.5; }
.editor-bar {
	display: flex;
	align-items: center;
	gap: 14px;
	margin-top: 10px;
}
.save-btn {
	font-family: var(--font-display);
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 1.5px;
	text-transform: uppercase;
	padding: 10px 28px;
	background: linear-gradient(135deg, var(--accent-green), #00c853);
	color: #ffffff;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.3s;
}
.save-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 20px rgba(5, 150, 105, 0.2);
}
.save-btn:active { transform: translateY(0); }
.save-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
	transform: none;
	box-shadow: none;
}
.save-status {
	font-size: 11px;
	color: var(--text-muted);
}
.no-kv {
	color: var(--accent-warm);
	padding: 20px;
	text-align: center;
	border: 1px dashed rgba(232, 93, 42, 0.3);
	border-radius: var(--radius);
}
/* Footer */
.footer {
	margin-top: 40px;
	padding-top: 20px;
	border-top: 1px solid var(--border);
	text-align: center;
	font-size: 11px;
	color: var(--text-muted);
	line-height: 2;
}
.footer a {
	color: var(--accent);
	text-decoration: none;
	transition: color 0.2s;
}
.footer a:hover { color: var(--text-bright); text-decoration: underline; }
.footer .divider {
	display: inline-block;
	width: 40px;
	text-align: center;
	opacity: 0.12;
}
.ua-line {
	margin-top: 16px;
	font-size: 10px;
	color: var(--text-muted);
	opacity: 0.5;
	word-break: break-all;
}
/* Responsive */
@media (max-width: 560px) {
	.card-grid {
		grid-template-columns: 1fr;
	}
	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}
	.config-row {
		flex-direction: column;
		gap: 4px;
	}
}
</style>
</head>
<body>
<div class="bg-grid"></div>
<div class="glow-orb orb-1"></div>
<div class="glow-orb orb-2"></div>
<div class="container">
	<header class="header">
		<div class="logo-area">
			<svg class="fox-logo" viewBox="0 0 40 36" fill="none" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<linearGradient id="foxGrad" x1="0" y1="0" x2="40" y2="36" gradientUnits="userSpaceOnUse">
						<stop offset="0%" stop-color="#00e5ff"/>
						<stop offset="55%" stop-color="#6366f1"/>
						<stop offset="100%" stop-color="#ff6b35"/>
					</linearGradient>
				</defs>
				<path d="M2 34L14 2L20 20Z" fill="url(#foxGrad)"/>
				<path d="M38 34L26 2L20 20Z" fill="url(#foxGrad)"/>
				<path d="M8 28L20 14L32 28L26 34L20 30L14 34Z" fill="url(#foxGrad)"/>
			</svg>
			<div>
				<div class="brand">foxai</div>
				<div class="subtitle">${FileName}</div>
			</div>
		</div>
		<div class="status-badge">Online</div>
	</header>

	<section class="section">
		<h2 class="section-title"><span class="title-accent"></span>Subscribe</h2>
		<p class="section-desc">点击链接复制订阅地址并生成二维码</p>
		<div class="card-grid">
			<div class="sub-card" style="animation-delay:0.05s">
				<div class="card-badge">Auto</div>
				<div class="card-label">自适应订阅</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?sub','qrcode_0')" class="card-link">https://${url.hostname}/${mytoken}</a>
				<div id="qrcode_0" class="qr-wrap"></div>
			</div>
			<div class="sub-card" style="animation-delay:0.1s">
				<div class="card-badge">Base64</div>
				<div class="card-label">Base64订阅</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?b64','qrcode_1')" class="card-link">https://${url.hostname}/${mytoken}?b64</a>
				<div id="qrcode_1" class="qr-wrap"></div>
			</div>
			<div class="sub-card" style="animation-delay:0.15s">
				<div class="card-badge">Clash</div>
				<div class="card-label">Clash订阅</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?clash','qrcode_2')" class="card-link">https://${url.hostname}/${mytoken}?clash</a>
				<div id="qrcode_2" class="qr-wrap"></div>
			</div>
			<div class="sub-card" style="animation-delay:0.2s">
				<div class="card-badge">Singbox</div>
				<div class="card-label">Singbox订阅</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?sb','qrcode_3')" class="card-link">https://${url.hostname}/${mytoken}?sb</a>
				<div id="qrcode_3" class="qr-wrap"></div>
			</div>
			<div class="sub-card" style="animation-delay:0.25s">
				<div class="card-badge">Surge</div>
				<div class="card-label">Surge订阅</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?surge','qrcode_4')" class="card-link">https://${url.hostname}/${mytoken}?surge</a>
				<div id="qrcode_4" class="qr-wrap"></div>
			</div>
			<div class="sub-card" style="animation-delay:0.3s">
				<div class="card-badge">Loon</div>
				<div class="card-label">Loon订阅</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?loon','qrcode_5')" class="card-link">https://${url.hostname}/${mytoken}?loon</a>
				<div id="qrcode_5" class="qr-wrap"></div>
			</div>
		</div>
	</section>

	<div class="toggle-bar" id="guestToggle" onclick="toggleNotice()">
		<span id="noticeToggle">Guest Subscribe / 访客订阅</span>
		<span class="toggle-arrow">&#9662;</span>
	</div>
	<div id="noticeContent" style="display:none;">
		<div class="guest-info">
			访客订阅仅可使用订阅功能，无法查看配置页 &mdash; GUEST TOKEN: <strong>${guest}</strong>
		</div>
		<div class="card-grid guest-section">
			<div class="sub-card">
				<div class="card-badge">Auto</div>
				<div class="card-label">自适应</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}','guest_0')" class="card-link">https://${url.hostname}/sub?token=${guest}</a>
				<div id="guest_0" class="qr-wrap"></div>
			</div>
			<div class="sub-card">
				<div class="card-badge">Base64</div>
				<div class="card-label">Base64</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&b64','guest_1')" class="card-link">https://${url.hostname}/sub?token=${guest}&b64</a>
				<div id="guest_1" class="qr-wrap"></div>
			</div>
			<div class="sub-card">
				<div class="card-badge">Clash</div>
				<div class="card-label">Clash</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&clash','guest_2')" class="card-link">https://${url.hostname}/sub?token=${guest}&clash</a>
				<div id="guest_2" class="qr-wrap"></div>
			</div>
			<div class="sub-card">
				<div class="card-badge">Singbox</div>
				<div class="card-label">Singbox</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&sb','guest_3')" class="card-link">https://${url.hostname}/sub?token=${guest}&sb</a>
				<div id="guest_3" class="qr-wrap"></div>
			</div>
			<div class="sub-card">
				<div class="card-badge">Surge</div>
				<div class="card-label">Surge</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&surge','guest_4')" class="card-link">https://${url.hostname}/sub?token=${guest}&surge</a>
				<div id="guest_4" class="qr-wrap"></div>
			</div>
			<div class="sub-card">
				<div class="card-badge">Loon</div>
				<div class="card-label">Loon</div>
				<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&loon','guest_5')" class="card-link">https://${url.hostname}/sub?token=${guest}&loon</a>
				<div id="guest_5" class="qr-wrap"></div>
			</div>
		</div>
	</div>

	<section class="config-section">
		<div class="config-row">
			<span class="config-key">SubAPI</span>
			<span class="config-val">${subProtocol}://${subConverter}</span>
		</div>
		<div class="config-row">
			<span class="config-key">SubConfig</span>
			<span class="config-val">${subConfig}</span>
		</div>
	</section>

	<section class="section">
		<h2 class="section-title"><span class="title-accent"></span>Editor</h2>
		<p class="section-desc">编辑节点链接与订阅地址，每行一个</p>
		${hasKV ? `
		<textarea id="content" class="editor"
			placeholder="${decodeURIComponent(atob('TElOSyVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNCVCOCVBQSVFOCU4QSU4MiVFNyU4MiVCOSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQp2bGVzcyUzQSUyRiUyRjI0NmFhNzk1LTA2MzctNGY0Yy04ZjY0LTJjOGZiMjRjMWJhZCU0MDEyNy4wLjAuMSUzQTEyMzQlM0ZlbmNyeXB0aW9uJTNEbm9uZSUyNnNlY3VyaXR5JTNEdGxzJTI2c25pJTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2YWxsb3dJbnNlY3VyZSUzRDElMjZ0eXBlJTNEd3MlMjZob3N0JTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2cGF0aCUzRCUyNTJGJTI1M0ZlZCUyNTNEMjU2MCUyM0NGbmF0CnRyb2phbiUzQSUyRiUyRmFhNmRkZDJmLWQxY2YtNGE1Mi1iYTFiLTI2NDBjNDFhNzg1NiU0MDIxOC4xOTAuMjMwLjIwNyUzQTQxMjg4JTNGc2VjdXJpdHklM0R0bHMlMjZzbmklM0RoazEyLmJpbGliaWxpLmNvbSUyNmFsbG93SW5zZWN1cmUlM0QxJTI2dHlwZSUzRHRjcCUyNmhlYWRlclR5cGUlM0Rub25lJTIzSEsKc3MlM0ElMkYlMkZZMmhoWTJoaE1qQXRhV1YwWmkxd2IyeDVNVE13TlRveVJYUlFjVzQyU0ZscVZVNWpTRzlvVEdaVmNFWlJkMjVtYWtORFVUVnRhREZ0U21SRlRVTkNkV04xVjFvNVVERjFaR3RTUzBodVZuaDFielUxYXpGTFdIb3lSbTgyYW5KbmRERTRWelkyYjNCMGVURmxOR0p0TVdwNlprTm1RbUklMjUzRCU0MDg0LjE5LjMxLjYzJTNBNTA4NDElMjNERQoKCiVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNiU5RCVBMSVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQpodHRwcyUzQSUyRiUyRnN1Yi54Zi5mcmVlLmhyJTJGYXV0bw=='))}">${content}</textarea>
		<div class="editor-bar">
			<button class="save-btn" onclick="saveContent(this)">Save</button>
			<span id="saveStatus" class="save-status"></span>
		</div>
		` : '<p class="no-kv">请绑定 KV 命名空间以启用编辑功能</p>'}
	</section>

	<footer class="footer">
		<div class="ua-line">UA: ${request.headers.get('User-Agent')}</div>
	</footer>
</div>

<script>
function copyToClipboard(text, qrcode) {
	navigator.clipboard.writeText(text).then(() => {
		showToast('已复制到剪贴板');
	}).catch(err => {
		console.error('复制失败:', err);
	});
	const qrcodeDiv = document.getElementById(qrcode);
	qrcodeDiv.innerHTML = '';
	new QRCode(qrcodeDiv, {
		text: text,
		width: 160,
		height: 160,
		colorDark: "#1e293b",
		colorLight: "#ffffff",
		correctLevel: QRCode.CorrectLevel.M,
		scale: 1
	});
}

function showToast(msg) {
	let t = document.createElement('div');
	t.textContent = msg;
	Object.assign(t.style, {
		position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
		background:'linear-gradient(135deg, #0891b2, #6366f1)', color:'#ffffff',
		padding:'10px 24px', borderRadius:'8px', fontSize:'12px', fontWeight:'600',
		fontFamily:"'JetBrains Mono', monospace", zIndex:'9999',
		boxShadow:'0 4px 20px rgba(8,145,178,0.3)', animation:'toastIn 0.3s ease'
	});
	document.body.appendChild(t);
	setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; }, 1800);
	setTimeout(() => t.remove(), 2200);
}

if (document.querySelector('.editor')) {
	let timer;
	const textarea = document.getElementById('content');
	const originalContent = textarea.value;

	function replaceFullwidthColon() {
		const text = textarea.value;
		textarea.value = text.replace(/\uff1a/g, ':');
	}

	function saveContent(button) {
		try {
			const updateButtonText = (step) => {
				button.textContent = \`Saving... \${step}\`;
			};
			const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
			if (!isIOS) replaceFullwidthColon();
			updateButtonText('...');
			button.disabled = true;

			const textarea = document.getElementById('content');
			if (!textarea) throw new Error('textarea not found');

			let newContent, originalContent;
			try {
				newContent = textarea.value || '';
				originalContent = textarea.defaultValue || '';
			} catch (e) {
				throw new Error('cannot read editor');
			}

			const updateStatus = (message, isError = false) => {
				const el = document.getElementById('saveStatus');
				if (el) {
					el.textContent = message;
					el.style.color = isError ? '#ff6b6b' : '#00e676';
				}
			};
			const resetButton = () => {
				button.textContent = 'Save';
				button.disabled = false;
			};

			if (newContent !== originalContent) {
				fetch(window.location.href, {
					method: 'POST',
					body: newContent,
					headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
					cache: 'no-cache'
				})
				.then(response => {
					if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
					const now = new Date().toLocaleString();
					document.title = \`${FileName} saved \${now}\`;
					updateStatus(\`saved \${now}\`);
				})
				.catch(error => {
					console.error('Save error:', error);
					updateStatus(\`failed: \${error.message}\`, true);
				})
				.finally(() => resetButton());
			} else {
				updateStatus('no changes');
				resetButton();
			}
		} catch (error) {
			button.textContent = 'Save';
			button.disabled = false;
			const el = document.getElementById('saveStatus');
			if (el) { el.textContent = \`error: \${error.message}\`; el.style.color = '#ff6b6b'; }
		}
	}

	textarea.addEventListener('blur', saveContent);
	textarea.addEventListener('input', () => {
		clearTimeout(timer);
		timer = setTimeout(saveContent, 5000);
	});
}

function toggleNotice() {
	const nc = document.getElementById('noticeContent');
	const nt = document.getElementById('noticeToggle');
	const tb = document.getElementById('guestToggle');
	if (nc.style.display === 'none' || nc.style.display === '') {
		nc.style.display = 'block';
		nt.textContent = 'Guest Subscribe / 访客订阅';
		tb.classList.add('active');
	} else {
		nc.style.display = 'none';
		nt.textContent = 'Guest Subscribe / 访客订阅';
		tb.classList.remove('active');
	}
}

document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('noticeContent').style.display = 'none';
});
</script>
</body>
</html>
		`;

		return new Response(html, {
			headers: { "Content-Type": "text/html;charset=utf-8" }
		});
	} catch (error) {
		console.error('处理请求时发生错误:', error);
		return new Response("服务器错误: " + error.message, {
			status: 500,
			headers: { "Content-Type": "text/plain;charset=utf-8" }
		});
	}
}