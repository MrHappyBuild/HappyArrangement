export const dynamic = "force-dynamic";

import Link from "next/link";

import { DashboardClient } from "@/components/dashboard-client";
import { listEvents, listLocalJobs } from "@/lib/local-store";

export default async function HomePage() {
  const jobs = await listLocalJobs();
  const events = await listEvents();

  return (
    <main className="shell grid">
      <section className="hero">
        <p className="eyebrow">Helt Lokal AI</p>
        <h1>Last opp kvitteringer og analyser dem direkte på denne Mac-en.</h1>
        <p className="lede">
          Appen lagrer bildefiler og resultater lokalt i prosjektmappen og bruker kun lokal Ollama
          for AI-behandling. Ingen Supabase, ingen Vercel og ingen innlogging.
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
        <p className="eyebrow">Lokal Flyt</p>
        <div className="security-list">
          <div className="security-item">
            Nettappen binder seg til <code>127.0.0.1</code> i dev og start, så den er ikke ment for
            andre maskiner på nettverket.
          </div>
          <div className="security-item">
            Kvitteringsbildet saniteres og lagres i <code>local-data/</code> før analyse.
          </div>
          <div className="security-item">
            Ollama må peke til <code>localhost</code> eller <code>127.0.0.1</code>; appen nekter
            andre adresser.
          </div>
        </div>
      </section>

      <DashboardClient initialJobs={jobs} initialEvents={events} />
    </main>
  );
}
