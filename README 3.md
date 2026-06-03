# Kvitteringsdeler Secure

Hybrid kvitteringsløsning for:

- `Vercel` til frontend og API-ruter
- `Supabase` til auth, database og privat lagring
- `Mac mini` til lokal AI-behandling med `Ollama`

Målet er at selve AI-behandlingen skjer lokalt, uten at Mac mini-en eksponeres direkte mot internett.

## Arkitektur

1. Brukeren logger inn med Supabase Auth.
2. Bare e-poster som er godkjent i `authorized_users` får bruke appen.
3. Kvitteringsbildet lastes opp til Next.js-ruten på Vercel.
4. Bildet re-enkodes med `sharp` og lagres i en privat Supabase-bucket.
5. En jobb legges i `receipt_jobs`.
6. Mac mini-workeren henter neste jobb via utgående kall til Vercel.
7. Workeren laster ned et tidsbegrenset signert bilde-URL, kjører lokal AI via Ollama og sender resultatet tilbake.

## Hvorfor dette er tryggere

- Mac mini-en trenger ingen åpne inngående porter.
- Ollama må peke til `localhost` eller `127.0.0.1`, og workeren nekter annen konfigurasjon.
- Kun Vercel kjenner `SUPABASE_SERVICE_ROLE_KEY`.
- Workeren bruker en egen `WORKER_SHARED_SECRET`, ikke Supabase service role.
- Opplastede filer saniteres før lagring.
- Supabase-bucketen er privat.
- Godkjenning styres via allowlist i `authorized_users`.

## Lokalt oppsett

1. Installer pakker:

```bash
npm install
```

2. Kopier app-variablene:

```bash
cp .env.example .env.local
```

3. Kjør SQL-en i [supabase/schema.sql](/Users/mr.reinfjord/Documents/Kvitteringsdeler/supabase/schema.sql) i Supabase SQL Editor.

4. Legg til minst én godkjent bruker:

```sql
insert into public.authorized_users (email, role, approved)
values ('deg@firma.no', 'admin', true)
on conflict (email) do update
set approved = true;
```

5. Start Next.js-appen:

```bash
npm run dev
```

## Worker på Mac mini

1. Installer Ollama på Mac mini.
2. Last ned en lokal vision-modell, for eksempel:

```bash
ollama pull qwen2.5vl:3b
```

3. Kopier worker-miljøfilen:

```bash
cp worker/.env.example worker/.env.local
```

4. Sett:

- `APP_BASE_URL=https://din-app.vercel.app`
- `WORKER_SHARED_SECRET=` samme hemmelighet som i Vercel
- `OLLAMA_BASE_URL=http://127.0.0.1:11434`

5. Start workeren:

```bash
npm run worker
```

## Vercel-variabler

Legg disse i Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `WORKER_SHARED_SECRET`
- `RECEIPT_MAX_FILE_BYTES`
- `APP_BASE_URL`

## Supabase-tabeller

- `authorized_users`: allowlist for godkjente brukere
- `receipt_jobs`: kø og resultater
- `storage bucket receipt-images`: privat kvitteringslagring

## Viktige sikkerhetsnotater

- Ikke legg `SUPABASE_SERVICE_ROLE_KEY` på Mac mini.
- Ikke eksponer Ollama på offentlig IP.
- Ikke gjør storage-bucketen offentlig.
- Roter `WORKER_SHARED_SECRET` hvis du mistenker lekkasje.
- API-nøkler som er delt i chat eller commit-historikk bør roteres.

## Test

```bash
npm test
```

## Neste steg

- Koble på adminskjerm for å godkjenne brukere i UI
- Legge til webhook eller e-post ved ferdig analyse
- Bytte mellom Ollama og OCR-only worker ved behov
