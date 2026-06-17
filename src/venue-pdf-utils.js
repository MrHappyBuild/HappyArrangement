import { buildVenuePlanningState } from "./venue-layout-utils.js";

const ITEM_COLOR_TOKENS = {
  round_table: {
    fill: "#dbe7ff",
    stroke: "#5f7dbd",
    text: "#1e355a"
  },
  long_table: {
    fill: "#dbe7ff",
    stroke: "#5f7dbd",
    text: "#1e355a"
  },
  chair: {
    fill: "#fff4df",
    stroke: "#b97a1f",
    text: "#72470f"
  },
  custom_zone: {
    fill: "#f2e6ff",
    stroke: "#8a63c8",
    text: "#563884"
  },
  stage: {
    fill: "#ffe6db",
    stroke: "#c56c44",
    text: "#7e3215"
  },
  dance_floor: {
    fill: "#fff0d4",
    stroke: "#cb8d1c",
    text: "#72470f"
  },
  buffet: {
    fill: "#e5f6ef",
    stroke: "#4f8b6b",
    text: "#23523d"
  },
  bar: {
    fill: "#e5f6ef",
    stroke: "#4f8b6b",
    text: "#23523d"
  },
  restroom: {
    fill: "#eef3ff",
    stroke: "#6b84bf",
    text: "#294581"
  },
  emergency_exit: {
    fill: "#e4f6ea",
    stroke: "#2f8b4c",
    text: "#1d5a31"
  }
};

function normalizeTextValue(value) {
  return String(value || "").trim();
}

