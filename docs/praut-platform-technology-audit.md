# Praut Platform Technology Audit

Tento dokument bere repozitar jako platformni monorepo, ne jako jednu aplikaci.
Architektura sama popisuje 30+ mikroservice rozdelenych na core backend, storage, fulltext, real-time, media, feature a backup sluzby.

To je dulezite: "hlavni technologie" tady nejsou jen frameworky, ale i provozni infrastruktura a interni build/runtime vrstva.

## Architektonske upozorneni

### Node verze neni sjednocena

Node verze neni v dokumentaci uplne jednoznacna:

- README rika Node.js `v20.11.0`
- Rush povoluje `>=20.0.0 <25.0.0`
- `.nvmrc` nastavuje `v22`

Neni to tragedie, ale pro tym musi existovat jedno autoritativni pravidlo, idealne sladene pres `.nvmrc`, CI a README najednou.

### `dev/docker-compose.yaml` je vyvojovy stack

`dev/docker-compose.yaml` je zjevne vyvojovy stack, ne produkcni blueprint. Obsahuje napriklad:

- `SERVER_SECRET=secret`
- MinIO `minioadmin`
- CockroachDB `start-single-node --insecure`
- lokalni porty
- vyvojove image a konfigurace

To je v poradku lokalne, ale nesmi se to bez tvrdeho hardeningu prenest do produkce.

## TypeScript, JavaScript a Node.js

### Ucel a zpusob pouziti

TypeScript je primarni aplikacni jazyk pro backend sluzby, frontend balicky, interni knihovny i build tooling.
Typicke `package.json` balicky pouzivaji skripty jako `compile`, `compile validate`, `jest`, `ts-jest`, `ts-node` a vystup do `lib`/`types`.

Node.js je runtime pro sluzby jako `front`, `account-service`, build skripty, bundlovani i lokalni vyvoj.
Rush definuje podporovany rozsah Node verzi `>=20.0.0 <25.0.0`.

Konfigurace je masivne rizena pres environment variables: DB URL, service secrets, endpointy sluzeb, fulltext URL, storage URL, queue config, OTEL endpointy a dalsi.
Napriklad server config explicitne vyzaduje `DB_URL`, `FULLTEXT_URL`, `SERVER_SECRET`, `FRONT_URL` a `ACCOUNTS_URL`.

### Best Practices

- Mit jednotnou verzi Node v `.nvmrc`, README, CI a Docker image.
- Vynucovat strict TypeScript, typovane DTO a typovane hranice mezi sluzbami.
- Validovat environment variables pri startu sluzby pres centralni schema, ne ad hoc v kazdem modulu.
- Oddelit aplikacni kod od startovaci logiky: knihovny by nemely primo volat `process.exit`, to patri do entrypointu sluzby.
- U runtime konfigurace rozlisovat verejne client-side hodnoty a server-only secrets.

### Anti-patterns

- Spolehat na `ts-node` v produkci misto predkompilovaneho vystupu.
- Maskovat chyby pomoci `any`, sirokych `catch (err: any)` a fallback chovani bez telemetry.
- Mit vice paralelnich zdroju pravdy pro Node verzi.
- Posilat tajne hodnoty pres environment variables do frontend bundlu bez whitelistu.
- Nechat rozdilne Node verze mezi lokalnim vyvojem, Dockerem a CI.

## Rush a pnpm monorepo

### Ucel a zpusob pouziti

Repozitar pouziva Microsoft Rush jako monorepo orchestrator a pnpm jako package manager.
`rush.json` nastavuje Rush `5.158.1` a pnpm `10.15.1`.

Rush centralne eviduje projekty. Nejde o automaticky glob scan, ale o explicitni inventory v `rush.json`.
V repozitari jsou core balicky, server foundations, pluginy, modely, pods a sluzby.

Build proces je rozdelen do fazi jako `build`, `validate`, `test`, `bundle`, `package`, `svelte-check` a `docker-build`.
Rush command-line konfigurace definuje zavislosti mezi fazemi.

README pouziva workflow:

```bash
rush install
rush build
rush bundle
rush package
rush validate
rush docker:build
rush docker:up
```

### Best Practices

- Pouzivat `rushx` uvnitr package a `rush` na urovni monorepa.
- Drzet `rush.json` jako jediny zdroj pravdy pro seznam projektu.
- V CI spoustet minimalne `rush install`, `rush build`, `rush validate`, `rush test` a pro releasy i `rush bundle/package`.
- Vyuzivat inkrementalni build a build cache, ale mit dokumentovany postup pro jeji invalidaci.
- Zapnout kontrolu konzistence verzi nebo mit jasne zduvodnene vyjimky; v tomto repu je `ensureConsistentVersions` vypnute.

