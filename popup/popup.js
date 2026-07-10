const titleInput = document.querySelector("#titleInput");
const notesInput = document.querySelector("#notesInput");
const dueDateInput = document.querySelector("#dueDateInput");
const dueTimeInput = document.querySelector("#dueTimeInput");
const priorityInput = document.querySelector("#priorityInput");
const taskForm = document.querySelector("#taskForm");
const taskList = document.querySelector("#taskList");
const taskTemplate = document.querySelector("#taskTemplate");
const taskCount = document.querySelector("#taskCount");
const message = document.querySelector("#message");
const sourceLabel = document.querySelector("#sourceLabel");
const dashboardButton = document.querySelector("#dashboardButton");
const languageSelect = document.querySelector("#languageSelect");

let activeSource = {
  url: null,
  pageTitle: null,
  domain: null,
  suggestedTitle: null
};

document.addEventListener("DOMContentLoaded", async () => {
  await TasklyI18n.applyDocument();
  setupLanguageSelect();
  titleInput.focus();
  await loadActiveSource();
  await renderTasks();
});

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const title = TasklyStore.normalizeText(titleInput.value) || activeSource.suggestedTitle;
  if (!title) {
    setMessage(TasklyI18n.t("titleRequired"), true);
    titleInput.focus();
    return;
  }

  try {
    await TasklyStore.addTask({
      title,
      notes: notesInput.value,
      dueDate: dueDateInput.value || null,
      dueTime: dueTimeInput.value || null,
      priority: priorityInput.value,
      url: activeSource.url,
      pageTitle: activeSource.pageTitle
    });

    taskForm.reset();
    priorityInput.value = "medium";
    titleInput.focus();
    setMessage(TasklyI18n.t("taskSaved"));
    await syncReminders();
    await renderTasks();
  } catch (error) {
    console.error(error);
    setMessage(TasklyI18n.t("taskSaveFailed"), true);
  }
});

dashboardButton.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
});

async function loadActiveSource() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !TasklyStore.isHttpUrl(tab.url)) {
    sourceLabel.textContent = TasklyI18n.t("sourceUnavailable");
    return;
  }

  const pageContext = await getPageContext(tab.id);
  const pageTitle = pageContext && pageContext.pageTitle ? pageContext.pageTitle : tab.title || null;
  const suggestedTitle = TasklyStore.cleanSavedTitle(pageTitle, tab.url, { allowGenericSuffix: true });

  activeSource = {
    url: tab.url,
    pageTitle,
    domain: TasklyStore.getDomain(tab.url),
    suggestedTitle
  };
  if (suggestedTitle && !titleInput.value) {
    titleInput.value = suggestedTitle;
  }
  titleInput.placeholder = suggestedTitle || TasklyI18n.t("taskPlaceholder");
  sourceLabel.textContent = TasklyI18n.t("sourceLabel", { domain: activeSource.domain });
}

function getPageContext(tabId) {
  const message = { type: "TASKLY_GET_PAGE_CONTEXT" };
  return sendMessageWithContentScript(tabId, message);
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

async function renderTasks() {
  const tasks = await TasklyStore.getTasks();
  const activeTasks = tasks.filter((task) => task.status !== TasklyStore.STATUS.DONE).slice(0, 8);

  taskList.textContent = "";
  taskCount.textContent = TasklyI18n.t("taskCount", { count: activeTasks.length });

  if (!activeTasks.length) {
    const empty = document.createElement("p");
    empty.className = "task-empty";
    empty.textContent = TasklyI18n.t("noActiveTasks");
    taskList.append(empty);
    return;
  }

  activeTasks.forEach((task) => {
    const node = taskTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector("h3").textContent = task.title;
    node.querySelector(".task-meta").textContent = getMeta(task);
    node.classList.toggle("is-overdue", TasklyStore.isTaskReminderOverdue(task));
    translateTaskNode(node);

    node.querySelector(".done-button").addEventListener("click", async () => {
      await TasklyStore.markDone(task.id);
      await syncReminders();
      await renderTasks();
    });

    const openButton = node.querySelector(".open-button");
    openButton.disabled = !task.url;
    openButton.addEventListener("click", () => {
      if (task.url) {
        chrome.tabs.create({ url: task.url });
      }
    });

    node.querySelector(".delete-button").addEventListener("click", async () => {
      await TasklyStore.deleteTask(task.id);
      await syncReminders();
      await renderTasks();
    });

    taskList.append(node);
  });
}

function getMeta(task) {
  const parts = [];
  if (task.status) parts.push(TasklyStore.getStatusLabel(task.status));
  if (task.domain) parts.push(task.domain);
  if (task.priority) parts.push(getPriorityLabel(task.priority));
  if (task.dueDate) parts.push(TasklyI18n.t("duePrefix", { value: TasklyStore.formatDueLabel(task) }));
  if (TasklyStore.isTaskReminderOverdue(task)) parts.push(TasklyI18n.t("overdue"));
  return parts.join(" - ") || TasklyI18n.t("taskManual");
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function syncReminders() {
  return new Promise((resolve) => {
    if (!globalThis.chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
      resolve();
      return;
    }

    chrome.runtime.sendMessage({ type: TasklyStore.REMINDER_SYNC_MESSAGE }, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

function setupLanguageSelect() {
  if (!languageSelect) return;
  languageSelect.value = TasklyI18n.getLanguage();
  languageSelect.addEventListener("change", async () => {
    await TasklyI18n.setLanguage(languageSelect.value);
    await TasklyI18n.applyDocument();
    if (globalThis.TasklyTheme) TasklyTheme.refresh();
    setMessage("");
    await loadActiveSource();
    await renderTasks();
  });
}

function translateTaskNode(node) {
  const doneButton = node.querySelector(".done-button");
  doneButton.textContent = TasklyI18n.t("ok");
  doneButton.title = TasklyI18n.t("markDone");
  doneButton.setAttribute("aria-label", TasklyI18n.t("markDone"));
  node.querySelector(".open-button").textContent = TasklyI18n.t("open");
  node.querySelector(".delete-button").textContent = TasklyI18n.t("delete");
}

function getPriorityLabel(priority) {
  const labels = {
    low: "priorityLow",
    medium: "priorityMedium",
    high: "priorityHigh"
  };
  return TasklyI18n.t(labels[priority] || "priorityMedium");
}
