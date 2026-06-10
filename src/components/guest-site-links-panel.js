"use client";

import { useEffect, useState } from "react";

function CopyLinkButton({ url }) {
  const [status, setStatus] = useState("");

  async function handleCopy() {
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Kopiering støttes ikke i denne nettleseren.");
      }

      await navigator.clipboard.writeText(url);
      setStatus("Kopiert");
      window.setTimeout(() => setStatus(""), 1800);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kunne ikke kopiere lenken.");
    }
  }

  return (
    <div className="button-row guest-site-link-actions">
      <a className="secondary-button" href={url} rel="noreferrer" target="_blank">
        Åpne
      </a>
      <button className="secondary-button" type="button" onClick={handleCopy}>
        Kopier lenke
      </button>
      {status ? <span className="muted">{status}</span> : null}
    </div>
  );
}

export function GuestSiteLinksPanel({
  baseUrl,
  pageLinks,
  introText,
  navigationLabel,
  backgroundImageUrl,
  backgroundMode,
  backgroundUploadStatus,
  isUploadingBackground,
  onIntroTextChange,
  onNavigationLabelChange,
  onBackgroundModeChange,
  onBackgroundUpload,
  onRemoveBackgroundImage,
  onSaveIntro,
  onIntroBlur,
  onNavigationLabelBlur,
  onBackgroundModeBlur,
  canManageGuest
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [baseQrCode, setBaseQrCode] = useState("");
  const [qrCodes, setQrCodes] = useState({});
  const [qrStatus, setQrStatus] = useState("");

  useEffect(() => {
    if (!isOpen || pageLinks.length === 0) {
      return undefined;
    }

    let cancelled = false;

    async function buildQrCodes() {
      try {
        const qrCodeModule = await import("qrcode");
        const QRCode = qrCodeModule.default || qrCodeModule;
        const nextBaseQrCode = await QRCode.toDataURL(baseUrl, {
          width: 180,
          margin: 1,
          color: {
            dark: "#245f52",
            light: "#fffdf8"
          }
        });
        const entries = await Promise.all(
          pageLinks.map(async (page) => [
            page.id,
            await QRCode.toDataURL(page.url, {
              width: 180,
              margin: 1,
              color: {
                dark: "#245f52",
                light: "#fffdf8"
              }
            })
          ])
        );

        if (!cancelled) {
          setBaseQrCode(nextBaseQrCode);
          setQrCodes(Object.fromEntries(entries));
          setQrStatus("");
        }
      } catch (error) {
        if (!cancelled) {
          setQrStatus(
            error instanceof Error ? error.message : "Kunne ikke generere QR-koder akkurat nå."
          );
        }
      }
    }

    buildQrCodes();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, isOpen, pageLinks]);

  return (
    <section className="stack">
      <div className="panel-header-inline">
        <div>
          <p className="eyebrow">Del med gjestene</p>
          <p className="muted">
            Åpne dette panelet når du vil hente lenker eller QR-koder til gjestenettsiden.
          </p>
        </div>
        <button
          aria-expanded={isOpen}
          className="secondary-button"
          type="button"
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? "Skjul URL til gjestenettside" : "URL til gjestenettside"}
        </button>
      </div>

      {isOpen ? (
        <div className="guest-site-public-links">
          <div className="guest-site-public-link-card guest-site-public-link-card-main">
            <div className="stack guest-site-public-links-summary">
              <p className="eyebrow">Hovedlenke</p>
              <strong>Startsiden til gjestenettsiden</strong>
              <a className="guest-site-public-link-url" href={baseUrl} rel="noreferrer" target="_blank">
                {baseUrl}
              </a>
              <CopyLinkButton url={baseUrl} />
              <p className="muted">
                Startsiden åpnes på hovedlenken. Undersidene under får egne adresser og QR-koder.
              </p>
            </div>
            <div className="guest-site-public-link-qr">
              {baseQrCode ? (
                <img
                  alt="QR-kode for hovedlenken til gjestenettsiden"
                  height="180"
                  src={baseQrCode}
                  width="180"
                />
              ) : (
                <div className="guest-site-public-link-qr-placeholder">
                  <span>Lager QR-kode…</span>
                </div>
              )}
            </div>
          </div>

          <div className="guest-site-public-link-grid">
            {pageLinks.map((page, index) => (
              <article className="guest-site-public-link-card" key={page.id}>
                <div className="stack">
                  <p className="eyebrow">{index === 0 ? "Startside" : "Underside"}</p>
                  <strong>{page.menuLabel || page.title}</strong>
                  <a
                    className="guest-site-public-link-url"
                    href={page.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {page.url}
                  </a>
                  <CopyLinkButton url={page.url} />
                </div>
                <div className="guest-site-public-link-qr">
                  {qrCodes[page.id] ? (
                    <img
                      alt={`QR-kode for ${page.menuLabel || page.title}`}
                      height="180"
                      src={qrCodes[page.id]}
                      width="180"
                    />
                  ) : (
                    <div className="guest-site-public-link-qr-placeholder">
                      <span>Lager QR-kode…</span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>

          {qrStatus ? <p className="notice">{qrStatus}</p> : null}

          {canManageGuest ? (
            <div className="guest-site-intro-editor stack">
              <label className="field">
                <span>Ingress på gjestenettsiden</span>
                <textarea
                  name="guestSiteIntro"
                  placeholder="Skriv en kort tekst som vises øverst på gjestenettsiden."
                  rows={4}
                  value={introText}
                  onChange={(eventObject) => onIntroTextChange(eventObject.currentTarget.value)}
                  onBlur={onIntroBlur}
                />
              </label>
              <label className="field">
                <span>Overskrift over menyen</span>
                <input
                  name="guestSiteNavigationLabel"
                  placeholder="F.eks. Meny, Innhold eller Praktisk info"
                  value={navigationLabel}
                  onChange={(eventObject) =>
                    onNavigationLabelChange(eventObject.currentTarget.value)
                  }
                  onBlur={onNavigationLabelBlur}
                />
              </label>
              <label className="field">
                <span>Bakgrunnsløsning</span>
                <select
                  value={backgroundMode}
                  onChange={(eventObject) => onBackgroundModeChange(eventObject.currentTarget.value)}
                  onBlur={onBackgroundModeBlur}
                >
                  <option value="shell">Bakgrunn på panelet</option>
                  <option value="page">Bakgrunn bak hele gjestenettsiden</option>
                </select>
              </label>
              <div className="stack guest-site-background-editor">
                <div className="panel-header-inline">
                  <div>
                    <span>Bakgrunnsbilde</span>
                    <p className="muted">
                      Last opp ett bakgrunnsbilde og velg om det skal ligge på innholdspanelet eller bak hele gjestenettsiden.
                    </p>
                  </div>
                </div>
                {backgroundImageUrl ? (
                  <div className="guest-site-background-preview">
                    <img alt="Forhåndsvisning av bakgrunnsbilde" src={backgroundImageUrl} />
                  </div>
                ) : (
                  <div className="notice">
                    <strong>Ingen bakgrunn valgt</strong>
                    <p>Last opp et bilde hvis du vil gi gjestenettsiden et tydelig visuelt uttrykk.</p>
                  </div>
                )}
                <div className="button-row">
                  <label className="secondary-button guest-page-upload-button">
                    {isUploadingBackground ? "Laster opp…" : backgroundImageUrl ? "Bytt bakgrunnsbilde" : "Last opp bakgrunnsbilde"}
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      disabled={isUploadingBackground}
                      hidden
                      type="file"
                      onChange={onBackgroundUpload}
                    />
                  </label>
                  {backgroundImageUrl ? (
                    <button className="secondary-button" type="button" onClick={onRemoveBackgroundImage}>
                      Fjern bakgrunn
                    </button>
                  ) : null}
                </div>
                {backgroundUploadStatus ? <p className="muted">{backgroundUploadStatus}</p> : null}
              </div>
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={onSaveIntro}>
                  Lagre gjestenettside
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