### Anti-patterns

- Instalovat balicky rucne pres `npm install` v subadresarich.
- Obchazet Rush pri zmene dependency grafu.
- Nechat workspace balicky driftovat na nekompatibilnich verzich.
- Mit build skripty zavisle na lokalnim globalnim stavu vyvojare.
- Pridavat projekty mimo Rush inventory.

## Interni build vrstva: `@hcengineering/platform-rig`, esbuild a TypeScript compiler

### Ucel a zpusob pouziti

`platform-rig` poskytuje binarky `compile`, `format`, `do-svelte-check`, `bump-package-version`, `update-deps` a dalsi.
Je to interni nastrojova vrstva nad TypeScriptem, esbuildem, Svelte a lint/format toolingem.

`compile.js` pouziva `esbuild`, `typescript`, `esbuild-svelte`, `svelte2tsx` a `svelte-preprocess`.
Umi rezimy `transpile`, `validate`, `ui-esbuild` a vychozi build.

Transpilace generuje CommonJS vystup do `lib`, sourcemapy a kopiruje JSON assety.
Validace TypeScriptem emituje deklarace a sbira diagnostiku.

Pro Svelte se generuji `.d.ts` soubory, ale aktualni generovani komponent pouziva velmi obecny `SvelteComponentTyped<any, any, any>`, coz je funkcni, ale typove slabe.

### Best Practices

- Drzet build nastroj deterministicky: stejne vstupy, stejne vystupy, zadne zavislosti na lokalnim prostredi.
- Overovat, ze `lib` a `types` odpovidaji `src`.
- Nedelat tichy fallback pri chybe build diagnostiky.
- U Svelte komponent generovat presnejsi typy pro props/events/slots.
- Mit jasne popsane, kdy se pouziva esbuild a kdy TypeScript compiler.

### Anti-patterns

- Nahrazovat typechecking pouze rychlou esbuild transpilaci.
- Generovat typy s `any` a povazovat je za plnohodnotnou kontraktovou dokumentaci.
- Michat CommonJS a ESM bez jednotnych pravidel.
- Rucne editovat generovane vystupy.
- Pridavat dalsi paralelni build pipeline mimo `platform-rig`.

## Svelte 4

### Ucel a zpusob pouziti

Svelte je hlavni UI framework pro frontendove balicky.
`@hcengineering/ui` zavisi na `svelte ^4.2.20`, `svelte-check`, `svelte-loader`, `svelte-preprocess`, `prettier-plugin-svelte` a `eslint-plugin-svelte`.

Frontendove balicky maji Rush fazi `_phase:svelte-check`, takze Svelte komponenty nejsou jen bundlovane, ale i validovane.

V Prettier konfiguraci je explicitni override pro `*.svelte` parser.

### Best Practices

- Drzet komponenty male, typovane a bez skryte business logiky.
- Vsechny props, events a slots typovat.
- Pouzivat store jen tam, kde je realne sdileny stav.
- Cistit subscription/listener side effects pri unmountu.
- Pridat accessibility kontroly do CI.

### Anti-patterns

- Delat ze Svelte komponent aplikacni service layer.
- Pouzivat globalni mutable stores jako nahradu architektury stavu.
- Spolehat na `any` typy u komponentovych kontraktu.
- Provadet tezke vypocty primo v reactive statements.
- Prepisovat DOM mimo Svelte lifecycle bez silneho duvodu.

## Webpack 5

### Ucel a zpusob pouziti

Webpack se pouziva pro bundlovani weboveho klienta i desktop klienta.
Desktop package ma `template: @hcengineering/webpack-package`, hlavni entry `dist/main/electron.js` a skripty pro produkcni i vyvojove webpack buildy.

Stack obsahuje `webpack`, `webpack-cli`, `webpack-dev-server`, `html-webpack-plugin`, `compression-webpack-plugin`, `dotenv-webpack`, `ts-loader`, `esbuild-loader`, `svelte-loader`, `sass-loader`, `css-loader` a dalsi loadery/pluginy.

### Best Practices

- Oddelit client-side build-time promenne od server-only secretu.
- Zapnout bundle analysis pro hlidani velikosti baliku.
- Pouzivat code splitting pro velke pluginove casti.
- Mit rozdilnou konfiguraci pro dev, staging a produkci.
- Udrzovat loader pipeline jednoduchou.

### Anti-patterns

- Propustit `.env` secrety do klientskeho bundlu pres `dotenv-webpack`.
- Vyrabet jeden obri monoliticky bundle pro celou platformu.
- Michat `ts-loader` a `esbuild-loader` bez jasneho pravidla, co provadi typecheck.
- Servirovat produkcni sourcemapy verejne bez kontroly.
- Pridavat pluginy do bundlu bez dopadu na performance budget.

