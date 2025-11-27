# Timesheet System

Sistema di gestione timesheet per dipendenti con Google Sheets come database.

## 🚀 Caratteristiche

- ✅ Login con username/password salvati nel Google Sheet
- ✅ Dashboard separata per Manager e Dipendenti
- ✅ Gestione progetti e commesse (solo Manager)
- ✅ Registrazione ore lavorate (Dipendenti)
- ✅ Approvazione/rifiutazione timesheet (Manager)
- ✅ Filtri per anno, mese, dipendente, progetto
- ✅ Totale ore per periodo
- ✅ Interfaccia moderna e responsive

## 📋 Prerequisiti

- Node.js 18+ e npm
- Account Google (per creare Google Sheet)
- Vercel account (per deploy)

## 🛠️ Setup

### 1. Clona e installa dipendenze

```bash
npm install
```

### 2. Configura Google Sheets

Segui la guida completa in `SETUP_GOOGLE_SHEETS.md`:

1. Crea il Google Sheet con i 4 fogli: `employees`, `projects`, `commesse`, `timesheets`
2. Configura gli header e inserisci alcuni dati di esempio
3. Copia il codice da `google-apps-script/Code.gs` in Google Apps Script
4. Pubblica come Web App e copia l'URL

### 3. Configura variabili d'ambiente

Crea un file `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

Sostituisci `YOUR_SCRIPT_ID` con l'URL della tua Web App.

### 4. Avvia in sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

### 5. Deploy su Vercel

```bash
# Installa Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Oppure connetti il repository GitHub a Vercel per deploy automatico.

**Importante**: Aggiungi la variabile d'ambiente `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` nelle impostazioni del progetto su Vercel.

## 📊 Struttura Google Sheet

### Foglio `employees`
```
id | nome | cognome | username | password | ruolo
```

### Foglio `projects`
```
id | nome | descrizione | data_inizio | data_fine | stato
```

### Foglio `commesse`
```
id | project_id | nome | descrizione | budget_ore | stato
```

### Foglio `timesheets`
```
id | employee_id | employee_name | project_id | commessa_id | data | ore | descrizione | stato | approvato_da | data_approvazione | data_inserimento
```

## 👤 Ruoli

- **Manager**: Può creare/modificare progetti e commesse, approvare/rifiutare timesheet, vedere tutti i timesheet
- **Dipendente**: Può inserire timesheet, vedere solo i propri timesheet

## 🔐 Autenticazione

Login semplice con username e password salvati nel foglio `employees`. 
Per uso interno (10 dipendenti), password in chiaro nel foglio.

## 📝 Note

- Il sistema è progettato per uso interno con pochi dipendenti
- Google Sheets ha limiti di rate (circa 20 richieste/secondo)
- I dati sono visibili direttamente nel Google Sheet
- Nessun backend hostato - tutto tramite Google Apps Script

## 🐛 Troubleshooting

**Errore "NEXT_PUBLIC_GOOGLE_SCRIPT_URL non configurato"**
- Verifica che il file `.env.local` esista e contenga l'URL corretto

**Errore CORS**
- Assicurati che la Web App di Google Apps Script sia pubblicata con "Chi può accedere: Tutti"

**Errore "Foglio non trovato"**
- Verifica che i nomi dei fogli siano esatti: `employees`, `projects`, `commesse`, `timesheets` (minuscole)

## 📄 Licenza

ISC

