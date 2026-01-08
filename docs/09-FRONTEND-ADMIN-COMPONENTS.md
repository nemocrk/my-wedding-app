# Frontend Admin Components

## Dashboard Page
Overview statistica del matrimonio con:
1. **Guests Stats Card**: Totali confermati/pendenti per Adulti e Bambini.
2. **Logistics Card**: Conteggi per Alloggi e Transfer richiesti.
3. **Financials Card**: Costi confermati e stimati totali.

## Invitation List Page
CRUD completo degli inviti:
- Tabella filtrabile e ordinabile.
- Modal di creazione/modifica invito.
- Generazione link pubblico con token.
- Gestione ospiti multipli per invito.

## Configuration Page
Pagina per la gestione delle variabili globali del sistema (`GlobalConfig`).

### Componenti
- **Config Form**: Form unico che gestisce tutti i campi di configurazione.
- **Save Feedback**: Notifiche toast/banner per successo o errore salvataggio.

### Sezioni Disponibili
1. **Gestione Costi Unitari**: Prezzi per pasti, alloggi e transfer.
2. **Testi e Comunicazioni**: Template personalizzabile per la lettera di invito.
3. **Sicurezza Link Pubblici**: Gestione chiave segreta e messaggi di errore.
4. **Configurazione WhatsApp**: 
   - `whatsapp_rate_limit`: Limite messaggi/ora per sessione (anti-ban).
   - Valore consigliato: 10 msg/ora.
   - Range: 1-100 messaggi.

## WhatsApp Integration
Pagina dedicata allo stato delle sessioni WhatsApp (Sposo/Sposa).
- **Status Cards**: Visualizzano stato connessione, QR Code e info profilo.
- **Queue Dashboard**: Monitoraggio in tempo reale della coda di invio.
- **Action Buttons**: Refresh, Logout, Test Message.

## Accommodations Page
Gestione delle strutture ricettive e assegnazione stanze.
- **Accommodation List**: Lista strutture con capacità totale/residua.
- **Room Management**: Configurazione stanze per struttura.
- **Auto-Assignment Tool**: Algoritmo per assegnazione automatica (Tetris/BestFit).
