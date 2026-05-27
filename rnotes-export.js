(function () {
  const store = globalThis.TasklyStore || globalThis.RnotesStore;
  if (!store) {
    throw new Error("TasklyStore harus dimuat sebelum rnotes-export.js.");
  }

  const { STATUS, getStatusLabel } = store;

  function toMarkdown(tasks) {
    const normalizedTasks = (Array.isArray(tasks) ? tasks : []).map((task) => ({
      ...task,
      status: store.normalizeStatus(task.status)
    }));
    const groups = [
      ["To Do", normalizedTasks.filter((task) => task.status === STATUS.TODO)],
      ["On Progress", normalizedTasks.filter((task) => task.status === STATUS.PROGRESS)],
      ["Done", normalizedTasks.filter((task) => task.status === STATUS.DONE)]
    ];

    const lines = ["# Taskly Export", ""];
    groups.forEach(([label, group]) => {
      lines.push(`## ${label}`, "");
      if (!group.length) {
        lines.push("_Tidak ada task._", "");
        return;
      }

      group.forEach((task) => {
        const checked = task.status === STATUS.DONE ? "x" : " ";
        lines.push(`- [${checked}] ${task.title}`);
        if (task.url) lines.push(`  - Source: ${task.url}`);
        if (task.priority) lines.push(`  - Priority: ${task.priority}`);
        if (task.dueDate) lines.push(`  - Due: ${task.dueDate}`);
        if (task.tags && task.tags.length) lines.push(`  - Tags: ${task.tags.join(", ")}`);
        if (task.completedAt) lines.push(`  - Completed: ${task.completedAt.slice(0, 10)}`);
        lines.push("");
      });
    });

    return lines.join("\n");
  }

  function toCsv(tasks) {
    const columns = [
      ["id", (task) => task.id],
      ["title", (task) => task.title],
      ["notes", (task) => task.notes],
      ["url", (task) => task.url],
      ["pageTitle", (task) => task.pageTitle],
      ["domain", (task) => task.domain],
      ["selectedText", (task) => task.selectedText],
      ["status", (task) => getStatusLabel(task.status)],
      ["priority", (task) => task.priority],
      ["tags", (task) => (task.tags || []).join("; ")],
      ["dueDate", (task) => task.dueDate],
      ["createdAt", (task) => task.createdAt],
      ["updatedAt", (task) => task.updatedAt],
      ["completedAt", (task) => task.completedAt]
    ];
    const header = columns.map(([label]) => escapeCsvValue(label)).join(",");
    const rows = (Array.isArray(tasks) ? tasks : []).map((task) =>
      columns.map(([, getValue]) => escapeCsvValue(getValue(task || {}))).join(",")
    );

    return [header, ...rows].join("\r\n");
  }

  function escapeCsvValue(value) {
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  Object.assign(store, {
    toMarkdown,
    toCsv
  });
})();
