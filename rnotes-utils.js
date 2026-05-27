(function () {
  const STORAGE_KEY = "taskly.tasks";
  const LEGACY_STORAGE_KEY = "rnotes.tasks";
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
      return "Task baru";
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
      return "Task baru";
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
    return STATUS_LABELS[normalizeStatus(status)] || STATUS_LABELS[STATUS.TODO];
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

  const api = {
    STORAGE_KEY,
    LEGACY_STORAGE_KEY,
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
    getStatusLabel
  };

  globalThis.TasklyUtils = api;
  globalThis.RnotesUtils = api;
})();
