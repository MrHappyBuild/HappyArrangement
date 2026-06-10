const DEFAULT_ROOM = {
  name: "Hovedsal",
  widthMeters: 12,
  heightMeters: 8,
  notes: ""
};

const DEFAULT_ITEM_ORDER = [
  "round_table",
  "long_table",
  "chair",
  "custom_zone",
  "stage",
  "dance_floor",
  "buffet",
  "bar",
  "restroom",
  "emergency_exit"
];

const LIBRARY_BY_TYPE = {
  round_table: {
    type: "round_table",
    label: "Rundt bord",
    shortLabel: "Rundt",
    defaultWidth: 1.8,
    defaultHeight: 1.8,
    defaultSeatCount: 8,
    colorToken: "table",
    seatable: true,
    defaultShape: "circle"
  },
  long_table: {
    type: "long_table",
    label: "Langbord",
    shortLabel: "Langbord",
    defaultWidth: 3.2,
    defaultHeight: 1,
    defaultSeatCount: 8,
    colorToken: "table",
    seatable: true
  },
  chair: {
    type: "chair",
    label: "Stol",
    shortLabel: "Stol",
    defaultWidth: 0.65,
    defaultHeight: 0.65,
    defaultSeatCount: 1,
    colorToken: "seat",
    seatable: true,
    defaultShape: "circle"
  },
  custom_zone: {
    type: "custom_zone",
    label: "Egen sone",
    shortLabel: "Sone",
    defaultWidth: 3,
    defaultHeight: 2,
    defaultSeatCount: 0,
    colorToken: "custom",
    seatable: false,
    defaultShape: "rectangle",
    supportedShapes: ["rectangle", "oval", "circle"]
  },
  stage: {
    type: "stage",
    label: "Scene",
    shortLabel: "Scene",
    defaultWidth: 4,
    defaultHeight: 2.2,
    defaultSeatCount: 0,
    colorToken: "stage",
    seatable: false,
    defaultShape: "rectangle"
  },
  dance_floor: {
    type: "dance_floor",
    label: "Dansegulv",
    shortLabel: "Dansegulv",
    defaultWidth: 4.5,
    defaultHeight: 3.5,
    defaultSeatCount: 0,
    colorToken: "dance",
    seatable: false,
    defaultShape: "rectangle"
  },
  buffet: {
    type: "buffet",
    label: "Buffet",
    shortLabel: "Buffet",
    defaultWidth: 3,
    defaultHeight: 1.2,
    defaultSeatCount: 0,
    colorToken: "service",
    seatable: false,
    defaultShape: "rectangle"
  },
  bar: {
    type: "bar",
    label: "Bar",
    shortLabel: "Bar",
    defaultWidth: 2.8,
    defaultHeight: 1.1,
    defaultSeatCount: 0,
    colorToken: "service",
    seatable: false,
    defaultShape: "rectangle"
  },
  restroom: {
    type: "restroom",
    label: "Toalett",
    shortLabel: "WC",
    defaultWidth: 2.2,
    defaultHeight: 1.8,
    defaultSeatCount: 0,
    colorToken: "service",
    seatable: false,
    defaultShape: "rectangle"
  },
  emergency_exit: {
    type: "emergency_exit",
    label: "Nodutgang",
    shortLabel: "Utgang",
    defaultWidth: 1.6,
    defaultHeight: 0.4,
    defaultSeatCount: 0,
    colorToken: "safety",
    seatable: false,
    defaultShape: "rectangle"
  }
};

export const VENUE_ITEM_LIBRARY = DEFAULT_ITEM_ORDER.map((type) => LIBRARY_BY_TYPE[type]);
export const VENUE_CUSTOM_SHAPE_OPTIONS = [
  { value: "rectangle", label: "Rektangel" },
  { value: "oval", label: "Oval" },
  { value: "circle", label: "Sirkel" }
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseNumber(value, fallback) {
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value || ""));
  return Number.isFinite(numeric) ? numeric : fallback;
}

function metersToPercent(valueMeters, roomMeters) {
  if (!roomMeters) {
    return 0;
  }

  return (valueMeters / roomMeters) * 100;
}

function legacyPercentToMeters(valuePercent, roomMeters, fallbackMeters) {
  const safePercent = parseNumber(valuePercent, NaN);

  if (!Number.isFinite(safePercent)) {
    return fallbackMeters;
  }

  return (safePercent / 100) * roomMeters;
}

