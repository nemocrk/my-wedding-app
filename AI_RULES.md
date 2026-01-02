# AI Development Rules

Le seguenti regole devono essere **sempre** rispettate durante lo sviluppo e la modifica di questo progetto.

## 1. Testing Obbligatorio
Ogni nuova funzionalità o modifica di backend DEVE includere:
- **Unit Test**: Test isolati per ogni singola funzione o metodo del model/serializer (`tests/test_models.py`, `tests/test_serializers.py`).
- **Smoke/Integration Test**: Test che verificano il flusso completo API (request -> db -> response) (`tests/test_api.py`).
- **Non-Regression Test**: Se viene risolto un bug, deve essere aggiunto un test case che riproduce il bug per evitare che si ripresenti.

Esempio comando test: `python manage.py test core`

## 2. Logging Parlante
I log devono essere configurati per essere:
- **Visibili**: Output su STDOUT/STDERR per essere catturati da Docker (`docker logs`).
- **Dettagliati**: Includere timestamp, livello, modulo e messaggio chiaro.
- **Livelli**:
    - `INFO`: Per operazioni di successo (es. "Invito creato: ID x").
    - `ERROR`: Con stacktrace completo per eccezioni.
    - `DEBUG`: Per dettagli sui payload in ingresso/uscita (solo in dev).

## 3. Gestione Errori Backend
- Mai sopprimere eccezioni con `pass` o blocchi `try/except` generici senza logging.
- Le API devono ritornare status code HTTP appropriati (400 per validation error, 500 per server error, 404 per not found).
- **Middleware JSON**: Assicurarsi che le eccezioni 500 ritornino JSON e non HTML.

## 4. Infrastruttura Docker
- Ogni servizio DEVE avere un healthcheck funzionante.
- Le migrazioni DB devono essere applicate automaticamente all'avvio del container (`entrypoint.sh`).
- I servizi GUI (come Adminer) devono essere esposti su reti non-internal.

## 5. UX e Gestione Errori Frontend (Strict)
- **Niente `alert()`**: Mai usare `window.alert()` per segnalare errori.
- **Error Modal**: Utilizzare sempre il componente `ErrorModal` per mostrare errori all'utente.
- **Dettagli Tecnici**: La modale deve permettere di espandere i dettagli tecnici dell'errore (messaggio JSON/stacktrace) per facilitare il debug, ma nasconderli di default all'utente finale.
- **Iconografia**: Usare icone appropriate (SVG "Sad Face" rossa per errori critici).
