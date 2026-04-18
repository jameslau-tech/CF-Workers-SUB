# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CF-Workers-SUB is a Cloudflare Worker that aggregates multiple proxy node links and subscription URLs into a single subscription endpoint. It auto-detects the client type (Clash, Singbox, Surge, Quantumult X, Loon, base64) via User-Agent and converts the aggregated subscription to the appropriate format using an external subconverter backend.

## Development & Deployment

This is a fork of [cmliu/CF-Workers-SUB](https://github.com/cmliu/CF-Workers-SUB). A GitHub Actions workflow (`.github/workflows/sync.yml`) auto-syncs from upstream daily.

- **Runtime**: Cloudflare Workers (no build step needed)
- **Entry point**: `_worker.js` (single-file architecture)
- **Config**: `wrangler.toml` — worker name, compatibility date, optional KV binding
- **Deploy**: `npx wrangler deploy` or push to Cloudflare Pages

## Architecture

Everything lives in `_worker.js`. The `fetch` handler is the main entry point with this request flow:

1. **Auth**: Checks `token` query param or path against `mytoken`, a daily-rotating MD5 hash (`fakeToken`), and `guestToken`. Unauthenticated requests get a fake nginx page (or redirect via `URL302`/`URL` env vars).
2. **Data loading**: If KV is bound, reads `LINK.txt` from KV (with a migration from old `/LINK.txt` key). Falls back to `MainData` hardcoded in the file or the `LINK` env var.
3. **Link parsing**: Splits all sources into node links (vless://, vmess://, trojan://, ss://, etc.) vs HTTP subscription URLs.
4. **Subscription fetching** (`getSUB`): Parallel-fetches all subscription URLs with a 2-second timeout, detects format (base64, Clash YAML, Singbox JSON, plaintext), and decodes accordingly.
5. **Format detection**: Inspects User-Agent and query params (`?clash`, `?sb`, `?surge`, `?quanx`, `?loon`, `?b64`) to determine output format.
6. **Conversion**: For non-base64 formats, proxies through the subconverter backend (`SUBAPI`) to generate client-specific configs.
7. **Web UI** (`KV` function): Browser requests (User-Agent contains "mozilla") render an HTML editor page for managing links in KV, with QR codes for subscription URLs and auto-save on blur.

### Key helper functions

| Function | Purpose |
|---|---|
| `ADD()` | Splits newline-delimited text into arrays, normalizes separators |
| `getSUB()` | Fetches subscription URLs in parallel, detects/decodes format |
| `getUrl()` | Proxies requests with custom User-Agent |
| `KV()` | Renders web UI editor and handles POST saves to KV |
| `sendMessage()` | Sends Telegram notifications via bot API |
| `MD5MD5()` | Double-MD5 hashing for token generation |
| `clashFix()` | Patches Clash configs for WireGuard remote-dns-resolve |
| `proxyURL()` | Reverse-proxies to a random URL from config |
| `迁移地址列表()` | One-time migration of KV keys from `/LINK.txt` to `LINK.txt` |

## Environment Variables

| Var | Required | Description |
|---|---|---|
| `TOKEN` | Yes | Subscription path/token (default `auto`) |
| `KV` | Recommended | Cloudflare KV namespace binding for persistent link storage |
| `LINK` | No | Fallback node/subscription links (newline-separated) if no KV |
| `LINKSUB` | No | Additional subscription URLs |
| `SUBAPI` | No | Subconverter backend hostname (default `SUBAPI.cmliussss.net`) |
| `SUBCONFIG` | No | Subconverter config INI URL |
| `SUBNAME` | No | Subscription display name |
| `GUEST` / `GUESTTOKEN` | No | Read-only guest subscription token |
| `TGTOKEN` / `TGID` | No | Telegram bot token and chat ID for notifications |
| `TG` | No | Set `1` to log all accesses to Telegram |
| `URL302` / `URL` | No | Redirect or reverse-proxy for unauthenticated visitors |
| `WARP` | No | Additional WARP node links to append |
| `SUBUPTIME` | No | Subscription update interval in hours (default 6) |

## Conventions

- Variable names use Chinese characters throughout (e.g., `订阅格式`, `自建节点`, `访客订阅`) — this is intentional and should be preserved.
- The code uses `let` for module-level mutable state that gets overridden from env vars on each request.
- The web UI HTML is constructed as template literals inside the `KV()` function with inline CSS/JS.
- Base64-encoded strings in the UI are obfuscated placeholders (e.g., telegram links, example nodes).