function normalizeRotation(value) {
  const allowed = [0, 90, 180, 270];
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);
  return allowed.includes(numeric) ? numeric : 0;
}

function getLibraryEntry(type) {
  return LIBRARY_BY_TYPE[type] || LIBRARY_BY_TYPE.round_table;
}

function normalizeVenueItemType(type) {
  if (type === "full_round_table") {
    return "round_table";
  }

  return typeof type === "string" && type ? type : "round_table";
}

function normalizeItemShape(type, value) {
  const entry = getLibraryEntry(type);
  const normalized = typeof value === "string" ? value.trim() : "";

  if (Array.isArray(entry.supportedShapes) && entry.supportedShapes.includes(normalized)) {
    return normalized;
  }

  if (entry.defaultShape) {
    return entry.defaultShape;
  }

  if (type === "round_table" || type === "chair") {
    return "circle";
  }

  return "rectangle";
}

function createSeatId(itemId, index) {
  return `${itemId}-seat-${index + 1}`;
}

function normalizeSeatCount(type, value) {
  const entry = getLibraryEntry(type);

  if (!entry.seatable) {
    return 0;
  }

  if (type === "chair") {
    return 1;
  }

  return clamp(Math.round(parseNumber(value, entry.defaultSeatCount)), 1, 24);
}

function normalizeSeats(itemId, type, inputSeats, seatCount) {
  if (seatCount === 0) {
    return [];
  }

  const safeSeats = Array.isArray(inputSeats) ? inputSeats : [];
  const normalizedSeats = [];

  for (let index = 0; index < seatCount; index += 1) {
    const sourceSeat = safeSeats[index] && typeof safeSeats[index] === "object" ? safeSeats[index] : {};
    normalizedSeats.push({
      id: typeof sourceSeat.id === "string" && sourceSeat.id ? sourceSeat.id : createSeatId(itemId, index),
      label:
        typeof sourceSeat.label === "string" && sourceSeat.label.trim()
          ? sourceSeat.label.trim()
          : type === "chair"
            ? "Stol"
            : `Plass ${index + 1}`,
      guestId: typeof sourceSeat.guestId === "string" ? sourceSeat.guestId : "",
      offsetX: clamp(parseNumber(sourceSeat.offsetX, 0), -40, 40),
      offsetY: clamp(parseNumber(sourceSeat.offsetY, 0), -40, 40)
    });
  }

  return normalizedSeats;
}

function buildDefaultItemLabel(type, index) {
  const entry = getLibraryEntry(type);
  return `${entry.label} ${index + 1}`;
}

export function createVenueItem(type, index = 0, room = DEFAULT_ROOM) {
  const normalizedType = normalizeVenueItemType(type);
  const entry = getLibraryEntry(normalizedType);
  const width = entry.defaultWidth;
  const height = entry.defaultHeight;
  const seatCount = normalizeSeatCount(normalizedType, entry.defaultSeatCount);
  const itemId = `venue-item-${Date.now()}-${Math.round(Math.random() * 100000)}`;
  const widthPercent = metersToPercent(width, room.widthMeters || DEFAULT_ROOM.widthMeters);
  const heightPercent = metersToPercent(height, room.heightMeters || DEFAULT_ROOM.heightMeters);

  return {
    id: itemId,
    type: entry.type,
    label: buildDefaultItemLabel(normalizedType, index),
    note: "",
    x: clamp(12 + index * 4, 0, Math.max(0, 100 - widthPercent)),
    y: clamp(12 + index * 4, 0, Math.max(0, 100 - heightPercent)),
    width,
    height,
    widthMeters: width,
    heightMeters: height,
    rotation: 0,
    shape: normalizeItemShape(entry.type, entry.defaultShape),
    seatCount,
    seats: normalizeSeats(itemId, normalizedType, [], seatCount),
    created_at: new Date().toISOString()
  };
}

