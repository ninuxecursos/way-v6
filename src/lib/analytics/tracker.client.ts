/**
 * Tracker first-party para o Way Home.
 * Carregado apenas no browser (importado dentro de useEffect no __root.tsx).
 * Coleta sessões, pageviews, cliques, scroll, formulários e duração.
 * Respeita opt-out via cookie `wh_track=off` e exclusão de admins via servidor.
 */

import type { Router } from "@tanstack/react-router";

const ENDPOINT_INGEST = "/api/public/analytics/ingest";
const ENDPOINT_PING = "/api/public/analytics/ping";
const COOKIE_SID = "wh_sid";
const COOKIE_VID = "wh_vid";
const COOKIE_OPTOUT = "wh_track";
const SESSION_TTL_MIN = 30;

type SessionInfo = { sid: string; vid: string; new: boolean };

function uuid(): string {
  // crypto.randomUUID disponível em browsers modernos
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax${secure}`;
}

function ensureSession(): SessionInfo {
  const vid = readCookie(COOKIE_VID) || uuid();
  writeCookie(COOKIE_VID, vid, 60 * 60 * 24 * 365 * 2); // 2 anos

  const lastSid = readCookie(COOKIE_SID);
  const lastSeenStr = readCookie(COOKIE_SID + "_ts");
  const lastSeen = lastSeenStr ? parseInt(lastSeenStr, 10) : 0;
  const now = Date.now();
  let sid = lastSid;
  let isNew = false;
  if (!sid || now - lastSeen > SESSION_TTL_MIN * 60 * 1000) {
    sid = uuid();
    isNew = true;
  }
  writeCookie(COOKIE_SID, sid, 60 * 60 * 24); // 1 dia (rolling)
  writeCookie(COOKIE_SID + "_ts", String(now), 60 * 60 * 24);
  return { sid, vid, new: isNew };
}

function isOptedOut(): boolean {
  return readCookie(COOKIE_OPTOUT) === "off";
}

function getUTMs(): Record<string, string | null> {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source"),
    utm_medium: p.get("utm_medium"),
    utm_campaign: p.get("utm_campaign"),
    utm_term: p.get("utm_term"),
    utm_content: p.get("utm_content"),
  };
}

function cssPath(el: Element): string {
  if (!el || el.nodeType !== 1) return "";
  const parts: string[] = [];
  let cur: Element | null = el;
  let depth = 0;
  while (cur && cur.nodeType === 1 && depth < 5) {
    let part = cur.nodeName.toLowerCase();
    if (cur.id) { part += `#${cur.id}`; parts.unshift(part); break; }
    const cls = (cur.className && typeof cur.className === "string") ? cur.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    if (cls) part += `.${cls}`;
    parts.unshift(part);
    cur = cur.parentElement;
    depth++;
  }
  return parts.join(" > ").slice(0, 240);
}

type Event = {
  event_type: string;
  path: string;
  page_title?: string;
  element_tag?: string;
  element_id?: string;
  element_class?: string;
  element_text?: string;
  element_selector?: string;
  x?: number;
  y?: number;
  scroll_depth_pct?: number;
  metadata?: Record<string, unknown>;
  occurred_at: string;
};

let queue: Event[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let session: SessionInfo | null = null;
let userId: string | null = null;
let lastScrollDepth = 0;
let lastPath = "";
let lastPathTs = 0;
let started = false;

function flush(useBeacon = false) {
  if (!session || queue.length === 0) return;
  const body = JSON.stringify({
    session_id: session.sid,
    visitor_id: session.vid,
    user_id: userId,
    events: queue,
  });
  queue = [];
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT_INGEST, new Blob([body], { type: "application/json" }));
    } else {
      fetch(ENDPOINT_INGEST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 2000);
}

function pushEvent(e: Omit<Event, "occurred_at">) {
  if (!session) return;
  queue.push({ ...e, occurred_at: new Date().toISOString() });
  if (queue.length >= 15) flush();
  else scheduleFlush();
}

function trackPageview() {
  const path = location.pathname + location.search;
  const now = Date.now();
  // Dedup: mesma rota em < 2s
  if (path === lastPath && now - lastPathTs < 2000) return;
  lastPath = path;
  lastPathTs = now;
  lastScrollDepth = 0;
  pushEvent({ event_type: "pageview", path, page_title: document.title });
}

function initSessionPayload(s: SessionInfo) {
  const utms = getUTMs();
  return {
    session_id: s.sid,
    visitor_id: s.vid,
    user_id: userId,
    is_new_session: s.new,
    user_agent: navigator.userAgent,
    screen_w: window.screen?.width ?? null,
    screen_h: window.screen?.height ?? null,
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
    language: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    referrer: document.referrer || null,
    landing_path: location.pathname + location.search,
    page_title: document.title,
    ...utms,
  };
}

