(function () {
  const STORAGE_KEY = "taskly.language";
  const DEFAULT_LANGUAGE = "id";
  const SUPPORTED_LANGUAGES = ["id", "en"];

  const DICTIONARY = {
    id: {
      appTitle: "Taskly",
      language: "Bahasa",
      languageId: "Indonesia",
      languageEn: "English",
      sourceReady: "Siap menangkap task.",
      sourceUnavailable: "Halaman ini tidak bisa dijadikan source.",
      sourceLabel: "Sumber: {domain}",
      dashboard: "Dashboard",
      openDashboard: "Buka dashboard",
      task: "Task",
      taskPlaceholder: "Tulis task cepat...",
      newTask: "Task baru",
      notes: "Catatan",
      notesPlaceholder: "Opsional",
      deadline: "Deadline",
      dateHelp: "Format tanggal, contoh 2026-05-28",
      reminderTime: "Jam Reminder",
      timeHelp: "Format 24 jam, contoh 14:30",
      priority: "Prioritas",
      priorityLow: "Low",
      priorityMedium: "Medium",
      priorityHigh: "High",
      saveTask: "Simpan Task",
      activeTasks: "Task Aktif",
      taskCount: "{count} task",
      itemCount: "{count} item",
      noActiveTasks: "Belum ada task aktif.",
      markDone: "Tandai selesai",
      ok: "OK",
      open: "Buka",
      delete: "Hapus",
      titleRequired: "Judul task wajib diisi.",
      taskSaved: "Task tersimpan.",
      taskSaveFailed: "Gagal menyimpan task.",
      taskManual: "Task manual",
      duePrefix: "deadline {value}",
      overdue: "overdue",
      dashboardTitle: "Taskly Dashboard",
      dashboardSubtitle: "Kelola task, catatan, dan link yang kamu tangkap dari browser.",
      dark: "Dark",
      light: "Light",
      activateDark: "Aktifkan dark mode",
      activateLight: "Aktifkan light mode",
      exportMd: "Export MD",
      exportCsv: "Export CSV",
      exportPdf: "Export PDF",
      exportJson: "Export JSON",
      filterTasks: "Filter task",
      searchPlaceholder: "Cari task, domain, catatan, atau URL...",
      filterStatus: "Filter berdasarkan status",
      filterPriority: "Filter berdasarkan prioritas",
      filterDomain: "Filter berdasarkan domain",
      allStatuses: "Semua status",
      allPriorities: "Semua prioritas",
      allDomains: "Semua domain",
      statusTodo: "To Do",
      statusProgress: "On Progress",
      statusDone: "Done",
      taskListTitle: "Task",
      detail: "Detail",
      title: "Judul",
      status: "Status",
      tags: "Tags",
      tagsPlaceholder: "study, follow up, idea",
      source: "Sumber",
      noSource: "Tidak ada sumber",
      save: "Simpan",
      chooseTaskFirst: "Pilih task dulu.",
      changesSaved: "Perubahan tersimpan.",
      taskMarkedDone: "Task ditandai selesai.",
      deleteTaskConfirm: "Hapus task \"{title}\"?",
      taskDeleted: "Task dihapus.",
      noMatchingTasks: "Tidak ada task yang cocok.",
      noTaskSelected: "Belum ada task yang dipilih.",
      noSelectedText: "Tidak ada selected text.",
      contextAddText: "Tambahkan teks ke Taskly",
      contextAddLink: "Tambahkan link ke Taskly",
      contextAddPage: "Simpan halaman ini ke Taskly",
      reminderTitle: "Reminder Taskly",
      reminderFallback: "Task belum selesai",
      reminderOpenDetail: "Buka Taskly untuk melihat detail.",
      exportTitle: "Taskly Export",
      exportGenerated: "Dibuat {value}",
      exportEmpty: "_Tidak ada task._",
      exportNoTask: "Tidak ada task.",
      exportTotal: "Total",
      exportProgress: "Progress",
      exportDue: "Deadline",
      exportPage: "Halaman {current} / {total}",
      labelPriority: "Prioritas",
      labelTags: "Tags",
      labelCompleted: "Selesai",
      labelNotes: "Catatan",
      labelQuote: "Kutipan",
      labelSource: "Sumber"
    },
    en: {
      appTitle: "Taskly",
      language: "Language",
      languageId: "Indonesia",
      languageEn: "English",
      sourceReady: "Ready to capture a task.",
      sourceUnavailable: "This page cannot be used as a source.",
      sourceLabel: "Source: {domain}",
      dashboard: "Dashboard",
      openDashboard: "Open dashboard",
      task: "Task",
      taskPlaceholder: "Write a quick task...",
      newTask: "New task",
      notes: "Notes",
      notesPlaceholder: "Optional",
      deadline: "Deadline",
      dateHelp: "Date format, example 2026-05-28",
      reminderTime: "Reminder Time",
      timeHelp: "24-hour format, example 14:30",
      priority: "Priority",
      priorityLow: "Low",
      priorityMedium: "Medium",
      priorityHigh: "High",
      saveTask: "Save Task",
      activeTasks: "Active Tasks",
      taskCount: "{count} task",
      itemCount: "{count} item",
      noActiveTasks: "No active tasks yet.",
      markDone: "Mark as done",
      ok: "OK",
      open: "Open",
      delete: "Delete",
      titleRequired: "Task title is required.",
      taskSaved: "Task saved.",
      taskSaveFailed: "Failed to save task.",
      taskManual: "Manual task",
      duePrefix: "due {value}",
      overdue: "overdue",
      dashboardTitle: "Taskly Dashboard",
      dashboardSubtitle: "Manage tasks, notes, and links captured from your browser.",
      dark: "Dark",
      light: "Light",
      activateDark: "Enable dark mode",
      activateLight: "Enable light mode",
      exportMd: "Export MD",
      exportCsv: "Export CSV",
      exportPdf: "Export PDF",
      exportJson: "Export JSON",
      filterTasks: "Task filters",
      searchPlaceholder: "Search tasks, domains, notes, or URLs...",
      filterStatus: "Filter by status",
      filterPriority: "Filter by priority",
      filterDomain: "Filter by domain",
      allStatuses: "All statuses",
      allPriorities: "All priorities",
      allDomains: "All domains",
      statusTodo: "To Do",
      statusProgress: "In Progress",
      statusDone: "Done",
      taskListTitle: "Tasks",
      detail: "Detail",
      title: "Title",
      status: "Status",
      tags: "Tags",
      tagsPlaceholder: "study, follow up, idea",
      source: "Source",
      noSource: "No source",
      save: "Save",
      chooseTaskFirst: "Select a task first.",
      changesSaved: "Changes saved.",
      taskMarkedDone: "Task marked done.",
      deleteTaskConfirm: "Delete task \"{title}\"?",
      taskDeleted: "Task deleted.",
      noMatchingTasks: "No matching tasks.",
      noTaskSelected: "No task selected yet.",
      noSelectedText: "No selected text.",
      contextAddText: "Add selected text to Taskly",
      contextAddLink: "Add link to Taskly",
      contextAddPage: "Save this page to Taskly",
      reminderTitle: "Taskly Reminder",
      reminderFallback: "Task is not done yet",
      reminderOpenDetail: "Open Taskly to view details.",
      exportTitle: "Taskly Export",
      exportGenerated: "Generated {value}",
      exportEmpty: "_No tasks._",
      exportNoTask: "No tasks.",
      exportTotal: "Total",
      exportProgress: "Progress",
      exportDue: "Due",
      exportPage: "Page {current} / {total}",
      labelPriority: "Priority",
      labelTags: "Tags",
      labelCompleted: "Completed",
      labelNotes: "Notes",
      labelQuote: "Quote",
      labelSource: "Source"
    }
  };

  let currentLanguage = DEFAULT_LANGUAGE;

  function normalizeLanguage(language) {
    return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  }

  function getStorageArea() {
    return globalThis.chrome && chrome.storage && chrome.storage.local
      ? chrome.storage.local
      : null;
  }

  function getFromStorage(key) {
    return new Promise((resolve) => {
      const storage = getStorageArea();
      if (!storage) {
        resolve(null);
        return;
      }

      storage.get([key], (result) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(result ? result[key] : null);
      });
    });
  }

  function setToStorage(value) {
    return new Promise((resolve) => {
      const storage = getStorageArea();
      if (!storage) {
        resolve();
        return;
      }

      storage.set(value, () => {
        resolve();
      });
    });
  }

  async function loadLanguage() {
    currentLanguage = normalizeLanguage(await getFromStorage(STORAGE_KEY));
    return currentLanguage;
  }

  function getLanguage() {
    return currentLanguage;
  }

  async function setLanguage(language) {
    currentLanguage = normalizeLanguage(language);
    await setToStorage({ [STORAGE_KEY]: currentLanguage });
    return currentLanguage;
  }

  function interpolate(text, params = {}) {
    return String(text || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    ));
  }

  function t(key, params) {
    const language = DICTIONARY[currentLanguage] || DICTIONARY[DEFAULT_LANGUAGE];
    const fallback = DICTIONARY[DEFAULT_LANGUAGE];
    return interpolate(language[key] ?? fallback[key] ?? key, params);
  }

  async function applyDocument() {
    await loadLanguage();
    if (!globalThis.document) {
      return currentLanguage;
    }

    document.documentElement.lang = currentLanguage;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((node) => {
      node.setAttribute("title", t(node.dataset.i18nTitle));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-language-select]").forEach((node) => {
      node.value = currentLanguage;
    });
    return currentLanguage;
  }

  const api = {
    STORAGE_KEY,
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
    loadLanguage,
    getLanguage,
    setLanguage,
    t,
    applyDocument
  };

  globalThis.TasklyI18n = api;
})();