function normalizeVenueItem(item, index = 0, room = DEFAULT_ROOM) {
  const safeItem = item && typeof item === "object" ? item : {};
  const normalizedType = normalizeVenueItemType(safeItem.type);
  const entry = getLibraryEntry(normalizedType);
  const rawLabel = typeof safeItem.label === "string" ? safeItem.label.trim() : "";
  const shouldDropLegacyOvalLabel =
    safeItem.type === "full_round_table" && /^Ovalt bord(?:\s+\d+)?$/i.test(rawLabel);
  const itemId = typeof safeItem.id === "string" && safeItem.id ? safeItem.id : `venue-item-${index + 1}`;
  const legacyWidthMeters = legacyPercentToMeters(safeItem.width, room.widthMeters, entry.defaultWidth);
  const legacyHeightMeters = legacyPercentToMeters(safeItem.height, room.heightMeters, entry.defaultHeight);
  const rawWidth = clamp(
    parseNumber(safeItem.widthMeters, legacyWidthMeters),
    0.4,
    Math.max(0.4, room.widthMeters)
  );
  const rawHeight = clamp(
    parseNumber(safeItem.heightMeters, legacyHeightMeters),
    0.4,
    Math.max(0.4, room.heightMeters)
  );
  const shape = normalizeItemShape(entry.type, safeItem.shape);
  const width = shape === "circle" ? Math.min(rawWidth, rawHeight) : rawWidth;
  const height = shape === "circle" ? Math.min(rawWidth, rawHeight) : rawHeight;
  const seatCount = normalizeSeatCount(entry.type, safeItem.seatCount);
  const widthPercent = metersToPercent(width, room.widthMeters);
  const heightPercent = metersToPercent(height, room.heightMeters);
  const maxX = Math.max(0, 100 - widthPercent);
  const maxY = Math.max(0, 100 - heightPercent);

  return {
    id: itemId,
    type: entry.type,
    label:
      rawLabel && !shouldDropLegacyOvalLabel
        ? rawLabel
        : buildDefaultItemLabel(entry.type, index),
    note: typeof safeItem.note === "string" ? safeItem.note.trim() : "",
    x: clamp(parseNumber(safeItem.x, 10), 0, maxX),
    y: clamp(parseNumber(safeItem.y, 10), 0, maxY),
    width,
    height,
    widthMeters: width,
    heightMeters: height,
    widthPercent,
    heightPercent,
    rotation: normalizeRotation(safeItem.rotation),
    shape,
    seatCount,
    seats: normalizeSeats(itemId, entry.type, safeItem.seats, seatCount),
    created_at: safeItem.created_at || new Date(0).toISOString()
  };
}

export function normalizeVenuePlan(plan) {
  const safePlan = plan && typeof plan === "object" ? plan : {};
  const room = safePlan.room && typeof safePlan.room === "object" ? safePlan.room : {};
  const normalizedRoom = {
    name: typeof room.name === "string" && room.name.trim() ? room.name.trim() : DEFAULT_ROOM.name,
    widthMeters: clamp(parseNumber(room.widthMeters, DEFAULT_ROOM.widthMeters), 4, 120),
    heightMeters: clamp(parseNumber(room.heightMeters, DEFAULT_ROOM.heightMeters), 4, 120),
    notes: typeof room.notes === "string" ? room.notes.trim() : DEFAULT_ROOM.notes
  };
  const items = Array.isArray(safePlan.items)
    ? safePlan.items.map((item, index) => normalizeVenueItem(item, index, normalizedRoom))
    : [];

  return {
    room: normalizedRoom,
    items
  };
}

export function updateVenueItemInPlan(venuePlan, itemId, changes) {
  const normalizedPlan = normalizeVenuePlan(venuePlan);
  const safeChanges = changes && typeof changes === "object" ? changes : {};

  return {
    ...normalizedPlan,
    items: normalizedPlan.items.map((item) =>
      item.id === itemId
        ? normalizeVenueItem(
            {
              ...item,
              ...safeChanges
            },
            normalizedPlan.items.findIndex((candidate) => candidate.id === itemId)
          )
        : item
    )
  };
}

export function removeVenueItemFromPlan(venuePlan, itemId) {
  const normalizedPlan = normalizeVenuePlan(venuePlan);

  return {
    ...normalizedPlan,
    items: normalizedPlan.items.filter((item) => item.id !== itemId)
  };
}

export function findVenueSeatAssignment(venuePlan, guestId) {
  const normalizedPlan = normalizeVenuePlan(venuePlan);
  const safeGuestId = typeof guestId === "string" ? guestId : "";

  if (!safeGuestId) {
    return null;
  }

  for (const item of normalizedPlan.items) {
    for (const seat of item.seats) {
      if (seat.guestId === safeGuestId) {
        return {
          itemId: item.id,
          itemLabel: item.label,
          seatId: seat.id,
          seatLabel: seat.label
        };
      }
    }
  }

  return null;
}

function createEmptySeatPosition(index) {
  return {
    id: `empty-seat-${index}`,
    left: 50,
    top: 50
  };
}