## Sass, PostCSS, Autoprefixer a CSS toolchain

### Ucel a zpusob pouziti

Frontend a desktop build pouziva Sass, PostCSS, Autoprefixer, CSS loader, style loader a Mini CSS Extract Plugin.
Repozitar ma i samostatny `@hcengineering/theme` balicek, coz naznacuje centralni theming vrstvu.

### Best Practices

- Centralizovat design tokens, barvy, spacing a typography.
- Preferovat komponentove lokalni styly pred globalnimi overrides.
- Drzet CSS build konzistentni mezi webem a desktopem.
- Osetrit dark mode, density a accessibility contrast na urovni theme layer.
- Hlidani velikosti vysledneho CSS zahrnout do bundlovaci analyzy.

### Anti-patterns

- Rozlevat globalni CSS napric pluginy.
- Pouzivat `!important` jako bezny mechanismus.
- Duplikovat design tokeny v jednotlivych plugin baliccich.
- Mit runtime CSS hacky misto systemoveho theme API.
- Importovat velke CSS frameworky do pluginu bez izolace.

## Express.js

### Ucel a zpusob pouziti

`server/front` pouziva Express jako webovy server pro staticke assety, konfiguraci klienta, uploady, file serving a range requesty.
Balicek zavisi na `express`, `express-fileupload`, `express-static-gzip`, `cors`, `body-parser`, `sharp`, `morgan`, `uuid` a storage knihovnach.

Kod nastavuje CORS, file upload pres temp files, JSON/urlencoded parsery, request logging pres Morgan a endpoint `/config.json`, ktery klientovi vraci runtime endpointy.

File handler validuje workspace pres account client, cte token z cookie/query/Bearer authorization, dela blob stat a vraci `403` pri mismatchi workspace.
File serving podporuje range requesty, ETag, Last-Modified, CSP header a streamovani ze `StorageAdapter`.

### Best Practices

- Nastavit explicitni CORS allowlist, ne otevrene `app.use(cors())`.
- U uploadu definovat limity velikosti, MIME allowlist a kontrolu obsahu.
- Tokeny preferovat v secure HTTP-only cookies nebo Authorization headeru, ne v query stringu.
- Streamovat velke soubory, ne bufferovat do pameti.
- Mit jednotne error handling middleware a audit log pro `401/403/404`.

### Anti-patterns

- Prijimat tokeny v URL query; ty konci v logach, historii a referreru.
- Nechat CORS otevrene bez omezeni originu.
- Spolehat na MIME typ od klienta.
- Pouzivat puvodni nazev souboru jako storage key bez normalizace a policy.
- Nechat upload temp files bez TTL/cleanup.

## Koa a koa-router

### Ucel a zpusob pouziti

`account-service` pouziva Koa, `koa-router`, `koa-bodyparser`, `@koa/cors` a cookies.
Slouzi jako authentication/account API, RPC endpoint, cookie management a administrativni maintenance proxy.

`serveAccount` vyzaduje `DB_URL`, `TRANSACTOR_URL` a `SERVER_SECRET`; registruje auth providery, nastavuje metadata platformy a vytvari Koa app/router.

Root RPC endpoint mapuje `request.method` na account metody, pracuje s DB, brandingem, tokenem a request metadaty.
Cookie endpoint uklada token bez workspace casti a delete endpoint cookie maze.

### Best Practices

- V middleware retezci mit jasne poradi: request ID, logging, body limits, auth, routes, error handler.
- Cookie nastavovat s `httpOnly`, `secure`, `sameSite`, domenovou politikou a kratkou zivotnosti podle rizika.
- Rozlisovat uzivatelske tokeny a service tokeny.
- Admin endpointy explicitne auditovat a rate-limitovat.
- Nevalidni auth vracet konzistentne jako `401/403`, ne skryvat chyby `404` bez auditu.

### Anti-patterns

- Slepe `slice(7)` u Authorization headeru bez overeni schematu Bearer.
- Siroke CORS s credentials bez allowlistu.
- Admin operace ridit query parametrem bez silne validace payloadu.
- Dlouhodobe cookie bez rotace a revokace tokenu.
- Smesovat account RPC, cookie management a admin maintenance bez jasne security boundary.

## WebSocket, interni RPC a MessagePack

### Ucel a zpusob pouziti

Transactor je podle architektury hlavni real-time transakcni engine.
Drzi WebSocket spojeni, zpracovava mutace, vynucuje business logiku a publikuje eventy do message queue.

Interni RPC balicek definuje `Request`, `Response`, `HelloRequest`, `HelloResponse`, binary/compression negotiation a pouziva `msgpackr` pro binarni serializaci.

