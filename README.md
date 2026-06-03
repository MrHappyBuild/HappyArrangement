# Kvitteringsdeler Local

En helt lokal kvitteringsapp for Mac-en din:

- frontend og API kjører lokalt med `Next.js`
- kvitteringsbilder lagres lokalt i `local-data/`
- AI-analysen kjøres lokalt med `Ollama`
- ingen Supabase, ingen Vercel og ingen ekstern API-kostnad

## Hva appen gjør

- leser butikk eller restaurant, dato og tid
- lager en linje per vare
- summerer antall, pris per vare og linjesum
- grupperer like varer
- lagrer tidligere analyser lokalt

## Oppsett

1. Installer avhengigheter:

```bash
npm install
```

2. Kopier miljøfilen:

```bash
cp .env.example .env.local
```

3. Installer og start Ollama.

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

## Sikkerhet

- Appen binder `dev` og `start` til `127.0.0.1`
- Ollama-URL må være lokal, ellers stopper analysen
- Bare `jpeg`, `png` og `webp` er tillatt
- Bilder saniteres og re-enkodes før lagring
- All data blir liggende lokalt i prosjektmappen

## Filer som lagres

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
