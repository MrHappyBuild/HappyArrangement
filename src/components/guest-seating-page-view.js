"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { buildVenuePlanningState } from "@/venue-layout-utils";

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

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

function sortSeatsByGuestName(left, right) {
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

function buildItemSearchText(item) {
  const parts = [item.label];

  item.seats.forEach((seat) => {
    if (seat.guest?.name) {
      parts.push(seat.guest.name);
    }
  });

  return parts.join(" ").toLowerCase();
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getGuestMapFitWidth(viewportWidthPixels) {
  const numeric = Number(viewportWidthPixels);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 512;
  }

  return Math.max(220, Math.round(numeric - 8));
}

function getGuestSeatNameDirectionClass(seat) {
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

function getGuestSeatDisplayValue(seat, guestNameDisplay) {
  if (!seat?.guest) {
    return "";
  }

  if (guestNameDisplay === "initials") {
    return formatGuestInitials(seat.guest.name);
  }

  return "";
}

export function GuestSeatingPageView({ event, title = "Sitteplan" }) {
  const [search, setSearch] = useState("");
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState("list");
  const [mapZoomPercent, setMapZoomPercent] = useState(100);
  const [mapViewportWidth, setMapViewportWidth] = useState(0);
  const mapViewportRef = useRef(null);
  const searchValue = normalizeSearchValue(search);
  const venueState = useMemo(() => buildVenuePlanningState(event), [event]);
  const seatingPageSettings = venueState.venuePlan.guestSeatingPage || {};
  const showItemLabels = seatingPageSettings.showItemLabels !== false;
  const guestNameDisplay = seatingPageSettings.guestNameDisplay || "initials";
  const visibleTypes = seatingPageSettings.visibleTypes || {};
  const visibleMapItems = useMemo(
    () =>
      venueState.items.filter((item) =>
        Object.prototype.hasOwnProperty.call(visibleTypes, item.type) ? visibleTypes[item.type] !== false : true
      ).map((item) => ({
        ...item,
        assignedSeats: [...item.seats].filter((seat) => seat.guest).sort(sortSeatsByGuestName),
        searchIndex: buildItemSearchText(item)
      })),
    [venueState.items, visibleTypes]
  );
  const seatableItems = useMemo(
    () =>
      visibleMapItems
        .filter((item) => item.seatable && item.seats.length > 0)
        .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), "nb")),
    [visibleMapItems]
  );
  const searchMatches = useMemo(() => {
    if (!searchValue) {
      return [];
    }

    return venueState.seatSummaries
      .filter(
        (seat) =>
          seat.guest &&
          visibleMapItems.some((item) => item.id === seat.itemId) &&
          normalizeSearchValue(seat.guest.name).includes(searchValue)
      )
      .sort((left, right) => String(left.guest?.name || "").localeCompare(String(right.guest?.name || ""), "nb"));
  }, [searchValue, venueState.seatSummaries, visibleMapItems]);
  const highlightedItemIds = useMemo(
    () => new Set(searchMatches.map((seat) => seat.itemId)),
    [searchMatches]
  );
  const effectiveViewMode = isCompactLayout ? mobileViewMode : "split";
  const roomStyle = {
    aspectRatio: `${venueState.venuePlan.room.widthMeters} / ${venueState.venuePlan.room.heightMeters}`
  };
  const mapFitWidth = getGuestMapFitWidth(mapViewportWidth);
  const mapRenderWidth = Math.max(32, Math.round(mapFitWidth * (mapZoomPercent / 100)));
  const mapSurfaceStyle = {
    ...roomStyle,
    width: `${mapRenderWidth}px`,
    minWidth: `${mapRenderWidth}px`
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 860px)");
    const applyLayout = () => {
      const isCompact = mediaQuery.matches;
      setIsCompactLayout(isCompact);
      setMobileViewMode((currentMode) => {
        if (!isCompact) {
          return "split";
        }

        return currentMode === "split" ? "list" : currentMode;
      });
    };

    applyLayout();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", applyLayout);
      return () => mediaQuery.removeEventListener("change", applyLayout);
    }

    mediaQuery.addListener(applyLayout);
    return () => mediaQuery.removeListener(applyLayout);
  }, []);

  useEffect(() => {
    const viewport = mapViewportRef.current;

    if (!viewport) {
      return undefined;
    }

    const updateViewportWidth = () => {
      setMapViewportWidth(Math.max(0, Math.floor(viewport.clientWidth)));
    };

    updateViewportWidth();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => {
        updateViewportWidth();
      });

      observer.observe(viewport);

      return () => observer.disconnect();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateViewportWidth);
      return () => window.removeEventListener("resize", updateViewportWidth);
    }

    return undefined;
  }, [effectiveViewMode]);

  return (
    <section className="guest-seating-shell stack">
      <div className="guest-seating-toolbar">
        <div>
          <h3>{title}</h3>
          <p className="muted">
            Søk på navnet ditt for å finne riktig bord og plass i rommet.
          </p>
        </div>
        <label className="field guest-seating-search">
          <span>Finn plass</span>
          <input
            placeholder="Søk på navn"
            type="search"
            value={search}
            onChange={(eventObject) => setSearch(eventObject.currentTarget.value)}
          />
        </label>
      </div>

      {isCompactLayout ? (
        <div className="guest-seating-view-switch" role="tablist" aria-label="Visning av sitteplan">
          <button
            aria-selected={effectiveViewMode === "list"}
            className={`secondary-button ${effectiveViewMode === "list" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMobileViewMode("list")}
          >
            Bordliste
          </button>
          <button
            aria-selected={effectiveViewMode === "map"}
            className={`secondary-button ${effectiveViewMode === "map" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMobileViewMode("map")}
          >
            Kart
          </button>
        </div>
      ) : null}

      {searchValue ? (
        <div className="guest-seating-search-results">
          {searchMatches.length ? (
            searchMatches.map((seat) => (
              <article className="guest-seating-search-card" key={`${seat.itemId}-${seat.id}`}>
                <strong>{seat.guest.name}</strong>
                <span>
                  {seat.itemLabel} • {seat.label}
                </span>
              </article>
            ))
          ) : (
            <div className="notice">
              <strong>Fant ingen plassering</strong>
              <p>Prøv et annet navn, eller sjekk med arrangøren hvis plasseringen ikke er lagt inn ennå.</p>
            </div>
          )}
        </div>
      ) : null}

      <div
        className={`guest-seating-layout ${
          effectiveViewMode === "map"
            ? "is-map-only"
            : effectiveViewMode === "list"
              ? "is-list-only"
              : "is-split"
        }`}
      >
        <article
          className={`guest-seating-map-card ${
            effectiveViewMode === "list" ? "is-hidden-on-mobile" : ""
          }`}
        >
          <div className="guest-seating-map-head">
            <div>
              <strong>{venueState.venuePlan.room.name}</strong>
              <span>
                {venueState.assignedSeats} av {venueState.totalSeats} plasser fylt
              </span>
            </div>
            <div className="guest-seating-map-tools">
              <button
                className="secondary-button compact-action-button"
                type="button"
                onClick={() =>
                  setMapZoomPercent((currentValue) =>
                    clampNumber(Math.max(1, Math.round(currentValue * 0.9)), 1, 10000)
                  )
                }
              >
                -
              </button>
              <span className="role-pill">{Math.round(mapZoomPercent)}%</span>
              <button
                className="secondary-button compact-action-button"
                type="button"
                onClick={() =>
                  setMapZoomPercent((currentValue) =>
                    clampNumber(Math.max(1, Math.round(currentValue * 1.1)), 1, 10000)
                  )
                }
              >
                +
              </button>
              <button
                className="secondary-button compact-action-button"
                type="button"
                onClick={() => {
                  setMapZoomPercent(100);
                  const viewport = mapViewportRef.current;

                  if (viewport) {
                    viewport.scrollTo({ left: 0, top: 0 });
                  }
                }}
              >
                Tilpass
              </button>
            </div>
          </div>
          <div className="guest-seating-map-shell">
            <div className="guest-seating-map-scroll" ref={mapViewportRef}>
              <div className="guest-seating-map" style={mapSurfaceStyle}>
                <div className="guest-seating-map-grid" />
                {visibleMapItems.map((item) => (
                  <div
                    className={`venue-item-shell guest-seating-map-item ${
                      highlightedItemIds.has(item.id) ? "is-highlighted" : ""
                    } venue-item-${item.type} venue-shape-${item.shape}`}
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
                  >
                    <div
                      className="venue-item-card"
                      style={{
                        transform: `rotate(${item.rotation}deg)`
                      }}
                    >
                      {showItemLabels ? (
                        <div className="venue-item-label">
                          <strong>{item.label}</strong>
                          <span>
                            {item.seatable ? `${item.assignedSeats?.length || 0} navn` : item.library.shortLabel}
                          </span>
                        </div>
                      ) : null}
                      {item.seatable
                        ? item.assignedSeats.map((seat) => {
                            const showSeatName = guestNameDisplay === "full";
                            const seatNameDirectionClass = getGuestSeatNameDirectionClass(seat);

                            return (
                              <div
                                className={`venue-seat-dot is-filled ${
                                  showSeatName ? `is-name-mode ${seatNameDirectionClass}` : ""
                                }`}
                                key={seat.id}
                                style={{
                                  left: `${seat.left}%`,
                                  top: `${seat.top}%`
                                }}
                                title={seat.guest.name}
                              >
                                <span className="venue-seat-value">
                                  {getGuestSeatDisplayValue(seat, guestNameDisplay)}
                                </span>
                                {showSeatName ? <span className="venue-seat-name">{seat.guest.name}</span> : null}
                              </div>
                            );
                          })
                        : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <div
          className={`guest-seating-table-grid ${
            effectiveViewMode === "map" ? "is-hidden-on-mobile" : ""
          }`}
        >
          {seatableItems.length ? (
            seatableItems
              .filter((item) => !searchValue || item.searchIndex.includes(searchValue))
              .map((item) => (
                <article
                  className={`guest-seating-table-card ${
                    highlightedItemIds.has(item.id) ? "is-highlighted" : ""
                  }`}
                  key={item.id}
                >
                  <div className="guest-seating-table-head">
                    <strong>{item.label}</strong>
                    <span>{item.assignedSeats.length || 0} plassert</span>
                  </div>
                  {item.assignedSeats.length ? (
                    <ul className="guest-seating-guest-list">
                      {item.assignedSeats.map((seat) => (
                        <li key={seat.id}>
                          <span>
                            {guestNameDisplay === "full"
                              ? seat.guest.name
                              : guestNameDisplay === "initials"
                                ? formatGuestInitials(seat.guest.name)
                                : "Opptatt plass"}
                          </span>
                          <strong>{seat.label}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Ingen navn er plassert her ennå.</p>
                  )}
                </article>
              ))
          ) : (
            <div className="notice">
              <strong>Ingen bord eller stoler er lagt inn ennå</strong>
              <p>Arrangøren må først bygge plantegningen og plassere gjestene i lokalet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
