import { parseGuestPageContent } from "@/guest-page-content";

function renderGuestPageInlineParts(parts, keyPrefix) {
  return parts.map((part, index) => {
    if (part.type === "styled") {
      const classNames = [
        "guest-inline-style",
        part.styles?.fontPreset ? `guest-page-font-${part.styles.fontPreset}` : "",
        part.styles?.textSize ? `guest-page-size-${part.styles.textSize}` : "",
        part.styles?.textWeight ? `guest-page-weight-${part.styles.textWeight}` : ""
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <span className={classNames} key={`${keyPrefix}-styled-${index}`}>
          {renderGuestPageInlineParts(part.parts || [], `${keyPrefix}-styled-${index}`)}
        </span>
      );
    }

    if (part.type === "link") {
      return (
        <a
          className="guest-page-inline-link"
          href={part.href}
          key={`${keyPrefix}-link-${index}`}
          rel="noreferrer"
          target="_blank"
        >
          {part.label}
        </a>
      );
    }

    return <span key={`${keyPrefix}-text-${index}`}>{part.text}</span>;
  });
}

export function GuestPageContentView({ content, showImageCaption = false }) {
  let blocks;

  try {
    blocks = parseGuestPageContent(content);
  } catch {
    blocks = [
      {
        type: "paragraph",
        parts: [{ type: "text", text: typeof content === "string" ? content : "" }]
      }
    ];
  }

  if (blocks.length === 0) {
    return <p>Denne siden er klar for informasjon, men mangler innhold enda.</p>;
  }

  return (
    <div className="guest-page-rendered">
      {blocks.map((block, index) => {
        if (block.type === "image") {
          return (
            <figure className="guest-page-figure" key={`block-${index}`}>
              <img
                alt={block.alt}
                className="guest-page-image"
                loading="lazy"
                src={block.src}
              />
              {showImageCaption && block.alt ? <figcaption>{block.alt}</figcaption> : null}
            </figure>
          );
        }

        if (block.type === "heading") {
          const Tag = block.level === 1 ? "h2" : "h3";
          return (
            <Tag className="guest-page-heading" key={`block-${index}`}>
              {renderGuestPageInlineParts(block.parts, `heading-${index}`)}
            </Tag>
          );
        }

        if (block.type === "list") {
          return (
            <ul className="guest-page-list" key={`block-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`block-${index}-item-${itemIndex}`}>
                  {renderGuestPageInlineParts(item, `list-${index}-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p className="guest-page-paragraph" key={`block-${index}`}>
            {renderGuestPageInlineParts(block.parts, `paragraph-${index}`)}
          </p>
        );
      })}
    </div>
  );
}
