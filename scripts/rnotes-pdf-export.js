(function () {
  const store = globalThis.TasklyStore || globalThis.RnotesStore;
  const utils = globalThis.TasklyUtils || globalThis.RnotesUtils;
  if (!store || !utils) {
    throw new Error("TasklyStore dan TasklyUtils harus dimuat sebelum rnotes-pdf-export.js.");
  }

  const { STATUS, PRIORITY, getStatusLabel } = store;
  const { normalizeText } = utils;

  function toPdf(tasks) {
    const reportTasks = (Array.isArray(tasks) ? tasks : []).map((task) => ({
      ...task,
      status: store.normalizeStatus(task.status)
    }));
    const pages = createPdfReport(reportTasks);
    return buildPdfBytes(pages);
  }

  function createPdfReport(tasks) {
    const PAGE_WIDTH = 595.28;
    const PAGE_HEIGHT = 841.89;
    const MARGIN = 42;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
    const FOOTER_TOP = 42;
    const HEADER_HEIGHT = 78;
    const colors = {
      ink: [31, 41, 51],
      muted: [96, 113, 130],
      border: [220, 227, 234],
      panel: [249, 251, 253],
      blue: [34, 118, 210],
      green: [23, 100, 58],
      red: [180, 35, 24],
      amber: [180, 83, 9],
      violet: [109, 40, 217],
      donePanel: [247, 250, 248],
      white: [255, 255, 255]
    };
    const pages = [];
    let page = null;
    let y = 0;

    const todoTasks = tasks.filter((task) => task.status === STATUS.TODO);
    const progressTasks = tasks.filter((task) => task.status === STATUS.PROGRESS);
    const doneTasks = tasks.filter((task) => task.status === STATUS.DONE);

    addPage();
    drawSummary(tasks);
    drawSection("To Do", todoTasks, STATUS.TODO);
    drawSection("On Progress", progressTasks, STATUS.PROGRESS);
    drawSection("Done", doneTasks, STATUS.DONE);
    pages.forEach((item, index) => drawFooter(item, index + 1, pages.length));

    return pages;

    function addPage() {
      page = { ops: [] };
      pages.push(page);
      drawRect(0, PAGE_HEIGHT - HEADER_HEIGHT, PAGE_WIDTH, HEADER_HEIGHT, colors.ink);
      drawText(MARGIN, PAGE_HEIGHT - 36, "Taskly Export", 22, "F2", colors.white);
      drawText(
        MARGIN,
        PAGE_HEIGHT - 57,
        `Generated ${formatPdfDateTime(new Date())}`,
        9,
        "F1",
        [213, 220, 228]
      );
      drawText(
        PAGE_WIDTH - MARGIN - 145,
        PAGE_HEIGHT - 45,
        `${tasks.length} task`,
        14,
        "F2",
        colors.white
      );
      y = PAGE_HEIGHT - HEADER_HEIGHT - 24;
    }

    function ensureSpace(height) {
      if (y - height < FOOTER_TOP + 18) {
        addPage();
      }
    }

    function drawSummary(allTasks) {
      ensureSpace(84);
      const dueTasks = allTasks.filter((task) => task.dueDate && task.status !== STATUS.DONE);
      const items = [
        ["Total", allTasks.length, colors.blue],
        ["To Do", todoTasks.length, colors.amber],
        ["Progress", progressTasks.length, colors.violet],
        ["Done", doneTasks.length, colors.green],
        ["Due", dueTasks.length, colors.red]
      ];
      const gap = 8;
      const width = (CONTENT_WIDTH - gap * (items.length - 1)) / items.length;

      items.forEach(([label, count, color], index) => {
        const x = MARGIN + index * (width + gap);
        const bottom = y - 58;
        drawRect(x, bottom, width, 58, colors.panel, colors.border);
        drawText(x + 10, bottom + 35, String(count), 18, "F2", color);
        drawText(x + 10, bottom + 17, label, 9, "F1", colors.muted);
      });

      y -= 78;
    }

    function drawSection(label, sectionTasks, status) {
      ensureSpace(52);
      drawRect(MARGIN, y - 24, CONTENT_WIDTH, 28, getSectionFill(status), null);
      drawRect(MARGIN, y - 24, 4, 28, getStatusColor(status), null);
      drawText(MARGIN + 12, y - 17, `${label} (${sectionTasks.length})`, 13, "F2", colors.ink);
      y -= 42;

      if (!sectionTasks.length) {
        ensureSpace(36);
        drawRect(MARGIN, y - 28, CONTENT_WIDTH, 28, [252, 253, 254], colors.border);
        drawText(MARGIN + 12, y - 18, "Tidak ada task.", 10, "F1", colors.muted);
        y -= 44;
        return;
      }

      sectionTasks.forEach((task) => drawTaskCard(task, status));
      y -= status === STATUS.DONE ? 4 : 8;
    }

    function drawTaskCard(task, sectionStatus) {
      const layout = getTaskLayout(task, sectionStatus);
      ensureSpace(layout.height + 12);

      const top = y;
      const bottom = top - layout.height;
      drawRect(MARGIN, bottom, CONTENT_WIDTH, layout.height, getCardFill(sectionStatus), colors.border);
      drawRect(MARGIN, bottom, 4, layout.height, sectionStatus === STATUS.DONE ? colors.green : getPriorityColor(task.priority));

      drawStatusPill(task.status || STATUS.TODO, MARGIN + CONTENT_WIDTH - 96, top - 28);

      let textY = top - 20;
      layout.titleLines.forEach((line) => {
        drawText(MARGIN + 14, textY, line, 12, "F2", colors.ink);
        textY -= 14;
      });

      if (layout.metaLines.length) {
        textY -= 2;
        layout.metaLines.forEach((line) => {
          drawText(MARGIN + 14, textY, line, 8.5, "F1", colors.muted);
          textY -= 11;
        });
      }

      if (layout.notesLines.length) {
        textY -= 3;
        drawText(MARGIN + 14, textY, "Catatan", 8.5, "F2", colors.ink);
        textY -= 11;
        layout.notesLines.forEach((line) => {
          drawText(MARGIN + 14, textY, line, 9, "F1", sectionStatus === STATUS.DONE ? colors.muted : colors.ink);
          textY -= 11;
        });
      }

      if (layout.sourceLines.length) {
        textY -= 3;
        drawText(MARGIN + 14, textY, "Source", 8.5, "F2", colors.ink);
        textY -= 11;
        layout.sourceLines.forEach((line) => {
          drawText(MARGIN + 14, textY, line, 8.5, "F1", colors.blue);
          textY -= 10;
        });
      }

      if (layout.selectedLines.length) {
        textY -= 3;
        drawText(MARGIN + 14, textY, "Kutipan", 8.5, "F2", colors.ink);
        textY -= 11;
        layout.selectedLines.forEach((line) => {
          drawText(MARGIN + 14, textY, line, 8.5, "F1", colors.muted);
          textY -= 10;
        });
      }

      y = bottom - (sectionStatus === STATUS.DONE ? 7 : 10);
    }

    function getTaskLayout(task, sectionStatus) {
      const bodyWidth = CONTENT_WIDTH - 28;
      const titleWidth = bodyWidth - 108;
      const titleLines = wrapPdfText(task.title || "Task baru", titleWidth, 12, true, 3);
      const metaLines = wrapPdfText(getPdfMeta(task), bodyWidth, 8.5, false, 2);
      const notesLines = wrapPdfText(task.notes, bodyWidth, 9, false, sectionStatus === STATUS.DONE ? 2 : 4);
      const sourceLines = wrapPdfText(task.url, bodyWidth, 8.5, false, sectionStatus === STATUS.DONE ? 1 : 2);
      const selectedLines = wrapPdfText(task.selectedText, bodyWidth, 8.5, false, sectionStatus === STATUS.DONE ? 0 : 4);
      let height = 22 + titleLines.length * 14;
      if (metaLines.length) height += 4 + metaLines.length * 11;
      if (notesLines.length) height += 17 + notesLines.length * 11;
      if (sourceLines.length) height += 17 + sourceLines.length * 10;
      if (selectedLines.length) height += 17 + selectedLines.length * 10;
      return {
        titleLines,
        metaLines,
        notesLines,
        sourceLines,
        selectedLines,
        height: Math.max(sectionStatus === STATUS.DONE ? 58 : 72, height + 12)
      };
    }

    function getPdfMeta(task) {
      const parts = [];
      if (task.domain) parts.push(task.domain);
      if (task.priority) parts.push(`Priority: ${task.priority}`);
      if (task.dueDate) parts.push(`Due: ${formatPdfDate(task.dueDate)}`);
      if (task.tags && task.tags.length) parts.push(`Tags: ${task.tags.join(", ")}`);
      if (task.completedAt) parts.push(`Completed: ${formatPdfDate(task.completedAt)}`);
      return parts.join(" | ");
    }

    function drawStatusPill(status, x, centerY) {
      const normalizedStatus = store.normalizeStatus(status);
      const fill = getSectionFill(normalizedStatus);
      const textColor = getStatusColor(normalizedStatus);
      const label = getStatusLabel(normalizedStatus).toUpperCase();
      drawRect(x, centerY - 8, 82, 18, fill, null);
      drawText(x + 10, centerY - 2, label, 7.2, "F2", textColor);
    }

    function getStatusColor(status) {
      if (status === STATUS.DONE) return colors.green;
      if (status === STATUS.PROGRESS) return colors.violet;
      return colors.amber;
    }

    function getSectionFill(status) {
      if (status === STATUS.DONE) return [232, 245, 238];
      if (status === STATUS.PROGRESS) return [245, 243, 255];
      return [255, 247, 237];
    }

    function getCardFill(status) {
      if (status === STATUS.DONE) return colors.donePanel;
      return colors.white;
    }

    function getPriorityColor(priority) {
      if (priority === PRIORITY.HIGH) return colors.red;
      if (priority === PRIORITY.LOW) return colors.green;
      return colors.blue;
    }

    function drawFooter(targetPage, current, total) {
      drawLine(MARGIN, 30, MARGIN + CONTENT_WIDTH, 30, colors.border, 1, targetPage);
      drawText(MARGIN, 18, "Taskly", 8, "F2", colors.muted, targetPage);
      drawText(
        PAGE_WIDTH - MARGIN - 70,
        18,
        `Page ${current} / ${total}`,
        8,
        "F1",
        colors.muted,
        targetPage
      );
    }

    function drawRect(x, bottom, width, height, fillColor, strokeColor, targetPage = page) {
      if (fillColor) targetPage.ops.push(`${rgb(fillColor)} rg`);
      if (strokeColor) targetPage.ops.push(`${rgb(strokeColor)} RG`);
      const paint = fillColor && strokeColor ? "B" : fillColor ? "f" : "S";
      targetPage.ops.push(`${num(x)} ${num(bottom)} ${num(width)} ${num(height)} re ${paint}`);
    }

    function drawLine(x1, y1, x2, y2, color, width = 1, targetPage = page) {
      targetPage.ops.push(`${rgb(color)} RG`);
      targetPage.ops.push(`${num(width)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`);
    }

    function drawText(x, baseline, text, size, font, color, targetPage = page) {
      const safeText = escapePdfString(text);
      if (!safeText) return;
      targetPage.ops.push(`${rgb(color)} rg`);
      targetPage.ops.push(
        `BT /${font} ${num(size)} Tf 1 0 0 1 ${num(x)} ${num(baseline)} Tm (${safeText}) Tj ET`
      );
    }
  }

  function buildPdfBytes(pages) {
    const encoder = new TextEncoder();
    const objects = [];
    const pageIds = [];
    const catalogId = 1;
    const pagesId = 2;
    const regularFontId = 3;
    const boldFontId = 4;

    objects[regularFontId] = `${regularFontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
    objects[boldFontId] = `${boldFontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

    pages.forEach((page, index) => {
      const contentId = 5 + index * 2;
      const pageId = contentId + 1;
      const content = `${page.ops.join("\n")}\n`;
      pageIds.push(`${pageId} 0 R`);
      objects[contentId] =
        `${contentId} 0 obj\n<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`;
      objects[pageId] =
        `${pageId} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595.28 841.89] ` +
        `/Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>\nendobj\n`;
    });

    objects[catalogId] = `${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`;
    objects[pagesId] =
      `${pagesId} 0 obj\n<< /Type /Pages /Kids [${pageIds.join(" ")}] /Count ${pages.length} >>\nendobj\n`;

    let output = "%PDF-1.4\n";
    const offsets = [0];
    for (let id = 1; id < objects.length; id += 1) {
      offsets[id] = encoder.encode(output).length;
      output += objects[id];
    }

    const xrefOffset = encoder.encode(output).length;
    output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id += 1) {
      output += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    }
    output += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return encoder.encode(output);
  }

  function wrapPdfText(value, maxWidth, fontSize, isBold = false, maxLines = Infinity) {
    if (maxLines <= 0) return [];

    const text = sanitizePdfText(value);
    if (!text) return [];

    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (pdfTextWidth(candidate, fontSize, isBold) <= maxWidth) {
        line = candidate;
        return;
      }

      if (line) {
        lines.push(line);
      }
      line = word;

      while (pdfTextWidth(line, fontSize, isBold) > maxWidth) {
        const chunk = takePdfChunk(line, maxWidth, fontSize, isBold);
        lines.push(chunk);
        line = line.slice(chunk.length);
      }
    });

    if (line) {
      lines.push(line);
    }

    if (lines.length <= maxLines) {
      return lines;
    }

    const clipped = lines.slice(0, maxLines);
    clipped[clipped.length - 1] = fitPdfLine(`${clipped[clipped.length - 1]}...`, maxWidth, fontSize, isBold);
    return clipped;
  }

  function takePdfChunk(text, maxWidth, fontSize, isBold) {
    let chunk = "";
    for (const char of text) {
      if (chunk && pdfTextWidth(`${chunk}${char}`, fontSize, isBold) > maxWidth) {
        return chunk;
      }
      chunk += char;
    }
    return chunk;
  }

  function fitPdfLine(text, maxWidth, fontSize, isBold) {
    let line = text;
    while (line.length > 3 && pdfTextWidth(line, fontSize, isBold) > maxWidth) {
      line = `${line.slice(0, -4)}...`;
    }
    return line;
  }

  function pdfTextWidth(text, fontSize, isBold) {
    const weight = isBold ? 1.06 : 1;
    let units = 0;
    for (const char of String(text || "")) {
      if (char === " ") units += 0.28;
      else if ("MW@#%".includes(char)) units += 0.82;
      else if ("il.,'|!:;".includes(char)) units += 0.25;
      else if (/[A-Z0-9]/.test(char)) units += 0.58;
      else units += 0.5;
    }
    return units * fontSize * weight;
  }

  function escapePdfString(value) {
    return sanitizePdfText(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function sanitizePdfText(value) {
    let text = normalizeText(value)
      .replace(/\u00a0/g, " ")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...");

    if (text.normalize) {
      text = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    }

    return text.replace(/[^\x20-\x7e]/g, "?");
  }

  function formatPdfDate(value) {
    const text = normalizeText(value);
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toISOString().slice(0, 10);
  }

  function formatPdfDateTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 19).replace("T", " ");
  }

  function rgb(color) {
    return color.map((channel) => num(channel / 255)).join(" ");
  }

  function num(value) {
    return Number(value).toFixed(2).replace(/\.?0+$/, "");
  }

  Object.assign(store, {
    toPdf
  });
})();
