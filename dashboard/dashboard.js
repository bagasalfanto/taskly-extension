const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const priorityFilter = document.querySelector("#priorityFilter");
const domainFilter = document.querySelector("#domainFilter");
const taskList = document.querySelector("#dashboardTaskList");
const taskTemplate = document.querySelector("#dashboardTaskTemplate");
const resultCount = document.querySelector("#resultCount");

const detailForm = document.querySelector("#detailForm");
const taskIdInput = document.querySelector("#taskIdInput");
const detailTitleInput = document.querySelector("#detailTitleInput");
const detailNotesInput = document.querySelector("#detailNotesInput");
const detailStatusInput = document.querySelector("#detailStatusInput");
const detailPriorityInput = document.querySelector("#detailPriorityInput");
const detailDueDateInput = document.querySelector("#detailDueDateInput");
const detailDueTimeInput = document.querySelector("#detailDueTimeInput");
const detailTagsInput = document.querySelector("#detailTagsInput");
const sourceLink = document.querySelector("#sourceLink");
const selectedTextPreview = document.querySelector("#selectedTextPreview");
const detailMessage = document.querySelector("#detailMessage");
const markDoneButton = document.querySelector("#markDoneButton");
const deleteDetailButton = document.querySelector("#deleteDetailButton");
const exportMarkdownButton = document.querySelector("#exportMarkdownButton");
const exportCsvButton = document.querySelector("#exportCsvButton");
const exportPdfButton = document.querySelector("#exportPdfButton");
const exportJsonButton = document.querySelector("#exportJsonButton");
const languageSelect = document.querySelector("#languageSelect");

let allTasks = [];
let selectedTaskId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await TasklyI18n.applyDocument();
  if (globalThis.TasklyTheme) TasklyTheme.refresh();
  setupLanguageSelect();
  await refresh();
});

[searchInput, statusFilter, priorityFilter, domainFilter].forEach((control) => {
  control.addEventListener("input", () => renderTaskList());
});

detailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedTaskId) {
    setDetailMessage(TasklyI18n.t("chooseTaskFirst"), true);
    return;
  }

  const title = TasklyStore.normalizeText(detailTitleInput.value);
  if (!title) {
    setDetailMessage(TasklyI18n.t("titleRequired"), true);
    detailTitleInput.focus();
    return;
  }

  await TasklyStore.updateTask(selectedTaskId, {
    title,
    notes: detailNotesInput.value,
    status: detailStatusInput.value,
    priority: detailPriorityInput.value,
    dueDate: detailDueDateInput.value || null,
    dueTime: detailDueTimeInput.value || null,
    tags: detailTagsInput.value
  });

  setDetailMessage(TasklyI18n.t("changesSaved"));
  await syncReminders();
  await refresh(selectedTaskId);
});

markDoneButton.addEventListener("click", async () => {
  if (!selectedTaskId) return;
  await TasklyStore.markDone(selectedTaskId);
  setDetailMessage(TasklyI18n.t("taskMarkedDone"));
  await syncReminders();
  await refresh(selectedTaskId);
});

deleteDetailButton.addEventListener("click", async () => {
  if (!selectedTaskId) return;
  const task = allTasks.find((item) => item.id === selectedTaskId);
  if (!task || !confirm(TasklyI18n.t("deleteTaskConfirm", { title: task.title }))) {
    return;
  }

  await TasklyStore.deleteTask(selectedTaskId);
  selectedTaskId = null;
  setDetailMessage(TasklyI18n.t("taskDeleted"));
  await syncReminders();
  await refresh();
});

exportMarkdownButton.addEventListener("click", async () => {
  const tasks = await TasklyStore.getTasks();
  downloadFile("taskly-export.md", TasklyStore.toMarkdown(tasks), "text/markdown");
});

exportCsvButton.addEventListener("click", async () => {
  const tasks = await TasklyStore.getTasks();
  downloadFile("taskly-export.csv", TasklyStore.toCsv(tasks), "text/csv;charset=utf-8");
});

exportPdfButton.addEventListener("click", async () => {
  const tasks = await TasklyStore.getTasks();
  downloadFile("taskly-export.pdf", TasklyStore.toPdf(tasks), "application/pdf");
});

exportJsonButton.addEventListener("click", async () => {
  const tasks = await TasklyStore.getTasks();
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tasks
  };
  downloadFile("taskly-export.json", JSON.stringify(payload, null, 2), "application/json");
});

async function refresh(preferredTaskId = selectedTaskId) {
  allTasks = await TasklyStore.getTasks();
  renderDomainFilter();

  if (preferredTaskId && allTasks.some((task) => task.id === preferredTaskId)) {
    selectedTaskId = preferredTaskId;
  } else {
    selectedTaskId = allTasks[0] ? allTasks[0].id : null;
  }

  renderTaskList();
  renderDetail();
}

