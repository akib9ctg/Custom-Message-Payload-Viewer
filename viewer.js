const metaEl = document.getElementById("meta");
const emptyEl = document.getElementById("empty");
const previewEl = document.getElementById("preview");
const rawEl = document.getElementById("raw");
const saveBtn = document.getElementById("save");
const copyBtn = document.getElementById("copy");
const listEl = document.getElementById("list");
const smsContainerEl = document.getElementById("smsContainer");
const smsPreviewEl = document.getElementById("smsPreview");
const tabEmailsEl = document.getElementById("tabEmails");
const tabSmsEl = document.getElementById("tabSms");
const countEmailsEl = document.getElementById("countEmails");
const countSmsEl = document.getElementById("countSms");
const prevPageEl = document.getElementById("prevPage");
const nextPageEl = document.getElementById("nextPage");
const pageInfoEl = document.getElementById("pageInfo");
const pageSizeEl = document.getElementById("pageSize");

let lastHtml = "";
let entries = [];
let activeIndex = 0;
let activeEntry = null;
let activeType = "email";
let lastContent = "";
let lastContentType = "email";
let actionLabels = { save: "Save", copy: "Copy" };
let lastSourceUrl = "";
let lastCapturedAt = null;
let activeAbsoluteIndex = 0;
const pageState = {
  email: 0,
  sms: 0
};
let pageSize = 6;
const resolveEntryType = (entry) => {
  if (!entry || typeof entry !== "object") return "email";
  if (entry.type === "email" || entry.type === "sms") return entry.type;
  const hasHtml = typeof entry.html === "string" && entry.html.trim() !== "";
  const hasText = typeof entry.text === "string" && entry.text.trim() !== "";
  if (hasHtml) return "email";
  if (hasText) return "sms";
  return "email";
};

const normalizeEntry = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  const type = resolveEntryType(entry);
  return {
    ...entry,
    type
  };
};

const applyActionLabels = () => {
  saveBtn.textContent = actionLabels.save;
  copyBtn.textContent = actionLabels.copy;
};

const formatTime = (value) => {
  if (!value) return "unknown";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "unknown";
  }
};

const updatePreview = (entry, sourceUrl, capturedAt) => {
  activeEntry = entry;
  const entryType = resolveEntryType(entry);
  if (entryType === "sms") {
    lastContentType = "sms";
    lastContent = entry.text || "";
    smsPreviewEl.textContent = lastContent;
    rawEl.value = lastContent;
    previewEl.srcdoc = "";
    previewEl.style.display = "none";
    smsContainerEl.style.display = "block";
    actionLabels = { save: "Save SMS", copy: "Copy SMS" };
  } else {
    lastContentType = "email";
    lastHtml = entry.html || "";
    lastContent = lastHtml;
    const htmlToRender = lastHtml || "<pre style=\"padding:16px;font-family:Consolas,monospace;\">No HTML content found for this email.</pre>";
    previewEl.srcdoc = "";
    requestAnimationFrame(() => {
      previewEl.srcdoc = htmlToRender;
    });
    rawEl.value = lastHtml;
    smsContainerEl.style.display = "none";
    previewEl.style.display = "block";
    actionLabels = { save: "Save HTML", copy: "Copy HTML" };
  }
  applyActionLabels();

  const source = sourceUrl || "(unknown)";
  const entryTime = entry.createdAt || capturedAt || "";
  const timeText = entryTime ? formatTime(entryTime) : formatTime(capturedAt);
  const subject = entry.subject ? entry.subject : "Email";
  const to = entry.to ? `To: ${entry.to}` : "";
  const from = entry.from ? `From: ${entry.from}` : "";
  const idText = entry.id ? `ID: ${entry.id}` : "";
  const parts = [subject, to, from, idText].filter(Boolean).join(" • ");
  const listCount = getFilteredEntries().length;
  const label = entryType === "sms" ? "SMS" : "Email";
  const absoluteIndex = Math.min(activeAbsoluteIndex + 1, listCount);
  const countText = listCount ? `${label} ${absoluteIndex} of ${listCount}` : label;
  metaEl.textContent = `${countText} | ${parts} | Captured from ${source} at ${timeText}`;
};

