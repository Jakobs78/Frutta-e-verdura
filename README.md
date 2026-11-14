# Frutta e verdura · Edizione Germoglio 0.2

Avventura single player in **3D reale**, pensata per bambini di 10–12 anni. Fragolina esplora un mondo in miniatura, cresce, costruisce officine e libera Carota dal castello del ferro.

## Avvio e pubblicazione

Richiede Node.js 22 o successivo. In Visual Studio Code apri questa cartella, poi il terminale:

```sh
npm ci
npm run dev
```

Apri **http://127.0.0.1:5173**. Il gioco ora usa moduli e una libreria 3D: non avviarlo facendo doppio clic sul file HTML.

Repository: [Jakobs78/Frutta-e-verdura](https://github.com/Jakobs78/Frutta-e-verdura). Su Vercel importa questo repository con framework **Other**, build `npm run build`, output `dist`. `vercel.json` contiene già queste impostazioni. Le dipendenze sono incluse nel file di blocco `package-lock.json`. La libreria 3D viene incorporata nella build; non viene caricata da un CDN durante la partita. I caratteri Google Fonts sono facoltativi.

Per giocare su smartphone e tablet usa il link HTTPS pubblicato da Vercel. L’indirizzo locale sul computer non è accessibile dagli altri dispositivi. Il gioco richiede un browser con WebGL 2 e accelerazione grafica attiva. Se il contesto grafico non è disponibile o viene perso, viene mostrato un messaggio con il pulsante Riprova.

## Comandi

| Azione | PC | Smartphone / tablet | Controller standard |
| --- | --- | --- | --- |
| Movimento a 360° | WASD o frecce | Joypad virtuale sinistro | Levetta sinistra o croce direzionale |
| Scegli destinazione | Clic sul terreno | Tocco sul terreno | — |
| Pugno | Q | Pugno | X / pulsante ovest |
| Salto | Spazio | Salta | A / pulsante sud |
| Raccolta / stazione / prigione | E | Usa | Y / pulsante nord |
| Pausa e guida | Esc | Pulsante pausa | Start |
| Chiudi una scheda | Esc | × | B / pulsante est |

Il joypad usa la cattura del puntatore: si può tenere la direzione con un dito e premere un’azione con l’altro. Gestisce anche il rilascio fuori dal controllo e l’interruzione del tocco. I controller devono essere riconosciuti dal browser con mappatura standard; premi un pulsante sul controller per consentire al browser di rilevarlo. La funzione **Espandi** allarga il gioco alla finestra anche sui browser che non consentono lo schermo intero nativo.

Il pulsante **Diario** nella scena mostra sempre obiettivo e passi della progressione. **Zaino** apre i materiali. **Officina** permette di consultare tutte le stazioni; costruzione e avvio manuale delle produzioni richiedono di essere nel frigorifero.

## Crescita e zone

Fragolina parte dal **livello 0**. Ogni raccolta di semi o gocce dà 3 XP, ogni azione di raccolta da un giacimento dà 5 XP, una lavorazione completata dà 10 XP. I nemici danno `18 + 8 × livello` XP. Costruzioni e potenziamenti danno esperienza. La soglia del livello successivo è `30 × (livello + 1)^1,25`, arrotondata. Livello massimo: 20.

Ogni livello aggiunge 10 punti di freschezza massima, 0,35 di forza e una piccola quantità di velocità. I pugni respingono e stordiscono; gli ostacoli bloccano i colpi.

| Livello | Zona | Risorsa e sblocchi |
| --- | --- | --- |
| 0 | Cucina | Semi, gocce, primi nemici |
| 1 | Bosco delle briciole | Alberi, legno, Falegnameria; anche Vivaio e Fontana diventano costruibili |
| 3 | Cava di zucchero | Pietra, Spaccapietre |
| 5 | Valle del ferro | Minerali, Fucina, castello e missione principale |

La mappa misura 5200 × 2400 unità. Le recinzioni scompaiono quando si sblocca una zona; collisioni e ricerca del percorso impediscono di superarle prima del livello richiesto, anche saltando. Le risorse si raccolgono con Usa/E o colpendole. Alberi e giacimenti hanno tre raccolte da 2 unità e ricrescono dopo 35 secondi attivi. Semi e gocce ricompaiono dopo 40 secondi.

Le muffe delle zone più lontane partono più forti. Alla ricomparsa possono aumentare di livello dopo due sconfitte o in base ai progressi di Fragolina. Le guardie della missione, una volta sconfitte, rimangono sconfitte.

## Officine: sblocco → costruzione → produzione → potenziamento

**Lo sblocco non costruisce automaticamente le stazioni.** Nel frigorifero rimangono cinque postazioni; le schede mostrano il livello richiesto e i materiali mancanti.

| Stazione | Livello richiesto | Costo iniziale | Funzione |
| --- | --- | --- | --- |
| Vivaio | 1 | 5 semi | Produce semi ogni 30 secondi |
| Fontana | 1 | 8 gocce | Accelera la rigenerazione nel frigorifero |
| Falegnameria | 1 | 6 legno + 3 semi | 3 legno → assi |
| Spaccapietre | 3 | 6 pietra + 3 legno | 3 pietra → blocchi |
| Fucina | 5 | 6 pietra + 4 minerale + 2 assi | 3 minerale → lingotti |

Ogni stazione arriva al livello 5, pagando materiali e raggiungendo il livello di personaggio indicato. Le lavorazioni durano 12/10/8/6/4 secondi ai livelli 1/2/3/4/5. Producono 1/1/2/2/3 unità lavorate. Il Vivaio produce tanti semi quanto il proprio livello; la Fontana aumenta la rigenerazione. Una lavorazione in corso deve terminare prima di potenziare la stazione.

## Missione principale: salva Carota

La missione si attiva al livello 5. Il castello è nella Valle del ferro, a est della mappa. La porta d’ingresso è a sud. Carota si trova nella cella del cortile, dietro sbarre di ferro.

1. Sconfiggi le due guardie corazzate. I progressi di ogni guardia vengono salvati.
2. Nella Fucina costruita produci il **Seghetto per metallo**, usando **3 lingotti, 2 assi e 1 blocco**. Richiede 15 secondi attivi.
3. Raggiungi le sbarre e premi Usa/E. Rimani vicino per 5 secondi: allontanarti interrompe il taglio.
4. Carota viene liberato. Ottieni 150 XP e sblocchi la scheda dell’aiutante. La cella diventa attraversabile.

Nessuna violenza esplicita: i nemici sono personaggi stilizzati e le sconfitte sono accompagnate da particelle. Esaurire la freschezza riporta Fragolina al rifugio con il 35% della freschezza massima. Si perde il 30% dei semi disponibili, arrotondato per difetto sulla quantità rimasta; livelli, strumenti, officine e progressi della missione vengono conservati.

## Carota, aiutante permanente

Dopo il salvataggio compare il pulsante **Carota**. Puoi assegnare un incarico, cambiarlo quando vuoi o chiedergli di seguirti.

- **Raccolta fissa:** 2 legno, pietra o minerale ogni 25 secondi di gioco attivo. I materiali entrano nello zaino; non svuota i giacimenti destinati al giocatore.
- **Produzione fissa:** avvia automaticamente cicli nella Falegnameria, nello Spaccapietre o nella Fucina già costruita. Consuma gli stessi 3 materiali grezzi per ciclo. Se mancano materiali, aspetta; la scheda mostra lo stato.
- Carota lavora anche mentre Fragolina esplora fuori dal frigorifero. Non subisce danni e non perde i materiali raccolti.

## Salvataggi

Progressi salvati in `localStorage` **su questo browser/dispositivo**. Non c’è sincronizzazione tra dispositivi o account. Si conservano livelli, XP, materiali, stazioni, lavorazioni in corso, seghetto, guardie sconfitte, salvataggio di Carota e incarico assegnato. Le vecchie scorte e le vecchie stazioni del prototipo 0.1 vengono migrate automaticamente; la nuova crescita parte dal livello 0.

Non c’è produzione o raccolta mentre la pagina è chiusa o il gioco è in pausa. I timer di lavorazione riprendono dal salvataggio. Quando la pagina perde il focus o diventa nascosta, il gioco si mette in pausa. Se lo spazio di archiviazione non è disponibile, l’interfaccia lo segnala e la partita continua per la sessione.

## Verifica e struttura

- `npm run check`: controllo sintassi.
- `npm test`: prove su progressione, blocchi delle zone, raccolta, produzione, combattimento, missione, aiutante, migrazione e ripartenza.
- `npm run build`: bundle 3D e file pubblici in `dist`.

`engine.js` contiene le regole indipendenti dalla grafica; `scene3d.js` genera modelli, illuminazione e camera con Three.js; `game.js` gestisce interfaccia, joypad, controller e comandi. `index.html` e `style.css` gestiscono i layout. `server.mjs` serve esclusivamente i file pubblici compilati e ascolta sul solo computer locale.

Login, multiplayer, acquisti, pubblicità, tracciamento e salvataggi online non sono inclusi. Il gioco non richiede dati personali.
