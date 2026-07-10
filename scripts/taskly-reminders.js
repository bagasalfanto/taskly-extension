(function () {
  const store = globalThis.TasklyStore || globalThis.RnotesStore;
  if (!store) {
    throw new Error("TasklyStore harus dimuat sebelum taskly-reminders.js.");
  }

  const ALARM_PREFIX = "taskly-reminder:";
  const SCHEDULER_ALARM = "taskly-reminder-scheduler";
  const SCHEDULER_INTERVAL_MINUTES = 1;
  const NOTIFICATION_PREFIX = "taskly-notification:";
  const DASHBOARD_PATH = "dashboard/dashboard.html";

  function getAlarmName(taskId) {
    return `${ALARM_PREFIX}${taskId}`;
  }

  function getNotificationId(task) {
    const reminderKey = getReminderTime(task) || Date.now();
    return `${NOTIFICATION_PREFIX}${task.id}:${reminderKey}`;
  }

  function getTaskIdFromAlarm(alarmName) {
    return String(alarmName || "").startsWith(ALARM_PREFIX)
      ? alarmName.slice(ALARM_PREFIX.length)
      : "";
  }

  function getTaskIdFromNotification(notificationId) {
    if (!String(notificationId || "").startsWith(NOTIFICATION_PREFIX)) {
      return "";
    }

    return notificationId.slice(NOTIFICATION_PREFIX.length).split(":")[0] || "";
  }

  function getReminderTime(task) {
    const time = Date.parse(task && task.reminderAt);
    return Number.isFinite(time) ? time : null;
  }

  function isActiveReminderTask(task) {
    return (
      task &&
      store.normalizeStatus(task.status) !== store.STATUS.DONE &&
      getReminderTime(task) !== null
    );
  }

  async function syncReminders(options = {}) {
    if (!chrome.alarms) {
      return;
    }

    await ensureSchedulerAlarm();

    const notifyMissed = Boolean(options.notifyMissed);
    const tasks = await store.getTasks();
    const now = Date.now();
    const activeAlarmNames = new Set();

    await Promise.all(
      tasks.filter(isActiveReminderTask).map(async (task) => {
        const reminderTime = getReminderTime(task);
        const alarmName = getAlarmName(task.id);

        if (reminderTime > now && !task.remindedAt) {
          activeAlarmNames.add(alarmName);
          await createAlarm(alarmName, reminderTime);
          return;
        }

        if (notifyMissed && !task.remindedAt) {
          await notifyAndMarkTask(task);
        }
      })
    );

    const alarms = await getAllAlarms();
    await Promise.all(
      alarms
        .filter((alarm) => alarm.name.startsWith(ALARM_PREFIX) && !activeAlarmNames.has(alarm.name))
        .map((alarm) => clearAlarm(alarm.name))
    );

    await updateBadge();
  }

  async function handleAlarm(alarm) {
    if (alarm && alarm.name === SCHEDULER_ALARM) {
      await syncReminders({ notifyMissed: true });
      return;
    }

    const taskId = getTaskIdFromAlarm(alarm && alarm.name);
    if (!taskId) {
      return;
    }

    const tasks = await store.getTasks();
    const task = tasks.find((item) => item.id === taskId);
    if (!isActiveReminderTask(task)) {
      await clearAlarm(getAlarmName(taskId));
      await updateBadge(tasks);
      return;
    }

    if (!task.remindedAt) {
      await notifyAndMarkTask(task);
    }

    await clearAlarm(getAlarmName(taskId));
    await updateBadge();
  }

  async function handleNotificationClick(notificationId) {
    const taskId = getTaskIdFromNotification(notificationId);
    if (!taskId) {
      return;
    }

    const tasks = await store.getTasks();
    const task = tasks.find((item) => item.id === taskId);
    const url = task && task.url
      ? task.url
      : chrome.runtime.getURL(DASHBOARD_PATH);

    chrome.tabs.create({ url });
    chrome.notifications.clear(notificationId);
  }

  async function notifyAndMarkTask(task) {
    await clearTaskNotifications(task.id);
    if (globalThis.TasklyI18n) {
      await TasklyI18n.loadLanguage();
    }
    const notificationCreated = await createNotification(getNotificationId(task), {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/favicon.svg"),
      title: getText("reminderTitle", "Reminder Taskly"),
      message: task.title || getText("reminderFallback", "Task belum selesai"),
      contextMessage: getNotificationContext(task),
      priority: 2
    });

    if (!notificationCreated) {
      return;
    }

    await store.updateTask(task.id, {
      remindedAt: new Date().toISOString()
    });
  }

  async function clearTaskNotifications(taskId) {
    const notifications = await getAllNotifications();
    const ids = Object.keys(notifications).filter((id) => getTaskIdFromNotification(id) === taskId);
    await Promise.all(ids.map((id) => clearNotification(id)));
  }

  function getNotificationContext(task) {
    const parts = [];
    const dueLabel = store.formatDueLabel(task);
    if (dueLabel) parts.push(getText("duePrefix", { value: dueLabel }, `Due ${dueLabel}`));
    if (task.domain) parts.push(task.domain);
    return parts.join(" - ") || getText("reminderOpenDetail", "Buka Taskly untuk melihat detail.");
  }

  async function updateBadge(existingTasks) {
    if (!chrome.action) {
      return;
    }

    const tasks = existingTasks || await store.getTasks();
    const overdueCount = tasks.filter((task) => (
      isActiveReminderTask(task) &&
      store.isTaskReminderOverdue(task)
    )).length;
    const text = overdueCount ? String(Math.min(overdueCount, 99)) : "";

    await setBadgeText(text);
    if (overdueCount) {
      await setBadgeBackgroundColor("#dc2626");
    }
  }

  async function ensureSchedulerAlarm() {
    const alarm = await getAlarm(SCHEDULER_ALARM);
    if (alarm) {
      return;
    }

    chrome.alarms.create(SCHEDULER_ALARM, {
      delayInMinutes: SCHEDULER_INTERVAL_MINUTES,
      periodInMinutes: SCHEDULER_INTERVAL_MINUTES
    });
  }

  function createAlarm(name, when) {
    return new Promise((resolve) => {
      chrome.alarms.create(name, { when });
      resolve();
    });
  }

  function clearAlarm(name) {
    return new Promise((resolve) => {
      chrome.alarms.clear(name, () => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  function getAlarm(name) {
    return new Promise((resolve) => {
      chrome.alarms.get(name, (alarm) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(alarm || null);
      });
    });
  }

  function getAllAlarms() {
    return new Promise((resolve) => {
      chrome.alarms.getAll((alarms) => {
        if (chrome.runtime.lastError) {
          resolve([]);
          return;
        }
        resolve(alarms || []);
      });
    });
  }

  function createNotification(id, options) {
    return new Promise((resolve) => {
      chrome.notifications.create(id, options, () => {
        if (chrome.runtime.lastError) {
          console.warn("Gagal membuat notification Taskly:", chrome.runtime.lastError.message);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  function clearNotification(id) {
    return new Promise((resolve) => {
      chrome.notifications.clear(id, () => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  function getAllNotifications() {
    return new Promise((resolve) => {
      if (!chrome.notifications || !chrome.notifications.getAll) {
        resolve({});
        return;
      }

      chrome.notifications.getAll((notifications) => {
        if (chrome.runtime.lastError) {
          resolve({});
          return;
        }
        resolve(notifications || {});
      });
    });
  }

  function setBadgeText(text) {
    return new Promise((resolve) => {
      chrome.action.setBadgeText({ text }, () => {
        if (chrome.runtime.lastError) {
          resolve();
          return;
        }
        resolve();
      });
    });
  }

  function setBadgeBackgroundColor(color) {
    return new Promise((resolve) => {
      chrome.action.setBadgeBackgroundColor({ color }, () => {
        if (chrome.runtime.lastError) {
          resolve();
          return;
        }
        resolve();
      });
    });
  }

  function getText(key, paramsOrFallback, fallback) {
    if (globalThis.TasklyI18n) {
      const params = typeof paramsOrFallback === "object" ? paramsOrFallback : undefined;
      return TasklyI18n.t(key, params);
    }
    return typeof paramsOrFallback === "string" ? paramsOrFallback : fallback;
  }

  globalThis.TasklyReminders = {
    syncReminders,
    handleAlarm,
    handleNotificationClick,
    updateBadge
  };
})();
