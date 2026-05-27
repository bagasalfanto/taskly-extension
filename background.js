importScripts("rnotes-utils.js", "rnotes-store.js", "rnotes-export.js", "rnotes-pdf-export.js");

const MENU_SELECTED_TEXT = "taskly-add-selected-text";
const MENU_LINK = "taskly-add-link";
const MENU_PAGE = "taskly-add-page";
const MESSAGE_GET_CONTEXT_MENU_CAPTURE = "TASKLY_GET_CONTEXT_MENU_CAPTURE";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_SELECTED_TEXT,
      title: "Tambahkan teks ke Taskly",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: MENU_LINK,
      title: "Tambahkan link ke Taskly",
      contexts: ["link"]
    });

    chrome.contextMenus.create({
      id: MENU_PAGE,
      title: "Simpan halaman ini ke Taskly",
      contexts: ["page"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const context = await getContextMenuCapture(info, tab);
    const pageTitle = getPageTitle(context, tab);

    if (info.menuItemId === MENU_SELECTED_TEXT) {
      const selectedText = TasklyStore.normalizeText(info.selectionText);
      await TasklyStore.addTask({
        title: TasklyStore.clampText(selectedText, 90),
        selectedText,
        url: tab && TasklyStore.isHttpUrl(tab.url) ? tab.url : null,
        pageTitle,
        priority: TasklyStore.PRIORITY.MEDIUM
      });
      return;
    }

    if (info.menuItemId === MENU_PAGE) {
      const pageUrl = tab && TasklyStore.isHttpUrl(tab.url) ? tab.url : null;
      await TasklyStore.addTask({
        title: pageTitle,
        selectedText: context ? context.selectedText : "",
        url: pageUrl,
        pageTitle,
        priority: TasklyStore.PRIORITY.MEDIUM
      });
      return;
    }

    if (info.menuItemId === MENU_LINK) {
      const linkUrl = info.linkUrl;
      const linkTitle = context && context.link ? context.link.title : "";
      await TasklyStore.addTask({
        title: linkTitle,
        url: linkUrl,
        pageTitle,
        usePageTitleAsTitle: false,
        priority: TasklyStore.PRIORITY.MEDIUM
      });
    }
  } catch (error) {
    console.error("Gagal menyimpan task Taskly:", error);
  }
});

function getContextMenuCapture(info, tab) {
  if (!tab || !tab.id || !TasklyStore.isHttpUrl(tab.url)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const message = {
      type: MESSAGE_GET_CONTEXT_MENU_CAPTURE,
      linkUrl: info.linkUrl || "",
      selectionText: info.selectionText || ""
    };

    sendMessageWithContentScript(tab.id, message).then(resolve);
  });
}

function getPageTitle(context, tab) {
  if (context && context.pageTitle) {
    return context.pageTitle;
  }

  return tab ? tab.title : null;
}

function sendMessageWithContentScript(tabId, message) {
  return sendTabMessage(tabId, message).then(async (response) => {
    if (response) {
      return response;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
    } catch (error) {
      return null;
    }

    return sendTabMessage(tabId, message);
  });
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(response || null);
    });
  });
}