async function sendInit(s: SessionInfo) {
  try {
    await fetch(ENDPOINT_INGEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...initSessionPayload(s), events: [] }),
      keepalive: true,
    });
  } catch {}
}

function ping() {
  if (!session) return;
  try {
    const body = JSON.stringify({ session_id: session.sid });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT_PING, new Blob([body], { type: "application/json" }));
    } else {
      fetch(ENDPOINT_PING, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {}
}

function attachListeners() {
  // Click delegation
  document.addEventListener(
    "click",
    (ev) => {
      const t = ev.target as Element | null;
      if (!t || !(t as Element).nodeType) return;
      const el = (t.closest?.("a,button,[role=button],input[type=submit]") as Element | null) || t;
      const tag = el.tagName?.toLowerCase() || "";
      const text = (el.textContent || "").trim().slice(0, 200);
      const href = (el as HTMLAnchorElement).href || "";
      const isOutbound = href && (() => {
        try { return new URL(href).hostname !== location.hostname; } catch { return false; }
      })();
      pushEvent({
        event_type: isOutbound ? "outbound_link" : "click",
        path: location.pathname + location.search,
        element_tag: tag,
        element_id: (el as HTMLElement).id || "",
        element_class: typeof (el as HTMLElement).className === "string" ? (el as HTMLElement).className.slice(0, 200) : "",
        element_text: text,
        element_selector: cssPath(el),
        x: (ev as MouseEvent).clientX,
        y: (ev as MouseEvent).clientY,
        metadata: href ? { href } : undefined,
      });
    },
    { capture: true, passive: true },
  );

  // Scroll milestones
  let scrollTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
        const h = document.documentElement;
        const total = h.scrollHeight - h.clientHeight;
        if (total <= 0) return;
        const pct = Math.min(100, Math.round((h.scrollTop / total) * 100));
        const milestone = pct >= 100 ? 100 : pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0;
        if (milestone > lastScrollDepth) {
          lastScrollDepth = milestone;
          pushEvent({
            event_type: "scroll",
            path: location.pathname + location.search,
            scroll_depth_pct: milestone,
          });
        }
      }, 400);
    },
    { passive: true },
  );

  // Form submit
  document.addEventListener(
    "submit",
    (ev) => {
      const form = ev.target as HTMLFormElement | null;
      if (!form || form.tagName !== "FORM") return;
      const fields = Array.from(form.querySelectorAll("input,select,textarea"))
        .map((el) => (el as HTMLInputElement).name)
        .filter(Boolean)
        .slice(0, 30);
      pushEvent({
        event_type: "form_submit",
        path: location.pathname + location.search,
        element_id: form.id || "",
        element_selector: cssPath(form),
        metadata: { action: form.action, method: form.method, fields },
      });
    },
    { capture: true, passive: true },
  );

  // Visibility / unload
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush(true);
      ping();
    }
  });
  window.addEventListener("pagehide", () => flush(true));
  window.addEventListener("beforeunload", () => flush(true));

  // Heartbeat 60s
  setInterval(() => { ping(); }, 60_000);
}

export function setAnalyticsUser(uid: string | null) {
  userId = uid;
}

export function trackCustomEvent(name: string, metadata?: Record<string, unknown>) {
  pushEvent({
    event_type: "custom",
    path: location.pathname + location.search,
    metadata: { name, ...(metadata || {}) },
  });
}

export function initAnalytics(router?: Router<any, any>) {
  if (typeof window === "undefined" || started) return;
  if (isOptedOut()) return;
  started = true;
  session = ensureSession();
  void sendInit(session);
  // pageview inicial
  trackPageview();
  attachListeners();
  // Hooka mudanças de rota do TanStack
  if (router && typeof router.subscribe === "function") {
    router.subscribe("onResolved", () => {
      // Atualiza last_seen via ping; pageview com dedup
      trackPageview();
    });
  } else {
    // Fallback: history API
    const _push = history.pushState;
    history.pushState = function (...args) {
      const r = _push.apply(this, args as any);
      setTimeout(trackPageview, 50);
      return r;
    };
    window.addEventListener("popstate", () => setTimeout(trackPageview, 50));
  }
}

export function disableAnalytics() {
  writeCookie(COOKIE_OPTOUT, "off", 60 * 60 * 24 * 365);
  writeCookie(COOKIE_SID, "", 0);
  writeCookie(COOKIE_VID, "", 0);
  writeCookie(COOKIE_SID + "_ts", "", 0);
}

export function enableAnalytics() {
  writeCookie(COOKIE_OPTOUT, "on", 60 * 60 * 24 * 365);
}