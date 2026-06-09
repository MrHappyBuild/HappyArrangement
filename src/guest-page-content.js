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
      ? convertHtmlToGuestMarkup(content).replace(/\r/g, "").trim()
      : "";

  if (!normalizedContent) {
    return [];
  }

  return normalizedContent
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const imageMatch = block.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);

      if (imageMatch) {
        const [, alt, rawUrl] = imageMatch;
        const safeUrl = sanitizeGuestContentUrl(rawUrl);

        if (safeUrl) {
          return {
            type: "image",
            alt: alt || "Bilde",
            src: safeUrl
          };
        }
      }

      if (block.startsWith("## ")) {
        return {
          type: "heading",
          level: 2,
          parts: parseGuestPageInlineContent(block.slice(3).trim())
        };
      }

      if (block.startsWith("# ")) {
        return {
          type: "heading",
          level: 1,
          parts: parseGuestPageInlineContent(block.slice(2).trim())
        };
      }

      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);

      if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
        return {
          type: "list",
          items: lines.map((line) => parseGuestPageInlineContent(line.slice(2).trim()))
        };
      }

      return {
        type: "paragraph",
        parts: parseGuestPageInlineContent(lines.join(" "))
      };
    });
}
