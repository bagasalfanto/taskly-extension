(function () {
  const STORAGE_KEY = "taskly.tasks";
  const LEGACY_STORAGE_KEY = "rnotes.tasks";
  const REMINDER_SYNC_MESSAGE = "TASKLY_SYNC_REMINDERS";
  const STATUS = {
    TODO: "todo",
    PROGRESS: "progress",
    DONE: "done"
  };
  const STATUS_LABELS = {
    [STATUS.TODO]: "To Do",
    [STATUS.PROGRESS]: "On Progress",
    [STATUS.DONE]: "Done"
  };
  const PRIORITY = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high"
  };

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function clampText(value, maxLength) {
    const text = normalizeText(value);
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength - 1).trim()}...`;
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  function getDomain(value) {
    if (!isHttpUrl(value)) {
      return null;
    }
    return new URL(value).hostname.replace(/^www\./, "");
  }

  function getDomainBrand(value) {
    const domain = getDomain(value);
    if (!domain) {
      return "";
    }

    const parts = domain.split(".").filter(Boolean);
    if (parts.length < 2) {
      return parts[0] || "";
    }

    return parts[parts.length - 2] || "";
  }

  function normalizeTitleToken(value) {
    return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function isLikelySiteSuffix(value, sourceUrl, allowGenericSuffix) {
    const text = normalizeText(value);
    if (!text || text.length > 48 || isHttpUrl(text)) {
      return false;
    }

    const token = normalizeTitleToken(text);
    const brand = normalizeTitleToken(getDomainBrand(sourceUrl));
    if (brand && (token === brand || token.includes(brand) || brand.includes(token))) {
      return true;
    }

    const commonSiteTokens = new Set([
      "youtube",
      "youtubemusic",
      "googleclassroom",
      "classroom",
      "googleforms",
      "forms",
      "lms",
      "elearning",
      "spada",
      "moodle",
      "canvas",
      "blackboard",
      "coursera",
      "edx",
      "github",
      "stackoverflow",
      "medium",
      "notion",
      "linkedin"
    ]);

    if (commonSiteTokens.has(token)) {
      return true;
    }

    if (!allowGenericSuffix) {
      return false;
    }

    const wordCount = text.split(" ").filter(Boolean).length;
    return wordCount <= 5 && text.length <= 32;
  }

  function cleanSavedTitle(value, sourceUrl, options = {}) {
    const title = normalizeText(value);
    if (!title || isHttpUrl(title)) {
      return "";
    }

    const parts = title.split(/\s+(?:-|\||\u2013|\u2014|\u00b7)\s+/).map(normalizeText).filter(Boolean);
    if (parts.length > 1) {
      const suffix = parts[parts.length - 1];
      const base = parts.slice(0, -1).join(" - ");
      if (base.length >= 4 && isLikelySiteSuffix(suffix, sourceUrl, options.allowGenericSuffix)) {
        return clampText(base, 120);
      }
    }

    return clampText(title, 120);
  }

  function titleFromUrl(value) {
    if (!isHttpUrl(value)) {
      return getI18nText("newTask", "Task baru");
    }

    const url = new URL(value);
    const domain = getDomain(value);
    if ((domain === "youtube.com" || domain === "youtu.be") && (url.pathname === "/watch" || domain === "youtu.be")) {
      return "Video YouTube";
    }

    if (domain === "classroom.google.com") {
      return "Google Classroom";
    }

    const ignoredPathParts = new Set(["watch", "view", "view.php", "index", "index.html", "home", "login"]);
    const pathPart = url.pathname
      .split("/")
      .filter(Boolean)
      .reverse()
      .map(decodePathPart)
      .find((part) => {
        const normalized = part.toLowerCase();
        return !ignoredPathParts.has(normalized) && !/^\d+$/.test(normalized);
      });
    const path = normalizeText(String(pathPart || "").replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "));
    return clampText(path || titleFromDomain(domain), 90);
  }

  function decodePathPart(value) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }

  function titleFromDomain(domain) {
    const brand = getDomainBrand(`https://${domain || ""}`);
    if (!brand) {
      return getI18nText("newTask", "Task baru");
    }

    return brand
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createId() {
    const random = Math.random().toString(36).slice(2, 8);
    return `task_${Date.now()}_${random}`;
  }

  function normalizePriority(priority) {
    if (Object.values(PRIORITY).includes(priority)) {
      return priority;
    }
    return PRIORITY.MEDIUM;
  }

  function normalizeStatus(status) {
    const text = normalizeText(status).toLowerCase().replace(/[_-]+/g, " ");
    if (text === STATUS.TODO || text === "to do" || text === "inbox") {
      return STATUS.TODO;
    }

    if (text === STATUS.PROGRESS || text === "on progress" || text === "in progress") {
      return STATUS.PROGRESS;
    }

    if (text === STATUS.DONE) {
      return STATUS.DONE;
    }

    return STATUS.TODO;
  }

  function getStatusLabel(status) {
    const normalizedStatus = normalizeStatus(status);
    const labels = {
      [STATUS.TODO]: "statusTodo",
      [STATUS.PROGRESS]: "statusProgress",
      [STATUS.DONE]: "statusDone"
    };
    return getI18nText(labels[normalizedStatus], STATUS_LABELS[normalizedStatus] || STATUS_LABELS[STATUS.TODO]);
  }

  function getI18nText(key, fallback) {
    return globalThis.TasklyI18n ? TasklyI18n.t(key) : fallback;
  }

  function normalizeTags(tags) {
    if (Array.isArray(tags)) {
      return tags.map(normalizeText).filter(Boolean);
    }

    return String(tags || "")
      .split(",")
      .map(normalizeText)
      .filter(Boolean);
  }

  function normalizeDueDate(value) {
    const text = normalizeText(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return text;
  }

  function normalizeDueTime(value) {
    const text = normalizeText(value);
    const match = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(text);
    if (!match) {
      return null;
    }

    const hour = Number(match[1]);
    if (hour < 0 || hour > 23) {
      return null;
    }

    return `${String(hour).padStart(2, "0")}:${match[2]}`;
  }

  function getReminderAt(dueDate, dueTime) {
    const normalizedDate = normalizeDueDate(dueDate);
    const normalizedTime = normalizeDueTime(dueTime);
    if (!normalizedDate || !normalizedTime) {
      return null;
    }

    const [year, month, day] = normalizedDate.split("-").map(Number);
    const [hour, minute] = normalizedTime.split(":").map(Number);
    const date = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  function formatDueLabel(task) {
    const dueDate = normalizeDueDate(task && task.dueDate);
    if (!dueDate) {
      return "";
    }

    const dueTime = normalizeDueTime(task && task.dueTime);
    return dueTime ? `${dueDate} ${dueTime}` : dueDate;
  }

  function isTaskReminderOverdue(task, now = new Date()) {
    if (!task || normalizeStatus(task.status) === STATUS.DONE) {
      return false;
    }

    const reminderAt = normalizeText(task.reminderAt);
    if (!reminderAt) {
      return false;
    }

    const dueTime = Date.parse(reminderAt);
    const nowTime = now instanceof Date ? now.getTime() : Date.parse(now);
    return Number.isFinite(dueTime) && Number.isFinite(nowTime) && dueTime <= nowTime;
  }

  const api = {
    STORAGE_KEY,
    LEGACY_STORAGE_KEY,
    REMINDER_SYNC_MESSAGE,
    STATUS,
    STATUS_LABELS,
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
  };

  globalThis.TasklyUtils = api;
  globalThis.RnotesUtils = api;
})();
