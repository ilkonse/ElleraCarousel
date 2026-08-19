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

## Note per la messa in produzione

- Il server Node **non gestisce da solo l'HTTPS**: va messo dietro un
  reverse proxy con TLS (nginx, Caddy, o il proxy fornito dalla piattaforma
  di hosting scelta — Render, Railway, Fly.io, un VPS con nginx, ecc.).
  Una volta che il sito gira dietro HTTPS, imposta `COOKIE_SECURE=true`
  nel file `.env` così i cookie di sessione vengono marcati "secure".
- Tieni il processo Node vivo con un process manager (`pm2`, `systemd`,
  o il meccanismo nativo della piattaforma scelta), così riparte da solo
  in caso di crash o riavvio del server.
- Fai backup periodici di `data/` (contiene le foto, l'elenco admin e le
  impostazioni): non è versionato in git di proposito (vedi `.gitignore`).
- Le sessioni admin sono in memoria: riavviare il server disconnette gli
  admin già loggati (dovranno rifare login). Per un pannello usato da
  poche persone va benissimo così; se in futuro serve alta disponibilità
  con più istanze del server, si può sostituire lo store di sessione con
  uno persistente (es. Redis).

## Struttura del progetto

```
server/            backend Express (rotte, autenticazione, upload)
public/            frontend statico (carosello + pannello admin)
public/img/        SVG della cornice di edera
data/images/       foto caricate dagli admin (non in git)
data/admins.json   account admin, password hashate (non in git)
data/settings.json impostazioni carosello (es. intervallo)
```