function escapeSvgText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatVenuePdfGuestInitials(name) {
  const parts = normalizeTextValue(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "?";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function getVenuePdfGuestDisplayName(guest, nameDisplay) {
  if (!guest) {
    return "";
  }

  return nameDisplay === "initials"
    ? formatVenuePdfGuestInitials(guest.name)
    : normalizeTextValue(guest.name);
}

function slugifyVenuePdfFilePart(value) {
  const normalized = normalizeTextValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "arrangement";
}

function isVisibleVenuePdfItem(item, visibleTypes) {
  return Object.prototype.hasOwnProperty.call(visibleTypes, item.type)
    ? visibleTypes[item.type] !== false
    : true;
}

function sortVenuePdfSeats(left, right) {
  if (!left?.guest && !right?.guest) {
    return String(left?.label || "").localeCompare(String(right?.label || ""), "nb");
  }

  if (!left?.guest) {
    return 1;
  }

  if (!right?.guest) {
    return -1;
  }

  return (
    String(left.guest.name || "").localeCompare(String(right.guest.name || ""), "nb") ||
    String(left.label || "").localeCompare(String(right.label || ""), "nb")
  );
}

function getVenuePdfItemColors(itemType) {
  return ITEM_COLOR_TOKENS[itemType] || ITEM_COLOR_TOKENS.custom_zone;
}

function getVenuePdfSeatNamePlacement(seat, seatRadius) {
  if (seat.top < 26) {
    return {
      x: seat.left,
      y: seat.top - seatRadius - 8,
      anchor: "middle"
    };
  }

  if (seat.top > 74) {
    return {
      x: seat.left,
      y: seat.top + seatRadius + 12,
      anchor: "middle"
    };
  }

  if (seat.left < 50) {
    return {
      x: seat.left - seatRadius - 8,
      y: seat.top + 4,
      anchor: "end"
    };
  }

  return {
    x: seat.left + seatRadius + 8,
    y: seat.top + 4,
    anchor: "start"
  };
}

function buildVenuePdfItemSvg(item, options) {
  const {
    mapWidth,
    mapHeight,
    nameDisplay,
    showItemLabels
  } = options;
  const itemWidth = (mapWidth * item.widthPercent) / 100;
  const itemHeightPercent = item.shape === "circle" ? item.widthPercent : item.heightPercent;
  const itemHeight = (mapHeight * itemHeightPercent) / 100;
  const left = (mapWidth * item.x) / 100;
  const top = (mapHeight * item.y) / 100;
  const radius = Math.max(10, Math.min(20, Math.min(itemWidth, itemHeight) * 0.14));
  const colors = getVenuePdfItemColors(item.type);
  const labelText = escapeSvgText(item.label);
  const metaText = escapeSvgText(
    item.seatable ? `${item.assignedSeats.length || 0} plassert` : item.library.shortLabel
  );
  const content = [];

  if (item.shape === "circle") {
    content.push(
      `<circle cx="${(itemWidth / 2).toFixed(2)}" cy="${(itemHeight / 2).toFixed(2)}" r="${(itemWidth / 2).toFixed(2)}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="3" />`
    );
  } else if (item.shape === "oval") {
    content.push(
      `<ellipse cx="${(itemWidth / 2).toFixed(2)}" cy="${(itemHeight / 2).toFixed(2)}" rx="${(itemWidth / 2).toFixed(2)}" ry="${(itemHeight / 2).toFixed(2)}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="3" />`
    );
  } else {
    content.push(
      `<rect x="0" y="0" width="${itemWidth.toFixed(2)}" height="${itemHeight.toFixed(2)}" rx="${Math.min(18, itemHeight * 0.25).toFixed(2)}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="3" />`
    );
  }

  if (showItemLabels) {
    content.push(
      `<text x="${(itemWidth / 2).toFixed(2)}" y="${Math.max(18, itemHeight / 2 - 6).toFixed(2)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(13, Math.min(22, itemWidth * 0.07)).toFixed(2)}" font-weight="700" fill="${colors.text}">${labelText}</text>`
    );
    content.push(
      `<text x="${(itemWidth / 2).toFixed(2)}" y="${Math.min(itemHeight - 10, itemHeight / 2 + 16).toFixed(2)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(10, Math.min(17, itemWidth * 0.05)).toFixed(2)}" fill="${colors.text}" opacity="0.82">${metaText}</text>`
    );
  }

  item.assignedSeats.forEach((seat) => {
    const seatX = (itemWidth * seat.left) / 100;
    const seatY = (itemHeight * seat.top) / 100;
    const guestText = getVenuePdfGuestDisplayName(seat.guest, nameDisplay);

    content.push(
      `<circle cx="${seatX.toFixed(2)}" cy="${seatY.toFixed(2)}" r="${radius.toFixed(2)}" fill="#6f4a19" stroke="#ffffff" stroke-width="2.5" />`
    );

    if (nameDisplay === "initials") {
      content.push(
        `<text x="${seatX.toFixed(2)}" y="${(seatY + 4).toFixed(2)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(10, radius * 0.9).toFixed(2)}" font-weight="700" fill="#fffaf2">${escapeSvgText(guestText)}</text>`
      );
    } else {
      const placement = getVenuePdfSeatNamePlacement(seat, radius);
      content.push(
        `<text x="${((itemWidth * placement.x) / 100).toFixed(2)}" y="${((itemHeight * placement.y) / 100).toFixed(2)}" text-anchor="${placement.anchor}" font-family="Arial, sans-serif" font-size="${Math.max(11, Math.min(16, itemWidth * 0.045)).toFixed(2)}" font-weight="600" fill="#4a2d0e">${escapeSvgText(guestText)}</text>`
      );
    }
  });

  return `<g transform="translate(${left.toFixed(2)} ${top.toFixed(2)})"><g transform="rotate(${item.rotation} ${(itemWidth / 2).toFixed(2)} ${(itemHeight / 2).toFixed(2)})">${content.join("")}</g></g>`;
}

export function buildVenuePdfExportData(event) {
  const venueState = buildVenuePlanningState(event);
  const guestSeatingPage = venueState.venuePlan.guestSeatingPage || {};
  const visibleTypes = guestSeatingPage.visibleTypes || {};
  const visibleItems = venueState.items
    .filter((item) => isVisibleVenuePdfItem(item, visibleTypes))
    .map((item) => ({
      ...item,
      assignedSeats: [...item.seats].filter((seat) => seat.guest).sort(sortVenuePdfSeats)
    }));
  const seatableItems = visibleItems
    .filter((item) => item.seatable && item.seats.length > 0)
    .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), "nb"));

  return {
    eventName: normalizeTextValue(event?.overview?.title) || normalizeTextValue(event?.name) || "Arrangement",
    roomName: normalizeTextValue(venueState.venuePlan.room.name) || "Sitteplan",
    totalSeats: venueState.totalSeats,
    assignedSeats: venueState.assignedSeats,
    openSeats: venueState.openSeats,
    roomWidthMeters: venueState.venuePlan.room.widthMeters,
    roomHeightMeters: venueState.venuePlan.room.heightMeters,
    showItemLabels: guestSeatingPage.showItemLabels !== false,
    showSeatLabels: guestSeatingPage.showSeatLabels !== false,
    visibleItems,
    seatableItems
  };
}

