function sanitizeGuestContentUrl(rawUrl) {
  if (typeof rawUrl !== "string") {
    return "";
  }

  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return "";
  }

  return "";
}

function clampGuestImageFocus(value) {
  const numeric = Number.parseFloat(String(value || ""));

  if (!Number.isFinite(numeric)) {
    return 50;
  }

  return Math.min(Math.max(Math.round(numeric), 0), 100);
}

function normalizeGuestImageDisplayMode(value) {
  return String(value || "").trim().toLowerCase() === "crop" ? "crop" : "fit";
}

function normalizeGuestImageCropRatio(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = new Set(["16:9", "4:3", "1:1", "3:4", "21:9"]);

  return allowed.has(normalized) ? normalized : "16:9";
}

function parseGuestPageImageAttributes(rawAttributes) {
  const attributes = typeof rawAttributes === "string" ? rawAttributes : "";
  const config = {
    displayMode: "fit",
    cropRatio: "16:9",
    focusX: 50,
    focusY: 50
  };
  const attributePattern = /([a-zA-Z]+)\s*=\s*([^\s}]+)/g;
  let match;

  while ((match = attributePattern.exec(attributes)) !== null) {
    const [, rawKey, rawValue] = match;
    const key = rawKey.toLowerCase();
    const value = rawValue.trim();

    if (key === "mode" || key === "display") {
      config.displayMode = normalizeGuestImageDisplayMode(value);
    }

    if (key === "ratio") {
      config.cropRatio = normalizeGuestImageCropRatio(value);
    }

    if (key === "focusx") {
      config.focusX = clampGuestImageFocus(value);
    }

    if (key === "focusy") {
      config.focusY = clampGuestImageFocus(value);
    }
  }

  return config;
}

export function parseGuestPageImageMarkup(markdown) {
  const source = typeof markdown === "string" ? markdown.trim() : "";
  const imageMatch = source.match(/^!\[([^\]]*)\]\(([^)\s]+)\)(?:\{([^}]*)\})?$/);

  if (!imageMatch) {
    return null;
  }

  const [, alt, rawUrl, rawAttributes] = imageMatch;
  const safeUrl = sanitizeGuestContentUrl(rawUrl);

  if (!safeUrl) {
    return null;
  }

  return {
    type: "image",
    alt: alt || "Bilde",
    src: safeUrl,
    ...parseGuestPageImageAttributes(rawAttributes)
  };
}

export function buildGuestPageImageMarkup(config) {
  const safeConfig = config && typeof config === "object" ? config : {};
  const alt = String(safeConfig.alt || "Bilde").trim() || "Bilde";
  const src = sanitizeGuestContentUrl(safeConfig.src || "");

  if (!src) {
    return "";
  }

  const displayMode = normalizeGuestImageDisplayMode(safeConfig.displayMode);
  const cropRatio = normalizeGuestImageCropRatio(safeConfig.cropRatio);
  const focusX = clampGuestImageFocus(safeConfig.focusX);
  const focusY = clampGuestImageFocus(safeConfig.focusY);
  const attributes = [];

  if (displayMode === "crop") {
    attributes.push("mode=crop");
    attributes.push(`ratio=${cropRatio}`);
    attributes.push(`focusX=${focusX}`);
    attributes.push(`focusY=${focusY}`);
  }

  return `![${alt}](${src})${attributes.length ? `{${attributes.join(" ")}}` : ""}`;
}

export function getGuestPageImageCropAspectRatio(value) {
  const ratio = normalizeGuestImageCropRatio(value);

  if (ratio === "21:9") {
    return "21 / 9";
  }

  if (ratio === "16:9") {
    return "16 / 9";
  }

  if (ratio === "4:3") {
    return "4 / 3";
  }

  if (ratio === "3:4") {
    return "3 / 4";
  }

  return "1 / 1";
}

function decodeGuestHtmlEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtmlTags(text) {
  return decodeGuestHtmlEntities(String(text || "").replace(/<[^>]+>/g, ""));
}

function convertHtmlToGuestMarkup(content) {
  let normalized = String(content || "");

  if (!/<[a-z][\s\S]*>/i.test(normalized)) {
    return normalized;
  }

  normalized = normalized.replace(/<script[\s\S]*?<\/script>/gi, "");
  normalized = normalized.replace(/<style[\s\S]*?<\/style>/gi, "");

  normalized = normalized.replace(
    /<img\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*alt\s*=\s*["']([^"']*)["'][^>]*>/gi,
    (_, src, alt) => `\n\n![${stripHtmlTags(alt)}](${src.trim()})\n\n`
  );
  normalized = normalized.replace(
    /<img\b[^>]*alt\s*=\s*["']([^"']*)["'][^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi,
    (_, alt, src) => `\n\n![${stripHtmlTags(alt)}](${src.trim()})\n\n`
  );
  normalized = normalized.replace(
    /<img\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi,
    (_, src) => `\n\n![](${src.trim()})\n\n`
  );
  normalized = normalized.replace(
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, label) => `[${stripHtmlTags(label).trim() || href.trim()}](${href.trim()})`
  );
  normalized = normalized.replace(/<br\s*\/?>/gi, "\n");
  normalized = normalized.replace(/<li\b[^>]*>/gi, "\n- ");
  normalized = normalized.replace(/<\/li>/gi, "");
  normalized = normalized.replace(/<h1\b[^>]*>/gi, "\n\n# ");
  normalized = normalized.replace(/<h2\b[^>]*>/gi, "\n\n## ");
  normalized = normalized.replace(/<h3\b[^>]*>/gi, "\n\n## ");
  normalized = normalized.replace(/<h4\b[^>]*>/gi, "\n\n## ");
  normalized = normalized.replace(/<h5\b[^>]*>/gi, "\n\n## ");
  normalized = normalized.replace(/<h6\b[^>]*>/gi, "\n\n## ");
  normalized = normalized.replace(/<\/h[1-6]>/gi, "\n\n");
  normalized = normalized.replace(/<(p|div|section|article|blockquote|ul|ol)\b[^>]*>/gi, "\n\n");
  normalized = normalized.replace(/<\/(p|div|section|article|blockquote|ul|ol)>/gi, "\n\n");
  normalized = normalized.replace(/<(strong|b|em|i|span)\b[^>]*>/gi, "");
  normalized = normalized.replace(/<\/(strong|b|em|i|span)>/gi, "");
  normalized = normalized.replace(/<[^>]+>/g, "");
  normalized = decodeGuestHtmlEntities(normalized);
  normalized = normalized.replace(/[ \t]+\n/g, "\n");
  normalized = normalized.replace(/\n{3,}/g, "\n\n");

  return normalized.trim();
}

