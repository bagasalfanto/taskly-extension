(function () {
  if (globalThis.__TASKLY_CONTENT_SCRIPT_LOADED__) {
    return;
  }

  globalThis.__TASKLY_CONTENT_SCRIPT_LOADED__ = true;

  const MESSAGE_GET_PAGE_CONTEXT = "TASKLY_GET_PAGE_CONTEXT";
  const MESSAGE_GET_CONTEXT_MENU_CAPTURE = "TASKLY_GET_CONTEXT_MENU_CAPTURE";

  let lastContextMenuCapture = getPageContext();

  document.addEventListener(
    "contextmenu",
    (event) => {
      lastContextMenuCapture = getPageContext(event.target);
    },
    true
  );

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) {
      return false;
    }

    if (message.type === MESSAGE_GET_PAGE_CONTEXT) {
      sendResponse(getPageContext());
      return true;
    }

    if (message.type === MESSAGE_GET_CONTEXT_MENU_CAPTURE) {
      sendResponse(getContextMenuCapture(message));
      return true;
    }

    return false;
  });

  function getContextMenuCapture(message) {
    const currentContext = getPageContext();
    const capture = lastContextMenuCapture || currentContext;

    if (!message.linkUrl) {
      return capture;
    }

    if (capture.link && capture.link.url === message.linkUrl) {
      return capture;
    }

    if (currentContext.link && currentContext.link.url === message.linkUrl) {
      return currentContext;
    }

    const matchingLink = getLinkContextByUrl(message.linkUrl);
    if (matchingLink) {
      return {
        ...currentContext,
        link: matchingLink
      };
    }

    return {
      ...currentContext,
      link: {
        url: message.linkUrl,
        title: ""
      }
    };
  }

  function getPageContext(target) {
    const link = getClosestLink(target);

    return {
      url: window.location.href,
      pageTitle: getBestPageTitle(),
      documentTitle: normalizeText(document.title),
      selectedText: normalizeText(String(window.getSelection ? window.getSelection() : "")),
      link: link
        ? {
            url: link.href,
            title: getLinkTitle(link)
          }
        : null
    };
  }

  function getClosestLink(target) {
    if (!target || !target.closest) {
      return null;
    }

    return target.closest("a[href]");
  }

  function getBestPageTitle() {
    return firstText([
      getYoutubePageTitle(),
      getMetaContent('meta[property="og:title"]'),
      getMetaContent('meta[name="twitter:title"]'),
      getMetaContent('meta[name="title"]'),
      getJsonLdName(),
      getHeadingText(),
      document.title
    ]);
  }

  function getLinkTitle(link) {
    const image = link.querySelector("img[alt]");
    const labelledBy = getLabelledByText(link);
    const nearbyTitle = getNearbyTitle(link);

    return firstText([
      getYoutubeLinkTitle(link),
      link.getAttribute("title"),
      labelledBy,
      nearbyTitle,
      link.getAttribute("aria-label"),
      link.innerText,
      link.textContent,
      image ? image.getAttribute("alt") : ""
    ]);
  }

  function getLinkContextByUrl(linkUrl) {
    const links = document.querySelectorAll("a[href]");
    for (const link of links) {
      if (!urlsMatch(link.href, linkUrl)) {
        continue;
      }

      const title = getLinkTitle(link);
      if (title) {
        return {
          url: link.href,
          title
        };
      }
    }

    return null;
  }

  function getYoutubePageTitle() {
    if (!isYoutubeHost(window.location.hostname)) {
      return "";
    }

    return firstText([
      getTextFromSelector("ytd-watch-metadata h1 yt-formatted-string"),
      getTextFromSelector("ytd-watch-metadata h1"),
      getTextFromSelector("#title h1 yt-formatted-string"),
      getTextFromSelector("h1.title yt-formatted-string"),
      getMetaContent('meta[itemprop="name"]'),
      getMetaContent('meta[name="title"]')
    ]);
  }

  function getYoutubeLinkTitle(link) {
    if (!isYoutubeHost(window.location.hostname) && !isYoutubeUrl(link.href)) {
      return "";
    }

    if (link.matches("#video-title, a#video-title, [id='video-title-link']")) {
      return firstText([
        link.getAttribute("title"),
        link.innerText,
        link.textContent,
        link.getAttribute("aria-label")
      ]);
    }

    const container = link.closest(
      [
        "ytd-video-renderer",
        "ytd-grid-video-renderer",
        "ytd-rich-item-renderer",
        "ytd-compact-video-renderer",
        "ytd-playlist-video-renderer",
        "ytd-reel-item-renderer"
      ].join(", ")
    );
    if (!container) {
      return "";
    }

    return firstText([
      getTextFromSelector("#video-title", container),
      getTextFromSelector("a#video-title", container),
      getTextFromSelector("[id='video-title-link']", container),
      getTextFromSelector("yt-formatted-string#video-title", container),
      getTextFromSelector("h3 a[href]", container),
      getTextFromSelector("h3", container)
    ]);
  }

  function getNearbyTitle(link) {
    const container = link.closest(
      'article, li, [role="article"], [data-testid], ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer'
    );
    if (!container) {
      return "";
    }

    const title = container.querySelector(
      'h1, h2, h3, [id="video-title"], [class*="title"]'
    );

    if (!title || title === link) {
      return "";
    }

    return title.getAttribute("aria-label") || title.innerText || title.textContent;
  }

  function getMetaContent(selector) {
    const element = document.querySelector(selector);
    return element ? element.getAttribute("content") : "";
  }

  function getTextFromSelector(selector, root = document) {
    const element = root.querySelector(selector);
    if (!element) {
      return "";
    }

    return element.getAttribute("title") || element.getAttribute("aria-label") || element.innerText || element.textContent;
  }

  function getJsonLdName() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const payload = JSON.parse(script.textContent || "null");
        const name = findJsonLdName(payload);
        if (name) {
          return name;
        }
      } catch (error) {
        // Ignore invalid JSON-LD; page title fallbacks still work.
      }
    }

    return "";
  }

  function findJsonLdName(value) {
    if (!value) {
      return "";
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const name = findJsonLdName(item);
        if (name) {
          return name;
        }
      }
      return "";
    }

    if (typeof value !== "object") {
      return "";
    }

    if (typeof value.name === "string") {
      return value.name;
    }

    if (typeof value.headline === "string") {
      return value.headline;
    }

    return findJsonLdName(value["@graph"]);
  }

  function getHeadingText() {
    const heading = document.querySelector("h1");
    return heading ? heading.innerText || heading.textContent : "";
  }

  function getLabelledByText(element) {
    const ids = normalizeText(element.getAttribute("aria-labelledby")).split(" ").filter(Boolean);
    if (!ids.length) {
      return "";
    }

    return firstText(
      ids.map((id) => {
        const label = document.getElementById(id);
        return label ? label.innerText || label.textContent : "";
      })
    );
  }

  function firstText(values) {
    for (const value of values) {
      const text = normalizeText(value);
      if (text) {
        return text;
      }
    }

    return "";
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function urlsMatch(left, right) {
    return getComparableUrl(left) === getComparableUrl(right);
  }

  function getComparableUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      const videoId = url.searchParams.get("v");
      if (isYoutubeHost(url.hostname) && videoId) {
        return `${url.origin}${url.pathname}?v=${videoId}`;
      }

      url.hash = "";
      return url.toString();
    } catch (error) {
      return normalizeText(value);
    }
  }

  function isYoutubeUrl(value) {
    try {
      return isYoutubeHost(new URL(value, window.location.href).hostname);
    } catch (error) {
      return false;
    }
  }

  function isYoutubeHost(hostname) {
    return /(^|\.)youtube\.com$/i.test(hostname) || /(^|\.)youtu\.be$/i.test(hostname);
  }
})();
