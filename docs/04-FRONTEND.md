# Frontend User (React)

## Overview
L'applicazione **Frontend User** è una Single Page Application (SPA) in React dedicata agli invitati. 
Permette di visualizzare l'invito digitale (con animazione 3D della busta) e gestire la propria partecipazione (RSVP).

## Stack Tecnologico
- **Core:** React 19, Vite
- **UI/Animation:** Framer Motion, Motion for React, CSS Modules
- **State Management:** React Hooks
- **Testing:** Vitest, React Testing Library
- **Icons:** Lucide React, React Icons

## Struttura Componenti

### `InvitationPage`
Pagina principale. Gestisce il flusso di autenticazione (tramite query params `?code=...`) e orchestra l'apertura della busta.
- **EnvelopeAnimation**: Animazione iniziale di apertura busta e ceralacca.
- **LetterContent**: Il cuore dell'interazione. Mostra il contenuto della lettera e permette di "girarla" per vedere i dettagli.

### `LetterContent`
Componente complesso che gestisce:
- **Flip Card 3D**: Fronte (copertina) e Retro (griglia opzioni).
- **FAB (Floating Action Button)**: Implementato con **React Portal** per sganciarsi dal contesto 3D della lettera. Gestisce la navigazione Fronte/Retro.
- **RSVP Form**: Gestione interattiva della conferma presenza.
- **Card Grid**: Griglia di icone per info aggiuntive (Alloggio, Viaggio, ecc.).
- **Expanded Card Modal**: Modale per i dettagli delle singole card.

## UX & Animazioni
1. **Envelope Flow**: Busta chiusa -> Rottura sigillo -> Estrazione lettera -> Lettura.
2. **Navigation**: 
   - L'utente usa il FAB per girare la lettera.
   - Il FAB cambia icona (`ArrowRight` -> `RotateCcw`) in base al lato.
   - Il FAB **scompare** quando si apre una modale di dettaglio per evitare conflitti visivi.
3. **Responsive**: 
   - Layout adattivo per mobile (single column grid).
   - Scaling dinamico della lettera.

## Testing
I test sono scritti con Vitest.
```bash
npm run test
```
Copertura principale su:
- `Fab.test.jsx`: Verifica rendering via Portal e visibilità condizionale.
- `LetterContent.test.jsx`: Verifica interazioni RSVP e Flip.