`RPCHandler` umi serializovat JSON nebo MessagePack a pri cteni requestu kontroluje, ze `method` je string.
Session manager spravuje workspace sessions, producers/consumers fronty a pravidelne tick handlery.

### Best Practices

- Versionovat RPC protokol a handshake.
- Omezit velikost zprav a rychlost requestu na spojeni.
- Zavest backpressure pro pomale klienty.
- Oddelit transportni chyby od business chyb.
- Mit kompatibilitni testy mezi client a server verzemi.

### Anti-patterns

- Povazovat WebSocket spojeni za implicitne autorizovane navzdy.
- Posilat neomezene velke payloady.
- Menit RPC tvar bez kompatibilni migrace.
- Michat JSON a binarni format bez explicitni negotiated capability.
- Broadcastovat vsem session bez per-workspace/per-user filtrace.

## Y.js a CRDT real-time collaboration

### Ucel a zpusob pouziti

`collaborator` sluzba je popsana jako real-time document collaboration sluzba pouzivajici Y.js CRDT pro simultanni editaci a conflict resolution.

Ve vyvojovem Docker Compose bezi collaborator na portu `3078` a frontend na nej odkazuje pres `COLLABORATOR_URL=ws://huly.local:3078`.

### Best Practices

- Autorizovat pristup na dokument/workspace pred pripojenim k CRDT room.
- Oddelit awareness/presence od trvaleho obsahu.
- Periodicky snapshotovat dokument a kompaktovat update log.
- Mit migracni strategii pro strukturu dokumentu.
- Testovat offline/online merge scenare.

### Anti-patterns

- Pouzivat CRDT jako univerzalni databazi pro veskerou business logiku.
- Ukladat nekonecny update log bez kompaktace.
- Ignorovat permission checks na urovni dokumentu.
- Michat document state a UI transient state.
- Zavadet centralni locky, ktere popiraji vyhody CRDT.

## Docker a Docker Compose

### Ucel a zpusob pouziti

Docker Compose sklada lokalni vyvojovy stack:

- CockroachDB
- Redpanda
- Redpanda Console
- MinIO
- Elasticsearch
- Redis
- account
- front
- transactor
- collaborator
- fulltext
- Rekoni
- datalake
- hulylake
- hulykvs
- hulygun
- hulypulse
- dalsi sluzby

Rush ma prikazy pro Docker build a spusteni stacku: `docker:build`, `docker:up`, minified varianty a PostgreSQL override.
README upozornuje, ze `rush docker:build` spousti potrebne `build/bundle/package` faze a nabizi minified variantu pro slabsi stroje.

### Best Practices

- Brat tento Compose jako dev-only a mit separacni production manifesty.
- Pinovat image tagy nebo digesty; nepouzivat `latest` v produkci.
- Secrets resit pres secret manager, ne plain environment variables.
- Nahradit `links` modernim DNS v Compose network.
- Pouzivat healthchecky, resource limity, profily a readiness ordering.

### Anti-patterns

- Nasadit `start-single-node --insecure` Cockroach do produkce.
- Nechat `SERVER_SECRET=secret`, `minioadmin` a lokalni endpointy mimo dev prostredi.
- Vystavovat interni porty verejne.
- Spolehat na `host-gateway` v produkcni siti.
- Michat lokalni a produkcni konfiguraci v jednom Compose bez profilu a guardrails.

## Databaze a storage

### CockroachDB / PostgreSQL vrstva

CockroachDB je v architekture oznacena jako primarni aplikacni databaze pro uzivatele, workspaces, dokumenty, transakce, metadata a permissions.

Docker Compose spousti CockroachDB na portech `26257` a `8089` v single-node insecure rezimu.
Interni balicek `@hcengineering/postgres` pouziva npm knihovnu `postgres` a navazuje na `@hcengineering/postgres-base` a `server-core`.

Best practices:

- Pocitat se serializable isolation a implementovat retry logiku transakci.
- Mit verzovane migrace a backward-compatible zmeny schematu.
- Delit connection pooly podle sluzby.
- Peclive volit primarni klice a indexy podle workloadu.
- V produkci zapnout TLS, auth, backupy a multi-node cluster.

Anti-patterns:

- Chovat se ke CockroachDB jako k obycejnemu single-node PostgreSQL bez retry strategie.
- Delat dlouhe transakce pres sitove volani.
- Spoustet business kriticke sluzby na `--insecure`.
- Pouzivat DB jako message queue.
- Spolehat na lokalni single-node chovani pri navrhu produkcni konzistence.

### MongoDB legacy support

MongoDB balicek je stale v repozitari a pouziva `mongodb` a `bson`.
Account service ale explicitne vypisuje MongoDB deprecation warning: podpora MongoDB je ve v7 deprecated, doporucena akce je migrace na CockroachDB pred upgradem a pokracovani vyzaduje `PROCEED_V7_MONGO=true`.