function renderDomainFilter() {
  const currentValue = domainFilter.value;
  const domains = [...new Set(allTasks.map((task) => task.domain).filter(Boolean))].sort();

  domainFilter.textContent = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = TasklyI18n.t("allDomains");
  domainFilter.append(allOption);

  domains.forEach((domain) => {
    const option = document.createElement("option");
    option.value = domain;
    option.textContent = domain;
    domainFilter.append(option);
  });

  domainFilter.value = domains.includes(currentValue) ? currentValue : "all";
}

function renderTaskList() {
  const visibleTasks = getFilteredTasks();
  taskList.textContent = "";
  resultCount.textContent = TasklyI18n.t("itemCount", { count: visibleTasks.length });

  if (!visibleTasks.length) {
    const empty = document.createElement("p");
    empty.className = "dashboard-task-empty";
    empty.textContent = TasklyI18n.t("noMatchingTasks");
    taskList.append(empty);
    return;
  }

  visibleTasks.forEach((task) => {
    const node = taskTemplate.content.firstElementChild.cloneNode(true);
    node.classList.toggle("active", task.id === selectedTaskId);
    node.classList.toggle("is-overdue", TasklyStore.isTaskReminderOverdue(task));
    node.querySelector("h3").textContent = task.title;
    node.querySelector(".task-meta").textContent = getMeta(task);

    const pill = node.querySelector(".status-pill");
    pill.textContent = TasklyStore.getStatusLabel(task.status);
    pill.className = `status-pill ${task.status}`;

    node.addEventListener("click", () => selectTask(task.id));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectTask(task.id);
      }
    });

    taskList.append(node);
  });
}

function renderDetail() {
  const task = allTasks.find((item) => item.id === selectedTaskId);
  detailForm.classList.toggle("is-empty", !task);

  if (!task) {
    taskIdInput.value = "";
    detailTitleInput.value = "";
    detailNotesInput.value = "";
    detailStatusInput.value = TasklyStore.STATUS.TODO;
    detailPriorityInput.value = "medium";
    detailDueDateInput.value = "";
    detailDueTimeInput.value = "";
    detailTagsInput.value = "";
    sourceLink.removeAttribute("href");
    sourceLink.textContent = TasklyI18n.t("noSource");
    selectedTextPreview.textContent = TasklyI18n.t("noTaskSelected");
    return;
  }

  taskIdInput.value = task.id;
  detailTitleInput.value = task.title;
  detailNotesInput.value = task.notes || "";
  detailStatusInput.value = task.status;
  detailPriorityInput.value = task.priority;
  detailDueDateInput.value = task.dueDate || "";
  detailDueTimeInput.value = task.dueTime || "";
  detailTagsInput.value = (task.tags || []).join(", ");

  if (task.url) {
    sourceLink.href = task.url;
    sourceLink.textContent = task.url;
  } else {
    sourceLink.removeAttribute("href");
    sourceLink.textContent = TasklyI18n.t("noSource");
  }

  selectedTextPreview.textContent = task.selectedText || TasklyI18n.t("noSelectedText");
}

function selectTask(id) {
  selectedTaskId = id;
  setDetailMessage("");
  renderTaskList();
  renderDetail();
}

function getFilteredTasks() {
  const keyword = TasklyStore.normalizeText(searchInput.value).toLowerCase();
  return allTasks.filter((task) => {
    const statusMatches = statusFilter.value === "all" || task.status === statusFilter.value;
    const priorityMatches = priorityFilter.value === "all" || task.priority === priorityFilter.value;
    const domainMatches = domainFilter.value === "all" || task.domain === domainFilter.value;
    const haystack = [
      task.title,
      task.notes,
      task.url,
      task.pageTitle,
      task.domain,
      task.dueDate,
      task.dueTime,
      task.reminderAt,
      task.selectedText,
      ...(task.tags || [])
    ]
      .join(" ")
      .toLowerCase();
    const keywordMatches = !keyword || haystack.includes(keyword);

    return statusMatches && priorityMatches && domainMatches && keywordMatches;
  });
}

function getMeta(task) {
  const parts = [];
  if (task.domain) parts.push(task.domain);
  if (task.priority) parts.push(getPriorityLabel(task.priority));
  if (task.dueDate) parts.push(TasklyI18n.t("duePrefix", { value: TasklyStore.formatDueLabel(task) }));
  if (TasklyStore.isTaskReminderOverdue(task)) parts.push(TasklyI18n.t("overdue"));
  if (task.tags && task.tags.length) parts.push(task.tags.join(", "));
  return parts.join(" - ") || TasklyI18n.t("taskManual");
}

function setDetailMessage(text, isError = false) {
  detailMessage.textContent = text;
  detailMessage.classList.toggle("error", isError);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
    setDetailMessage("");
    await refresh(selectedTaskId);
  });
}

function getPriorityLabel(priority) {
  const labels = {
    low: "priorityLow",
    medium: "priorityMedium",
    high: "priorityHigh"
  };
  return TasklyI18n.t(labels[priority] || "priorityMedium");
}
