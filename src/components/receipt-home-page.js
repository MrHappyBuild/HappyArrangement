import Link from "next/link";

import { DashboardClient } from "@/components/dashboard-client";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listEvents, listLocalJobs } from "@/lib/local-store";

export async function ReceiptHomePage({ searchParams }) {
  const params = searchParams ? await searchParams : {};
  const jobs = await listLocalJobs();
  const events = await listEvents();
  const cloudMode = isSupabaseConfigured();
  const selectedEventId =
    typeof params?.eventId === "string" && events.some((event) => event.id === params.eventId)
      ? params.eventId
      : null;

  return (
    <main className="shell grid">
      <section className="hero">
        <p className="eyebrow">{cloudMode ? "Supabase + Vercel" : "Helt Lokal AI"}</p>
        <h1>
          {cloudMode
            ? "Last opp kvitteringer og jobb videre i en nettskyklar arrangementsplattform."
            : "Last opp kvitteringer og analyser dem direkte på denne Mac-en."}
        </h1>
        <p className="lede">
          {cloudMode
            ? "Appen lagrer arrangementer, kvitteringer og mediefiler i Supabase, mens AI-analysen fortsatt kan kjore mot lokal Ollama."
            : "Appen lagrer bildefiler og resultater lokalt i prosjektmappen og bruker kun lokal Ollama for AI-behandling. Ingen Supabase, ingen Vercel og ingen innlogging."}
        </p>
      </section>

      <section className="panel stack">
        <p className="eyebrow">Ny Versjon</p>
        <div className="security-list">
          <div className="security-item">
            Vil du teste neste generasjon arrangementsplattform? Aapne{" "}
            <Link href="/workspace">V2-betaen for gjester, oppgaver, planlegging og utvidet oppgjor</Link>.
          </div>
        </div>
      </section>

      <section className="panel stack">
        <p className="eyebrow">{cloudMode ? "Hybrid Flyt" : "Lokal Flyt"}</p>
        <div className="security-list">
          <div className="security-item">
            {cloudMode ? (
              <>
                Arrangementer og media hentes fra <code>Supabase</code>, mens den lokale
                kvitteringsmotoren fortsatt kan kjore mot <code>Ollama</code> nar du vil bruke
                lokal AI.
              </>
            ) : (
              <>
                Nettappen binder seg til <code>127.0.0.1</code> i dev og start, så den er ikke
                ment for andre maskiner på nettverket.
              </>
            )}
          </div>
          <div className="security-item">Kvitteringsbildet saniteres før lagring og analyse.</div>
          <div className="security-item">
            Ollama må peke til <code>localhost</code> eller <code>127.0.0.1</code>; appen nekter
            andre adresser.
          </div>
        </div>
      </section>

      <DashboardClient
        initialJobs={jobs}
        initialEvents={events}
        initialSelectedEventId={selectedEventId}
      />
    </main>
  );
}
