# Partio Tapahtumat

Sovellus partiolippukunnan tapahtumien lisäämiseen ja tarkasteluun. Tapahtumat tallennetaan **AWS DynamoDB:hen** ja synkronoidaan **Google-kalenteriin**.

- **Käyttöliittymä:** suomi
- **Koodi:** englanti
- **Teknologia:** Vite + React (TypeScript) -frontend ja Express (TypeScript) -backend

## Ominaisuudet

- **Lisää tapahtuma** (etusivu) – kentät: Mitä?, Tarkennus, Alkaa, Loppuu, Kenelle?, Ilmoittautuminen, Lisätiedot. Vahvistuspainike.
- **Tarkastele tapahtumia** – lista, jossa voi muokata ja poistaa tapahtumia.
- **Muokkaa tapahtumaa** – olemassa olevan tapahtuman muokkaus.
- **Iframe-sivu** (`/iframe`) – julkinen tekstimuotoinen lista tapahtumista aikajärjestyksessä, tarkoitettu upotettavaksi toiselle sivulle.
- Tapahtumat tallennetaan DynamoDB:hen ja synkronoidaan Google-kalenteriin.

## Rakenne

```
partio-tapahtumat/
├── client/          # Vite + React (TypeScript) -frontend
├── server/          # Express (TypeScript) -backend
├── scripts/
│   └── create-table.sh   # DynamoDB-taulun luontiskripti
├── .env.example
└── vercel.json
```

## Aloitus

### 1. Asenna riippuvuudet

```bash
npm install
```

### 2. Luo DynamoDB-taulu

Vaatii AWS CLI:n ja konfiguroidut tunnukset (`aws configure`).

```bash
./scripts/create-table.sh
```

Taulu `partio-tapahtumat` luodaan alueelle `eu-north-1` (oletus). Taulussa on:

- Avain: `pk` (HASH) = `"EVENT"`, `sk` (RANGE) = tapahtuman id
- GSI `startsAtIndex` alkamisajan mukaista lajittelua varten

### 3. Google-kalenteri (palvelutili)

1. Luo palvelutili [Google Cloud Console](https://console.cloud.google.com/): _IAM & Admin → Service Accounts → Create Service Account_.
2. Ota käyttöön **Google Calendar API** projektissa.
3. Lataa palvelutilin JSON-avain ja tallenna se esim. `server/service-account-key.json`.
4. Jaa kohdekalenteri palvelutilin sähköpostiosoitteelle (oikeudella _"Make changes to events"_).
5. Aseta `GOOGLE_CALENDAR_ID`-ympäristömuuttuja kalenterin id:ksi (esim. `xxx@group.calendar.google.com`).

### 4. Ympäristömuuttujat

Kopioi `.env.example` → `.env` ja täytä arvot:

```bash
cp .env.example .env
```

Tärkeimmät:

- `ADMIN_PASSWORD` – salasana, jolla lisäys/muokkaus/poisto suojataan
- `SESSION_SECRET` – pitkä satunnainen merkkijono
- `AWS_REGION`, `DYNAMODB_TABLE`
- `GOOGLE_SERVICE_ACCOUNT_KEY` – palvelutilin avaintiedoston polku
- `GOOGLE_CALENDAR_ID` – kalenterin id

### 5. Käynnistä

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

Kirjaudu sisään `ADMIN_PASSWORD`-salasanalla, lisää tapahtuma ja tarkista, että se näkyy DynamoDB:ssä ja Google-kalenterissa.

## API

| Metodi | Polku              | Kuvaus                                 | Suojattu |
| ------ | ------------------ | -------------------------------------- | -------- |
| POST   | `/api/auth`        | Kirjaudu salasanalla                   | –        |
| POST   | `/api/auth/logout` | Kirjaudu ulos                          | –        |
| GET    | `/api/auth`        | Tarkista istunto                       | –        |
| GET    | `/api/events`      | Listaa tapahtumat (aikajärjestyksessä) | –        |
| GET    | `/api/events/:id`  | Yksittäinen tapahtuma                  | –        |
| POST   | `/api/events`      | Luo tapahtuma                          | kyllä    |
| PUT    | `/api/events/:id`  | Päivitä tapahtuma                      | kyllä    |
| DELETE | `/api/events/:id`  | Poista tapahtuma                       | kyllä    |

## Turvallisuus

- AWS- ja Google-tunnukset ovat vain backendissä, eivät koskaan selaimessa.
- Lisäys/muokkaus/poisto suojataan jaetulla salasanalla (httpOnly-eväste).
- Iframe-sivu on julkinen, jotta se voidaan upottaa lippukunnan sivulle.

## Vercel-julkaisu

Projekti sisältää `vercel.json`-tiedoston. Backend on Express-sovellus, joka voidaan ajaa Vercelin Node-runtime:ssa. Tarkempi julkaisukonfiguraatio voidaan viimeistellä myöhemmin.