function buildRoundSeatPositions(item) {
  if (item.seatCount <= 0) {
    return [];
  }

  const centerX = 50;
  const centerY = 50;
  const radiusX = 46;
  const radiusY = 46;

  return item.seats.map((seat, index) => {
    const angle = (Math.PI * 2 * index) / item.seatCount - Math.PI / 2;
    return {
      ...seat,
      left: centerX + Math.cos(angle) * radiusX + (seat.offsetX || 0),
      top: centerY + Math.sin(angle) * radiusY + (seat.offsetY || 0)
    };
  });
}

function buildLongTableSeatPositions(item) {
  if (item.seatCount <= 0) {
    return [];
  }

  const topCount = Math.ceil(item.seatCount / 2);
  const bottomCount = item.seatCount - topCount;
  const positions = [];

  for (let index = 0; index < topCount; index += 1) {
    positions.push({
      ...item.seats[index],
      left: ((index + 1) / (topCount + 1)) * 100 + (item.seats[index].offsetX || 0),
      top: -6 + (item.seats[index].offsetY || 0)
    });
  }

  for (let index = 0; index < bottomCount; index += 1) {
    positions.push({
      ...item.seats[topCount + index],
      left: ((index + 1) / (bottomCount + 1)) * 100 + (item.seats[topCount + index].offsetX || 0),
      top: 106 + (item.seats[topCount + index].offsetY || 0)
    });
  }

  return positions;
}

function buildChairSeatPositions(item) {
  if (item.seatCount <= 0) {
    return [];
  }

  return [
    {
      ...item.seats[0],
      left: 50 + (item.seats[0].offsetX || 0),
      top: 50 + (item.seats[0].offsetY || 0)
    }
  ];
}

export function buildVenueSeatPositions(item) {
  if (!item || item.seatCount <= 0) {
    return [];
  }

  if (item.type === "round_table") {
    return buildRoundSeatPositions(item);
  }

  if (item.type === "long_table") {
    return buildLongTableSeatPositions(item);
  }

  if (item.type === "chair") {
    return buildChairSeatPositions(item);
  }

  return item.seats.map((seat, index) => ({
    ...seat,
    ...createEmptySeatPosition(index)
  }));
}

function comparePeopleForSeating(left, right) {
  const priority = {
    accepted: 0,
    maybe: 1,
    pending: 2,
    declined: 3
  };

  const leftRank = priority[left?.rsvpStatus] ?? 4;
  const rightRank = priority[right?.rsvpStatus] ?? 4;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return String(left?.name || "").localeCompare(String(right?.name || ""), "nb");
}

