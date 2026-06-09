# Kvitteringsdeler

Appen kan kjore i to moduser:

- `Lokal modus`: data og bilder lagres i `local-data/`
- `Supabase-modus`: arrangementer, kvitteringer og media lagres i Supabase, og appen kan deployes til Vercel

AI-analysen kan fortsatt kjore mot lokal `Ollama`.

## Hva appen gjør

- leser butikk eller restaurant, dato og tid
- lager en linje per vare
- summerer antall, pris per vare og linjesum
- grupperer like varer
- lagrer tidligere analyser og arrangementsdata

## Oppsett

1. Installer avhengigheter:

```bash
npm install
```

2. Kopier miljøfilen:

```bash
cp .env.example .env.local
```

3. Installer og start Ollama hvis du vil bruke lokal AI.

4. Last ned modellen:

```bash
npm run ai:pull
```

5. Start appen lokalt:

```bash
npm run dev
```

I et eget terminalvindu kan du også starte Ollama via prosjektet:

```bash
npm run ai:serve
```

6. Åpne:

```text
http://127.0.0.1:3000
```

## Miljøvariabler

- `OLLAMA_BASE_URL`
  Bør være `http://127.0.0.1:11434` eller `http://localhost:11434`
- `OLLAMA_MODEL`
  Standard er `qwen2.5vl:3b`
- `RECEIPT_MAX_FILE_BYTES`
  Maks filstørrelse
- `LOCAL_DATA_DIR`
  Katalog for lokale analyser og opplastede bilder
- `RECEIPT_PROCESSING_MODE`
  `inline` for helt lokal analyse i app-serveren. `queue` for Vercel + Supabase + lokal Mac mini-worker. Standard blir `queue` hvis Supabase er konfigurert.
- `SUPABASE_URL`
  URL til Supabase-prosjektet ditt. Hvis denne og service role key er satt, bruker appen Supabase i stedet for lokal fil-lagring.
- `SUPABASE_SERVICE_ROLE_KEY`
  Server-side nøkkel for appens API-ruter og server-rendering.
- `SUPABASE_MEDIA_BUCKET`
  Privat bucket for kvitteringer, innsendinger og gjestebilder. Standard er `receipt-images`.
- `SUPABASE_DEFAULT_OWNER_USER_ID`
  Valgfri bruker-id som kan settes som eier ved nye arrangementer i en tidlig bootstrap-fase uten full auth-flyt.

## Supabase og Vercel

For skydeploy trenger du:

1. Opprett et Supabase-prosjekt.
2. Kjør SQL-filen i `supabase/schema.sql`.
3. Legg inn `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` og `RECEIPT_PROCESSING_MODE=queue` i `.env.local` lokalt og i Vercel Environment Variables.
4. Deploy appen til Vercel.
5. La Mac mini-en kjore worker mot samme Supabase-prosjekt:

```bash
npm run ai:serve
npm run worker:watch
```

I dagens versjon brukes Supabase via server-side service role. Det betyr at løsningen er klar for organizer/admin-drift i Vercel, men full innlogging og per-bruker tilgangsstyring bor fortsatt i neste fase. Kvitteringsanalyse i skyoppsettet skjer gjennom kø + lokal worker, ikke direkte inne i Vercel-funksjonen.

## Sikkerhet

- Appen binder `dev` og `start` til `127.0.0.1`
- Ollama-URL må være lokal, ellers stopper analysen
- Bare `jpeg`, `png` og `webp` er tillatt
- Bilder saniteres og re-enkodes før lagring
- I Supabase-modus går media til privat storage-bucket, og data lagres i Postgres

## Filer som lagres lokalt

- analyser: `local-data/receipts.json`
- opplastede bilder: `local-data/uploads/...`

## Test

```bash
npm test
```

## Røyk-test

Når `npm run dev` og `npm run ai:serve` kjører, kan du bekrefte hele flyten med:

```bash
npm run smoke
```

Denne lager en lokal testkvittering, laster den opp til appen og skriver ut resultatet.

## Tips

Hvis du vil slette lokal historikk, kan du stoppe appen og slette `local-data/`.
