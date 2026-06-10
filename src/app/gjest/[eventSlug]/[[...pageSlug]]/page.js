export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { GuestPageContentView } from "@/components/guest-page-content-view";
import {
  buildGuestSiteBasePath,
  buildGuestSitePagePath,
  ensureEventShape
} from "@/event-platform-utils";
import { getEventBySlug } from "@/lib/local-store";

function visibleGuestPages(event) {
  const normalized = ensureEventShape(event);
  return Array.isArray(normalized.guestPages) ? normalized.guestPages : [];
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

  return (
    <main className="shell grid">
      <section className="hero">
        <p className="eyebrow">Gjestenettside</p>
        <h1>{normalizedEvent.overview.title || normalizedEvent.name}</h1>
        <p className="lede">
          {normalizedEvent.overview.description ||
            "Her finner gjestene praktisk informasjon og undersider for arrangementet."}
        </p>
      </section>

      <section className="guest-site-shell guest-site-public-shell">
        <aside className="guest-site-sidebar">
          <div className="stack">
            <p className="eyebrow">Navigasjon</p>
            <nav className="guest-site-menu">
              {pages.map((page, index) => {
                const href = index === 0 ? basePath : buildGuestSitePagePath(normalizedEvent, page);

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
            <p className="eyebrow">For gjestene</p>
            <h2>{selectedPage.title}</h2>
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
          </article>
        </div>
      </section>
    </main>
  );
}
