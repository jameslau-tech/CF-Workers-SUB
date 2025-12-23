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

		// 新增变量
		const PROXY_IP = env.PROXY_IP || '';
		const MAX_NODES = parseInt(env.MAX_NODES) || 1000;
		const CACHE_TTL = parseInt(env.CACHE_TTL) || 1800;
		const CUSTOM_HEADER = env.CUSTOM_HEADER || '';
		const FILTER_KEYWORDS = env.FILTER_KEYWORDS ? env.FILTER_KEYWORDS.split(',').map(k => k.trim()) : [];
		const SORT_BY_NAME = env.SORT_BY_NAME === 'true';
		const ADMIN_PASS = env.ADMIN_PASS || '';

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
			if (TG == 1 && url.pathname !== "/" && url.pathname !== "/favicon.ico") await sendMessage(`#异常访问 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgent}\n域名: ${url.hostname}\n访问路径: ${url.pathname}`);
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
					await sendMessage(`#编辑订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}\n域名: ${url.hostname}\n访问路径: ${url.pathname}`);
					return await KV(request, env, 'LINK.txt', 访客订阅, ADMIN_PASS);
				} else {
					MainData = await env.KV.get('LINK.txt') || MainData;
				}
			} else {
				MainData = env.LINK || MainData;
				if (env.LINKSUB) urls = await ADD(env.LINKSUB);
			}
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
			await sendMessage(`#获取订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}\n域名: ${url.hostname}\n访问路径: ${url.pathname}`);
			const isSubConverterRequest = request.headers.get('subconverter-request') || request.headers.get('subconverter-version') || userAgent.includes('subconverter');
			let 订阅格式 = 'base64';
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

			let subConverterUrl;
			let 订阅转换URL = `${url.origin}/${await MD5MD5(fakeToken)}?token=${fakeToken}`;
			//console.log(订阅转换URL);
			let req_data = MainData;

			let 追加UA = 'v2rayn';
			if (url.searchParams.has('b64') || url.searchParams.has('base64')) 订阅格式 = 'base64';
			else if (url.searchParams.has('clash')) 追加UA = 'clash';
			else if (url.searchParams.has('singbox')) 追加UA = 'singbox';
			else if (url.searchParams.has('surge')) 追加UA = 'surge';
			else if (url.searchParams.has('quanx')) 追加UA = 'Quantumult%20X';
			else if (url.searchParams.has('loon')) 追加UA = 'Loon';

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
			//const text = String.fromCharCode.apply(null, encodedData);
			const utf8Decoder = new TextDecoder();
			const text = utf8Decoder.decode(encodedData);

			//去重
			const uniqueLines = new Set(text.split('\n'));
			let result = [...uniqueLines].join('\n');
			//console.log(result);

			// 应用过滤、排序和截断
			let lines = result.split('\n').filter(line => line.trim() !== '');
			if (FILTER_KEYWORDS.length > 0) {
				lines = lines.filter(line => FILTER_KEYWORDS.some(keyword => line.toLowerCase().includes(keyword.toLowerCase())));
			}
			if (SORT_BY_NAME) {
				lines = lines.sort((a, b) => a.localeCompare(b));
			}
			if (lines.length > MAX_NODES) {
				lines = lines.slice(0, MAX_NODES);
			}
			result = lines.join('\n');

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
				//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,
				"Cache-Control": `max-age=${CACHE_TTL}`,
			};
			if (CUSTOM_HEADER) {
				responseHeaders["X-Custom-Header"] = CUSTOM_HEADER;
			}

			if (订阅格式 == 'base64' || token == fakeToken) {
				return new Response(base64Data, { headers: responseHeaders });
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
			//console.log(订阅转换URL);
			try {
				const subConverterResponse = await fetch(subConverterUrl, { headers: { 'User-Agent': userAgentHeader } });//订阅转换
				if (!subConverterResponse.ok) return new Response(base64Data, { headers: responseHeaders });
				let subConverterContent = await subConverterResponse.text();
				if (订阅格式 == 'clash') subConverterContent = await clashFix(subConverterContent);
				// 只有非浏览器订阅才会返回SUBNAME
				if (!userAgent.includes('mozilla')) responseHeaders["Content-Disposition"] = `attachment;filename=${FileName}.${订阅格式 == 'clash' ? 'yaml' : 'txt'}`;
				return new Response(subConverterContent, { headers: responseHeaders });
			} catch (error) {
				return new Response(base64Data, { headers: responseHeaders });
			}
		}
	}
};

