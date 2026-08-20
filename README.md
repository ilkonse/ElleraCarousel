# Ellera Carousel

Carosello fotografico a tutto schermo con cornice di edera, più un pannello
di amministrazione nascosto (`/admin`) per caricare/eliminare le foto e
impostare l'intervallo di cambio immagine.

## Come funziona

- **Pagina pubblica (`/`)**: mostra a tutto schermo, una alla volta, le foto
  presenti in `data/images/`, in ordine alfabetico sul nome del file. Ogni
  quante immagini cambiano è configurabile dall'admin.
- **Pagina admin (`/admin`)**: non è collegata da nessun link nel sito
  pubblico, ma non è "sicura" solo perché nascosta — richiede comunque
  login con email e password. Da lì un admin può caricare nuove foto,
  eliminarle e cambiare l'intervallo del carosello.
- Le foto vengono salvate su disco in `data/images/` con il nome file scelto
  in fase di upload (ripulito da caratteri pericolosi). **Il nome del file
  determina l'ordine di visualizzazione**: per controllare l'ordine, rinomina
  i file prima di caricarli, ad es. `01-arrivo.jpg`, `02-pranzo.jpg`, ecc.

## Requisiti

- [Node.js](https://nodejs.org/) versione 18 o superiore (con `npm`).

## Primo avvio (in locale)

```bash
npm install
cp .env.example .env
```

Apri `.env` e imposta `SESSION_SECRET` con una stringa casuale lunga, ad
esempio generandola con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crea il primo account amministratore (ti verranno chiesti email e password
da terminale, la password non viene mai scritta su disco in chiaro):

```bash
npm run create-admin
```

Avvia il server:

```bash
npm start
```

Il sito sarà disponibile su `http://localhost:3000/` e il pannello admin su
`http://localhost:3000/admin`.

## Aggiungere altri admin

Rilancia semplicemente `npm run create-admin` e rispondi ai prompt: gli
account sono pochi per design (pensati per un piccolo gruppo di
amministratori), memorizzati con password hashate (bcrypt) in
`data/admins.json`.

## Note per la messa in produzione (hosting "tradizionale")

Queste note valgono se ospiti il sito su un VPS, Render, Railway, Fly.io o
simili — cioè un processo Node persistente con un disco reale. Per il
deploy su **Vercel** vedi la sezione dedicata più sotto: lì lo storage
funziona in modo diverso (serverless, senza disco persistente).

- Il server Node **non gestisce da solo l'HTTPS**: va messo dietro un
  reverse proxy con TLS (nginx, Caddy, o il proxy fornito dalla piattaforma
  di hosting scelta). Una volta che il sito gira dietro HTTPS, imposta
  `COOKIE_SECURE=true` nel file `.env` così i cookie di sessione vengono
  marcati "secure".
- Tieni il processo Node vivo con un process manager (`pm2`, `systemd`,
  o il meccanismo nativo della piattaforma scelta), così riparte da solo
  in caso di crash o riavvio del server.
- Fai backup periodici di `data/` (contiene le foto, l'elenco admin e le
  impostazioni): non è versionato in git di proposito (vedi `.gitignore`).
- Le sessioni admin sono in memoria: riavviare il server disconnette gli
  admin già loggati (dovranno rifare login). Per un pannello usato da
  poche persone va benissimo così.

## Deploy su Vercel (produzione ad ogni push)

Su Vercel il codice gira come funzione **serverless**: niente disco
persistente né memoria condivisa tra richieste. Per questo l'app rileva
automaticamente, dalle variabili d'ambiente, se deve usare disco/file JSON
locali (default, per lo sviluppo) oppure due servizi esterni collegati al
progetto Vercel:

- **Vercel Blob** per le foto (al posto di `data/images/`);
- un **database Redis/KV** (integrazione "Redis" dal Vercel Marketplace,
  storicamente chiamata "Vercel KV") per admin, impostazioni e sessioni
  (al posto di `data/admins.json`, `data/settings.json` e delle sessioni
  in memoria).

Nessuna di queste due variabili va impostata a mano: Vercel le inietta da
sola quando colleghi gli storage al progetto (vedi passo 3).

### 1. Importa il repository

Su [vercel.com](https://vercel.com) → **Add New → Project** → importa il
repository GitHub `ilkonse/ElleraCarousel`. Vercel rileva `vercel.json` e
`api/index.js` automaticamente, non serve configurare build command
(non c'è alcun passo di build).

### 2. Variabili d'ambiente

In **Project → Settings → Environment Variables**, per l'ambiente
Production (e volendo anche Preview), imposta:

- `SESSION_SECRET`: stringa casuale lunga (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
- `COOKIE_SECURE`: `true`.
- `SITE_NAME`: facoltativa, es. `Ellera Polcanto`.

### 3. Collega Blob e Redis/KV

In **Project → Storage**:

- **Create Database → Blob**: crealo e collegalo al progetto. Vercel
  aggiunge da sola `BLOB_READ_WRITE_TOKEN` alle variabili d'ambiente.
- **Create Database → Redis** (Marketplace, provider Upstash): crealo e
  collegalo. Vercel aggiunge `KV_REST_API_URL` e `KV_REST_API_TOKEN` (o i
  nomi equivalenti `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`,
  supportati entrambi).

Fai un redeploy dopo aver collegato gli storage, così la funzione parte
con le nuove variabili d'ambiente disponibili.

### 4. Deploy automatico ad ogni push

Una volta importato il progetto, Vercel è già configurato per fare deploy
automatico ad ogni push: push su `main` → **Production deployment**, push
su altri branch o pull request → **Preview deployment** con URL a parte.
Non serve altro (nessuna GitHub Action da aggiungere).

### 5. Crea il primo admin in produzione

Non c'è (volutamente) un endpoint per creare admin dal browser. Per creare
il primo admin nel database Redis di produzione, lancialo in locale
puntando alle credenziali di produzione:

```bash
npx vercel login
npx vercel link            # collega questa cartella al progetto Vercel
npx vercel env pull .env.production.local
```

Poi copia temporaneamente `KV_REST_API_URL` e `KV_REST_API_TOKEN` (o i
`UPSTASH_REDIS_REST_*`) da `.env.production.local` dentro il tuo `.env`
locale, esegui:

```bash
npm run create-admin
```

e infine rimuovi quei due valori dal tuo `.env` locale (per non lasciare
il tuo ambiente di sviluppo puntato per sbaglio ai dati di produzione).

## Struttura del progetto

```
server/                    backend Express (rotte, autenticazione, upload)
server/app.js              app Express esportata (usata sia in locale che su Vercel)
server/lib/storage/        backend immagini: disco locale vs Vercel Blob
api/index.js               entry point per Vercel (funzione serverless)
vercel.json                instrada tutto il traffico verso api/index.js
public/                    frontend statico (carosello + pannello admin)
public/img/                SVG della cornice di edera
data/images/               foto caricate dagli admin, backend locale (non in git)
data/admins.json           account admin, backend locale (non in git)
data/settings.json         impostazioni carosello, backend locale (non in git)
```