const INLINE_STYLE_FONT_VALUES = new Set(["clean", "editorial", "classic"]);
const INLINE_STYLE_SIZE_VALUES = new Set(["sm", "md", "lg"]);
const INLINE_STYLE_WEIGHT_VALUES = new Set(["regular", "bold"]);

function parseGuestInlineStyleAttributes(rawAttributes) {
  const styles = {};
  const source = typeof rawAttributes === "string" ? rawAttributes : "";
  const pattern = /(font|size|weight)\s*=\s*([a-z_]+)/gi;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const [, key, rawValue] = match;
    const value = rawValue.toLowerCase();

    if (key === "font" && INLINE_STYLE_FONT_VALUES.has(value)) {
      styles.fontPreset = value;
    }

    if (key === "size" && INLINE_STYLE_SIZE_VALUES.has(value)) {
      styles.textSize = value;
    }

    if (key === "weight" && INLINE_STYLE_WEIGHT_VALUES.has(value)) {
      styles.textWeight = value;
    }
  }

  return styles;
}

export function parseGuestPageInlineContent(text) {
  const source = typeof text === "string" ? text : "";
  const parts = [];
  let cursor = 0;
  const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const stylePattern = /\[style([^\]]*)\]/gi;

  while (cursor < source.length) {
    linkPattern.lastIndex = cursor;
    stylePattern.lastIndex = cursor;

    const nextLinkMatch = linkPattern.exec(source);
    const nextStyleMatch = stylePattern.exec(source);
    const linkIndex = nextLinkMatch ? nextLinkMatch.index : Number.POSITIVE_INFINITY;
    const styleIndex = nextStyleMatch ? nextStyleMatch.index : Number.POSITIVE_INFINITY;

    if (!Number.isFinite(linkIndex) && !Number.isFinite(styleIndex)) {
      break;
    }

    if (styleIndex < linkIndex) {
      if (styleIndex > cursor) {
        parts.push({
          type: "text",
          text: source.slice(cursor, styleIndex)
        });
      }

      const [rawStyleMatch, rawAttributes] = nextStyleMatch;
      const innerStart = styleIndex + rawStyleMatch.length;
      const closeIndex = source.indexOf("[/style]", innerStart);

      if (closeIndex === -1) {
        parts.push({
          type: "text",
          text: source.slice(styleIndex)
        });
        cursor = source.length;
        break;
      }

      parts.push({
        type: "styled",
        styles: parseGuestInlineStyleAttributes(rawAttributes),
        parts: parseGuestPageInlineContent(source.slice(innerStart, closeIndex))
      });
      cursor = closeIndex + "[/style]".length;
      continue;
    }

    if (linkIndex > cursor) {
      parts.push({
        type: "text",
        text: source.slice(cursor, linkIndex)
      });
    }

    const [rawMatch, label, rawUrl] = nextLinkMatch;
    const safeUrl = sanitizeGuestContentUrl(rawUrl);

    if (safeUrl) {
      parts.push({
        type: "link",
        label,
        href: safeUrl
      });
    } else {
      parts.push({
        type: "text",
        text: rawMatch
      });
    }

    cursor = linkIndex + rawMatch.length;
  }

  if (cursor < source.length) {
    parts.push({
      type: "text",
      text: source.slice(cursor)
    });
  }

  return parts.length > 0 ? parts : [{ type: "text", text: source }];
}

export function parseGuestPageContent(content) {
  const normalizedContent =
    typeof content === "string"
      ? convertHtmlToGuestMarkup(content).replace(/\r/g, "")
      : "";

  if (!normalizedContent.trim()) {
    return [];
  }

  return normalizedContent
    .split(/\n\s*\n/)
    .filter((block) => block.trim().length > 0)
    .map((rawBlock) => {
      const trimmedBlock = rawBlock.trim();
      const imageBlock = parseGuestPageImageMarkup(trimmedBlock);

      if (imageBlock) {
        return imageBlock;
      }

      if (trimmedBlock.startsWith("## ")) {
        return {
          type: "heading",
          level: 2,
          parts: parseGuestPageInlineContent(trimmedBlock.slice(3).trim())
        };
      }

      if (trimmedBlock.startsWith("# ")) {
        return {
          type: "heading",
          level: 1,
          parts: parseGuestPageInlineContent(trimmedBlock.slice(2).trim())
        };
      }

      const lines = rawBlock.split("\n").filter((line) => line.trim().length > 0);

      if (lines.length > 0 && lines.every((line) => /^\s*-\s+/.test(line))) {
        return {
          type: "list",
          items: lines.map((line) =>
            parseGuestPageInlineContent(line.replace(/^\s*-\s+/, "").trim())
          )
        };
      }

      return {
        type: "paragraph",
        parts: parseGuestPageInlineContent(rawBlock)
      };
    });
}