export function buildVenuePlanningState(event) {
  const safeEvent = event && typeof event === "object" ? event : {};
  const venuePlan = normalizeVenuePlan(safeEvent.venuePlan);
  const people = Array.isArray(safeEvent.people) ? [...safeEvent.people].sort(comparePeopleForSeating) : [];
  const personMap = new Map(people.map((person) => [person.id, person]));
  const seatSummaries = [];
  const assignmentCounts = new Map();

  const items = venuePlan.items.map((item) => {
    const library = getLibraryEntry(item.type);
    const seats = buildVenueSeatPositions(item).map((seat) => {
      const guest = seat.guestId ? personMap.get(seat.guestId) || null : null;

      if (seat.guestId) {
        assignmentCounts.set(seat.guestId, (assignmentCounts.get(seat.guestId) || 0) + 1);
      }

      const summary = {
        ...seat,
        itemId: item.id,
        itemLabel: item.label,
        itemType: item.type,
        guest
      };
      seatSummaries.push(summary);

      return summary;
    });

    return {
      ...item,
      library,
      seatable: library.seatable,
      isCustomShape: item.type === "custom_zone",
      seats
    };
  });

  const assignedGuestIds = new Set(
    [...assignmentCounts.entries()].filter(([, count]) => count > 0).map(([guestId]) => guestId)
  );
  const activeGuests = people.filter((person) => person.rsvpStatus !== "declined");
  const unplacedGuests = activeGuests.filter((person) => !assignedGuestIds.has(person.id));
  const duplicateGuests = people.filter((person) => (assignmentCounts.get(person.id) || 0) > 1);
  const allergyGuests = people.filter(
    (person) => Boolean(String(person.allergies || "").trim()) || Boolean(String(person.dietaryNotes || "").trim())
  );
  const dietaryAssignments = seatSummaries
    .filter(
      (seat) =>
        seat.guest &&
        (Boolean(String(seat.guest.allergies || "").trim()) ||
          Boolean(String(seat.guest.dietaryNotes || "").trim()) ||
          Boolean(String(seat.guest.seatingNote || "").trim()))
    )
    .sort((left, right) => {
      const itemCompare = String(left.itemLabel || "").localeCompare(String(right.itemLabel || ""), "nb");

      if (itemCompare !== 0) {
        return itemCompare;
      }

      return String(left.guest?.name || "").localeCompare(String(right.guest?.name || ""), "nb");
    });
  const declinedAssignedGuests = seatSummaries
    .filter((seat) => seat.guest?.rsvpStatus === "declined")
    .map((seat) => seat.guest)
    .filter(Boolean);
  const emergencyExitCount = items.filter((item) => item.type === "emergency_exit").length;
  const totalSeats = seatSummaries.length;
  const assignedSeats = seatSummaries.filter((seat) => seat.guest).length;
  const openSeats = totalSeats - assignedSeats;
  const warnings = [];

  if (activeGuests.length > totalSeats) {
    warnings.push(`Det mangler ${activeGuests.length - totalSeats} seteplasser for aktive gjester.`);
  }

  if (duplicateGuests.length > 0) {
    warnings.push(
      `${duplicateGuests.length} gjester er plassert mer enn en gang. Sjekk sitteplanen for duplikater.`
    );
  }

  if (emergencyExitCount === 0) {
    warnings.push("Lokalet mangler markert nodutgang. Legg inn minst en utgang i planen.");
  }

  if (allergyGuests.length > 0 && unplacedGuests.some((guest) => allergyGuests.find((person) => person.id === guest.id))) {
    warnings.push("Noen gjester med allergier eller kostbehov er fortsatt ikke plassert.");
  }

  if (declinedAssignedGuests.length > 0) {
    warnings.push("Minst en gjest som har svart 'kommer ikke' er fortsatt plassert i lokalet.");
  }

  return {
    venuePlan,
    items,
    people,
    activeGuests,
    unplacedGuests,
    seatSummaries,
    totalSeats,
    assignedSeats,
    openSeats,
    duplicateGuests,
    allergyGuests,
    dietaryAssignments,
    declinedAssignedGuests,
    emergencyExitCount,
    warnings
  };
}

export function assignGuestToVenueSeat(venuePlan, itemId, seatId, guestId) {
  const normalizedPlan = normalizeVenuePlan(venuePlan);
  const safeGuestId = typeof guestId === "string" ? guestId : "";

  return {
    ...normalizedPlan,
    items: normalizedPlan.items.map((item) => ({
      ...item,
      seats: item.seats.map((seat) => {
        if (seat.guestId === safeGuestId) {
          return {
            ...seat,
            guestId: item.id === itemId && seat.id === seatId ? safeGuestId : ""
          };
        }

        if (item.id === itemId && seat.id === seatId) {
          return {
            ...seat,
            guestId: safeGuestId
          };
        }

        return seat;
      })
    }))
  };
}

export function clearGuestFromVenueSeat(venuePlan, itemId, seatId) {
  const normalizedPlan = normalizeVenuePlan(venuePlan);

  return {
    ...normalizedPlan,
    items: normalizedPlan.items.map((item) => ({
      ...item,
      seats: item.seats.map((seat) =>
        item.id === itemId && seat.id === seatId
          ? {
              ...seat,
              guestId: ""
            }
          : seat
      )
    }))
  };
}

export function updateVenueSeatOffsetInPlan(venuePlan, itemId, seatId, offsetX, offsetY) {
  const normalizedPlan = normalizeVenuePlan(venuePlan);

  return {
    ...normalizedPlan,
    items: normalizedPlan.items.map((item) => ({
      ...item,
      seats: item.seats.map((seat) =>
        item.id === itemId && seat.id === seatId
          ? {
              ...seat,
              offsetX: clamp(parseNumber(offsetX, seat.offsetX || 0), -40, 40),
              offsetY: clamp(parseNumber(offsetY, seat.offsetY || 0), -40, 40)
            }
          : seat
      )
    }))
  };
}

export function resetVenueSeatOffsetsInPlan(venuePlan, itemId) {
  const normalizedPlan = normalizeVenuePlan(venuePlan);

  return {
    ...normalizedPlan,
    items: normalizedPlan.items.map((item) => ({
      ...item,
      seats:
        item.id === itemId
          ? item.seats.map((seat) => ({
              ...seat,
              offsetX: 0,
              offsetY: 0
            }))
          : item.seats
    }))
  };
}
