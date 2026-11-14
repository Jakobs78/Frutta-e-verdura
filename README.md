# Frutta e verdura

Un prototipo 2D per browser: Fragolina esplora la cucina e trasforma un frigorifero quasi vuoto nel suo rifugio.

## Prova subito

Apri `index.html` nel browser con un doppio clic. Il gioco non richiede installazioni o account. Per un salvataggio più prevedibile e per lavorare in Visual Studio Code, usa il server locale:

1. Apri questa cartella in Visual Studio Code: **File → Apri cartella**.
2. Se Node.js non è già installato, installa una versione recente LTS.
3. Apri **Terminale → Nuovo terminale** ed esegui `npm run dev`.
4. Visita **http://127.0.0.1:5173**.

Non occorre eseguire `npm install`: il progetto non usa dipendenze. I caratteri Google Fonts sono facoltativi; senza Internet vengono usati i caratteri locali.

## Comandi

| Comando | Azione |
| --- | --- |
| WASD o frecce | Movimento libero in tutte le direzioni |
| Clic / tocco sul terreno | Raggiungi il punto aggirando gli ostacoli |
| Spazio | Salta le briciole e le muffe |
| Q | Tira un pugno nella direzione dell’ultimo movimento |
| E oppure clic sulla stazione | Costruisci/interagisci con una stazione vicina |
| Esc / pulsante pausa | Pausa e guida |
| Torna al rifugio | Ritorno rapido al sicuro |

Su smartphone sono disponibili anche pulsanti touch. La visuale dall’alto consente movimento a 360°; il salto è rappresentato con un’altezza simulata, mantenendo un mondo 2D.

## Cosa c’è nella versione 0.1

- Frigorifero riconoscibile con luce, ventola, ripiani, latte, uova, vasetti, cassetto e porta aperta.
- Fragola disegnata e animata, movimento normalizzato in diagonale, collisioni e ricerca del percorso per il movimento con clic.
- Zona sicura con recupero della freschezza; cucina con pericolo crescente in base alla distanza dal frigo.
- Semi e gocce da raccogliere, risorse che ricompaiono dopo 40 secondi di gioco e muffe che inseguono il personaggio.
- Pugno con Q (o pulsante touch): colpisce davanti a Fragolina, respinge e stordisce le muffe. Tre colpi le sconfiggono; ricompaiono dopo 20 secondi di gioco. Una breve pausa di 0,45 secondi separa i pugni. Gli ostacoli bloccano i colpi.
- Vivaio costruibile con 5 semi: genera un seme ogni 30 secondi di gioco attivo.
- Fontana costruibile con 8 gocce: aumenta la rigenerazione al rifugio.
- Se si esaurisce la freschezza si torna al frigorifero, perdendo il 30% dei semi disponibili (arrotondamento a favore della perdita).
- Minimappa, missione, pausa e ripartenza con conferma.
- Salvataggio automatico di risorse e stazioni in questo browser; al rientro si parte dal rifugio. Nessuna produzione mentre la pagina è chiusa o in pausa.

Il salvataggio è locale: non è condiviso tra dispositivi, modalità in incognito o indirizzi diversi. Se lo spazio di archiviazione non è disponibile, il gioco continua indicando che i progressi durano solo per la sessione.

## Pubblicare su GitHub e Vercel

Non è necessario eliminare gli altri progetti. Il repository dedicato è [Jakobs78/Frutta-e-verdura](https://github.com/Jakobs78/Frutta-e-verdura).

1. Su Vercel seleziona **Add New → Project** e importa **Jakobs78/Frutta-e-verdura**.
2. La configurazione `vercel.json` è già inclusa: framework **Other**, comando build `npm run build`, cartella di output `dist`. Non servono variabili d’ambiente.
3. Seleziona **Deploy**. I successivi aggiornamenti sul branch `main` attiveranno nuovi deploy.

Per lavorare da un altro computer, usa **Git: Clone** in Visual Studio Code con l’indirizzo `https://github.com/Jakobs78/Frutta-e-verdura.git`.

## Struttura

- `index.html`: interfaccia, guida e testi.
- `style.css`: grafica della pagina e disposizione su desktop e smartphone.
- `game.js`: illustrazioni Canvas 2D, regole e interazioni.
- `server.mjs`: anteprima locale, accessibile solo dal computer corrente.
- `build.mjs`: copia i file pubblici in `dist`.
- `vercel.json`: configurazione di pubblicazione.

Controlli: `npm run check`. Preparazione per pubblicazione: `npm run build`.

## Prossime decisioni

Questa è una base single player. Prima di ampliare il gioco vanno scelti lo stile grafico definitivo, il tipo di combattimento o fuga, la struttura della progressione e i personaggi sbloccabili. Login, multiplayer, audio e salvataggi online non sono inclusi.