const getFilteredEntries = () =>
  entries.filter((entry) => resolveEntryType(entry) === activeType);

const renderTabs = () => {
  const emailCount = entries.filter((entry) => resolveEntryType(entry) === "email").length;
  const smsCount = entries.filter((entry) => resolveEntryType(entry) === "sms").length;
  countEmailsEl.textContent = `(${emailCount})`;
  countSmsEl.textContent = `(${smsCount})`;
  tabEmailsEl.classList.toggle("active", activeType === "email");
  tabSmsEl.classList.toggle("active", activeType === "sms");
  tabEmailsEl.disabled = emailCount === 0;
  tabSmsEl.disabled = smsCount === 0;
};

const renderPagination = (totalCount) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(pageState[activeType], totalPages - 1);
  pageState[activeType] = page;
  pageInfoEl.textContent = `Page ${page + 1} of ${totalPages}`;
  prevPageEl.disabled = page <= 0;
  nextPageEl.disabled = page >= totalPages - 1;
};

const renderList = (sourceUrl, capturedAt) => {
  listEl.innerHTML = "";
  const filtered = getFilteredEntries();
  if (!filtered.length) {
    emptyEl.style.display = "block";
    emptyEl.textContent = activeType === "sms" ? "No SMS captured yet." : "No emails captured yet.";
    previewEl.style.display = "none";
    smsContainerEl.style.display = "none";
    rawEl.value = "";
    renderPagination(0);
    return;
  }
  emptyEl.style.display = "none";
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(pageState[activeType], totalPages - 1);
  pageState[activeType] = page;
  const start = page * pageSize;
  const end = start + pageSize;
  const pageItems = filtered.slice(start, end);
  renderPagination(filtered.length);

  pageItems.forEach((entry, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `email-card${index === activeIndex ? " active" : ""}`;
    const defaultLabel = entry.type === "sms" ? "SMS" : "Email";
    const title = entry.subject || (entry.id ? `${defaultLabel} #${entry.id}` : defaultLabel);
    const toLine = entry.to ? `To: ${entry.to}` : "";
    const fromLine = entry.from ? `From: ${entry.from}` : "";
    const routeLine = entry.route ? `Route: ${entry.route}` : "";
    const timeLine = entry.createdAt ? formatTime(entry.createdAt) : "";
    const metaLines = [toLine, fromLine, routeLine, timeLine].filter(Boolean);
    card.innerHTML = `<div class="email-title">${title}</div>${metaLines
      .map((line) => `<div class="email-meta">${line}</div>`)
      .join("")}`;
    card.addEventListener("click", () => {
      activeIndex = index;
      activeAbsoluteIndex = start + index;
      renderList(sourceUrl, capturedAt);
      updatePreview(entry, sourceUrl, capturedAt);
    });
    listEl.appendChild(card);
  });
};

const loadHtml = async () => {
  const data = await chrome.storage.session.get([
    "lastHtml",
    "lastHtmlList",
    "lastSourceUrl",
    "lastCapturedAt"
  ]);

  entries = Array.isArray(data.lastHtmlList)
    ? data.lastHtmlList.map(normalizeEntry).filter(Boolean)
    : [];
  lastHtml = data.lastHtml || "";
  if (!lastHtml && !entries.length) {
    emptyEl.style.display = "block";
    metaEl.textContent = "No captured emails or SMS yet.";
    return;
  }

  lastSourceUrl = data.lastSourceUrl || "(unknown)";
  lastCapturedAt = data.lastCapturedAt;
  if (entries.length) {
    const hasEmail = entries.some((entry) => entry.type === "email");
    const hasSms = entries.some((entry) => entry.type === "sms");
    activeType = hasEmail ? "email" : hasSms ? "sms" : "email";
    activeIndex = 0;
    pageState.email = 0;
    pageState.sms = 0;
    renderTabs();
    renderList(lastSourceUrl, lastCapturedAt);
    const filtered = getFilteredEntries();
    if (filtered.length) {
      activeAbsoluteIndex = 0;
      updatePreview(filtered[0], lastSourceUrl, lastCapturedAt);
    }
    return;
  }

  previewEl.srcdoc = lastHtml;
  rawEl.value = lastHtml;
  metaEl.textContent = `Captured from ${lastSourceUrl} at ${formatTime(lastCapturedAt)}`;
};