async function KV(request, env, kvkey = 'LINK.txt', guestToken = 'guest', adminPass = '') {
	const url = new URL(request.url);
	const method = request.method;
	const pass = url.searchParams.get('pass') || '';

	if (adminPass && pass !== adminPass) {
		return new Response('Unauthorized: Invalid password', { status: 401 });
	}

	if (method === 'POST') {
		const formData = await request.formData();
		const content = formData.get('links') || '';
		await env.KV.put(kvkey, content);
		return new Response('保存成功！', { status: 200 });
	} else if (method === 'GET') {
		const content = await env.KV.get(kvkey) || '';
		const html = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>订阅管理</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container mt-5">
  <h2>节点/订阅管理</h2>
  <form method="post">
    <textarea name="links" class="form-control" rows="20">${content}</textarea>
    <button type="submit" class="btn btn-primary mt-3">保存</button>
  </form>
  <p>当前节点列表：</p>
  <pre>${content}</pre>
</body>
</html>
		`;
		return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
	}
	return new Response('Method Not Allowed', { status: 405 });
}

async function MD5MD5(input) {
	const hc = (d, enc = 'hex') => {
		const str = d.toString(enc);
		const s = 8 - str.length;
		return s > 0 ? new Array(s + 1).join('0') + str : str;
	};

	const rl = (num, cnt) => (num << cnt) | (num >>> (32 - cnt));

	const cmn = (q, a, b, x, s, t) => rl(a + q + x + t, s) + b;

	const ff = (a, b, c, d, x, s, t) => cmn((b & c) | (~b & d), a, b, x, s, t);

	const gg = (a, b, c, d, x, s, t) => cmn((b & d) | (c & ~d), a, b, x, s, t);

	const hh = (a, b, c, d, x, s, t) => cmn(b ^ c ^ d, a, b, x, s, t);

	const ii = (a, b, c, d, x, s, t) => cmn(c ^ (b | ~d), a, b, x, s, t);

	const sb = x => new TextEncoder().encode(x);

	const calcMD5 = inp => {
		const x = Array();
		const k = inp.length;
		const BS = 64;

		let a = 1732584193,
			b = -271733879,
			c = -1732584194,
			d = 271733878;

		for (let i = 0; i < k; i += BS) {
			const oa = a,
				ob = b,
				oc = c,
				od = d;

			a = ff(a, b, c, d, inp[i + 0], 7, -680876936);
			d = ff(d, a, b, c, inp[i + 1], 12, -389564586);
			c = ff(c, d, a, b, inp[i + 2], 17, 606105819);
			b = ff(b, c, d, a, inp[i + 3], 22, -1044525330);
			a = ff(a, b, c, d, inp[i + 4], 7, -176418897);
			d = ff(d, a, b, c, inp[i + 5], 12, 1200080426);
			c = ff(c, d, a, b, inp[i + 6], 17, -1473231341);
			b = ff(b, c, d, a, inp[i + 7], 22, -45705983);
			a = ff(a, b, c, d, inp[i + 8], 7, 1770035416);
			d = ff(d, a, b, c, inp[i + 9], 12, -1958414417);
			c = ff(c, d, a, b, inp[i + 10], 17, -42063);
			b = ff(b, c, d, a, inp[i + 11], 22, -1990404162);
			a = ff(a, b, c, d, inp[i + 12], 7, 1804603682);
			d = ff(d, a, b, c, inp[i + 13], 12, -40341101);
			c = ff(c, d, a, b, inp[i + 14], 17, -1502002290);
			b = ff(b, c, d, a, inp[i + 15], 22, 1236535329);

			a = gg(a, b, c, d, inp[i + 1], 5, -165796510);
			d = gg(d, a, b, c, inp[i + 6], 9, -1069501632);
			c = gg(c, d, a, b, inp[i + 11], 14, 643717713);
			b = gg(b, c, d, a, inp[i + 0], 20, -373897302);
			a = gg(a, b, c, d, inp[i + 5], 5, -701558691);
			d = gg(d, a, b, c, inp[i + 10], 9, 38016083);
			c = gg(c, d, a, b, inp[i + 15], 14, -660478335);
			b = gg(b, c, d, a, inp[i + 4], 20, -405537848);
			a = gg(a, b, c, d, inp[i + 9], 5, 568446438);
			d = gg(d, a, b, c, inp[i + 14], 9, -1019803690);
			c = gg(c, d, a, b, inp[i + 3], 14, -187363961);
			b = gg(b, c, d, a, inp[i + 8], 20, 1163531501);
			a = gg(a, b, c, d, inp[i + 13], 5, -1444681467);
			d = gg(d, a, b, c, inp[i + 2], 9, -51403784);
			c = gg(c, d, a, b, inp[i + 7], 14, 1735328473);
			b = gg(b, c, d, a, inp[i + 12], 20, -1926607734);

			a = hh(a, b, c, d, inp[i + 5], 4, -378558);
			d = hh(d, a, b, c, inp[i + 8], 11, -2022574463);
			c = hh(c, d, a, b, inp[i + 11], 16, 1839030562);
			b = hh(b, c, d, a, inp[i + 14], 23, -35309556);
			a = hh(a, b, c, d, inp[i + 1], 4, -1530992060);
			d = hh(d, a, b, c, inp[i + 4], 11, 1272893353);
			c = hh(c, d, a, b, inp[i + 7], 16, -155497632);
			b = hh(b, c, d, a, inp[i + 10], 23, -1094730640);
			a = hh(a, b, c, d, inp[i + 13], 4, 681279174);
			d = hh(d, a, b, c, inp[i + 0], 11, -358537222);
			c = hh(c, d, a, b, inp[i + 3], 16, -722521979);
			b = hh(b, c, d, a, inp[i + 6], 23, 76029189);
			a = hh(a, b, c, d, inp[i + 9], 4, -640364487);
			d = hh(d, a, b, c, inp[i + 12], 11, -421815835);
			c = hh(c, d, a, b, inp[i + 15], 16, 530742520);
			b = hh(b, c, d, a, inp[i + 2], 23, -995338651);

			a = ii(a, b, c, d, inp[i + 0], 6, -198630844);
			d = ii(d, a, b, c, inp[i + 7], 10, 1126891415);
			c = ii(c, d, a, b, inp[i + 14], 15, -1416354905);
			b = ii(b, c, d, a, inp[i + 5], 21, -57434055);
			a = ii(a, b, c, d, inp[i + 12], 6, 1700485571);
			d = ii(d, a, b, c, inp[i + 3], 10, -1894986606);
			c = ii(c, d, a, b, inp[i + 10], 15, -1051523);
			b = ii(b, c, d, a, inp[i + 1], 21, -2054922799);
			a = ii(a, b, c, d, inp[i + 8], 6, 1873313359);
			d = ii(d, a, b, c, inp[i + 15], 10, -30611744);
			c = ii(c, d, a, b, inp[i + 6], 15, -1560198380);
			b = ii(b, c, d, a, inp[i + 13], 21, 1309151649);
			a = ii(a, b, c, d, inp[i + 4], 6, -145523070);
			d = ii(d, a, b, c, inp[i + 11], 10, -1120210379);
			c = ii(c, d, a, b, inp[i + 2], 15, 718787259);
			b = ii(b, c, d, a, inp[i + 9], 21, -343485551);

			a = (a + oa) | 0;
			b = (b + ob) | 0;
			c = (c + oc) | 0;
			d = (d + od) | 0;
		}

		return hc(a) + hc(b) + hc(c) + hc(d);
	};

	const inp = sb(input);
	const len = inp.length * 8;
	const inpPadded = new Uint8Array(((len + 72) >>> 9) << 6);

	inpPadded.set(inp);
	inpPadded[inp.length] = 128;

	for (let i = inp.length + 1; i < inpPadded.length - 8; i++) inpPadded[i] = 0;

	let view = new DataView(inpPadded.buffer);
	view.setUint32(inpPadded.length - 8, len >>> 0, true);
	view.setUint32(inpPadded.length - 4, len / 4294967296, true);

	const hash = calcMD5(inpPadded);
	return calcMD5(sb(hash));
}

async function ADD(md) {
	var add = [];
	if (typeof md == 'string') {
		const lines = md.split("\n");
		for (let line of lines) {
			const elem = line.trim();
			if (elem) {
				add.push(elem);
			}
		}
	} else {
		add = md;
	}
	return add;
}

async function 迁移地址列表(env, kvkey = 'LINK.txt') {
	if (env.LINK) await env.KV.put(kvkey, env.LINK);
}

async function sendMessage(subject, ip, short) {
	if (BotToken !== '' && ChatID !== '') {
		let msg = `${subject}\nIP: ${ip}\n${short}`;
		return await fetch(`https://api.telegram.org/bot${BotToken}/sendMessage?chat_id=${ChatID}&text=${encodeURIComponent(msg)}`, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br, zstd',
				'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.85 Safari/537.36'
			},
		});
	}
}

