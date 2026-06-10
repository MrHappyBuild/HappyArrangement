"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  VENUE_CUSTOM_SHAPE_OPTIONS,
  VENUE_ITEM_LIBRARY,
  assignGuestToVenueSeat,
  buildVenuePlanningState,
  clearGuestFromVenueSeat,
  createVenueItem,
  findVenueSeatAssignment,
  normalizeVenuePlan,
  removeVenueItemFromPlan,
  resetVenueSeatOffsetsInPlan,
  updateVenueSeatOffsetInPlan,
  updateVenueItemInPlan
} from "@/venue-layout-utils";

function formatGuestInitials(name) {
  const parts = String(name || "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "?";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function hasDietaryInfo(person) {
  return Boolean(
    String(person?.allergies || "").trim() ||
      String(person?.dietaryNotes || "").trim() ||
      String(person?.seatingNote || "").trim()
  );
}

function buildGuestSearchIndex(person) {
  return [
    person.name,
    person.email,
    person.note,
    person.allergies,
    person.dietaryNotes,
    person.seatingNote
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchGuestFilter(person, filterValue, venueState) {
  if (filterValue === "all") {
    return true;
  }

  if (filterValue === "active") {
    return person.rsvpStatus !== "declined";
  }

  if (filterValue === "placed") {
    return !venueState.unplacedGuests.find((guest) => guest.id === person.id);
  }

  if (filterValue === "unplaced") {
    return Boolean(venueState.unplacedGuests.find((guest) => guest.id === person.id));
  }

  if (filterValue === "dietary") {
    return hasDietaryInfo(person);
  }

  return person.rsvpStatus === filterValue;
}

function renderGuestMeta(person) {
  const rows = [];

  if (person.allergies) {
    rows.push(`Allergi: ${person.allergies}`);
  }

  if (person.dietaryNotes) {
    rows.push(`Mat: ${person.dietaryNotes}`);
  }

  if (person.seatingNote) {
    rows.push(`Plassering: ${person.seatingNote}`);
  }

  return rows;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatMetersValue(value) {
  const numeric = Number(value || 0);
  const hasDecimal = Math.abs(numeric - Math.round(numeric)) > 0.001;

  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: hasDecimal ? 1 : 0,
    maximumFractionDigits: 1
  }).format(numeric);
}

function formatItemDimensions(item) {
  if (!item) {
    return "";
  }

  return `${formatMetersValue(item.widthMeters || item.width)} × ${formatMetersValue(
    item.heightMeters || item.height
  )} m`;
}

function isCircularVenueItem(item) {
  return item?.shape === "circle";
}

function mapResizeDeltaByRotation(rotation, deltaWidthMeters, deltaHeightMeters) {
  if (rotation === 90 || rotation === 270) {
    return {
      widthDelta: deltaHeightMeters,
      heightDelta: deltaWidthMeters
    };
  }

  return {
    widthDelta: deltaWidthMeters,
    heightDelta: deltaHeightMeters
  };
}

function VenueEmptyState({ title, body }) {
  return (
    <div className="notice event-platform-empty">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function VenueTab({ event, viewerAccess, onSaveVenuePlan }) {
  const canManageVenue = viewerAccess.canManagePlanning;
  const [venueMode, setVenueMode] = useState("room");
  const [showFullSeatNames, setShowFullSeatNames] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [guestFilter, setGuestFilter] = useState("active");
  const [guestSearch, setGuestSearch] = useState("");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [seatAdjustMode, setSeatAdjustMode] = useState(false);
  const [planDraft, setPlanDraft] = useState(() => normalizeVenuePlan(event.venuePlan));
  const [draggedGuestId, setDraggedGuestId] = useState("");
  const [itemDrag, setItemDrag] = useState(null);
  const [resizeDrag, setResizeDrag] = useState(null);
  const [seatDrag, setSeatDrag] = useState(null);
  const planDraftRef = useRef(planDraft);
  const canvasRef = useRef(null);
  const isRoomMode = venueMode === "room";
  const isGuestMode = venueMode === "guest";
  const canEditLayout = canManageVenue && isRoomMode;
  const canPlaceGuests = canManageVenue && isGuestMode;
  const canMoveVenueItems = canManageVenue;

  useEffect(() => {
    const nextPlan = normalizeVenuePlan(event.venuePlan);
    setPlanDraft(nextPlan);
    planDraftRef.current = nextPlan;
  }, [event.id, event.venuePlan]);

  useEffect(() => {
    planDraftRef.current = planDraft;
  }, [planDraft]);

  useEffect(() => {
    if (!isFocusMode) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFocusMode]);

  useEffect(() => {
    setZoomPercent((currentValue) => clampNumber(currentValue, 50, isFocusMode ? 240 : 180));
  }, [isFocusMode]);

  const venueState = useMemo(
    () => buildVenuePlanningState({ ...event, venuePlan: planDraft }),
    [event, planDraft]
  );
  const roomWidthMeters = venueState.venuePlan.room.widthMeters;
  const roomHeightMeters = venueState.venuePlan.room.heightMeters;

  const selectedItem =
    venueState.items.find((item) => item.id === selectedItemId) || venueState.items[0] || null;

  useEffect(() => {
    if (!venueState.items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(venueState.items[0]?.id || "");
    }
  }, [selectedItemId, venueState.items]);

  useEffect(() => {
    if (!selectedItem?.seatable) {
      setSeatAdjustMode(false);
    }
  }, [selectedItem?.id, selectedItem?.seatable]);

  useEffect(() => {
    if (!isRoomMode) {
      setSeatAdjustMode(false);
    }
  }, [isRoomMode]);

  const filteredGuests = useMemo(() => {
    const query = guestSearch.trim().toLowerCase();

    return venueState.people.filter((person) => {
      if (!matchGuestFilter(person, guestFilter, venueState)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return buildGuestSearchIndex(person).includes(query);
    });
  }, [guestFilter, guestSearch, venueState]);

  async function commitPlan(nextPlan, successMessage, previousPlan = planDraftRef.current) {
    const normalizedPlan = normalizeVenuePlan(nextPlan);
    setPlanDraft(normalizedPlan);
    planDraftRef.current = normalizedPlan;
    const savedEvent = await onSaveVenuePlan(normalizedPlan, successMessage);

    if (!savedEvent) {
      const rollbackPlan = normalizeVenuePlan(previousPlan);
      setPlanDraft(rollbackPlan);
      planDraftRef.current = rollbackPlan;
      return false;
    }

    return true;
  }

  function applyPreviewPlan(mutator) {
    setPlanDraft((currentPlan) => {
      const nextPlan = normalizeVenuePlan(mutator(currentPlan));
      planDraftRef.current = nextPlan;
      return nextPlan;
    });
  }

  useEffect(() => {
    if (!itemDrag || !canMoveVenueItems) {
      return undefined;
    }

    function handlePointerMove(eventObject) {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      const deltaXPercent = ((eventObject.clientX - itemDrag.startClientX) / rect.width) * 100;
      const deltaYPercent = ((eventObject.clientY - itemDrag.startClientY) / rect.height) * 100;

      applyPreviewPlan((currentPlan) =>
        updateVenueItemInPlan(currentPlan, itemDrag.itemId, {
          x: itemDrag.startX + deltaXPercent,
          y: itemDrag.startY + deltaYPercent
        })
      );
    }

    async function handlePointerUp() {
      const finalPlan = planDraftRef.current;
      setItemDrag(null);
      const savedEvent = await onSaveVenuePlan(finalPlan, "Lokaleelementet ble flyttet.");

      if (!savedEvent) {
        const rollbackPlan = normalizeVenuePlan(itemDrag.initialPlan);
        setPlanDraft(rollbackPlan);
        planDraftRef.current = rollbackPlan;
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [canMoveVenueItems, itemDrag, onSaveVenuePlan]);

  useEffect(() => {
    if (!resizeDrag || !canMoveVenueItems) {
      return undefined;
    }

    function handlePointerMove(eventObject) {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      const deltaWidthMeters = ((eventObject.clientX - resizeDrag.startClientX) / rect.width) * roomWidthMeters;
      const deltaHeightMeters = ((eventObject.clientY - resizeDrag.startClientY) / rect.height) * roomHeightMeters;
      const { widthDelta, heightDelta } = mapResizeDeltaByRotation(
        resizeDrag.rotation,
        deltaWidthMeters,
        deltaHeightMeters
      );

      applyPreviewPlan((currentPlan) =>
        updateVenueItemInPlan(currentPlan, resizeDrag.itemId, {
          widthMeters: resizeDrag.startWidth + widthDelta,
          heightMeters: resizeDrag.startHeight + heightDelta
        })
      );
    }

    async function handlePointerUp() {
      const finalPlan = planDraftRef.current;
      setResizeDrag(null);
      const savedEvent = await onSaveVenuePlan(finalPlan, "Storrelsen pa elementet ble oppdatert.");

      if (!savedEvent) {
        const rollbackPlan = normalizeVenuePlan(resizeDrag.initialPlan);
        setPlanDraft(rollbackPlan);
        planDraftRef.current = rollbackPlan;
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [canMoveVenueItems, onSaveVenuePlan, resizeDrag, roomHeightMeters, roomWidthMeters]);

  useEffect(() => {
    if (!seatDrag || !canEditLayout) {
      return undefined;
    }

    function handlePointerMove(eventObject) {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      const deltaXPercent = ((eventObject.clientX - seatDrag.startClientX) / rect.width) * 100;
      const deltaYPercent = ((eventObject.clientY - seatDrag.startClientY) / rect.height) * 100;

      applyPreviewPlan((currentPlan) =>
        updateVenueSeatOffsetInPlan(
          currentPlan,
          seatDrag.itemId,
          seatDrag.seatId,
          seatDrag.startOffsetX + deltaXPercent,
          seatDrag.startOffsetY + deltaYPercent
        )
      );
    }

    async function handlePointerUp() {
      const finalPlan = planDraftRef.current;
      setSeatDrag(null);
      const savedEvent = await onSaveVenuePlan(finalPlan, "Plasseringen pa stolen ble justert.");

      if (!savedEvent) {
        const rollbackPlan = normalizeVenuePlan(seatDrag.initialPlan);
        setPlanDraft(rollbackPlan);
        planDraftRef.current = rollbackPlan;
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [canEditLayout, onSaveVenuePlan, seatDrag]);

  async function handleAddItem(type) {
    if (!canEditLayout) {
      return;
    }

    const previousPlan = planDraftRef.current;
    const sameTypeCount = previousPlan.items.filter((item) => item.type === type).length;
    const nextItem = createVenueItem(type, sameTypeCount, previousPlan.room);
    const nextPlan = {
      ...previousPlan,
      items: [...previousPlan.items, nextItem]
    };

    setSelectedItemId(nextItem.id);
    await commitPlan(nextPlan, `${nextItem.label} er lagt til i lokalet.`, previousPlan);
  }

  async function handleSaveRoom(formEvent) {
    formEvent.preventDefault();

    if (!canEditLayout) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const previousPlan = planDraftRef.current;
    const nextPlan = {
      ...previousPlan,
      room: {
        ...previousPlan.room,
        name: String(formData.get("name") || "").trim(),
        widthMeters: Number(formData.get("widthMeters") || previousPlan.room.widthMeters),
        heightMeters: Number(formData.get("heightMeters") || previousPlan.room.heightMeters),
        notes: String(formData.get("notes") || "").trim()
      },
      guestSeatingPage: {
        ...(previousPlan.guestSeatingPage && typeof previousPlan.guestSeatingPage === "object"
          ? previousPlan.guestSeatingPage
          : {}),
        isPublished: formData.has("publishGuestSeatingPage"),
        navigationLabel:
          String(
            formData.get("guestSeatingPageNavigationLabel") ||
              previousPlan.guestSeatingPage?.navigationLabel ||
              "Sitteplan"
          ).trim() || "Sitteplan"
      }
    };

    await commitPlan(nextPlan, "Lokaleinformasjonen er oppdatert.", previousPlan);
  }

  async function handleSaveItem(formEvent) {
    formEvent.preventDefault();

    if (!canEditLayout || !selectedItem) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const nextShape = String(formData.get("shape") || selectedItem.shape || "").trim();
    const nextWidthMeters = Number(
      formData.get("widthMeters") || selectedItem.widthMeters || selectedItem.width
    );
    const nextHeightMeters =
      nextShape === "circle"
        ? nextWidthMeters
        : Number(formData.get("heightMeters") || selectedItem.heightMeters || selectedItem.height);
    const previousPlan = planDraftRef.current;
    const nextPlan = updateVenueItemInPlan(previousPlan, selectedItem.id, {
      label: String(formData.get("label") || "").trim(),
      note: String(formData.get("note") || "").trim(),
      rotation: Number(formData.get("rotation") || selectedItem.rotation),
      shape: nextShape,
      widthMeters: nextWidthMeters,
      heightMeters: nextHeightMeters,
      seatCount: selectedItem.seatable
        ? Number(formData.get("seatCount") || selectedItem.seatCount)
        : selectedItem.seatCount
    });

    await commitPlan(nextPlan, `${selectedItem.label} er oppdatert.`, previousPlan);
  }

  async function handleDeleteItem() {
    if (!canEditLayout || !selectedItem) {
      return;
    }

    const shouldDelete = window.confirm(`Vil du slette "${selectedItem.label}" fra lokaleplanen?`);

    if (!shouldDelete) {
      return;
    }

    const previousPlan = planDraftRef.current;
    const nextPlan = removeVenueItemFromPlan(previousPlan, selectedItem.id);
    setSelectedItemId("");
    await commitPlan(nextPlan, `${selectedItem.label} ble fjernet fra lokalet.`, previousPlan);
  }

  async function handleSeatDrop(itemId, seatId, guestId) {
    if (!canPlaceGuests || !guestId) {
      return;
    }

    const previousPlan = planDraftRef.current;
    const nextPlan = assignGuestToVenueSeat(previousPlan, itemId, seatId, guestId);
    const seatGuest = venueState.people.find((person) => person.id === guestId);
    await commitPlan(
      nextPlan,
      `${seatGuest?.name || "Gjesten"} ble plassert i lokalet.`,
      previousPlan
    );
  }

  async function handleClearSeat(itemId, seatId) {
    if (!canPlaceGuests) {
      return;
    }

    const previousPlan = planDraftRef.current;
    const nextPlan = clearGuestFromVenueSeat(previousPlan, itemId, seatId);
    await commitPlan(nextPlan, "Plasseringen ble fjernet.", previousPlan);
  }

  async function handleGuestDropBack(guestId) {
    if (!canPlaceGuests || !guestId) {
      return;
    }

    const assignment = findVenueSeatAssignment(planDraftRef.current, guestId);

    if (!assignment) {
      return;
    }

    await handleClearSeat(assignment.itemId, assignment.seatId);
  }

  async function handleQuickResize(delta) {
    if (!canEditLayout || !selectedItem) {
      return;
    }

    const previousPlan = planDraftRef.current;
    const nextPlan = updateVenueItemInPlan(previousPlan, selectedItem.id, {
      widthMeters: (selectedItem.widthMeters || selectedItem.width) + delta,
      heightMeters: (selectedItem.heightMeters || selectedItem.height) + delta
    });

    await commitPlan(nextPlan, `${selectedItem.label} fikk ny storrelse.`, previousPlan);
  }

  async function handleResetSeatOffsets() {
    if (!canEditLayout || !selectedItem?.seatable) {
      return;
    }

    const previousPlan = planDraftRef.current;
    const nextPlan = resetVenueSeatOffsetsInPlan(previousPlan, selectedItem.id);
    await commitPlan(nextPlan, `Plassene pa ${selectedItem.label} ble satt tilbake til standard.`, previousPlan);
  }

  function handleZoomStep(direction) {
    setZoomPercent((currentValue) =>
      clampNumber(currentValue + direction * 10, 50, isFocusMode ? 240 : 180)
    );
  }

  function getSeatNameDirectionClass(seat) {
    if (!seat || !seat.guest) {
      return "";
    }

    if (seat.top < 26) {
      return "name-direction-top";
    }

    if (seat.top > 74) {
      return "name-direction-bottom";
    }

    return seat.left < 50 ? "name-direction-left" : "name-direction-right";
  }

  const roomStyle = {
    aspectRatio: `${roomWidthMeters} / ${roomHeightMeters}`
  };

  const gridStyle = {
    "--venue-room-width": roomWidthMeters,
    "--venue-room-height": roomHeightMeters
  };
  const canvasScaleStyle = {
    width: `${zoomPercent}%`,
    minWidth: `${Math.max(440, Math.round(720 * (zoomPercent / 100)))}px`
  };
  const zoomMax = isFocusMode ? 240 : 180;

  return (
    <>
      {isFocusMode ? <div className="venue-focus-backdrop" onClick={() => setIsFocusMode(false)} /> : null}
      <div className={`stack ${isFocusMode ? "venue-focus-shell" : ""}`}>
      <section className="panel stack">
          <div className="panel-header-inline">
          <div>
            <h3>Lokale og sitteplan</h3>
            <p className="muted">
              {isRoomMode
                ? "Tegn opp lokalet, plasser bord og stoler, og bygg selve rommet."
                : "Fordel gjestene rett pa stolplassene og hold oversikt over kostbehov og plassering."}
            </p>
          </div>
          <div className="venue-toolbar">
            <div className="venue-mode-switch" role="tablist" aria-label="Arbeidsmodus for lokale">
              <button
                className={`secondary-button compact-action-button ${isRoomMode ? "is-active" : ""}`}
                type="button"
                onClick={() => setVenueMode("room")}
              >
                Rediger rom
              </button>
              <button
                className={`secondary-button compact-action-button ${isGuestMode ? "is-active" : ""}`}
                type="button"
                onClick={() => setVenueMode("guest")}
              >
                Plasser gjester
              </button>
            </div>
            <label className="venue-toggle-chip">
              <input
                checked={showFullSeatNames}
                type="checkbox"
                onChange={(eventObject) => setShowFullSeatNames(eventObject.currentTarget.checked)}
              />
              <span>{showFullSeatNames ? "Viser fulle navn" : "Vis initialer"}</span>
            </label>
            <div className="venue-zoom-controls">
              <button className="secondary-button compact-action-button" type="button" onClick={() => handleZoomStep(-1)}>
                -
              </button>
              <label className="field venue-zoom-field">
                <span>Zoom</span>
                <input
                  max={zoomMax}
                  min="50"
                  onChange={(eventObject) =>
                    setZoomPercent(clampNumber(Number(eventObject.currentTarget.value || 100), 50, zoomMax))
                  }
                  type="range"
                  value={zoomPercent}
                />
              </label>
              <span className="role-pill">{zoomPercent}%</span>
              <button className="secondary-button compact-action-button" type="button" onClick={() => handleZoomStep(1)}>
                +
              </button>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setIsFocusMode((currentValue) => !currentValue)}
            >
              {isFocusMode ? "Lukk fokusmodus" : "Fokusmodus"}
            </button>
          </div>
        </div>
        <div className="overview-grid">
          <article className="info-card">
            <span>Plasserte gjester</span>
            <strong>
              {venueState.assignedSeats}/{venueState.totalSeats || 0}
            </strong>
          </article>
          <article className="info-card">
            <span>Mangler stol</span>
            <strong>{venueState.unplacedGuests.length}</strong>
          </article>
          <article className="info-card">
            <span>Ledige plasser</span>
            <strong>{venueState.openSeats}</strong>
          </article>
          <article className="info-card">
            <span>Gjester med kostbehov</span>
            <strong>{venueState.allergyGuests.length}</strong>
          </article>
        </div>
        {venueState.warnings.length ? (
          <div className="notice warning">
            <strong>Dette bor ryddes opp i</strong>
            <ul className="detail-list">
              {venueState.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="notice success">
            <strong>Lokaleplanen ser ryddig ut.</strong>
            <p>Du har nok stoler, minst en nodutgang og ingen aapenbare sittekonflikter akkurat na.</p>
          </div>
        )}
      </section>

      <section className={`venue-planner-grid ${isFocusMode ? "is-focus-mode" : ""}`}>
        <div className="stack">
          {isRoomMode ? (
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Romoppsett</h3>
                <p className="muted">Styr navn, storrelse og praktiske notater for lokalet.</p>
              </div>
            </div>
            <form
              className="stack"
              key={`${event.id}-${venueState.venuePlan.room.name}-${venueState.venuePlan.room.widthMeters}-${venueState.venuePlan.room.heightMeters}-${venueState.venuePlan.room.notes}-${venueState.venuePlan.guestSeatingPage?.isPublished}-${venueState.venuePlan.guestSeatingPage?.navigationLabel}`}
              onSubmit={handleSaveRoom}
            >
              <div className="compact-grid">
                <label className="field">
                  <span>Navn pa rommet</span>
                  <input
                    defaultValue={venueState.venuePlan.room.name}
                    disabled={!canManageVenue}
                    name="name"
                    placeholder="F.eks. Hovedsal"
                  />
                </label>
                <label className="field">
                  <span>Bredde (meter)</span>
                  <input
                    defaultValue={venueState.venuePlan.room.widthMeters}
                    disabled={!canManageVenue}
                    max="120"
                    min="4"
                    name="widthMeters"
                    step="1"
                    type="number"
                  />
                </label>
                <label className="field">
                  <span>Hoyde (meter)</span>
                  <input
                    defaultValue={venueState.venuePlan.room.heightMeters}
                    disabled={!canManageVenue}
                    max="120"
                    min="4"
                    name="heightMeters"
                    step="1"
                    type="number"
                  />
                </label>
              </div>
              <label className="field">
                <span>Driftsnotat</span>
                <textarea
                  defaultValue={venueState.venuePlan.room.notes}
                  disabled={!canManageVenue}
                  name="notes"
                  placeholder="F.eks. hvor gavebordet skal sta, hvor serveringen skal ut, eller om en vegg maa holdes fri."
                  rows={4}
                />
              </label>
              <div className="notice">
                <strong>På gjestenettsiden</strong>
                <p>
                  Kryss av hvis sitteplanen skal publiseres som en egen side på gjestenettsiden, med søk på navn og oversikt over bordplasseringer.
                </p>
              </div>
              <label className="field checkbox-field">
                <span>Publiser sitteplan på gjestenettsiden</span>
                <input
                  defaultChecked={Boolean(venueState.venuePlan.guestSeatingPage?.isPublished)}
                  disabled={!canManageVenue}
                  name="publishGuestSeatingPage"
                  type="checkbox"
                />
              </label>
              <label className="field">
                <span>Navn på siden</span>
                <input
                  defaultValue={venueState.venuePlan.guestSeatingPage?.navigationLabel || "Sitteplan"}
                  disabled={!canManageVenue}
                  name="guestSeatingPageNavigationLabel"
                  placeholder="F.eks. Sitteplan eller Bordplassering"
                />
              </label>
              {canManageVenue ? (
                <button className="secondary-button" type="submit">
                  Lagre romoppsett
                </button>
              ) : (
                <p className="muted">Denne visningen kan se lokalet, men ikke endre det.</p>
              )}
            </form>
          </section>
          ) : null}

          {isRoomMode ? (
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Mobelbibliotek</h3>
                <p className="muted">Legg inn bord, stoler, scene, buffet, bar og nodutganger.</p>
              </div>
            </div>
            <div className="venue-library-grid">
              {VENUE_ITEM_LIBRARY.map((entry) => (
                <button
                  className="venue-library-card"
                  disabled={!canManageVenue}
                  key={entry.type}
                  type="button"
                  onClick={() => handleAddItem(entry.type)}
                >
                  <strong>{entry.label}</strong>
                  <span>
                    {entry.seatable
                      ? `${entry.defaultSeatCount} plasser som utgangspunkt`
                      : "Praktisk markor for rommet"}
                  </span>
                </button>
              ))}
            </div>
          </section>
          ) : null}

          {isGuestMode ? (
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Gjester som skal plasseres</h3>
                <p className="muted">
                  Dra en gjest rett over pa en stol. Slipp tilbake i sonen nederst for aa ta dem ut igjen.
                </p>
              </div>
            </div>
            <div className="compact-grid">
              <label className="field">
                <span>Filter</span>
                <select value={guestFilter} onChange={(eventObject) => setGuestFilter(eventObject.currentTarget.value)}>
                  <option value="active">Aktive gjester</option>
                  <option value="all">Alle</option>
                  <option value="unplaced">Mangler plass</option>
                  <option value="placed">Allerede plassert</option>
                  <option value="accepted">Kommer</option>
                  <option value="maybe">Kanskje</option>
                  <option value="pending">Ikke svart</option>
                  <option value="declined">Kommer ikke</option>
                  <option value="dietary">Allergi / matbehov</option>
                </select>
              </label>
              <label className="field">
                <span>Sok</span>
                <input
                  placeholder="Navn, allergi eller sitteinfo"
                  value={guestSearch}
                  onChange={(eventObject) => setGuestSearch(eventObject.currentTarget.value)}
                />
              </label>
            </div>
            <div className="venue-guest-list">
              {filteredGuests.length === 0 ? (
                <VenueEmptyState
                  title="Ingen gjester i dette utvalget"
                  body="Juster filteret eller legg til flere gjester under gjestemodulen."
                />
              ) : (
                filteredGuests.map((person) => {
                  const assignment = findVenueSeatAssignment(venueState.venuePlan, person.id);

                  return (
                    <div
                      className={`venue-guest-chip ${assignment ? "is-assigned" : ""}`}
                      draggable={canPlaceGuests}
                      key={person.id}
                      onDragEnd={() => setDraggedGuestId("")}
                      onDragStart={(eventObject) => {
                        if (!canPlaceGuests) {
                          return;
                        }

                        eventObject.dataTransfer.effectAllowed = "move";
                        eventObject.dataTransfer.setData("text/plain", person.id);
                        setDraggedGuestId(person.id);
                      }}
                    >
                      <span className="venue-guest-avatar">{formatGuestInitials(person.name)}</span>
                      <div className="venue-guest-content">
                        <strong>{person.name}</strong>
                        <span className="venue-guest-status">
                          {person.rsvpStatus === "accepted"
                            ? "Kommer"
                            : person.rsvpStatus === "maybe"
                              ? "Kanskje"
                              : person.rsvpStatus === "declined"
                                ? "Kommer ikke"
                                : "Ikke svart"}
                          {assignment ? ` • ${assignment.itemLabel}` : ""}
                        </span>
                        {renderGuestMeta(person).length ? (
                          <div className="venue-guest-tags">
                            {renderGuestMeta(person).map((meta) => (
                              <span className="role-pill" key={`${person.id}-${meta}`}>
                                {meta}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div
              className={`venue-unassign-dropzone ${draggedGuestId ? "is-active" : ""}`}
              onDragOver={(eventObject) => {
                if (!canPlaceGuests || !draggedGuestId) {
                  return;
                }

                eventObject.preventDefault();
                eventObject.dataTransfer.dropEffect = "move";
              }}
              onDrop={async (eventObject) => {
                if (!canPlaceGuests) {
                  return;
                }

                eventObject.preventDefault();
                const guestId = eventObject.dataTransfer.getData("text/plain") || draggedGuestId;
                setDraggedGuestId("");
                await handleGuestDropBack(guestId);
              }}
            >
              Slipp en gjest her for aa ta dem ut av sitteplanen.
            </div>
          </section>
          ) : null}
        </div>

        <section className="panel stack venue-layout-panel">
          <div className="panel-header-inline">
            <div>
              <h3>{venueState.venuePlan.room.name}</h3>
              <p className="muted">
                {isRoomMode
                  ? "Dra pa elementene for aa plassere dem. Klikk et bord for aa justere detaljer og seteoppsett."
                  : "Velg et bord eller en stol i lokalet, dra gjester til plassene, og flytt eller skaler fortsatt bordene direkte i tegningen ved behov."}
              </p>
            </div>
          </div>
          <div className="venue-room-shell">
            <div className="venue-room-scale-surface" style={canvasScaleStyle}>
              <div className="venue-room-stage" ref={canvasRef} style={roomStyle}>
                <div className="venue-room-grid" style={gridStyle}>
                {venueState.items.length === 0 ? (
                  <VenueEmptyState
                    title="Lokalet er tomt"
                    body={
                      isRoomMode
                        ? "Start med aa legge inn et bord, noen stoler eller en nodutgang fra biblioteket til venstre."
                        : "Bytt til Rediger rom for aa legge inn bord, stoler og andre elementer i lokalet."
                    }
                  />
                ) : null}
                {venueState.items.map((item) => (
                  <div
                    className={`venue-item-shell ${selectedItem?.id === item.id ? "is-selected" : ""} venue-item-${item.type} venue-shape-${item.shape}`}
                    key={item.id}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      width: `${item.widthPercent}%`,
                      ...(item.shape === "circle"
                        ? {
                            aspectRatio: "1 / 1"
                          }
                        : {
                            height: `${item.heightPercent}%`
                          })
                    }}
                    onClick={() => setSelectedItemId(item.id)}
                    onPointerDown={(eventObject) => {
                      if (!canMoveVenueItems) {
                        return;
                      }

                      const targetElement = eventObject.target instanceof HTMLElement ? eventObject.target : null;

                      if (targetElement?.closest("[data-seat-drop]")) {
                        return;
                      }

                      setSelectedItemId(item.id);
                      setItemDrag({
                        itemId: item.id,
                        startClientX: eventObject.clientX,
                        startClientY: eventObject.clientY,
                        startX: item.x,
                        startY: item.y,
                        initialPlan: planDraftRef.current
                      });
                    }}
                  >
                    {canMoveVenueItems && selectedItem?.id === item.id ? (
                      <button
                        className="venue-item-resize-handle"
                        type="button"
                        onClick={(eventObject) => eventObject.stopPropagation()}
                        onPointerDown={(eventObject) => {
                          eventObject.stopPropagation();
                          setResizeDrag({
                            itemId: item.id,
                            startClientX: eventObject.clientX,
                            startClientY: eventObject.clientY,
                            startWidth: item.widthMeters || item.width,
                            startHeight: item.heightMeters || item.height,
                            rotation: item.rotation,
                            initialPlan: planDraftRef.current
                          });
                        }}
                      >
                        ↘
                      </button>
                    ) : null}
                    <div
                      className="venue-item-card"
                      style={{
                        transform: `rotate(${item.rotation}deg)`
                      }}
                    >
                      <div className="venue-item-label">
                        <strong>{item.label}</strong>
                        <span>{item.library.shortLabel}</span>
                        {selectedItem?.id === item.id ? (
                          <span className={`venue-item-dimensions ${resizeDrag?.itemId === item.id ? "is-live" : ""}`}>
                            {formatItemDimensions(item)}
                          </span>
                        ) : null}
                      </div>
                      {item.seats.map((seat) => {
                        const showSeatName = Boolean(showFullSeatNames && seat.guest);
                        const seatNameDirectionClass = getSeatNameDirectionClass(seat);

                        return (
                          <button
                            className={`venue-seat-dot ${seat.guest ? "is-filled" : ""} ${
                              hasDietaryInfo(seat.guest) ? "has-dietary" : ""
                            } ${seatAdjustMode && selectedItem?.id === item.id ? "is-adjusting" : ""} ${
                              showSeatName ? `is-name-mode ${seatNameDirectionClass}` : ""
                            }`}
                            data-seat-drop="true"
                            draggable={
                              Boolean(seat.guest) &&
                              canPlaceGuests &&
                              !(seatAdjustMode && selectedItem?.id === item.id)
                            }
                            key={seat.id}
                            style={{
                              left: `${seat.left}%`,
                              top: `${seat.top}%`
                            }}
                            title={
                              seat.guest
                                ? `${seat.guest.name}${
                                    renderGuestMeta(seat.guest).length ? ` • ${renderGuestMeta(seat.guest).join(" • ")}` : ""
                                  }`
                                : seat.label
                            }
                            type="button"
                            onClick={(eventObject) => {
                              eventObject.stopPropagation();
                              setSelectedItemId(item.id);
                            }}
                            onPointerDown={(eventObject) => {
                              if (!canEditLayout || !seatAdjustMode || selectedItem?.id !== item.id) {
                                return;
                              }

                              eventObject.preventDefault();
                              eventObject.stopPropagation();
                              setSeatDrag({
                                itemId: item.id,
                                seatId: seat.id,
                                startClientX: eventObject.clientX,
                                startClientY: eventObject.clientY,
                                startOffsetX: seat.offsetX || 0,
                                startOffsetY: seat.offsetY || 0,
                                initialPlan: planDraftRef.current
                              });
                            }}
                            onDragEnd={() => setDraggedGuestId("")}
                            onDragOver={(eventObject) => {
                              if (!canPlaceGuests || (seatAdjustMode && selectedItem?.id === item.id)) {
                                return;
                              }

                              eventObject.preventDefault();
                              eventObject.stopPropagation();
                              eventObject.dataTransfer.dropEffect = "move";
                            }}
                            onDragStart={(eventObject) => {
                              if (!canPlaceGuests || !seat.guest || (seatAdjustMode && selectedItem?.id === item.id)) {
                                return;
                              }

                              eventObject.dataTransfer.effectAllowed = "move";
                              eventObject.dataTransfer.setData("text/plain", seat.guest.id);
                              setDraggedGuestId(seat.guest.id);
                              eventObject.stopPropagation();
                            }}
                            onDrop={async (eventObject) => {
                              if (!canPlaceGuests || (seatAdjustMode && selectedItem?.id === item.id)) {
                                return;
                              }

                              eventObject.preventDefault();
                              eventObject.stopPropagation();
                              const guestId = eventObject.dataTransfer.getData("text/plain") || draggedGuestId;
                              setDraggedGuestId("");
                              await handleSeatDrop(item.id, seat.id, guestId);
                            }}
                          >
                            <span className="venue-seat-value">
                              {seat.guest ? formatGuestInitials(seat.guest.name) : seat.label.replace("Plass ", "")}
                            </span>
                            {showSeatName ? <span className="venue-seat-name">{seat.guest.name}</span> : null}
                            {hasDietaryInfo(seat.guest) ? <small>!</small> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>
          <div className="venue-room-legend">
            <span>
              {isRoomMode
                ? "Tips: dra pa elementene for aa flytte dem, bruk hjornet nede til hoyre for aa skalere i meter, og juster zoom for aa jobbe tettere eller mer oversiktlig."
                : "Tips: dra personer til stolene i denne visningen. Du kan fortsatt flytte bord og bruke hjornet nede til hoyre for aa skalere dem i meter mens du plasserer gjestene."}
            </span>
          </div>
        </section>

        <div className="stack">
          {isRoomMode ? (
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Valgt element</h3>
                <p className="muted">Juster bordnummer, storrelse, rotasjon og seteplasser for det du har markert.</p>
              </div>
            </div>
            {selectedItem ? (
              <form
                className="stack"
                key={`${selectedItem.id}-${selectedItem.label}-${selectedItem.rotation}-${selectedItem.widthMeters}-${selectedItem.heightMeters}-${selectedItem.seatCount}-${selectedItem.note}`}
                onSubmit={handleSaveItem}
              >
                <div className="notice">
                  <strong>Storrelse i meter</strong>
                  <p>
                    {resizeDrag?.itemId === selectedItem.id ? "Skalerer na til " : "Gjeldende storrelse: "}
                    <code>{formatItemDimensions(selectedItem)}</code>
                  </p>
                </div>
                <div className="compact-grid">
                  <label className="field">
                    <span>Navn</span>
                    <input
                      defaultValue={selectedItem.label}
                      disabled={!canManageVenue}
                      name="label"
                      placeholder="F.eks. Bord 6"
                    />
                  </label>
                  <label className="field">
                    <span>Rotasjon</span>
                    <select defaultValue={selectedItem.rotation} disabled={!canManageVenue} name="rotation">
                      <option value="0">0 grader</option>
                      <option value="90">90 grader</option>
                      <option value="180">180 grader</option>
                      <option value="270">270 grader</option>
                    </select>
                  </label>
                  {selectedItem.isCustomShape ? (
                    <label className="field">
                      <span>Form</span>
                      <select defaultValue={selectedItem.shape} disabled={!canManageVenue} name="shape">
                        {VENUE_CUSTOM_SHAPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="field">
                    <span>{isCircularVenueItem(selectedItem) ? "Diameter (meter)" : "Bredde (meter)"}</span>
                    <input
                      defaultValue={selectedItem.widthMeters || selectedItem.width}
                      disabled={!canManageVenue}
                      max={isCircularVenueItem(selectedItem) ? Math.min(roomWidthMeters, roomHeightMeters) : roomWidthMeters}
                      min="0.4"
                      name="widthMeters"
                      step="0.1"
                      type="number"
                    />
                  </label>
                  {isCircularVenueItem(selectedItem) ? (
                    <div className="field">
                      <span>Lengde</span>
                      <p className="muted">Styres automatisk av diameteren for runde elementer.</p>
                    </div>
                  ) : (
                    <label className="field">
                      <span>Lengde (meter)</span>
                      <input
                        defaultValue={selectedItem.heightMeters || selectedItem.height}
                        disabled={!canManageVenue}
                        max={roomHeightMeters}
                        min="0.4"
                        name="heightMeters"
                        step="0.1"
                        type="number"
                      />
                    </label>
                  )}
                  {selectedItem.seatable ? (
                    <label className="field">
                      <span>Antall plasser</span>
                      <input
                        defaultValue={selectedItem.seatCount}
                        disabled={!canManageVenue || selectedItem.type === "chair"}
                        max="24"
                        min="1"
                        name="seatCount"
                        step="1"
                        type="number"
                      />
                    </label>
                  ) : null}
                </div>
                <label className="field">
                  <span>Notat</span>
                  <textarea
                    defaultValue={selectedItem.note}
                    disabled={!canManageVenue}
                    name="note"
                    placeholder="F.eks. familie, brudefolge, barn eller serveringsinfo"
                    rows={3}
                  />
                </label>
                {selectedItem.seatable ? (
                  <div className="notice">
                    <strong>Plassjustering</strong>
                    <p>
                      Standardplassene legges jevnt automatisk. Slå på justering hvis du vil
                      finflytte enkeltplasser manuelt på bordet.
                    </p>
                  </div>
                ) : null}
                <div className="button-row">
                  {selectedItem.seatable && canManageVenue ? (
                    <button
                      className={`secondary-button compact-action-button ${seatAdjustMode ? "is-active" : ""}`}
                      type="button"
                      onClick={() => setSeatAdjustMode((currentValue) => !currentValue)}
                    >
                      {seatAdjustMode ? "Ferdig med plassjustering" : "Juster plasser"}
                    </button>
                  ) : null}
                  {selectedItem.seatable && canManageVenue ? (
                    <button
                      className="secondary-button compact-action-button"
                      type="button"
                      onClick={handleResetSeatOffsets}
                    >
                      Nullstill plasser
                    </button>
                  ) : null}
                  {canManageVenue ? (
                    <>
                      <button
                        className="secondary-button compact-action-button"
                        type="button"
                        onClick={() => handleQuickResize(-0.2)}
                      >
                        Mindre
                      </button>
                      <button
                        className="secondary-button compact-action-button"
                        type="button"
                        onClick={() => handleQuickResize(0.2)}
                      >
                        Storre
                      </button>
                    </>
                  ) : null}
                  {canManageVenue ? (
                    <button className="secondary-button" type="submit">
                      Lagre element
                    </button>
                  ) : null}
                  {canManageVenue ? (
                    <button className="danger-button compact-action-button" type="button" onClick={handleDeleteItem}>
                      Slett element
                    </button>
                  ) : null}
                </div>
                {selectedItem.seats.length ? (
                  <div className="stack">
                    <strong>Plasser pa {selectedItem.label}</strong>
                    <div className="venue-seat-roster">
                      {selectedItem.seats.map((seat) => (
                        <div className="venue-seat-roster-row" key={seat.id}>
                          <div>
                            <strong>{seat.label}</strong>
                            <span>{seat.guest ? seat.guest.name : "Ledig plass"}</span>
                          </div>
                          <div className="button-row">
                            {seat.guest && hasDietaryInfo(seat.guest) ? (
                              <span className="role-pill">Kostbehov</span>
                            ) : null}
                            {seat.guest && canManageVenue ? (
                              <button
                                className="secondary-button compact-action-button"
                                type="button"
                                onClick={() => handleClearSeat(selectedItem.id, seat.id)}
                              >
                                Fjern
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </form>
            ) : (
              <VenueEmptyState
                title="Ingen element valgt"
                body="Klikk pa et bord eller en stol i lokalevisningen for aa redigere det."
              />
            )}
          </section>
          ) : null}

          {isGuestMode ? (
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Valgt bord eller stol</h3>
                <p className="muted">
                  Velg et bord eller en stol for aa se hvem som sitter der og rydde plasseringer ved behov.
                </p>
              </div>
            </div>
            {selectedItem ? (
              selectedItem.seats.length ? (
                <div className="stack">
                  <div className="notice">
                    <strong>{selectedItem.label}</strong>
                    <p>
                      {selectedItem.seatCount} plasser • dra gjester inn pa setene i midtpanelet for aa bygge sitteplanen.
                    </p>
                  </div>
                  <div className="venue-seat-roster">
                    {selectedItem.seats.map((seat) => (
                      <div className="venue-seat-roster-row" key={seat.id}>
                        <div>
                          <strong>{seat.label}</strong>
                          <span>{seat.guest ? seat.guest.name : "Ledig plass"}</span>
                        </div>
                        <div className="button-row">
                          {seat.guest && hasDietaryInfo(seat.guest) ? (
                            <span className="role-pill">Kostbehov</span>
                          ) : null}
                          {seat.guest && canPlaceGuests ? (
                            <button
                              className="secondary-button compact-action-button"
                              type="button"
                              onClick={() => handleClearSeat(selectedItem.id, seat.id)}
                            >
                              Fjern
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <VenueEmptyState
                  title={`${selectedItem.label} har ingen stolplasser`}
                  body="Velg et bord eller en stol i plantegningen for aa jobbe med plasseringene."
                />
              )
            ) : (
              <VenueEmptyState
                title="Ingen plass valgt"
                body="Klikk pa et bord eller en stol i lokalevisningen for aa se og rydde plasseringene."
              />
            )}
          </section>
          ) : null}

          {isGuestMode ? (
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Servering og hensyn</h3>
                <p className="muted">
                  Denne listen er laget for toastmaster, hovmester eller kjokken, sa matbehov og spesielle plasshensyn ikke blir borte.
                </p>
              </div>
            </div>
            {venueState.dietaryAssignments.length === 0 ? (
              <VenueEmptyState
                title="Ingen registrerte kostbehov i sitteplanen"
                body="Legg allergier eller matpreferanser pa gjestene i gjestemodulen for aa faa en tydelig serviceoversikt her."
              />
            ) : (
              <div className="venue-service-list">
                {venueState.dietaryAssignments.map((seat) => (
                  <article className="venue-service-card" key={`${seat.itemId}-${seat.id}`}>
                    <div>
                      <strong>{seat.guest.name}</strong>
                      <span>
                        {seat.itemLabel} • {seat.label}
                      </span>
                    </div>
                    <div className="venue-service-tags">
                      {seat.guest.allergies ? <span className="role-pill">Allergi: {seat.guest.allergies}</span> : null}
                      {seat.guest.dietaryNotes ? <span className="role-pill">Mat: {seat.guest.dietaryNotes}</span> : null}
                      {seat.guest.seatingNote ? <span className="role-pill">Plassering: {seat.guest.seatingNote}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          ) : null}
        </div>
      </section>
      </div>
    </>
  );
}
