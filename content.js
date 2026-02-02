(() => {
  const cfg = typeof CONFIG === "object" && CONFIG ? CONFIG : {};
  const CAPTURE_URL_SUBSTRING = cfg.CAPTURE_URL_SUBSTRING || "";
  const ROUTE_FILTER = cfg.ROUTE_FILTER || "";
  const CAPTURE_ROUTES = Array.isArray(cfg.CAPTURE_ROUTES) ? cfg.CAPTURE_ROUTES : [];
  const EMAIL_ROUTE = cfg.EMAIL_ROUTE || "/req/email";
  const SMS_ROUTE = cfg.SMS_ROUTE || "/req/sms";
  const SMS_TEXT_FIELD = cfg.SMS_TEXT_FIELD || "body";
  const BODY_FIELD = cfg.BODY_FIELD || "body";
  const HTML_FIELD = cfg.HTML_FIELD || "html";
  const AUTO_OPEN = cfg.AUTO_OPEN !== false;
  const MAX_HTML_LENGTH = typeof cfg.MAX_HTML_LENGTH === "number" ? cfg.MAX_HTML_LENGTH : 0;
  const LOG_TO_CONSOLE = cfg.LOG_TO_CONSOLE !== false;
  const CAPTURE_DOCUMENT = cfg.CAPTURE_DOCUMENT !== false;

  const log = (...args) => {
    if (LOG_TO_CONSOLE) {
      console.log("[JSON HTML Viewer]", ...args);
    }
  };

  const shouldInspectUrl = (url) => {
    if (!url) return false;
    if (!CAPTURE_URL_SUBSTRING) return true;
    return url.includes(CAPTURE_URL_SUBSTRING);
  };

  const isRouteAllowed = (route) => {
    if (CAPTURE_ROUTES.length) {
      return !!route && CAPTURE_ROUTES.includes(route);
    }
    if (ROUTE_FILTER) {
      return !!route && route === ROUTE_FILTER;
    }
    return true;
  };

  let lastFingerprint = "";
  const fingerprint = (entryList) => {
    const joined = entryList
      .map((entry) => {
        const value = entry.type === "sms" ? entry.text || "" : entry.html || "";
        return value.slice(0, 200);
      })
      .join("|");
    return `${entryList.length}:${joined.length}:${joined.slice(0, 200)}`;
  };

  const sendHtmlList = (htmlList, sourceUrl) => {
    if (!htmlList.length) return;
    const fp = fingerprint(htmlList);
    if (fp === lastFingerprint) return;
    lastFingerprint = fp;
    chrome.runtime.sendMessage({
      type: "capturedHtmlList",
      entries: htmlList,
      sourceUrl: sourceUrl || "",
      autoOpen: AUTO_OPEN
    });
  };

  const normalizeHtml = (html) => {
    let out = html;
    if (out.includes("\\u003C") || out.includes("\\u003E")) {
      out = out.replace(/\\u003C/g, "<").replace(/\\u003E/g, ">");
    }
    if (out.includes("\\r\\n")) {
      out = out.replace(/\\r\\n/g, "\n");
    }
    return out;
  };

  const looksLikeHtml = (value) => {
    const t = value.trim();
    return (
      t.startsWith("<!DOCTYPE") ||
      t.startsWith("<html") ||
      t.includes("<body") ||
      t.includes("</html>") ||
      t.includes("<table")
    );
  };

  const looksLikeUrl = (value) => {
    const t = value.trim();
    return /^https?:\/\/\S+$/i.test(t);
  };

  const tryParseJson = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const isJsonString = (value) => {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
    return tryParseJson(trimmed) !== null;
  };

  const normalizeRecipients = (toValue) => {
    if (!toValue) return "";
    if (typeof toValue === "string") return toValue;
    if (Array.isArray(toValue)) {
      return toValue
        .map((entry) => {
          if (!entry) return "";
          if (typeof entry === "string") return entry;
          const email = entry.email || "";
          const name = entry.name || "";
          return name ? `${name} <${email}>` : email;
        })
        .filter(Boolean)
        .join(", ");
    }
    return "";
  };

  const normalizeSender = (fromValue) => {
    if (!fromValue) return "";
    if (typeof fromValue === "string") return fromValue;
    const email = fromValue.email || "";
    const name = fromValue.name || "";
    return name ? `${name} <${email}>` : email;
  };

  const collectEntries = (node, routeCtx, metaCtx, results) => {
    if (node === null || node === undefined) return;

    if (typeof node === "string") {
      const trimmed = node.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        const parsed = tryParseJson(trimmed);
        if (parsed) {
          collectEntries(parsed, routeCtx, metaCtx, results);
        }
      }
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        collectEntries(item, routeCtx, metaCtx, results);
      }
      return;
    }

    if (typeof node === "object") {
      const route = typeof node.route === "string" ? node.route : routeCtx;
      const id = node.id !== undefined ? node.id : metaCtx.id;
      const createdAt = node.createdAt || metaCtx.createdAt;

      if (HTML_FIELD in node && typeof node[HTML_FIELD] === "string") {
        if (isRouteAllowed(route)) {
          if (looksLikeHtml(node[HTML_FIELD]) || looksLikeUrl(node[HTML_FIELD])) {
            let htmlValue = node[HTML_FIELD];
            let urlValue = "";
            if (looksLikeUrl(node[HTML_FIELD])) {
              urlValue = node[HTML_FIELD].trim();
              htmlValue = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Email Link</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:24px;background:#f5f6f8;color:#1d1f23}a{color:#1f6feb;text-decoration:none}button{background:#1f6feb;color:#fff;border:none;border-radius:6px;padding:10px 14px;font-size:14px;cursor:pointer}</style></head><body><h2>Email Link</h2><p>This email contains a link:</p><p><a href="${urlValue}" target="_blank" rel="noreferrer">${urlValue}</a></p><p><button onclick="window.open('${urlValue}','_blank')">Open Link</button></p></body></html>`;
            }
            results.push({
              type: "email",
              html: htmlValue,
              url: urlValue,
              route: route || "",
              id: id !== undefined ? String(id) : "",
              createdAt: createdAt || "",
              subject: node.subject || metaCtx.subject || "",
              to: normalizeRecipients(node.to || metaCtx.to),
              from: normalizeSender(node.from || metaCtx.from)
            });
          }
        }
      }

      if (route === SMS_ROUTE && SMS_TEXT_FIELD in node && typeof node[SMS_TEXT_FIELD] === "string") {
        if (isRouteAllowed(route) && !isJsonString(node[SMS_TEXT_FIELD])) {
          results.push({
            type: "sms",
            text: node[SMS_TEXT_FIELD],
            route: route || "",
            id: id !== undefined ? String(id) : "",
            createdAt: createdAt || "",
            subject: "SMS",
            to: normalizeRecipients(node.to || metaCtx.to),
            from: normalizeSender(node.from || metaCtx.from)
          });
        }
      }

      if (BODY_FIELD in node && typeof node[BODY_FIELD] === "string") {
        const parsedBody = tryParseJson(node[BODY_FIELD]);
        if (parsedBody) {
          const nextMeta = {
            id,
            createdAt,
            subject: parsedBody.subject || metaCtx.subject,
            to: parsedBody.to || metaCtx.to,
            from: parsedBody.from || metaCtx.from
          };
          collectEntries(parsedBody, route, nextMeta, results);
        }
      }

      for (const key of Object.keys(node)) {
        if (key === HTML_FIELD || key === BODY_FIELD) continue;
        collectEntries(node[key], route, metaCtx, results);
      }
    }
  };

  const extractHtmlEntries = (text) => {
    const parsed = tryParseJson(text);
    if (!parsed) return [];
    const results = [];
    collectEntries(parsed, null, {}, results);
    return results;
  };

  const handleText = (text, sourceUrl) => {
    if (!text || !text.trim()) return;
    const entries = extractHtmlEntries(text);
    if (!entries.length) return;

    const normalizedEntries = entries
      .map((entry) => {
        if (entry.type === "sms") {
          const text = entry.text || "";
          return {
            ...entry,
            text: text.replace(/\r\n/g, "\n")
          };
        }
        const normalized = normalizeHtml(entry.html || "");
        if (MAX_HTML_LENGTH && normalized.length > MAX_HTML_LENGTH) {
          return null;
        }
        return {
          ...entry,
          html: normalized
        };
      })
      .filter(Boolean);

    if (!normalizedEntries.length) return;
    log("HTML captured from", sourceUrl, "count:", normalizedEntries.length);
    sendHtmlList(normalizedEntries, sourceUrl);
  };

  const handleFetchResponse = async (response) => {
    const url = response.url || "";
    if (!shouldInspectUrl(url)) return;
    const text = await response.text();
    handleText(text, url);
  };

  const patchFetch = () => {
    if (!window.fetch) return;
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        handleFetchResponse(response.clone());
      } catch (err) {
        log("Fetch capture failed", err);
      }
      return response;
    };
  };

  const patchXhr = () => {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.__jsonHtmlViewerUrl = url;
      return originalOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (body) {
      this.addEventListener("load", function () {
        try {
          const url = this.__jsonHtmlViewerUrl || "";
          if (!shouldInspectUrl(url)) return;
          if (this.responseType && this.responseType !== "" && this.responseType !== "text") return;
          handleText(this.responseText, url);
        } catch (err) {
          log("XHR capture failed", err);
        }
      });
      return originalSend.call(this, body);
    };
  };

  patchFetch();
  patchXhr();

  const tryCaptureDocument = () => {
    if (!CAPTURE_DOCUMENT) return;
    if (!shouldInspectUrl(window.location.href)) return;
    const text = document.body ? document.body.innerText || "" : "";
    if (!text) return;
    handleText(text, window.location.href);
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(tryCaptureDocument, 0);
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      tryCaptureDocument();
    });
  }
})();
