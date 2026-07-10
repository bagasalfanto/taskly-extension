importScripts(
  "rnotes-utils.js",
  "taskly-i18n.js",
  "rnotes-store.js",
  "rnotes-export.js",
  "rnotes-pdf-export.js",
  "taskly-reminders.js"
);

const MENU_SELECTED_TEXT = "taskly-add-selected-text";
const MENU_LINK = "taskly-add-link";
const MENU_PAGE = "taskly-add-page";
const MESSAGE_GET_CONTEXT_MENU_CAPTURE = "TASKLY_GET_CONTEXT_MENU_CAPTURE";

chrome.runtime.onInstalled.addListener(async () => {
  await createContextMenus();
  await runReminderJob(() => TasklyReminders.syncReminders({ notifyMissed: false }));
});

chrome.runtime.onStartup.addListener(async () => {
  await createContextMenus();
  await runReminderJob(() => TasklyReminders.syncReminders({ notifyMissed: false }));
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  await runReminderJob(() => TasklyReminders.handleAlarm(alarm));
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  await runReminderJob(() => TasklyReminders.handleNotificationClick(notificationId));
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes[TasklyI18n.STORAGE_KEY]) {
    createContextMenus();
  }

  if (changes[TasklyStore.STORAGE_KEY]) {
    runReminderJob(() => TasklyReminders.syncReminders({ notifyMissed: false }));
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== TasklyStore.REMINDER_SYNC_MESSAGE) {
    return false;
  }

  TasklyReminders.syncReminders({ notifyMissed: true })
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.error("Gagal sync reminder Taskly:", error);
      sendResponse({ ok: false, message: error && error.message ? error.message : "Sync gagal." });
    });

  return true;
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
      await syncRemindersAfterTaskChange();
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
      await syncRemindersAfterTaskChange();
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
      await syncRemindersAfterTaskChange();
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

async function syncRemindersAfterTaskChange() {
  await TasklyReminders.syncReminders({ notifyMissed: true });
}

async function runReminderJob(job) {
  try {
    await job();
  } catch (error) {
    console.error("Gagal menjalankan reminder Taskly:", error);
  }
}

async function createContextMenus() {
  await TasklyI18n.loadLanguage();
  return new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: MENU_SELECTED_TEXT,
        title: TasklyI18n.t("contextAddText"),
        contexts: ["selection"]
      });

      chrome.contextMenus.create({
        id: MENU_LINK,
        title: TasklyI18n.t("contextAddLink"),
        contexts: ["link"]
      });

      chrome.contextMenus.create({
        id: MENU_PAGE,
        title: TasklyI18n.t("contextAddPage"),
        contexts: ["page"]
      });

      resolve();
    });
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
        files: ["scripts/content.js"]
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
