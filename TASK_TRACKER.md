# IRIS Model Strategy Task Tracker

Status: [ ] Pending | [~] In Progress | [x] Done | [!] Blocked

Last updated: 2026-01-28 19:50
Current agent: Claude Sonnet 4.5

---

## Phase 0: Repository Cleanup
- [x] Delete outdated survival_knowledge/ folder
  - Agent: Claude Sonnet 4.5
  - Completed: 2026-01-28 19:49
  - Removed: /USB_ASSISTANT/server/data/survival_knowledge/ (outdated product specs)
- [x] Create MODEL_STRATEGY.md
  - Agent: Claude Sonnet 4.5
  - Completed: 2026-01-28 19:50
  - Size: 33KB (complete reasoning-first model strategy)
- [x] Create TASK_TRACKER.md (this file)
  - Agent: Background agent
  - Completed: 2026-01-28 19:49
  - Size: 2.3KB (agent task coordination)
- [x] Create AGENT_INSTRUCTIONS.md
  - Agent: Background agent
  - Completed: 2026-01-28 19:50
  - Size: 23KB (comprehensive collaboration guide)
- [x] Create COMPETITIVE_ANALYSIS.md
  - Agent: Background agent
  - Completed: 2026-01-28 19:49
  - Size: 9.4KB (IRIS vs Docket Drive vs PortableMind)
- [ ] Create docs/CATEGORY_REDESIGN.md
- [ ] Create docs/REASONING_MODELS.md

## Phase 1: Model Cleanup (Storage: Freed 39.78GB)
- [x] Update types/index.ts - Remove old categories, add new
  - Agent: Multi-agent deployment
  - Completed: 2026-01-28 20:15
  - Changes: Removed uncensored/mathematics/chemistry/planting, added reasoning/stem/multilingual/building
- [x] Update CategorySelector.tsx - New category UI
  - Agent: Multi-agent deployment
  - Completed: 2026-01-28 20:15
  - Changes: Updated icons and colors for 8 new categories
- [x] Update models/manifest.json - Remove 12 models
  - Agent: Multi-agent deployment
  - Completed: 2026-01-28 20:15
  - Changes: Removed 12 redundant models, manifest now has 13 models
- [x] Delete 12 GGUF files from models/ directory
  - Agent: Multi-agent deployment
  - Completed: 2026-01-28 20:15
  - Changes: Deleted 10 GGUF files (2 were never downloaded), freed 39.78GB
- [~] Test: Category selector shows 8 categories
  - Agent: Claude Sonnet 4.5
  - Status: Verifying changes before push to dev

## Phase 2: Model Downloads (Storage: Add ~45GB)
- [ ] Download QwQ-32B-Preview (18GB)
- [ ] Download DeepSeek-R1-Distill-Qwen-7B (4.7GB)
- [ ] Download DeepSeek-R1-Distill-Llama-8B (4.9GB)
- [ ] Download Qwen 2.5 32B (18GB)
- [ ] Download Qwen 2.5 Coder 32B (18GB)
- [ ] Download Aya 23 8B (4.9GB)
- [ ] Add all 6 models to manifest.json
- [ ] Test: All models show in Model Manager

## Phase 3: UI Updates
- [ ] Add "Unrestricted Mode" toggle in Settings
- [ ] Update ChatPage.tsx preferredModelIds
- [ ] Add reasoning category prompts
- [ ] Update STEM category (merge math+chemistry keywords)
- [ ] Add multilingual category detection
- [ ] Test: Category auto-detection works

## Phase 4: Documentation
- [ ] Update USB_ASSISTANT/README.md
- [ ] Finalize COMPETITIVE_ANALYSIS.md
- [ ] Update IMPLEMENTATION_TRACKER.md
- [ ] Test: Docs reflect current state

## Phase 5: Testing & Validation
- [ ] Test reasoning models (QwQ, DeepSeek-R1)
- [ ] Test multilingual (Aya 23)
- [ ] Verify total storage ≤93GB
- [ ] Run POST /api/models/refresh
- [ ] Test: All models load correctly

## Phase 6: Build & Release
- [ ] Rebuild UI (npm run build)
- [ ] Sync to static/ directories
- [ ] Test production build
- [ ] Create 128GB USB release
- [ ] Test: USB boots and runs offline

---

## Blocked Tasks
(None yet)

---

## Notes for Next Agent
- Focus on 128GB USB only (not 256GB variant)
- Keep UI improvements from opencode.md session
- Reasoning models are the key differentiator
- All changes must maintain offline-first architecture
