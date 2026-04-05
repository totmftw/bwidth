# Negotiation Agent — UI Overhaul Specification
### Chat Interface + Contract Module
**Derived from:** `screen.css`, `assets.css`, `chat1.css`, `cover.css`, `image.css`  
**Reference design:** Premium Chat App UI Kit (Figma node 2005-100)

---

## PART 1 — REMOVAL INSTRUCTIONS

### What to DELETE (complete teardown — no remnants)

```
REMOVE all of the following from the codebase:

Components:
  - NegotiationModal / NegotiationPopup (any existing)
  - ContractForm / ContractView (any inline rendering)
  - NegotiationPanel, NegotiationSidebar, NegotiationPage
  - OfferCard, CounterOfferCard (legacy offer display)
  - ContractPreviewModal, ContractPDFViewer (inline/legacy)
  - Any <form> tagged as negotiation-form, offer-form, contract-form

Routes:
  - /negotiation/:id (any legacy route)
  - /contract/:id (any legacy route)
  - /offer/accept | /offer/reject | /offer/counter

State:
  - negotiationSlice / negotiationReducer (Redux/Zustand/Context)
  - contractSlice / contractReducer
  - offerState, counterOfferState

API calls:
  - submitOffer(), acceptOffer(), rejectOffer(), counterOffer()
  - fetchContract(), signContract() [re-implement inside new module]
  - Any legacy negotiation WebSocket channel bindings

Styles:
  - negotiation.css, contract.css, offer.css (or equivalent modules)
  - Any class prefixed: .neg-, .offer-, .contract- (legacy)

Database / schema:
  - Do NOT drop tables — preserve all negotiation and contract data
  - Simply remove all frontend access to the old UI layer
```

---

## PART 2 — DESIGN TOKENS (extracted from project CSS files)

Use these exact values throughout the new implementation.  
Do not introduce new colors, fonts, or radii outside this system.

### Colors

```css
:root {
  /* Primary brand */
  --blue-primary:       #188BEF;
  --blue-light:         #49AAFF;
  --blue-dark:          #061F35;
  --blue-darkest:       #061D3D;
  --blue-tinted-bg:     rgba(24, 139, 239, 0.10);
  --blue-tinted-card:   rgba(22, 161, 251, 0.16);
  --blue-subtle:        rgba(17, 74, 123, 0.08);
  --blue-border:        rgba(115, 189, 236, 0.21);

  /* Gradients */
  --gradient-primary:   linear-gradient(180deg, #49AAFF 0%, #188BEF 100%);
  --gradient-send-btn:  linear-gradient(185.92deg, #49AAFF 55.63%, #188BEF 95.3%);
  --gradient-panel-bg:  linear-gradient(180deg,
                          rgba(24, 139, 239, 0.30)  0%,
                          rgba(227, 242, 251, 0.30) 40.84%,
                          rgba(255, 255, 255, 0.30) 51.13%),
                        #FFFFFF;
  --gradient-input-bg:  linear-gradient(270deg,
                          rgba(115, 189, 236, 0.06)  7.99%,
                          rgba(115, 189, 236, 0.21) 92.01%),
                        rgba(255, 255, 255, 0.80);
  --gradient-footer:    linear-gradient(180deg,
                          rgba(229, 242, 253, 0) 0%, #E5F2FD 100%);

  /* Neutrals */
  --white:              #FFFFFF;
  --white-16:           rgba(255, 255, 255, 0.16);
  --white-80:           rgba(255, 255, 255, 0.80);
  --black-05:           rgba(0, 0, 0, 0.05);
  --black-12:           rgba(0, 0, 0, 0.12);
  --black-16:           rgba(0, 0, 0, 0.16);

  /* Text */
  --text-primary:       #061F35;
  --text-secondary:     rgba(6, 31, 53, 0.60);
  --text-on-blue:       #FFFFFF;
  --text-time:          rgba(255, 255, 255, 0.50);
}
```

### Typography

```css
:root {
  --font-primary: 'Helvetica Neue', Helvetica, Arial, sans-serif;

  /* Scale */
  --text-xs:   8.98px;
  --text-sm:   9.60px;
  --text-base: 10.40px;
  --text-md:   11.20px;
  --text-lg:   21.22px;   /* header display */
  --text-xl:   22.12px;   /* large display  */

  /* Weights */
  --weight-normal: 400;
  --weight-medium: 500;
}
```

### Spacing & Radii

