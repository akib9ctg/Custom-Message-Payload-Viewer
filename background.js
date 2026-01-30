const openViewer = async () => {
  const url = chrome.runtime.getURL("viewer.html");
  await chrome.tabs.create({ url });
};

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.type === "capturedHtmlList") {
    const entries = Array.isArray(msg.entries) ? msg.entries : [];
    if (!entries.length) return;
    const firstEmail = entries.find((entry) => entry && entry.type === "email");
    const firstHtml = firstEmail && typeof firstEmail.html === "string" ? firstEmail.html : "";

    chrome.storage.session
      .set({
        lastHtml: firstHtml,
        lastHtmlList: entries,
        lastSourceUrl: msg.sourceUrl || "",
        lastCapturedAt: Date.now()
      })
      .then(() => {
        if (msg.autoOpen) {
          openViewer();
        }
      })
      .catch(() => {});
  }
});

chrome.action.onClicked.addListener(() => {
  openViewer();
});