Best practices:

- Brat MongoDB jako legacy adapter, ne jako doporuceny novy deployment target.
- Migrovat data na CockroachDB pred pridanim novych funkci zavislych na nove datove vrstve.
- Omezit nove Mongo-only typy a indexy.
- Mit testy migrace a rollback scenar.
- Jasne dokumentovat, ktere sluzby Mongo jeste realne podporuji.

Anti-patterns:

- Zakladat novy deployment na MongoDB.
- Pridavat funkcionalitu, ktera existuje jen pro Mongo.
- Smesovat Cockroach a Mongo pro stejny bounded context bez migracniho planu.
- Ignorovat deprecation warning.
- Predstirat, ze MongoDB a CockroachDB jsou bezezbytku zamenitelne.

### MinIO / S3 object storage / Datalake / Hulylake

MinIO je S3-compatible object storage pro binary files, attachments, images, blobs a backups.

Docker Compose spousti MinIO na portech `9000/9001`.
`datalake` pouziva bucket konfiguraci s MinIO endpointem a `hulylake` pouziva AWS-compatible env promenne.

Architektura rozlisuje:

- `datalake`: blob storage management s metadaty
- `hulylake`: storage adapter API / S3-compatible interface

Interni MinIO balicek pouziva npm knihovnu `minio`.

Best practices:

- Metadata drzet v DB, binarni data v object storage.
- Validovat content type, velikost a typ souboru pred ulozenim.
- Pouzivat checksums/ETag a lifecycle policies.
- Oddelit bucket pro blobs, backups a exporty.
- V produkci zapnout TLS, sifrovani, rotaci access keys a least-privilege credentials.

Anti-patterns:

- Pouzivat `minioadmin/minioadmin` mimo lokalni vyvoj.
- Verit nazvu souboru nebo MIME typu od klienta.
- Delat object storage verejne pristupnou bez autorizace.
- Ukladat business metadata jen do object tags.
- Nemit pravidelne testy restore z backup bucketu.

## Eventing, fulltext a cache

### Redpanda / Kafka / KafkaJS

Redpanda slouzi jako Kafka-compatible event streaming mezi sluzbami.
Architektura popisuje producenty jako Transactor, Workspace a Rating a konzumenty jako Fulltext, Media, Process, HulyGun a Backup.

Docker Compose spousti Redpandu s Kafka adresami, Schema Registry a Pandaproxy.
Redpanda Console je pripojena na broker i Schema Registry.

Interni `@hcengineering/kafka` balicek pouziva `kafkajs`.
Session manager vytvari queue producers/consumers nad `QueueTopic.Workspace` a `QueueTopic.Users`.

Best practices:

- Versionovat event schema.
- Pouzivat idempotentni konzumenty.
- Mit dead-letter topic pro poison messages.
- Klicovat eventy podle workspace nebo entity, pokud je dulezite poradi.
- Monitorovat lag, retry rate a consumer group health.

Anti-patterns:

- Predpokladat globalni poradi eventu napric partitionami.
- Delat dual-write DB + Kafka bez outbox/inbox strategie.
- Ignorovat chybne eventy a zaseknout consumer group.
- Posilat do Kafka payloady bez verze.
- Pouzivat Kafka jako synchronni request/response API.

### Elasticsearch

Elasticsearch slouzi pro full-text indexy spravovane fulltext sluzbou.
Architektura rika, ze fulltext konzumuje eventy, extrahuje obsah a udrzuje Elasticsearch index.

Docker Compose spousti Elasticsearch `7.14.2` na portu `9200` a `fulltext_cockroach` ukazuje na `FULLTEXT_DB_URL=http://huly.local:9200`.
Interni elastic balicek pouziva `@elastic/elasticsearch ^7.17.14`.

Best practices:

- Elasticsearch brat jako odvozeny index, ne source of truth.
- Mit explicitni mappingy, analyzery a index aliasy.
- Reindex delat pres alias swap, ne destruktivne.
- Omezovat wildcard/fuzzy dotazy a hlidat query latency.
- Mit proces pro kompletni rebuild indexu z primarni databaze/eventu.

Anti-patterns:

- Ukladat jedine authoritative kopie dat do Elasticsearch.
- Spolehat na dynamic mappings v produkci.
- Mit jeden sdileny index pro vsechny typy bez rizeneho mappingu.
- Pousti nakladne dotazy bez timeoutu.
- Ignorovat kompatibilitu mezi ES server verzi a client verzi.

### Redis / HulyPulse