export function buildVenueSeatingChartSvg(exportData, options = {}) {
  const mapWidth = Math.max(1200, Math.round(Number(options.mapWidth) || 1600));
  const ratio =
    exportData.roomHeightMeters / Math.max(exportData.roomWidthMeters, 1);
  const mapHeight = Math.max(1, Math.round(mapWidth * ratio));
  const nameDisplay = options.nameDisplay === "initials" ? "initials" : "full";
  const svgParts = [];

  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${mapWidth}" height="${mapHeight}" viewBox="0 0 ${mapWidth} ${mapHeight}" role="img" aria-label="Sitteplan for ${escapeSvgText(exportData.eventName)}">`
  );
  svgParts.push(`<rect x="0" y="0" width="${mapWidth}" height="${mapHeight}" fill="#fffaf4" />`);
  svgParts.push(`<rect x="8" y="8" width="${mapWidth - 16}" height="${mapHeight - 16}" rx="28" fill="#fffdf8" stroke="#d7cab4" stroke-width="6" />`);

  const verticalStep = mapWidth / Math.max(exportData.roomWidthMeters, 1);
  const horizontalStep = mapHeight / Math.max(exportData.roomHeightMeters, 1);

  for (let x = verticalStep; x < mapWidth; x += verticalStep) {
    svgParts.push(
      `<line x1="${x.toFixed(2)}" y1="0" x2="${x.toFixed(2)}" y2="${mapHeight}" stroke="#ede4d7" stroke-width="1.5" stroke-dasharray="10 12" />`
    );
  }

  for (let y = horizontalStep; y < mapHeight; y += horizontalStep) {
    svgParts.push(
      `<line x1="0" y1="${y.toFixed(2)}" x2="${mapWidth}" y2="${y.toFixed(2)}" stroke="#ede4d7" stroke-width="1.5" stroke-dasharray="10 12" />`
    );
  }

  exportData.visibleItems.forEach((item) => {
    svgParts.push(
      buildVenuePdfItemSvg(item, {
        mapWidth,
        mapHeight,
        nameDisplay,
        showItemLabels: exportData.showItemLabels
      })
    );
  });

  svgParts.push("</svg>");

  return {
    svgMarkup: svgParts.join(""),
    width: mapWidth,
    height: mapHeight
  };
}

export function buildVenueSeatingListPdfLines(exportData, options = {}) {
  const nameDisplay = options.nameDisplay === "initials" ? "initials" : "full";
  const includeSeatLabels = options.includeSeatLabels !== false;
  const lines = [
    `${exportData.eventName} - Bordliste`,
    `${exportData.roomName} • ${exportData.assignedSeats} av ${exportData.totalSeats} plasser fylt`,
    ""
  ];

  exportData.seatableItems.forEach((item) => {
    lines.push(
      `${item.label} • ${item.assignedSeats.length} plassert • ${Math.max(
        0,
        item.seats.length - item.assignedSeats.length
      )} ledige`
    );

    if (item.assignedSeats.length === 0) {
      lines.push("Ingen navn er plassert her ennå.");
      lines.push("");
      return;
    }

    item.assignedSeats.forEach((seat) => {
      const guestText = getVenuePdfGuestDisplayName(seat.guest, nameDisplay);
      lines.push(includeSeatLabels ? `${seat.label}: ${guestText}` : guestText);
    });

    lines.push("");
  });

  return lines;
}

export function buildVenuePdfFilename(event) {
  return `${slugifyVenuePdfFilePart(event?.overview?.title || event?.name)}-sitteplan.pdf`;
}
