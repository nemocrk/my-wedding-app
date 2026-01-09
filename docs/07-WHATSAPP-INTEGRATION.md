# WhatsApp Integration (WAHA)

Questo progetto usa un servizio di integrazione (`/whatsapp-integration`) che fa da “adapter” verso WAHA (istanze separate per `groom` e `bride`) e verso il backend Django. [page:0]

## Sessione WAHA

La sessione WAHA usata dall’integrazione è **sempre** `default` (cioè tutte le chiamate WAHA includono `session=default` o path `/api/sessions/default/...`). [page:0]

## Verifica contatto

Endpoint interno del microservizio:

- `GET /:session_type/:contact_id/check`
  - `session_type`: `groom` | `bride`
  - `contact_id`: numero (viene normalizzato a sole cifre)

Chiamate WAHA effettuate:

- Esistenza numero WhatsApp:
  - `GET /api/contacts/check-exists?phone=<numero>&session=default` [page:0]
- Recupero info contatto (per capire se è “in rubrica”):
  - `GET /api/contacts?contactId=<chatId>&session=default` [page:0]

## Sicurezza

- Le chiamate verso WAHA richiedono l’header `X-Api-Key` (una per sessione `groom` e una per `bride`). [page:0]