```css
:root {
  /* Border radii */
  --radius-xs:   6.40px;    /* icon buttons      */
  --radius-sm:   8.80px;    /* tags, badges       */
  --radius-md:   9.60px;    /* action buttons     */
  --radius-lg:   13.60px;   /* input bar          */
  --radius-xl:   19.59px;   /* message bubbles    */
  --radius-2xl:  20px;      /* modal panel        */
  --radius-full: 74.86px;   /* pills              */

  /* Spacing */
  --space-xs:  8px;
  --space-sm:  12px;
  --space-md:  16px;
  --space-lg:  28px;
  --space-xl:  40px;
}
```

### Effects

```css
:root {
  /* Shadows */
  --shadow-panel:  50px 30px 50px rgba(0, 0, 0, 0.02);
  --shadow-input:  0px -24px 40px rgba(115, 189, 236, 0.18);
  --shadow-send:   /* blur glow under send button */
                   0px 8px 24px rgba(24, 139, 239, 0.35);

  /* Blur */
  --blur-sm:   blur(6.98px);
  --blur-md:   blur(16px);
  --blur-lg:   blur(22.44px);
  --blur-xl:   blur(45.80px);
  --blur-max:  blur(120px);
}
```

---

## PART 3 — CHAT POPUP INTERFACE

### Overview

Replace ALL legacy negotiation UI with a single floating popup chat component.  
It is the **sole interface** for negotiation. It activates inline over any page  
without navigation. Think: WhatsApp or iMessage inside a polished glass panel.

### Popup Structure

```
┌─────────────────────────────────────────────────────┐  ← .neg-popup
│  HEADER                                             │
│  ┌─────────────────────────────────────────────┐   │
│  │  [Avatar]  Party Name · Round 1 of 2        │   │  ← .neg-header
│  │            Booking: Event Name              │   │
│  │                              [×]            │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  CONTEXT BANNER (proposal card)                     │
│  ┌─────────────────────────────────────────────┐   │  ← .neg-proposal-card
│  │  Fee  ·  Slot  ·  Travel  ·  Tech Rider     │   │
│  │                              [Edit] [Submit] │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  MESSAGES                                           │
│  ┌─────────────────────────────────────────────┐   │  ← .neg-messages
│  │                        [Agent bubble]       │   │
│  │  [Party A bubble]                           │   │
│  │                        [Agent bubble]       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  FEEDBACK ROW (per message)         [👍]  [👎]      │  ← .neg-feedback
│                                                     │
│  QUICK ACTIONS                                      │
│  [ ✓ Accept ]  [ ↩ Counter ]  [ ✗ Reject ]         │  ← .neg-actions
│                                                     │
│  INPUT BAR                                          │
│  ┌─────────────────────────────────────────────┐   │  ← .neg-input-bar
│  │  📎  [ Type your message...          ] [→]  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Component Styles

#### `.neg-popup` — Outer shell

```css
.neg-popup {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;

  width: 400px;
  max-height: 720px;
  min-height: 480px;

  background: var(--gradient-panel-bg);
  border: 1.36px solid var(--white);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-panel),
              0 8px 40px rgba(24, 139, 239, 0.12);

  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* Entry animation */
  animation: neg-popup-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes neg-popup-in {
  from { opacity: 0; transform: translateY(32px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
```

#### `.neg-header` — Top bar with party info + round counter

```css
.neg-header {
  position: relative;
  padding: var(--space-md) var(--space-md) 0;
  background: linear-gradient(180deg,
    rgba(24, 139, 239, 0.60) 0%,
    rgba(24, 139, 239, 0.00) 100%);
  backdrop-filter: var(--blur-xl);
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
}

.neg-header__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--white-16);
  object-fit: cover;
}

.neg-header__name {
  font-family: var(--font-primary);
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--white);
}

.neg-header__meta {
  font-size: var(--text-base);
  color: var(--text-time);
}

.neg-header__round-badge {
  /* Pill showing "Round 1 of 2" */
  padding: 4px 10px;
  background: var(--white-16);
  backdrop-filter: var(--blur-max);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--white);
}

