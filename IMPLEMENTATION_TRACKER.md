# IRIS USB Assistant - Implementation Tracker

Status legend: [ ] pending, [~] in progress, [x] done

Last updated: 2026-01-28

## Progress Summary
- Phases 1-3 complete: layout, responsive panels, category grid, compact chat list, category collapse control.
- Phase 4: default model selection + model states complete; source grouping still pending.
- Phase 5 complete: offline badge in header + offline guarantee note in Settings.
- Phase 6 complete: UI i18n + language selector (EN, ES, FR, DE, PT, RU, UK, FA, AR).
- Phase 7 complete: offline quick prompts, guides expanded, onboarding copy updated.
- Production UI assets rebuilt and synced to `USB_ASSISTANT/static` and `USB_ASSISTANT/backend/static` (commit 897f072).

## Phase 1 - Layout Foundation (Dynamic + Collapse)
- [x] Make main layout fluid (flex/grid with clamp widths)
- [x] Persist panel visibility in localStorage
- [x] Add responsive auto-collapse below lg (1024px)
- [x] Ensure route defaults to /chat after system test

## Phase 2 - Header + Active Unit Placement
- [x] Keep Active Unit dropdown in top header next to category badge
- [x] Remove any duplicate Active Unit block below categories
- [x] Ensure truncation and sizing behave across breakpoints

## Phase 3 - Category Grid + Conversation Density
- [x] Lock auto-fit grid sizing for consistent behavior
- [x] Compact conversation list (header + items)
- [x] Optional: add search/filter for chats
- [x] Add explicit collapse control for categories panel

## Phase 4 - Model Management UX
- [x] Add default model selection (star)
- [x] Display model states (available/loading/ready/error)
- [ ] Group sources (USB vs host models) if metadata exists

## Phase 5 - Offline Guarantee UX
- [x] Add offline status badge in header
- [x] Add offline proof/notes in Settings

## Phase 6 - Multi-language UI
- [x] Add i18n framework and language bundles
- [x] Languages: EN, ES, FR, DE, PT, RU, UK, FA, AR
- [x] Add language selector in Settings
- [x] Persist language selection

## Phase 7 - Use-case Launch Experience
- [x] Add no-internet quick prompts
- [x] Improve Guides with offline workflows
- [x] Update onboarding copy for offline use
