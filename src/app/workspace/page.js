export const dynamic = "force-dynamic";

import { EventPlatformClient } from "@/components/event-platform-client";
import { listEvents, listLocalJobs } from "@/lib/local-store";

export default async function WorkspacePage() {
  const [events, jobs] = await Promise.all([listEvents(), listLocalJobs()]);

  return (
    <main className="shell grid">
      <section className="hero">
        <p className="eyebrow">Arrangement V2</p>
        <h1>Planlegg, fordel ansvar og folg opp okonomi i en egen beta-flate.</h1>
        <p className="lede">
          Denne siden bygger videre pa dagens lokale losning uten aa erstatte den. Her jobber du
          med gjester, oppgaver, planlegging, godkjenning og utvidet oppgjor.
        </p>
      </section>

      <EventPlatformClient initialEvents={events} initialJobs={jobs} />
    </main>
  );
}
