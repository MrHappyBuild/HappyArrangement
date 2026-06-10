"use client";

import { useEffect, useMemo, useState } from "react";

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

export function GuestSeatingPageView({ event, title = "Sitteplan" }) {
  const [search, setSearch] = useState("");
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState("list");
  const searchValue = normalizeSearchValue(search);
  const venueState = useMemo(() => buildVenuePlanningState(event), [event]);
  const seatableItems = useMemo(
    () =>
      venueState.items
        .filter((item) => item.seatable && item.seats.length > 0)
        .map((item) => ({
          ...item,
          assignedSeats: [...item.seats].filter((seat) => seat.guest).sort(sortSeatsByGuestName),
          searchIndex: buildItemSearchText(item)
        }))
        .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), "nb")),
    [venueState.items]
  );
  const searchMatches = useMemo(() => {
    if (!searchValue) {
      return [];
    }

    return venueState.seatSummaries
      .filter((seat) => seat.guest && normalizeSearchValue(seat.guest.name).includes(searchValue))
      .sort((left, right) => String(left.guest?.name || "").localeCompare(String(right.guest?.name || ""), "nb"));
  }, [searchValue, venueState.seatSummaries]);
  const highlightedItemIds = useMemo(
    () => new Set(searchMatches.map((seat) => seat.itemId)),
    [searchMatches]
  );
  const effectiveViewMode = isCompactLayout ? mobileViewMode : "split";
  const roomStyle = {
    aspectRatio: `${venueState.venuePlan.room.widthMeters} / ${venueState.venuePlan.room.heightMeters}`
  };
  const mapSurfaceStyle = isCompactLayout
    ? {
        ...roomStyle,
        minWidth: "560px"
      }
    : roomStyle;

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
            <strong>{venueState.venuePlan.room.name}</strong>
            <span>
              {venueState.assignedSeats} av {venueState.totalSeats} plasser fylt
            </span>
          </div>
          <div className="guest-seating-map-shell">
            <div className="guest-seating-map-scroll">
              <div className="guest-seating-map" style={mapSurfaceStyle}>
                <div className="guest-seating-map-grid" />
                {seatableItems.map((item) => (
                  <div
                    className={`guest-seating-item guest-seating-shape-${item.shape} ${
                      highlightedItemIds.has(item.id) ? "is-highlighted" : ""
                    }`}
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
                    <div className="guest-seating-item-label">
                      <strong>{item.label}</strong>
                      <span>{item.assignedSeats.length} navn</span>
                    </div>
                    <div className="guest-seating-item-seat-dots">
                      {item.assignedSeats.slice(0, 10).map((seat) => (
                        <span className="guest-seating-seat-dot" key={seat.id} title={seat.guest.name}>
                          {formatGuestInitials(seat.guest.name)}
                        </span>
                      ))}
                      {item.assignedSeats.length > 10 ? (
                        <span className="guest-seating-seat-dot is-overflow">+{item.assignedSeats.length - 10}</span>
                      ) : null}
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
                          <span>{seat.guest.name}</span>
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
