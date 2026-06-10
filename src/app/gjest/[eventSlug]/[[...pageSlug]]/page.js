export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { GuestAgendaPageView } from "@/components/guest-agenda-page-view";
import { GuestPageContentView } from "@/components/guest-page-content-view";
import { GuestSeatingPageView } from "@/components/guest-seating-page-view";
import {
  buildGuestSiteBasePath,
  buildGuestSiteNavigationEntries,
  ensureEventShape
} from "@/event-platform-utils";
import { getEventBySlug } from "@/lib/local-store";

function buildGuestSiteBackgroundStyles(backgroundImageUrl) {
  if (!backgroundImageUrl) {
    return {
      frameStyle: undefined,
      shellStyle: undefined
    };
  }

  return {
    frameStyle: {
      backgroundImage: `linear-gradient(180deg, rgba(255, 252, 247, 0.76), rgba(255, 248, 238, 0.9)), url(${backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      borderRadius: "32px"
    },
    shellStyle: {
      backgroundImage: `linear-gradient(180deg, rgba(255, 252, 247, 0.76), rgba(255, 248, 238, 0.9)), url(${backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      padding: "18px",
      borderRadius: "32px"
    }
  };
}

function visibleGuestPages(event) {
  const normalized = ensureEventShape(event);
  return buildGuestSiteNavigationEntries(normalized);
}

export default async function GuestSitePage({ params }) {
  const resolvedParams = await params;
  const pageSegments = Array.isArray(resolvedParams?.pageSlug) ? resolvedParams.pageSlug : [];
  if (pageSegments.length > 1) {
    notFound();
  }
  const event = await getEventBySlug(resolvedParams?.eventSlug || "");

  if (!event) {
    notFound();
  }

  const normalizedEvent = ensureEventShape(event);
  const pages = visibleGuestPages(normalizedEvent);

  if (!pages.length) {
    notFound();
  }

  const requestedPageSlug = typeof pageSegments[0] === "string" ? pageSegments[0] : "";
  const selectedPage = requestedPageSlug
    ? pages.find((page) => page.slug === requestedPageSlug)
    : pages[0];

  if (!selectedPage) {
    notFound();
  }

  const basePath = buildGuestSiteBasePath(normalizedEvent);
  const guestSiteIntro =
    typeof normalizedEvent.guestSite?.introText === "string"
      ? normalizedEvent.guestSite.introText.trim()
      : "";
  const navigationLabel = normalizedEvent.guestSite?.navigationLabel || "Navigasjon";
  const guestSiteBackgroundMode = normalizedEvent.guestSite?.backgroundMode || "shell";
  const guestSiteBackgroundStyles = buildGuestSiteBackgroundStyles(
    normalizedEvent.guestSite?.backgroundImageUrl || ""
  );
  const guestSiteFrameStyle =
    guestSiteBackgroundMode === "page" ? guestSiteBackgroundStyles.frameStyle : undefined;
  const guestSiteShellStyle =
    guestSiteBackgroundMode === "shell" ? guestSiteBackgroundStyles.shellStyle : undefined;

  return (
    <main
      className={`shell grid ${guestSiteBackgroundMode === "page" ? "guest-site-page-background-frame" : ""}`}
      style={guestSiteFrameStyle}
    >
      <section className="hero">
        <h1>{normalizedEvent.overview.title || normalizedEvent.name}</h1>
        {guestSiteIntro ? <p className="lede">{guestSiteIntro}</p> : null}
      </section>

      <section className="guest-site-shell guest-site-public-shell" style={guestSiteShellStyle}>
        <aside className="guest-site-sidebar">
          <div className="stack">
            <p className="eyebrow">{navigationLabel}</p>
            <nav className="guest-site-menu">
              {pages.map((page, index) => {
                const href = page.path || (index === 0 ? basePath : basePath);

                return (
                  <Link
                    className={`guest-site-link ${selectedPage.id === page.id ? "is-active" : ""}`}
                    href={href}
                    key={page.id}
                  >
                    <strong>{page.menuLabel || page.title}</strong>
                    <span>{page.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="stack guest-site-event-facts">
            {normalizedEvent.overview.location ? (
              <div>
                <span>Sted</span>
                <strong>{normalizedEvent.overview.location}</strong>
              </div>
            ) : null}
            {normalizedEvent.overview.startsAt ? (
              <div>
                <span>Starter</span>
                <strong>{normalizedEvent.overview.startsAt}</strong>
              </div>
            ) : null}
            {normalizedEvent.overview.endsAt ? (
              <div>
                <span>Slutter</span>
                <strong>{normalizedEvent.overview.endsAt}</strong>
              </div>
            ) : null}
            {normalizedEvent.overview.dressCode ? (
              <div>
                <span>Dresscode</span>
                <strong>{normalizedEvent.overview.dressCode}</strong>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="guest-site-stage stack">
          <article className="guest-site-preview guest-site-public-preview">
            <h2>{selectedPage.title}</h2>
            {selectedPage.kind === "venue_seating" ? (
              <GuestSeatingPageView event={normalizedEvent} title={selectedPage.title} />
            ) : selectedPage.kind === "guest_agenda" ? (
              <GuestAgendaPageView event={normalizedEvent} title={selectedPage.title} />
            ) : (
              <div
                className={`guest-site-copy guest-page-font-${selectedPage.fontPreset || "clean"} guest-page-size-${
                  selectedPage.textSize || "md"
                } guest-page-weight-${selectedPage.textWeight || "regular"}`}
              >
                <GuestPageContentView
                  content={selectedPage.content || ""}
                  showImageCaption={Boolean(selectedPage.showImageCaption)}
                />
              </div>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}
