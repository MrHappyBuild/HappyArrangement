export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { GuestSitePublicStage } from "@/components/guest-site-public-stage";
import {
  buildGuestSiteBasePath,
  buildGuestSiteNavigationEntries,
  ensureEventShape
} from "@/event-platform-utils";
import { parseGuestPageContent } from "@/guest-page-content";
import { getEventBySlug } from "@/lib/local-store";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://happy-arrangement.vercel.app";

function buildGuestSiteBackgroundStyles(backgroundImageUrl) {
  if (!backgroundImageUrl) {
    return {
      pageLayerStyle: undefined,
      shellStyle: undefined
    };
  }

  return {
    pageLayerStyle: {
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

function renderGuestSiteFacts(event) {
  return (
    <>
      {event.overview.location ? (
        <div>
          <span>Sted</span>
          <strong>{event.overview.location}</strong>
        </div>
      ) : null}
      {event.overview.startsAt ? (
        <div>
          <span>Starter</span>
          <strong>{event.overview.startsAt}</strong>
        </div>
      ) : null}
      {event.overview.endsAt ? (
        <div>
          <span>Slutter</span>
          <strong>{event.overview.endsAt}</strong>
        </div>
      ) : null}
      {event.overview.dressCode ? (
        <div>
          <span>Dresscode</span>
          <strong>{event.overview.dressCode}</strong>
        </div>
      ) : null}
    </>
  );
}

function extractGuestPageDescription(selectedPage, event, guestSiteIntro) {
  if (selectedPage?.kind === "venue_seating") {
    return `Se sitteplanen for ${event.overview.title || event.name}.`;
  }

  if (selectedPage?.kind === "guest_agenda") {
    return `Se agendaen for ${event.overview.title || event.name}.`;
  }

  const content = typeof selectedPage?.content === "string" ? selectedPage.content : "";

  if (content) {
    const blocks = parseGuestPageContent(content);
    const firstParagraph = blocks.find((block) => block.type === "paragraph");

    if (firstParagraph?.parts?.length) {
      const text = firstParagraph.parts
        .map((part) => {
          if (part.type === "link") {
            return part.label;
          }

          if (part.type === "styled") {
            return (part.parts || [])
              .map((childPart) => (childPart.type === "link" ? childPart.label : childPart.text || ""))
              .join("");
          }

          return part.text || "";
        })
        .join("")
        .replace(/\s+/g, " ")
        .trim();

      if (text) {
        return text;
      }
    }
  }

  if (guestSiteIntro) {
    return guestSiteIntro;
  }

  if (event.overview.description) {
    return event.overview.description;
  }

  return `Informasjon for gjester til ${event.overview.title || event.name}.`;
}

async function loadGuestSiteState(paramsPromise) {
  const resolvedParams = await paramsPromise;
  const pageSegments = Array.isArray(resolvedParams?.pageSlug) ? resolvedParams.pageSlug : [];

  if (pageSegments.length > 1) {
    return null;
  }

  const event = await getEventBySlug(resolvedParams?.eventSlug || "");

  if (!event) {
    return null;
  }

  const normalizedEvent = ensureEventShape(event);
  const pages = visibleGuestPages(normalizedEvent);

  if (!pages.length) {
    return null;
  }

  const requestedPageSlug = typeof pageSegments[0] === "string" ? pageSegments[0] : "";
  const selectedPage = requestedPageSlug
    ? pages.find((page) => page.slug === requestedPageSlug)
    : pages[0];

  if (!selectedPage) {
    return null;
  }

  return {
    normalizedEvent,
    pages,
    selectedPage,
    requestedPageSlug
  };
}

export async function generateMetadata({ params }) {
  const state = await loadGuestSiteState(params);

  if (!state) {
    return {
      title: "Gjestenettside",
      description: "Informasjonsside for gjester."
    };
  }

  const { normalizedEvent, selectedPage } = state;
  const eventTitle = normalizedEvent.overview.title || normalizedEvent.name || "Arrangement";
  const guestSiteIntro =
    typeof normalizedEvent.guestSite?.introText === "string"
      ? normalizedEvent.guestSite.introText.trim()
      : "";
  const pageTitle = selectedPage.title || selectedPage.menuLabel || eventTitle;
  const title = selectedPage === state.pages[0] ? eventTitle : `${pageTitle} | ${eventTitle}`;
  const description = extractGuestPageDescription(selectedPage, normalizedEvent, guestSiteIntro);
  const canonicalPath = selectedPage.path || buildGuestSiteBasePath(normalizedEvent);
  const ogImage = normalizedEvent.guestSite?.backgroundImageUrl || undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: new URL(canonicalPath, APP_URL).toString(),
      siteName: eventTitle,
      images: ogImage
        ? [
            {
              url: ogImage,
              alt: eventTitle
            }
          ]
        : undefined
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined
    }
  };
}

export default async function GuestSitePage({ params }) {
  const state = await loadGuestSiteState(params);

  if (!state) {
    notFound();
  }
  const { normalizedEvent, pages, selectedPage } = state;

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
  const guestSitePageLayerStyle =
    guestSiteBackgroundMode === "page" ? guestSiteBackgroundStyles.pageLayerStyle : undefined;
  const guestSiteShellStyle =
    guestSiteBackgroundMode === "shell" ? guestSiteBackgroundStyles.shellStyle : undefined;
  const selectedMenuLabel = selectedPage.menuLabel || selectedPage.title;
  const isLandingPage = selectedPage.id === pages[0]?.id;

  return (
    <main
      className={`shell grid guest-site-public-main ${
        guestSiteBackgroundMode === "page" ? "guest-site-page-background-frame guest-site-page-background-host" : ""
      }`}
    >
      {guestSitePageLayerStyle ? (
        <div
          aria-hidden="true"
          className="guest-site-page-background-layer"
          style={guestSitePageLayerStyle}
        />
      ) : null}
      <section className="hero guest-site-public-hero">
        <h1>{normalizedEvent.overview.title || normalizedEvent.name}</h1>
        {guestSiteIntro ? <p className="lede">{guestSiteIntro}</p> : null}
      </section>

      <div className="guest-site-mobile-nav-group">
        <details className="guest-site-mobile-nav">
          <summary className="guest-site-mobile-nav-summary">
            <div className="stack compact-stack">
              <p className="eyebrow">{navigationLabel}</p>
              <strong>{selectedMenuLabel}</strong>
            </div>
            <span className="role-pill">{pages.length}</span>
          </summary>
          <div className="guest-site-mobile-nav-panel stack">
            <nav className="guest-site-menu">
              {pages.map((page, index) => {
                const href = page.path || (index === 0 ? basePath : basePath);

                return (
                  <Link
                    className={`guest-site-link ${selectedPage.id === page.id ? "is-active" : ""}`}
                    href={href}
                    key={`mobile-${page.id}`}
                  >
                    <strong>{page.menuLabel || page.title}</strong>
                    <span>{page.title}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="stack guest-site-event-facts guest-site-mobile-facts">
              {renderGuestSiteFacts(normalizedEvent)}
            </div>
          </div>
        </details>
      </div>

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
            {renderGuestSiteFacts(normalizedEvent)}
          </div>
        </aside>

        <div className="guest-site-stage stack">
          <GuestSitePublicStage
            backgroundImageUrl={normalizedEvent.guestSite?.backgroundImageUrl || ""}
            event={normalizedEvent}
            isLandingPage={isLandingPage}
            pages={pages}
            selectedPage={selectedPage}
          />
        </div>
      </section>
    </main>
  );
}
