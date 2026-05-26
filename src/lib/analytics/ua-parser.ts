/**
 * Mini UA parser sem dependências (compatível Cloudflare Worker).
 * Detecta tipo de dispositivo, OS e browser principais.
 */

export type ParsedUA = {
  device_type: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  os: string;
  os_version: string;
  browser: string;
  browser_version: string;
  is_bot: boolean;
};

const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /facebookexternalhit/i,
  /facebot/i, /pingdom/i, /preview/i, /lighthouse/i, /headlesschrome/i,
  /phantomjs/i, /selenium/i, /puppeteer/i, /playwright/i, /curl/i, /wget/i,
  /python-requests/i, /node-fetch/i, /axios/i, /go-http-client/i,
];

export function parseUA(ua: string | null | undefined): ParsedUA {
  const s = ua || "";
  const isBot = BOT_PATTERNS.some((re) => re.test(s));
  if (isBot) {
    return { device_type: "bot", os: "Bot", os_version: "", browser: "Bot", browser_version: "", is_bot: true };
  }

  // device
  let device_type: ParsedUA["device_type"] = "desktop";
  if (/ipad|tablet|playbook|silk/i.test(s)) device_type = "tablet";
  else if (/mobi|iphone|ipod|android.+mobile|blackberry|iemobile|opera mini/i.test(s)) device_type = "mobile";
  else if (/android/i.test(s) && !/mobile/i.test(s)) device_type = "tablet";

  // OS
  let os = "Unknown";
  let os_version = "";
  if (/windows nt ([\d.]+)/i.test(s)) { os = "Windows"; os_version = RegExp.$1; }
  else if (/mac os x ([\d_\.]+)/i.test(s)) { os = "macOS"; os_version = RegExp.$1.replace(/_/g, "."); }
  else if (/android ([\d\.]+)/i.test(s)) { os = "Android"; os_version = RegExp.$1; }
  else if (/iphone os ([\d_]+)/i.test(s) || /ipad.+os ([\d_]+)/i.test(s)) { os = "iOS"; os_version = RegExp.$1.replace(/_/g, "."); }
  else if (/linux/i.test(s)) { os = "Linux"; }
  else if (/cros /i.test(s)) { os = "ChromeOS"; }

  // Browser (order matters)
  let browser = "Unknown";
  let browser_version = "";
  if (/edg\/([\d\.]+)/i.test(s)) { browser = "Edge"; browser_version = RegExp.$1; }
  else if (/opr\/([\d\.]+)/i.test(s) || /opera\/([\d\.]+)/i.test(s)) { browser = "Opera"; browser_version = RegExp.$1; }
  else if (/chrome\/([\d\.]+)/i.test(s)) { browser = "Chrome"; browser_version = RegExp.$1; }
  else if (/firefox\/([\d\.]+)/i.test(s)) { browser = "Firefox"; browser_version = RegExp.$1; }
  else if (/version\/([\d\.]+).+safari/i.test(s)) { browser = "Safari"; browser_version = RegExp.$1; }
  else if (/safari\/([\d\.]+)/i.test(s)) { browser = "Safari"; browser_version = RegExp.$1; }

  return { device_type, os, os_version, browser, browser_version, is_bot: false };
}

export function extractDomain(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function anonymizeIp(ip: string | null | undefined): string {
  if (!ip) return "";
  if (ip.includes(":")) {
    // IPv6: zera últimos 4 grupos
    const parts = ip.split(":");
    return parts.slice(0, 4).join(":") + "::";
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    parts[3] = "0";
    return parts.join(".");
  }
  return ip;
}