Redis je v architekture popsany jako in-memory cache a pub/sub pro HulyPulse real-time notifications.
Docker Compose spousti Redis `8.0.2-alpine3.21` a HulyPulse se pripojuje pres `HULY_REDIS_URLS=redis://redis:6379`, port `8099`.

Best practices:

- Redis pouzivat pro cache, pub/sub a transient state, ne jako primarni databazi.
- Nastavit TTL a eviction policy podle typu dat.
- Mit reconnect/backoff strategii.
- V produkci pouzivat auth, TLS a monitoring pameti.
- Nepredpokladat durable delivery u Redis pub/sub.

Anti-patterns:

- Ukladat source-of-truth stav pouze do Redis.
- Ignorovat memory pressure.
- Pouzivat Redis pub/sub pro udalosti, ktere musi byt garantovane doruceny.
- Nemit fallback pri restartu Redis.
- Sdilet jeden Redis namespace bez prefixu a separace prostredi.

## Observability

### Jaeger / OpenTelemetry / Stats

Architektura uvadi Jaeger jako distributed tracing UI a OTLP collector.
Sluzby posilaji traces pro performance monitoring.

Docker Compose predava sluzbam:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces
```

Jaeger bezi s `COLLECTOR_OTLP_ENABLED=true`.
Existuje take `stats` sluzba a account/front endpointy pro statistiky a metriky.

Best practices:

- Propagovat trace ID napric HTTP, WebSocket a Kafka eventy.
- Mit jasnou sampling policy.
- Neposilat do traces tokeny, osobni udaje ani plne payloady dokumentu.
- Merit business metriky oddelene od infrastruktury.
- Napojit alerting na SLO: latency, error rate, queue lag, DB retries, index lag.

Anti-patterns:

- Pouzivat Jaeger all-in-one jako produkcni observability backend.
- Vytvaret high-cardinality labely typu user ID, workspace ID vsude bez kontroly.
- Nechat stats endpointy dostupne bez auth.
- Logovat tokeny z query stringu.
- Zamenovat tracing za audit log.

## Testovani a kvalita

### Jest / ts-jest / UI testy

README popisuje `rush test` pro vsechny testy a `rushx test` uvnitr balicku.
UI testy maji vlastni workflow v adresari `tests`, vcetne build/bundle/docker pripravy a `rushx uitest`.

Typicke balicky pouzivaji `jest`, `ts-jest`, `@types/jest`; nektere skripty maji `--passWithNoTests` a u serverovych balicku casto `--forceExit`.
README zminuje BrowserStack pro dalsi testovani.

Best practices:

- Oddelit unit, integration, contract a E2E testy.
- Spoustet testy v CI na zmenenych projektech i transitive dependentech.
- Mit deterministickou pripravu test DB/workspace.
- Doplnit contract testy pro RPC, Kafka eventy a storage adaptery.
- Merit coverage kritickych domen, ne jen globalni procento.

Anti-patterns:

- Spolehat na `--passWithNoTests`; muze skryt balicky bez testu.
- Pouzivat `--forceExit` jako nahradu za spravne uzavrene handlery a DB spojeni.
- Delat UI testy zavisle na sleep/timeoutech misto cekani na stav.
- Nemit testy migraci a obnovy backupu.
- Testovat jen happy path RPC bez chybovych stavu.

### ESLint / Prettier / svelte-check

Prettier konfigurace nastavuje 2 mezery, zadne semicolony, single quotes, print width 120 a Svelte parser override.

`@hcengineering/ui` pouziva ESLint, TypeScript ESLint, `eslint-plugin-svelte`, `svelte-check`, `prettier-plugin-svelte` a formatovaci/build/test skripty.

Rush ma samostatne faze pro `format`, `svelte-check`, `validate` a prikaz `doformat`.

Best practices:

- Lint, format, typecheck a svelte-check vynucovat v CI.
- Nepovolit merge pri typecheck chybach.
- Drzet jednotnou konfiguraci pres monorepo, ne per-package chaos.
- Pouzivat `eslint-disable` jen s komentarem proc.
- Mit pre-commit/pre-push hooky jako podporu, ale CI jako autoritu.

Anti-patterns:

- Formatovani nechavat na dobrovolnosti.
- Zakryvat typove chyby `any` nebo `// @ts-ignore`.
- Vypinat pravidla lokalne kvuli rychlosti.
- Mit jine lint pravidlo pro frontend a backend bez duvodu.
- Brat `svelte-check` jako volitelny krok u Svelte-heavy projektu.

## Desktop a media

### Electron

Repozitar obsahuje desktop klienta `@hcengineering/desktop` s main entry `dist/main/electron.js`.
Skripty spousti produkcni i vyvojovy Electron pres `electron --no-sandbox .`.

Desktop build pouziva Webpack, Svelte loader, Sass/PostCSS toolchain, TypeScript, `esbuild-loader`, Jest a Electron `^38.2.2`.

