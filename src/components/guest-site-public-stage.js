"use client";

import { useEffect, useMemo, useState } from "react";

import { collectGuestPageImageUrls } from "@/guest-page-content";

import { GuestAgendaPageView } from "./guest-agenda-page-view";
import { GuestPageContentView } from "./guest-page-content-view";
import { GuestSeatingPageView } from "./guest-seating-page-view";

const guestImageLoadCache = new Map();

function getCacheEntry(url) {
  return guestImageLoadCache.get(url) || null;
}

function isImageReady(url) {
  if (!url) {
    return true;
  }

  const entry = getCacheEntry(url);
  return entry?.status === "loaded" || entry?.status === "error";
}

function preloadGuestImage(url) {
  if (!url) {
    return Promise.resolve("skipped");
  }

  const existingEntry = getCacheEntry(url);

  if (existingEntry?.status === "loaded" || existingEntry?.status === "error") {
    return Promise.resolve(existingEntry.status);
  }

  if (existingEntry?.promise) {
    return existingEntry.promise;
  }

  const promise = new Promise((resolve) => {
    let resolved = false;

    function finalize(status) {
      if (resolved) {
        return;
      }

      resolved = true;
      guestImageLoadCache.set(url, { status });
      resolve(status);
    }

    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => {
      if (typeof image.decode === "function") {
        image.decode().catch(() => {}).finally(() => finalize("loaded"));
        return;
      }

      finalize("loaded");
    };
    image.onerror = () => finalize("error");
    image.src = url;

    if (image.complete && image.naturalWidth > 0) {
      finalize("loaded");
    }
  });

  guestImageLoadCache.set(url, {
    status: "loading",
    promise
  });

  return promise;
}

function buildUniqueImageUrlList(values) {
  return [...new Set(values.filter(Boolean))];
}

export function GuestSitePublicStage({
  event,
  selectedPage,
  pages,
  backgroundImageUrl = "",
  isLandingPage = false
}) {
  const currentPageImageUrls = useMemo(() => {
    const contentImageUrls =
      selectedPage?.kind === "content" ? collectGuestPageImageUrls(selectedPage.content || "") : [];

    return buildUniqueImageUrlList([backgroundImageUrl, ...contentImageUrls]);
  }, [backgroundImageUrl, selectedPage]);

  const allGuestSiteImageUrls = useMemo(() => {
    const contentImageUrls = pages.flatMap((page) =>
      page.kind === "content" ? collectGuestPageImageUrls(page.content || "") : []
    );

    return buildUniqueImageUrlList([backgroundImageUrl, ...contentImageUrls]);
  }, [backgroundImageUrl, pages]);

  const [isStageReady, setIsStageReady] = useState(
    isLandingPage || currentPageImageUrls.every(isImageReady)
  );

  useEffect(() => {
    if (allGuestSiteImageUrls.length === 0) {
      return undefined;
    }

    void Promise.allSettled(allGuestSiteImageUrls.map(preloadGuestImage));
    return undefined;
  }, [allGuestSiteImageUrls]);

  useEffect(() => {
    let cancelled = false;

    if (isLandingPage || currentPageImageUrls.length === 0 || currentPageImageUrls.every(isImageReady)) {
      setIsStageReady(true);
      return undefined;
    }

    setIsStageReady(false);
    void Promise.allSettled(currentPageImageUrls.map(preloadGuestImage)).then(() => {
      if (!cancelled) {
        setIsStageReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentPageImageUrls, isLandingPage]);

  if (!isStageReady) {
    return (
      <article className="guest-site-preview guest-site-public-preview guest-site-public-preview-loading">
        <div className="guest-site-public-loading-card">
          <strong>Laster inn siden…</strong>
          <p>Bildene klargjøres før innholdet vises.</p>
        </div>
      </article>
    );
  }

  return (
    <article className="guest-site-preview guest-site-public-preview">
      <h2>{selectedPage.title}</h2>
      {selectedPage.kind === "venue_seating" ? (
        <GuestSeatingPageView event={event} title={selectedPage.title} />
      ) : selectedPage.kind === "guest_agenda" ? (
        <GuestAgendaPageView event={event} title={selectedPage.title} />
      ) : (
        <div
          className={`guest-site-copy guest-page-font-${selectedPage.fontPreset || "clean"} guest-page-size-${
            selectedPage.textSize || "md"
          } guest-page-weight-${selectedPage.textWeight || "regular"}`}
        >
          <GuestPageContentView
            content={selectedPage.content || ""}
            imageLoading="eager"
            showImageCaption={Boolean(selectedPage.showImageCaption)}
          />
        </div>
      )}
    </article>
  );
}