tabEmailsEl.addEventListener("click", () => {
  activeType = "email";
  activeIndex = 0;
  activeAbsoluteIndex = pageState.email * pageSize;
  renderTabs();
  renderList(lastSourceUrl, lastCapturedAt);
  const filtered = getFilteredEntries();
  if (filtered.length) {
    const page = pageState.email;
    const start = page * pageSize;
    const entry = filtered[start] || filtered[0];
    activeAbsoluteIndex = start;
    updatePreview(entry, lastSourceUrl, lastCapturedAt);
  }
});

tabSmsEl.addEventListener("click", () => {
  activeType = "sms";
  activeIndex = 0;
  activeAbsoluteIndex = pageState.sms * pageSize;
  renderTabs();
  renderList(lastSourceUrl, lastCapturedAt);
  const filtered = getFilteredEntries();
  if (filtered.length) {
    const page = pageState.sms;
    const start = page * pageSize;
    const entry = filtered[start] || filtered[0];
    activeAbsoluteIndex = start;
    updatePreview(entry, lastSourceUrl, lastCapturedAt);
  }
});

prevPageEl.addEventListener("click", () => {
  const total = getFilteredEntries().length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  pageState[activeType] = Math.max(0, pageState[activeType] - 1);
  activeIndex = 0;
  const start = pageState[activeType] * pageSize;
  activeAbsoluteIndex = start;
  renderList(lastSourceUrl, lastCapturedAt);
  const filtered = getFilteredEntries();
  if (filtered.length) {
    const entry = filtered[start] || filtered[0];
    updatePreview(entry, lastSourceUrl, lastCapturedAt);
  }
});

nextPageEl.addEventListener("click", () => {
  const total = getFilteredEntries().length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  pageState[activeType] = Math.min(totalPages - 1, pageState[activeType] + 1);
  activeIndex = 0;
  const start = pageState[activeType] * pageSize;
  activeAbsoluteIndex = start;
  renderList(lastSourceUrl, lastCapturedAt);
  const filtered = getFilteredEntries();
  if (filtered.length) {
    const entry = filtered[start] || filtered[0];
    updatePreview(entry, lastSourceUrl, lastCapturedAt);
  }
});

pageSizeEl.addEventListener("change", () => {
  const value = Number(pageSizeEl.value);
  pageSize = Number.isFinite(value) && value > 0 ? value : 6;
  pageState[activeType] = 0;
  activeIndex = 0;
  activeAbsoluteIndex = 0;
  renderList(lastSourceUrl, lastCapturedAt);
  const filtered = getFilteredEntries();
  if (filtered.length) {
    updatePreview(filtered[0], lastSourceUrl, lastCapturedAt);
  }
});

saveBtn.addEventListener("click", () => {
  if (!lastContent) return;
  const mime = lastContentType === "sms" ? "text/plain" : "text/html";
  const blob = new Blob([lastContent], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const base =
    activeEntry && activeEntry.subject
      ? activeEntry.subject
      : lastContentType === "sms"
      ? "sms"
      : "email";
  const idPart = activeEntry && activeEntry.id ? `-${activeEntry.id}` : "";
  const safeName = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const ext = lastContentType === "sms" ? "txt" : "html";
  anchor.download = `${safeName || "message"}${idPart}.${ext}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

copyBtn.addEventListener("click", async () => {
  if (!lastContent) return;
  try {
    await navigator.clipboard.writeText(lastContent);
    copyBtn.textContent = "Copied";
    setTimeout(() => {
      copyBtn.textContent = actionLabels.copy;
    }, 1200);
  } catch {
    copyBtn.textContent = "Copy failed";
    setTimeout(() => {
      copyBtn.textContent = actionLabels.copy;
    }, 1200);
  }
});

loadHtml();
