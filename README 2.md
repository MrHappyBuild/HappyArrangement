# Kvitteringsdeler

En liten webapp for å laste opp bilde av en kvittering og hente ut:

- dato og tid
- butikk eller restaurant
- en linje per vare
- antall, pris per vare og linjesum
- totalsum for hele kvitteringen
- CSV-eksport av varelinjene

## Kom i gang

1. Installer avhengigheter:

   ```bash
   npm install
   ```

2. Kopier `.env.example` til `.env` og legg inn OpenAI-nøkkelen din:

   ```bash
   cp .env.example .env
   ```

3. Start appen:

   ```bash
   npm run dev
   ```

4. Åpne [http://localhost:3000](http://localhost:3000)

Du kan også skrive inn OpenAI-nøkkelen direkte i appen under `Avanserte innstillinger` hvis du ikke vil bruke `.env`.

## Miljøvariabler

- `OPENAI_API_KEY`: påkrevd
- `OPENAI_MODEL`: valgfri, standard er `gpt-5.4-mini`
- `PORT`: valgfri, standard er `3000`

## Test

```bash
npm test
```