Best practices:

- Oddelit main process, preload scripts a renderer.
- Zapnout `contextIsolation`, vypnout `nodeIntegration` v rendereru a pouzivat uzke IPC API.
- Podepisovat buildy a ridit auto-update kanaly.
- Minimalizovat native moduly a auditovat dependency chain.
- Testovat desktop zvlast pro Windows/macOS/Linux.

Anti-patterns:

- Spoustet Electron s `--no-sandbox` mimo kontrolovane vyvojove prostredi.
- Vystavit Node API rendereru.
- Posilat secrety pres IPC bez validace.
- Sdilet webovou konfiguraci s desktopem bez security rozdilu.
- Ignorovat code signing, auto-update integrity a CSP.

### Rekoni / document intelligence / PDF a dokumentove zpracovani

Rekoni je sluzba pro document intelligence: extrahuje text a strukturovana data z binarnich dokumentu jako PDF, DOC, DOCX, RTF a HTML.
Pouziva se pro searchability a resume parsing.

Docker Compose spousti Rekoni na portu `4004`, front na nej odkazuje pres `REKONI_URL` a fulltext pres `REKONI_URL=http://huly.local:4004`.
Fulltext sluzba kombinuje DB, Elasticsearch, storage a Rekoni pro indexaci obsahu.

Best practices:

- Dokumentove parsovani izolovat do samostatne sluzby kvuli bezpecnosti a resource limitum.
- Omezit velikost souboru, pocet stran a timeouty parsovani.
- Spoustet parsery v sandboxovanem kontejneru.
- Verzionovat extrahovany text i parser verzi kvuli reindexum.
- Mit fallback pro neparsovatelne nebo chranene dokumenty.

Anti-patterns:

- Parsovat neduveryhodne dokumenty v hlavnim aplikacnim procesu.
- Drzet cele PDF/DOCX v pameti bez limitu.
- Pouzivat vystup OCR/parseru jako bezpecny HTML bez sanitizace.
- Blokovat transakcni requesty dlouhym dokumentovym parsingem.
- Nemit frontu/retry/DLQ pro poskozene dokumenty.

### Media, image processing, HLS streaming, preview, print/sign

Architektura obsahuje stream sluzbu pro video streaming s HLS transcodingem, media pro video/audio conversion a preview pro thumbnail/preview generovani.

Docker Compose spousti `stream`, `media`, `preview`, `print` a `sign`.
Frontend ma endpointy `STREAM_URL`, `PREVIEW_URL`, `PRINT_URL`, `SIGN_URL`.

`server/front` pouziva `sharp` pro praci s obrazky a file serving.

Best practices:

- Media processing delat asynchronne pres queue, ne v request-response ceste.
- U obrazku validovat realny typ souboru, rozmery a velikost.
- U HLS drzet segmenty v object storage a mit cleanup lifecycle.
- U podpisove sluzby izolovat certifikaty, pristupy a audit.
- Pro preview pouzivat deterministic cache key podle obsahu/verze.

Anti-patterns:

- Dekodovat neduveryhodne obrazky/dokumenty bez limitu.
- Ukladat certifikaty do image nebo repozitare.
- Spoustet CPU-heavy transcode ve stejne sluzbe jako API.
- Nechat preview cache rust bez expirace.
- Poskytovat media URL bez workspace authorization.

## Auth, tokeny, OTP a cookies

### Ucel a zpusob pouziti

Account sluzby pouzivaji `@hcengineering/server-token`, OTP knihovny, cookie management a auth providery.
`account` balicek zavisi na `otp-generator`, `otplib`, `server-token`, Mongo/Postgres vrstvach a server pipeline.

Account service dekoduje tokeny pro statistiky/admin operace, nastavuje token secret a uklada account token do HTTP-only cookie.
Front file handler akceptuje token z cookie, query parametru nebo Bearer headeru.

### Best Practices

- Service secrets a token signing keys spravovat pres secret manager.
- Preferovat Authorization header nebo secure HTTP-only cookie pred query tokeny.
- U cookies explicitne nastavit `sameSite`, `secure`, `httpOnly`, domenu a expiraci.
- Mit revokaci/rotaci tokenu a audit citlivych operaci.
- OTP chranit rate-limitem, kratkou TTL a brute-force ochranou.

### Anti-patterns

- Pouzivat token v URL query.
- Mit univerzalni `SERVER_SECRET=secret`.
- Michat user tokeny a service tokeny bez claims/purpose separation.
- Nastavovat dlouhodobe cookies bez revokace.
- Spolehat na skryti admin endpointu pomoci `404` misto explicitni bezpecnostni politiky a auditu.

## Pluginova a modelova architektura Huly