.neg-header__close {
  width: 29.6px;
  height: 29.6px;
  background: var(--white-16);
  backdrop-filter: var(--blur-max);
  border-radius: var(--radius-xs);
  border: none;
  cursor: pointer;
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

#### `.neg-proposal-card` — Prefilled proposal banner

```css
.neg-proposal-card {
  margin: var(--space-sm) var(--space-md);
  padding: var(--space-sm) var(--space-md);

  background: var(--gradient-input-bg);
  backdrop-filter: var(--blur-md);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-input);

  border: 1px solid rgba(115, 189, 236, 0.30);
}

.neg-proposal-card__tag {
  /* Individual proposal fields: Fee · Slot · Travel etc. */
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  background: var(--blue-subtle);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-normal);
  color: var(--text-primary);
  gap: 4px;
}

.neg-proposal-card__edit-btn {
  /* Outlined secondary button */
  padding: 6px 14px;
  border: 1.2px solid var(--blue-primary);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--blue-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
}

.neg-proposal-card__submit-btn {
  /* Filled primary button */
  padding: 6px 14px;
  background: var(--gradient-primary);
  border: 1.2px solid var(--white);
  border-radius: var(--radius-sm);
  color: var(--white);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  box-shadow: var(--shadow-send);
}
```

#### `.neg-messages` — Scrollable chat area

```css
.neg-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 10px;

  /* Custom scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(24, 139, 239, 0.20) transparent;
}

/* Message received (from other party, via agent relay) */
.neg-bubble--received {
  align-self: flex-start;
  max-width: 78%;

  background: var(--blue-tinted-card);    /* rgba(22, 161, 251, 0.16) */
  backdrop-filter: var(--blur-sm);
  border-radius: 0 var(--radius-xl) var(--radius-xl) var(--radius-xl);
  padding: var(--space-sm) var(--space-md);

  font-family: var(--font-primary);
  font-size: var(--text-base);
  color: var(--text-primary);
}

/* Message sent (by current user) */
.neg-bubble--sent {
  align-self: flex-end;
  max-width: 78%;

  background: var(--gradient-send-btn);   /* blue gradient */
  border-radius: var(--radius-xl) 0 var(--radius-xl) var(--radius-xl);
  padding: var(--space-sm) var(--space-md);

  font-family: var(--font-primary);
  font-size: var(--text-base);
  color: var(--white);
}

/* Agent system messages */
.neg-bubble--agent {
  align-self: center;
  max-width: 90%;

  background: var(--blue-tinted-bg);      /* rgba(24, 139, 239, 0.10) */
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  border-left: 3px solid var(--blue-primary);

  font-size: var(--text-xs);
  font-style: italic;
  color: var(--text-secondary);
}

.neg-bubble__time {
  font-size: var(--text-xs);
  color: var(--text-time);
  margin-top: 4px;
  text-align: right;
}
```

#### `.neg-feedback` — Thumbs up/down per bubble

```css
/* Render inline below every agent-generated bubble */
.neg-feedback {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  align-self: flex-start;   /* aligns to the bubble that precedes it */
}

.neg-feedback__btn {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  border: 1px solid var(--blue-border);
  background: var(--white-80);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, transform 0.15s ease;
}

.neg-feedback__btn:hover {
  background: var(--gradient-input-bg);
  transform: scale(1.15);
}

.neg-feedback__btn--active {
  background: var(--gradient-primary);
  border-color: transparent;
  color: var(--white);
}
```

#### `.neg-actions` — Quick action row (Accept / Counter / Reject)

```css
.neg-actions {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  justify-content: center;
}

.neg-actions__accept {
  flex: 1;
  padding: 9px 0;
  background: var(--gradient-primary);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--white);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  box-shadow: var(--shadow-send);
}

.neg-actions__counter {
  flex: 1;
  padding: 9px 0;
  background: var(--blue-tinted-bg);
  border: 1.2px solid var(--blue-primary);
  border-radius: var(--radius-sm);
  color: var(--blue-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
}

.neg-actions__reject {
  flex: 1;
  padding: 9px 0;
  background: transparent;
  border: 1.2px solid rgba(6, 31, 53, 0.20);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
}
```

#### `.neg-input-bar` — Message composer

```css
.neg-input-bar {
  margin: 0 var(--space-md) var(--space-md);
  padding: var(--space-sm) var(--space-md);

  background: var(--gradient-input-bg);
  backdrop-filter: var(--blur-md);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-input);
  border: 1px solid var(--blue-border);

  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.neg-input-bar__field {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-primary);
  font-size: var(--text-base);
  color: var(--text-primary);
  outline: none;
}

.neg-input-bar__field::placeholder {
  color: rgba(6, 31, 53, 0.35);
}

.neg-input-bar__send {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--gradient-send-btn);
  color: var(--white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-send);

  /* Glow pulse on active session */
  animation: send-pulse 2.8s ease-in-out infinite;
}

@keyframes send-pulse {
  0%, 100% { box-shadow: var(--shadow-send); }
  50%       { box-shadow: 0 0 20px rgba(24, 139, 239, 0.55); }
}

.neg-input-bar__attach {
  width: 20px;
  height: 20px;
  opacity: 0.35;
  cursor: pointer;
  color: var(--blue-darkest);
}
```

### Popup Trigger Button

```css
/* Floating trigger that replaces any legacy "Negotiate" button */
.neg-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 9.6px 16px;
  background: var(--gradient-primary);
  border: 1.2px solid var(--white);
  border-radius: var(--radius-sm);
  color: var(--white);
  font-family: var(--font-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  box-shadow: var(--shadow-send);

  transition: opacity 0.15s ease;
}

.neg-trigger:hover { opacity: 0.88; }
```

### Popup Overlay (backdrop scrim)

```css
.neg-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgba(6, 31, 53, 0.18);
  backdrop-filter: blur(4px);
  animation: fade-in 0.2s ease forwards;
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

---

## PART 4 — CONTRACT MODULE (standalone, invoked separately)

The contract is its own module, invoked by the agent when negotiation concludes.  
It renders as a second popup layer over the chat popup, or as a full-panel modal.

### Contract Panel

```css
.contract-panel {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contract-panel__card {
  width: 560px;
  max-height: 85vh;
  overflow-y: auto;

  background: var(--gradient-panel-bg);
  border: 1.36px solid var(--white);
  border-radius: var(--radius-2xl);
  box-shadow: 102px 61px 102px rgba(0, 0, 0, 0.02),
              0 24px 80px rgba(24, 139, 239, 0.15);
  backdrop-filter: var(--blur-md);

  padding: var(--space-lg) var(--space-lg);
}

.contract-panel__section-heading {
  font-family: var(--font-primary);
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
  border-bottom: 0.8px solid rgba(6, 31, 53, 0.06);
  padding-bottom: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.contract-panel__field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: var(--text-base);
  color: var(--text-secondary);
}

.contract-panel__field-value {
  font-weight: var(--weight-medium);
  color: var(--text-primary);
}

.contract-panel__sign-btn {
  width: 100%;
  padding: 14px 0;
  background: var(--gradient-send-btn);
  border: none;
  border-radius: var(--radius-md);
  color: var(--white);
  font-family: var(--font-primary);
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  cursor: pointer;
  box-shadow: var(--shadow-send);
  margin-top: var(--space-md);
}

.contract-panel__pdf-btn {
  width: 100%;
  padding: 12px 0;
  background: transparent;
  border: 1.2px solid var(--blue-primary);
  border-radius: var(--radius-md);
  color: var(--blue-primary);
  font-family: var(--font-primary);
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  cursor: pointer;
  margin-top: var(--space-xs);
}
```

### Contract Invocation API

```javascript
// Call this (never import from legacy negotiation module)
import { ContractModule } from '@/modules/contract';

ContractModule.open({
  bookingId:   'booking_abc123',
  agreedTerms: { fee, slot, travel, rider, catering, accommodation },
  parties:     { artist, organizer, venue },
  onSigned:    (contractId) => { /* download PDF, update booking status */ },
  onError:     (err) => { /* show toast */ }
});
```

---

## PART 5 — INTEGRATION CHECKLIST

```
[ ] Remove all legacy components listed in Part 1
[ ] Apply CSS variables from Part 2 to global stylesheet / design tokens file
[ ] Build .neg-popup component (Part 3)
[ ] Wire .neg-trigger to replace every legacy "Negotiate" / "Make Offer" button
[ ] Connect WebSocket channel to .neg-messages bubble renderer
[ ] Implement thumbs up / down RLHF event emitter on .neg-feedback
[ ] Build ContractModule (Part 4) as isolated lazy-loaded chunk
[ ] Wire agent's negotiation-complete event → ContractModule.open()
[ ] Verify: popup works on all breakpoints (mobile-first, min-width: 320px)
[ ] Verify: no personal info passes through input — apply real-time filter
[ ] QA: 2-round counter enforced → quick actions disabled post-round 2
[ ] QA: PDF download available only post both-party signature
[ ] Admin panel: expose AI model settings as described in agent spec
[ ] Accessibility: focus trap inside popup, Escape closes, ARIA roles set
```

---

## PART 6 — RESPONSIVE BREAKPOINTS

```css
/* Mobile: popup becomes full-screen sheet */
@media (max-width: 480px) {
  .neg-popup {
    width: 100%;
    height: 100%;
    max-height: 100%;
    bottom: 0;
    right: 0;
    border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  }
}

/* Tablet: popup floats center */
@media (min-width: 481px) and (max-width: 768px) {
  .neg-popup {
    width: 360px;
    bottom: 16px;
    right: 16px;
  }
}

/* Desktop: default (400px bottom-right corner) */
@media (min-width: 769px) {
  /* defaults from Part 3 apply */
}
```

---

*This spec supersedes all prior negotiation and contract UI documentation.  
All implementation must derive tokens exclusively from Part 2 above.*