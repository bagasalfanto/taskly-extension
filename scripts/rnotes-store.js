(function () {
  const utils = globalThis.TasklyUtils || globalThis.RnotesUtils;
  if (!utils) {
    throw new Error("TasklyUtils harus dimuat sebelum rnotes-store.js.");
  }

  const {
    STORAGE_KEY,
    LEGACY_STORAGE_KEY,
    REMINDER_SYNC_MESSAGE,
    STATUS,
    PRIORITY,
    normalizeText,
    clampText,
    isHttpUrl,
    getDomain,
    cleanSavedTitle,
    titleFromUrl,
    nowIso,
    createId,
    normalizePriority,
    normalizeStatus,
    normalizeTags,
    normalizeDueDate,
    normalizeDueTime,
    getReminderAt,
    formatDueLabel,
    isTaskReminderOverdue,
    getStatusLabel
  } = utils;

  function getStorageArea() {
    if (!globalThis.chrome || !chrome.storage || !chrome.storage.local) {
      throw new Error("chrome.storage.local tidak tersedia.");
    }

    return chrome.storage.local;
  }

  function getFromStorage(keys) {
    return new Promise((resolve, reject) => {
      getStorageArea().get(keys, (result) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(error);
          return;
        }
        resolve(result || {});
      });
    });
  }

  function setToStorage(value) {
    return new Promise((resolve, reject) => {
      getStorageArea().set(value, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  function createTask(input) {
    input = input || {};
    const createdAt = nowIso();
    const status = normalizeStatus(input.status);
    const rawUrl = isHttpUrl(input.url) ? input.url : null;
    const selectedText = clampText(input.selectedText, 1200) || null;
    const pageTitle = cleanSavedTitle(input.pageTitle, rawUrl, { allowGenericSuffix: true }) || null;
    const usePageTitleAsTitle = input.usePageTitleAsTitle !== false;
    const dueDate = normalizeDueDate(input.dueDate);
    const dueTime = dueDate ? normalizeDueTime(input.dueTime) : null;
    const reminderAt = getReminderAt(dueDate, dueTime);
    const title =
      cleanSavedTitle(input.title, rawUrl) ||
      (usePageTitleAsTitle ? pageTitle : "") ||
      clampText(selectedText, 90) ||
      titleFromUrl(rawUrl) ||
      "Task baru";

    return {
      id: createId(),
      title,
      notes: normalizeText(input.notes),
      url: rawUrl,
      pageTitle,
      domain: rawUrl ? getDomain(rawUrl) : null,
      selectedText,
      status,
      priority: normalizePriority(input.priority),
      tags: normalizeTags(input.tags),
      dueDate,
      dueTime,
      reminderAt,
      remindedAt: input.remindedAt || null,
      createdAt,
      updatedAt: createdAt,
      completedAt: status === STATUS.DONE ? createdAt : null
    };
  }

  async function getTasks() {
    const result = await getFromStorage([STORAGE_KEY, LEGACY_STORAGE_KEY]);
    const hasCurrentTasks = Array.isArray(result[STORAGE_KEY]);
    const sourceTasks = hasCurrentTasks
      ? result[STORAGE_KEY]
      : Array.isArray(result[LEGACY_STORAGE_KEY])
        ? result[LEGACY_STORAGE_KEY]
        : [];
    const validTasks = sourceTasks.filter((task) => task && task.id);
    const normalizedTasks = validTasks.map(normalizeTask);
    const shouldSave =
      !hasCurrentTasks ||
      normalizedTasks.some((task, index) => needsNormalizationSave(task, validTasks[index]));
    const tasks = normalizedTasks.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    if (shouldSave && tasks.length) {
      await saveTasks(tasks);
    }

    return tasks;
  }

  function normalizeTask(task) {
    const status = normalizeStatus(task.status);
    const dueDate = normalizeDueDate(task.dueDate);
    const dueTime = dueDate ? normalizeDueTime(task.dueTime) : null;
    const reminderAt = getReminderAt(dueDate, dueTime);
    return {
      ...task,
      status,
      priority: normalizePriority(task.priority),
      tags: normalizeTags(task.tags),
      dueDate,
      dueTime,
      reminderAt,
      remindedAt: task.remindedAt || null,
      completedAt: status === STATUS.DONE ? task.completedAt || task.updatedAt || task.createdAt || nowIso() : null
    };
  }

  function needsNormalizationSave(normalizedTask, rawTask) {
    return (
      normalizedTask.status !== rawTask.status ||
      normalizedTask.priority !== rawTask.priority ||
      normalizedTask.dueDate !== (rawTask.dueDate || null) ||
      normalizedTask.dueTime !== (rawTask.dueTime || null) ||
      normalizedTask.reminderAt !== (rawTask.reminderAt || null) ||
      normalizedTask.remindedAt !== (rawTask.remindedAt || null)
    );
  }

  async function saveTasks(tasks) {
    await setToStorage({ [STORAGE_KEY]: tasks });
    return tasks;
  }

  async function addTask(input) {
    const task = createTask(input || {});
    const tasks = await getTasks();
    await saveTasks([task, ...tasks]);
    return task;
  }

  async function updateTask(id, changes) {
    const tasks = await getTasks();
    let updatedTask = null;
    const hasDueDateChange = Object.prototype.hasOwnProperty.call(changes, "dueDate");
    const hasDueTimeChange = Object.prototype.hasOwnProperty.call(changes, "dueTime");
    const hasRemindedAtChange = Object.prototype.hasOwnProperty.call(changes, "remindedAt");
    const updatedTasks = tasks.map((task) => {
      if (task.id !== id) {
        return task;
      }

      const status = changes.status ? normalizeStatus(changes.status) : task.status;
      const dueDate = hasDueDateChange ? normalizeDueDate(changes.dueDate) : task.dueDate || null;
      const dueTime = dueDate
        ? hasDueTimeChange
          ? normalizeDueTime(changes.dueTime)
          : task.dueTime || null
        : null;
      const reminderAt = getReminderAt(dueDate, dueTime);
      const reminderChanged = reminderAt !== (task.reminderAt || null);
      const completedAt =
        status === STATUS.DONE
          ? task.completedAt || nowIso()
          : null;
      const remindedAt = hasRemindedAtChange
        ? changes.remindedAt || null
        : reminderChanged
          ? null
          : task.remindedAt || null;

      updatedTask = {
        ...task,
        ...changes,
        title: clampText(changes.title ?? task.title, 120) || task.title,
        notes: normalizeText(changes.notes ?? task.notes),
        priority: normalizePriority(changes.priority ?? task.priority),
        status,
        tags: normalizeTags(changes.tags ?? task.tags),
        dueDate,
        dueTime,
        reminderAt,
        remindedAt,
        updatedAt: nowIso(),
        completedAt
      };

      return updatedTask;
    });

    await saveTasks(updatedTasks);
    return updatedTask;
  }

  async function deleteTask(id) {
    const tasks = await getTasks();
    const updatedTasks = tasks.filter((task) => task.id !== id);
    await saveTasks(updatedTasks);
    return updatedTasks;
  }

  async function markDone(id) {
    return updateTask(id, { status: STATUS.DONE });
  }

  const api = {
    STORAGE_KEY,
    LEGACY_STORAGE_KEY,
    REMINDER_SYNC_MESSAGE,
    STATUS,
    PRIORITY,
    normalizeText,
    clampText,
    isHttpUrl,
    getDomain,
    cleanSavedTitle,
    titleFromUrl,
    normalizeStatus,
    normalizeDueDate,
    normalizeDueTime,
    getReminderAt,
    formatDueLabel,
    isTaskReminderOverdue,
    getStatusLabel,
    createTask,
    getTasks,
    saveTasks,
    addTask,
    updateTask,
    deleteTask,
    markDone
  };

  globalThis.TasklyStore = api;
  globalThis.RnotesStore = api;
})();