async function getSUB(arr, request, 追加UA, userAgentHeader) {
	const allPromises = arr.map(async (url) => {
		try {
			const newRequest = new Request(request, { redirect: 'follow' });
			newRequest.headers.set('User-Agent', 追加UA);
			const res = await fetch(url, newRequest);
			if (!res.ok) {
				console.error(`Error fetching ${url}: ${res.status}`);
				return '';
			}
			let text = await res.text();
			if (text.includes('sub')) {
				const match = text.match(/sub(?:scription)?=(.*)/i);
				if (match) text = atob(match[1]);
			} else if (text.match(/^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/)) {
				text = atob(text);
			}
			return text.split('\n');
		} catch (error) {
			console.error(`Error fetching ${url}: ${error.message}`);
			return '';
		}
	});

	const results = await Promise.all(allPromises);
	let newResults = [];
	let newUrl = '';
	for (let lines of results) {
		if (lines) {
			newResults.push(...lines);
			newUrl += '|' + encodeURIComponent(lines.join('\n'));
		}
	}
	return [newResults, newUrl];
}

async function clashFix(content) {
	let yaml = jsyaml.load(content);
	for (let i = 0; i < yaml.proxies.length; i++) {
		if (yaml.proxies[i].network === 'http') {
			yaml.proxies[i] = {
				...yaml.proxies[i],
				tls: yaml.proxies[i].tls === 'true',
				skipCertVerify: yaml.proxies[i]['skip-cert-vertify'] === 'true'
			};
			delete yaml.proxies[i]['skip-cert-vertify'];
		}
	}
	return jsyaml.dump(yaml);
}

async function proxyURL(url, reqUrl) {
	return await fetch(url, {
		method: 'get',
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml;',
			'Accept-Encoding': 'gzip, deflate, br, zstd',
			'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.85 Safari/537.36'
		},
	}).then(resp => resp.text()).then(text => {
		return text.replace(/__DOMAIN__/g, reqUrl.hostname).replace(/__PATH__/g, reqUrl.pathname);
	});
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
	`;
	return text;
}