### Ucel a zpusob pouziti

Repozitar neni jen aplikace, ale platforma pro CRM, PM, Chat, HRM a ATS aplikace.
README to explicitne popisuje jako framework pro business aplikace.

Rush inventory obsahuje mnoho pluginu, modelu, server pluginu a resources: contact, task, chunter, recruit, tracker, calendar, notification, github, gmail, drive, document, hr, request a dalsi.

`server-pipeline` agreguje velke mnozstvi server pluginu/resources a tim funguje jako kompozicni vrstva backend funkcionality.

### Best Practices

- Kazdy plugin drzet jako bounded context: model, UI resources, server resources, migrace, testy.
- Vyzadovat stabilni interni API mezi pluginy.
- Minimalizovat cyklicke zavislosti.
- Verzionovat model a mit migracni strategii.
- Dokumentovat lifecycle pluginu: init, upgrade, disable, data export.

### Anti-patterns

- Sdilet business logiku pres nahodne importy mezi pluginy.
- Obchazet modelovou vrstvu primym zapisem do cizich dat.
- Pridavat plugin bez server-side permission modelu.
- Mit implicitni zavislosti jen pres side effects importu.
- Rozsirovat core model o domenove specificke veci bez separace.

## API client, integrace a externi sluzby

### Ucel a zpusob pouziti

README odkazuje na API client pro programatickou interakci s Huly a priklady pouziti v Huly examples.

V monorepu jsou integracni pluginy/sluzby jako GitHub, Gmail, Telegram, Bitrix a dalsi.
Frontend compose konfigurace obsahuje endpointy pro Gmail, Calendar, Telegram, GitHub a dalsi sluzby.

### Best Practices

- Externi integrace izolovat pres adapter/connector vrstvu.
- OAuth/tokeny ukladat sifrovane a rotovat refresh tokeny.
- Mit retry/backoff a rate-limit respektujici API poskytovatele.
- Integrace testovat contract testy a mock servery.
- Uzivatelum transparentne ukazovat stav synchronizace.

### Anti-patterns

- Volat externi API primo z core business logiky.
- Blokovat transakcni request na pomale externi API.
- Ukladat OAuth tokeny plaintext.
- Nemit idempotentni sync.
- Prenaset provider-specific model do core domeny.

## Shell skripty a vyvojarska automatizace

### Ucel a zpusob pouziti

README pouziva shell skripty jako:

- `scripts/fast-start.sh`
- `scripts/presetup-rush.sh`
- `scripts/build.sh`

Rush command-line definuje globalni prikazy, ktere volaji shell skripty pro Docker build, formatovani, cisteni TS cache a dependency updates.

README upozornuje na problem Windows line endings u `.sh` skriptu a doporucuje checkout z WSL nebo vypnuti `core.autocrlf`.

### Best Practices

- Shell skripty psat idempotentne a s `set -euo pipefail`.
- Validovat vstupy a existenci zavislosti.
- Dokumentovat podporovane OS/shelly.
- Presunout komplexni logiku do Node/TS CLI, pokud roste.
- Testovat skripty v CI na Linuxu a pripadne WSL/macOS.

### Anti-patterns

- Spolehat na lokalni `PATH` nebo globalne instalovane binarky.
- Neresit CRLF na Windows.
- Skryt kritickou release logiku v netestovanem shell skriptu.
- Pouzivat shell pro slozite JSON/YAML transformace bez validace.
- Nemit dry-run pro destruktivni operace.

## Shrnuti hlavnich architektonickych rizik

### 1. Konfiguracni drift Node verze

README, Rush a `.nvmrc` nejsou plne sladene.
To opravit jako prvni, protoze buildy v takto velkem monorepu musi byt reprodukovatelne.

### 2. Dev secrets a insecure sluzby

Compose je dobry pro lokal, ale obsahuje hodnoty, ktere by v produkci byly kriticke bezpecnostni chyby.

### 3. MongoDB je legacy past

Kod ho jeste podporuje, ale account service jasne varuje pred pokracovanim bez migrace na CockroachDB.

### 4. Token v query stringu

Front file handler ho podporuje.
Prakticky je to kompatibilni fallback, ale bezpecnostne by se mel postupne odstranit nebo velmi omezit.

### 5. Mozny preklep v env promenne

V compose je u transactoru `HYLYLAKE_URL`, zatimco jinde se pouziva `HULYLAKE_URL`.
Neni jiste, ze je to bug, ale je nutne overit, jakou promennou sluzba skutecne cte.

### 6. Testovaci signaly jsou slabsi, nez by mely byt

Caste `--passWithNoTests` a `--forceExit` jsou prakticke u velkeho monorepa, ale nesmi maskovat chybejici testy nebo neuzavrene resources.
