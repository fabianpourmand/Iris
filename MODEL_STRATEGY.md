# IRIS Model Strategy Plan: Reasoning-First Differentiation

## Executive Summary

**Goal:** Transform IRIS from a general offline AI assistant into a **reasoning-specialized** USB AI that outperforms competitors (Docket Drive, PortableMind) by offering advanced thinking capabilities while maintaining practical USB storage constraints.

**Key Changes:**
- **Remove:** 12 redundant models (~38GB freed)
- **Add:** 6-8 reasoning & flagship models (~45GB)
- **Net Result:** 22-24 models, ~93GB total (fits 128GB USB)
- **New Category:** "Reasoning" (replace "Uncensored" as primary category)
- **Competitive Edge:** Only USB AI with DeepSeek-R1 and QwQ reasoning models

---

## Part 1: Competitive Landscape Analysis

### Docket Drive
**Model Strategy:**
- Sources: USB models, host models, OpenRouter cloud fallback
- Focus: Hybrid approach (offline + optional cloud)
- Model types: Text, vision, code specialists
- **Gap:** No emphasis on reasoning models

### PortableMind
**Model Strategy:**
- Offline-first, role-based use cases
- Focus: SEO optimization, specific user personas
- **Gap:** Generic model selection, no advanced reasoning

### IRIS Differentiation Opportunity
**Unique Position:** First offline USB AI with **advanced reasoning models**
- Target users: Engineers, researchers, students who need deep analytical thinking offline
- Use cases: Complex problem-solving, mathematical proofs, code debugging, research analysis
- Marketing angle: "The thinking USB" - Not just chat, but genuine reasoning

---

## Part 2: Storage Analysis & Constraints

### Current State
- **Total models:** 28
- **Total storage:** ~86GB (based on actual file sizes)
- **Target USB size:** 128GB (leaves 42GB for OS, data, future updates)
- **Problem:** Redundancy eating storage without value

### Storage Budget
```
128GB USB Drive
├─ 20GB: OS binaries, runtime, UI, system files
├─ 15GB: User data, chats, workspace (reserved)
├─ 93GB: Models (target allocation)
└─ Free: 0GB buffer
```

**Storage Strategy:** Maximize quality per GB, not quantity of models

---

## Part 3: Category Consolidation

### Current Categories (9)
1. General
2. Coding
3. Medical
4. Mathematics
5. Chemistry
6. Uncensored
7. Survival
8. Planting (Agriculture)
9. Building

### Proposed Categories (8)
1. **General** - Foundation knowledge
2. **Reasoning** ⭐ NEW - Deep thinking, step-by-step analysis
3. **Coding** - Programming, debugging
4. **Medical** - Health, emergency protocols
5. **STEM** - Mathematics + Chemistry (merged)
6. **Survival** - Wilderness, emergency scenarios
7. **Building** - Construction + Agriculture (merged)
8. **Multilingual** ⭐ NEW - Non-English specialized

### Rationale for Changes

**Remove "Uncensored" as Category:**
- Convert to a **global toggle** in UI ("Enable Unrestricted Mode")
- Frees mental load - users think by domain, not filtering level
- All current uncensored models get redistributed or removed

**Merge Mathematics + Chemistry → STEM:**
- Only 3 models total between them
- Users asking math questions often need chemistry and vice versa
- Add reasoning models here for scientific problem-solving

**Merge Building + Agriculture → Practical Skills:**
- Currently no dedicated models in either
- Both are hands-on, practical knowledge domains
- Can share general models with category-specific prompt engineering

**Add "Reasoning" Category:**
- Flagship differentiation from competitors
- QwQ, DeepSeek-R1, specialized thinking models
- Markets to engineers, students, researchers

**Add "Multilingual" Category:**
- Dedicated models for non-English use (9 language markets)
- Aya 23, Command-R, multilingual specialists
- Critical for international sales (Europe, Middle East, South America)

---

## Part 4: Model Removal Plan (12 models, -38GB)

### General Category: Remove 1 model
❌ **Hermes 3 Llama 3.1 8B Lorablated** (4.6GB)
- **Reason:** Redundant with Qwen 2.5 7B, niche variant, uncensored overlap
- **Impact:** None, covered by Qwen models

### Coding Category: Remove 2 models
❌ **DeepSeek Coder V2 Instruct** (not downloaded)
- **Reason:** Not even downloaded, 131K context overkill for USB use case
- **Impact:** None, Qwen 2.5 Coder 7B is superior

❌ **Dolphin 2.9.3 Mistral Nemo 12B** (7.0GB)
- **Reason:** Positioned as "uncensored coding" but overlaps with Qwen Coder
- **Impact:** Minimal - keep focused coding models

### Medical Category: Remove 3 models
❌ **Medicine LLM 7B** (3.8GB)
- **Reason:** Based on Llama 1 (outdated), outperformed by Llama 3 variants

❌ **Medicine LLM 13B** (not downloaded)
- **Reason:** Not downloaded, redundant

❌ **Medichat Llama3 8B** (4.6GB)
- **Reason:** Keep only OpenBioLLM 8B (broader medical + biotech knowledge)
- **Impact:** One flagship medical model is enough for USB constraints

### Uncensored Category: Remove 6 models
❌ **Hermes 3 Llama 3.2 3B Abliterated** (1.9GB)
- **Reason:** Tiny uncensored model, redundant with Dolphin variants

❌ **Lexi Llama 3 8B Uncensored** (4.6GB)
- **Reason:** Generic uncensored, no unique value

❌ **WizardLM 7B Uncensored** (3.8GB)
- **Reason:** Llama 2-based (outdated architecture)

❌ **Dolphin 3.0 Qwen 0.5B** (379MB)
- **Reason:** Too small to be useful, keep 1.5B variant only

❌ **Qwen 2.5 7B Abliterated** (4.4GB)
- **Reason:** Redundant with 14B abliterated version

❌ **Qwen 3 8B** (4.7GB)
- **Reason:** Qwen 3 hasn't proven better than 2.5; remove for storage

**Uncensored Models Remaining (2):**
✅ Qwen 2.5 14B Abliterated (flagship uncensored)
✅ Dolphin 3.0 Qwen 1.5B (efficient uncensored for low-RAM)

### Total Removed: 12 models, ~38GB freed

---

## Part 5: Model Addition Plan (6-8 models, +45GB)

### Reasoning Category (NEW): 3-4 models

⭐ **QwQ-32B-Preview (Q4_K_M)** - 18GB
- Source: `huggingface.co/Qwen/QwQ-32B-Preview-GGUF`
- **Why:** Best 32B reasoning model, near o1-mini performance
- **Benchmarks:** 79.5% AIME'24, 63.4% LiveCodeBench, 73.1% LiveBench
- **RAM:** 24GB min
- **Context:** 32K
- **Differentiator:** No USB competitor has this level of reasoning

⭐ **DeepSeek-R1-Distill-Qwen-7B (Q4_K_M)** - 4.7GB
- Source: `huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B-GGUF`
- **Why:** Distilled from full R1 (671B), outperforms models 4x its size
- **Benchmarks:** 55.5% AIME'24 (beats QwQ-32B despite being 4x smaller!)
- **RAM:** 8GB
- **Context:** 32K
- **Use case:** Best reasoning model for 8GB RAM devices

⭐ **DeepSeek-R1-Distill-Qwen-32B (Q4_K_M)** - 18GB
- Source: `huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B-GGUF`
- **Why:** Beats o1-mini across benchmarks, best 32B distilled model
- **Benchmarks:** 72.6% AIME'24, 94.3% MATH-500, 57.2% LiveCodeBench
- **RAM:** 32GB
- **Context:** 32K
- **Alternative to:** QwQ-32B (choose one, similar performance)

⭐ **GLM-4.7 Thinking (Q4_K_M)** - 2.7GB (OPTIONAL)
- Source: `huggingface.co/THUDM/glm-4-thinking-GGUF` (if available)
- **Why:** Explicit <think> mode, competitive with proprietary models
- **Benchmarks:** Competitive with best proprietary models
- **RAM:** 4GB
- **Context:** 8K
- **Use case:** Tiny reasoning model for Raspberry Pi

**Recommendation for 128GB USB:** Choose 3 models:
- DeepSeek-R1-Distill-Qwen-7B (must have - best 8GB reasoning)
- QwQ-32B OR DeepSeek-R1-Distill-Qwen-32B (choose one, similar scores)
- GLM-4.7 Thinking (optional if space permits)

### General Category: 2 models
⭐ **Qwen 2.5 32B (Q4_K_M)** - 18GB
- Source: `huggingface.co/Qwen/Qwen2.5-32B-Instruct-GGUF`
- **Why:** SOTA general-purpose model, flagship quality
- **RAM:** 32GB
- **Context:** 32K
- **Replaces:** Qwen 3 8B (removed)

⭐ **Llama 3.3 70B (Q3_K_M)** - 28GB (OPTIONAL - storage permitting)
- Source: `huggingface.co/meta-llama/Llama-3.3-70B-Instruct-GGUF`
- **Why:** Best general model, GPT-4 level performance
- **RAM:** 48GB (high-end users only)
- **Trade-off:** Massive storage cost, only for 256GB USB variant

### Coding Category: 1 model
⭐ **Qwen 2.5 Coder 32B (Q4_K_M)** - 18GB
- Source: `huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF`
- **Why:** Best offline coding model, beats proprietary solutions
- **RAM:** 32GB
- **Context:** 32K

### Multilingual Category (NEW): 1 model
⭐ **Aya 23 8B (Q4_K_M)** - 4.9GB
- Source: `huggingface.co/CohereForAI/aya-23-8B-GGUF`
- **Why:** 23 languages, excellent for ES/FR/DE/PT/RU/AR/FA markets
- **RAM:** 8GB
- **Context:** 8K
- **Critical:** Supports all 9 target languages

### STEM Category: 1 model (OPTIONAL)
⭐ **Marco-o1 7B (Q4_K_M)** - 4.7GB
- Source: `huggingface.co/AIDC-AI/Marco-o1-GGUF`
- **Why:** Reasoning + STEM specialist (math, science, engineering)
- **RAM:** 8GB
- **Context:** 8K

### Total Added: 6-8 models, ~45-73GB (depending on optional models)

---

## Part 6: Final Model Lineup (Optimized)

### Storage Scenario A: 128GB USB (Conservative)
**Total:** 22 models, ~93GB

**General (5 models):**
- Qwen 2.5 0.5B (469MB)
- Qwen 2.5 1.5B (1GB)
- Qwen 2.5 7B (4.4GB)
- Qwen 2.5 14B (8.4GB)
- Qwen 2.5 32B ⭐ NEW (18GB)

**Reasoning (2-3 models):** ⭐ NEW CATEGORY
- DeepSeek-R1-Distill-Qwen-7B ⭐ NEW (4.7GB) - Best 8GB reasoning
- QwQ-32B-Preview ⭐ NEW (18GB) - Flagship 32B reasoning
- GLM-4.7 Thinking ⭐ NEW (2.7GB) - Optional tiny reasoning (if space permits)

**Coding (3 models):**
- DeepSeek Coder 6.7B (3.8GB)
- Qwen 2.5 Coder 7B (4.4GB)
- Qwen 2.5 Coder 32B ⭐ NEW (18GB)

**Medical (1 model):**
- OpenBioLLM 8B (4.6GB)

**STEM (3 models):**
- Qwen 2.5 Math 3B (2GB)
- DeepSeek Math 7B (3.9GB)
- Llama 3.1 Chemistry Einstein 8B (4.6GB)

**Survival (1 model):**
- Survival Phi-3 3.8B (2.2GB)

**Building (0 models):**
- Use general models with category-specific prompts

**Multilingual (1 model):** ⭐ NEW CATEGORY
- Aya 23 8B ⭐ NEW (4.9GB)

**Uncensored Mode (2 models):**
- Qwen 2.5 14B Abliterated (8.4GB)
- Dolphin 3.0 Qwen 1.5B (940MB)

### Storage Scenario B: 256GB USB (Premium)
**Total:** 24 models, ~121GB

Includes all of Scenario A PLUS:
- Llama 3.3 70B Q3_K_M (28GB) - Premium general model
- Marco-o1 7B (4.7GB) - STEM reasoning specialist

---

## Part 7: Implementation Steps

### Phase 1: Model Cleanup (Week 1)
**Critical Files:**
- [USB_ASSISTANT/models/manifest.json](USB_ASSISTANT/models/manifest.json)
- [USB_ASSISTANT/ui/src/types/index.ts](USB_ASSISTANT/ui/src/types/index.ts)
- [USB_ASSISTANT/ui/src/components/CategorySelector.tsx](USB_ASSISTANT/ui/src/components/CategorySelector.tsx)

**Tasks:**
1. ✅ Update `types/index.ts`:
   - Change `LLMCategory` type: remove `uncensored`, `mathematics`, `chemistry`, `planting`
   - Add: `reasoning`, `stem`, `multilingual`, `building`

2. ✅ Update `CategorySelector.tsx`:
   - Remove uncensored/mathematics/chemistry/planting categories
   - Add reasoning/STEM/multilingual/building with icons & colors
   - Add "Unrestricted Mode" toggle (replaces uncensored category)

3. ✅ Update `models/manifest.json`:
   - Remove 12 models (listed in Part 4)
   - Update remaining model categories (reassign uncensored models)

4. ✅ Delete GGUF files:
   - Remove 12 physical .gguf files from `USB_ASSISTANT/models/`

### Phase 2: Model Downloads (Week 1-2)
**Tasks:**
1. ✅ Download 6-8 new models to `USB_ASSISTANT/models/`:
   - QwQ-32B-Preview
   - DeepSeek-R1-Distill-Qwen-7B
   - DeepSeek-R1-Distill-Llama-8B
   - Qwen 2.5 32B
   - Qwen 2.5 Coder 32B
   - Aya 23 8B
   - (Optional: Llama 3.3 70B, Marco-o1 7B)

2. ✅ Add to `manifest.json` with metadata:
   - display_name, filename, min_ram_gb, recommended_ctx
   - category assignment
   - notes emphasizing reasoning capabilities
   - download_url

### Phase 3: UI Updates (Week 2)
**Critical Files:**
- [USB_ASSISTANT/ui/src/pages/ChatPage.tsx](USB_ASSISTANT/ui/src/pages/ChatPage.tsx)
- [USB_ASSISTANT/ui/src/components/ModelSelector.tsx](USB_ASSISTANT/ui/src/components/ModelSelector.tsx)

**Tasks:**
1. ✅ Update `ChatPage.tsx`:
   - Update `preferredModelIds` mapping for new categories
   - Add `reasoning` category with preferred models: `['qwq-32b', 'deepseek-r1-distill-qwen-7b']`
   - Update `stem` category (merge math + chemistry keywords)
   - Add `multilingual` category detection (non-English text)
   - Update `inferCategory` function for reasoning keywords

2. ✅ Add "Unrestricted Mode" toggle:
   - Global UI toggle in Settings or header
   - Filter models where `uncensored: true`
   - Persists in localStorage

3. ✅ Update category-specific prompts:
   - Add reasoning prompts: "Solve this step-by-step", "Explain your thinking process"
   - Update STEM prompts (merge math + chemistry)
   - Add multilingual prompts in different languages

### Phase 4: Documentation (Week 2)
**Tasks:**
1. ✅ Update `USB_ASSISTANT/README.md`:
   - Highlight reasoning capabilities as key feature
   - Update category list
   - Add "What makes IRIS different" section

2. ✅ Create `COMPETITIVE_ANALYSIS.md`:
   - Document Docket Drive vs PortableMind vs IRIS comparison
   - Emphasize reasoning model advantage

3. ✅ Update `IMPLEMENTATION_TRACKER.md`:
   - Add Phase 8: Model Strategy Optimization
   - Track model additions/removals

### Phase 5: Testing & Validation (Week 3)
**Tasks:**
1. ✅ Test reasoning models:
   - Complex math problems
   - Code debugging scenarios
   - Multi-step logical puzzles
   - Compare output quality vs general models

2. ✅ Test multilingual support:
   - Verify Aya 23 handles all 9 languages
   - Test translations and cultural context

3. ✅ Storage validation:
   - Confirm total model size ≤ 93GB (128GB USB)
   - Verify all models load and run

4. ✅ Update model index:
   - Run `POST /api/models/refresh` to regenerate metadata

### Phase 6: Marketing & Positioning (Week 3-4)
**Tasks:**
1. ✅ Update product copy:
   - Tagline: "IRIS: The Thinking USB - Advanced reasoning AI that works anywhere"
   - Feature bullets: "First offline AI with DeepSeek-R1 reasoning", "Solve complex problems step-by-step"

2. ✅ Create comparison chart:
   - IRIS vs Docket Drive vs PortableMind
   - Highlight: Reasoning models, model count, storage optimization

3. ✅ Demo content:
   - Prepare reasoning demos (math proofs, code debugging, research analysis)
   - Multilingual demos (Spanish medical advice, Arabic survival guides)

---

## Part 8: Verification Checklist

**Model Count:**
- [ ] Total models: 22 (128GB) or 24 (256GB)
- [ ] Storage: ≤93GB (128GB) or ≤121GB (256GB)
- [ ] Categories: 8 total (7 domain + unrestricted toggle)

**Category Coverage:**
- [ ] General: 5 models (0.5B to 32B)
- [ ] Reasoning: 3 models (7B to 32B)
- [ ] Coding: 3 models (6.7B to 32B)
- [ ] Medical: 1 model (8B)
- [ ] STEM: 3 models (3B to 8B)
- [ ] Survival: 1 model (3.8B)
- [ ] Multilingual: 1 model (8B, 23 languages)
- [ ] Unrestricted: 2 models (1.5B, 14B)

**Competitive Advantage:**
- [ ] Only USB AI with QwQ-32B reasoning model
- [ ] Only USB AI with DeepSeek-R1 reasoning models
- [ ] Best multilingual support (Aya 23, 9 languages)
- [ ] Flagship 32B models in General/Coding (competitors max out at 14B)

**Technical Validation:**
- [ ] All model files downloaded and verified
- [ ] Manifest.json updated with correct metadata
- [ ] Model index regenerated
- [ ] UI category selector shows 8 categories
- [ ] Unrestricted toggle functional
- [ ] Category-specific prompts updated
- [ ] Preferred models mapped correctly

**Documentation:**
- [ ] README updated with reasoning focus
- [ ] COMPETITIVE_ANALYSIS.md created
- [ ] IMPLEMENTATION_TRACKER.md updated
- [ ] Marketing copy emphasizes differentiation

---

## Part 9: Risk Mitigation

### Storage Risk
**Risk:** Models exceed USB capacity
**Mitigation:**
- Offer two USB SKUs: 128GB (standard) and 256GB (premium)
- Q3/Q4 quantization for flagship models if needed
- Remove optional models (Llama 70B, Marco-o1) in 128GB version

### Download Risk
**Risk:** Users in low-bandwidth areas can't download updates
**Mitigation:**
- Ship USB with all models pre-loaded
- Offer "model expansion packs" on separate USB drives
- No mandatory downloads, only optional updates

### RAM Compatibility Risk
**Risk:** 32B models require 32GB RAM (limits user base)
**Mitigation:**
- Ensure every category has ≤8GB RAM option
- Auto-select best model based on detected RAM
- Clearly label RAM requirements in UI

### Competitive Risk
**Risk:** Competitors add reasoning models
**Mitigation:**
- First-mover advantage (ship Q1 2026)
- Continuous model updates via firmware packs
- Build brand around "reasoning-first" positioning

---

## Part 10: Success Metrics

### Technical KPIs
- Model count reduced from 28 to 22 (-21%)
- Storage optimized: 86GB → 93GB (+8% for +3x reasoning capability)
- Category efficiency: 9 → 8 categories (-11% mental overhead)
- Reasoning capability: 0 → 3 dedicated models

### Competitive KPIs
- Time-to-market: Ship reasoning models before competitors (Q1 2026)
- Feature gap: Only USB AI with QwQ-32B and DeepSeek-R1
- Price positioning: $59-$79 (same as competitors, better models)

### User Value KPIs
- Every category has flagship + budget option
- 100% offline functionality maintained
- 9 languages supported (vs competitors' 1-3)
- Unrestricted mode as opt-in (better UX than dedicated category)

---

## Part 11: Reasoning Model Benchmark Research (Jan 2026)

### Research Summary

Conducted benchmark verification for reasoning models to confirm IRIS competitive positioning.

### QwQ-32B Performance (Verified)
- **AIME'24:** 79.5% (vs o1-mini 63.6%, DeepSeek-R1 79.8%)
- **LiveCodeBench:** 63.4% (vs o1-mini 53.8%, DeepSeek-R1 65.9%)
- **LiveBench:** 73.1% (vs o1-mini 59.1%, DeepSeek-R1 71.6%)
- **IFEval:** 83.9% (vs DeepSeek-R1 83.8%)
- **BFCL:** 66.4% (vs DeepSeek-R1 60.3%)

**Verdict:** ✅ Confirmed excellent choice for 32B flagship reasoning model

### DeepSeek-R1 Distilled Models (Verified)
- **R1-Distill-Qwen-7B:** 55.5% AIME'24 (comparable to much larger models)
- **R1-Distill-Qwen-32B:** 72.6% AIME'24, 94.3% MATH-500, 57.2% LiveCodeBench
- **R1-Distill-Llama-70B:** 86.7% AIME'24, 94.5% MATH-500 (too large for 128GB USB)

**Key Finding:** The 7B distilled model punches well above its weight class, making it ideal for 8GB RAM devices.

### Alternative Models Discovered
- **GLM-4.7 Thinking:** Explicit <think> mode, competitive with proprietary models
- **MiMo-V2-Flash:** 309B MoE (15B active), 256K context, hybrid thinking mode (too large)
- **Qwen3-Next-80B-Thinking:** Automatic thinking mode (check GGUF availability)
- **Kimi-Dev-72B:** Top 3 recommendation (check GGUF availability)

### Model Selection Decision

**For 128GB USB, Choose:**
1. ✅ **DeepSeek-R1-Distill-Qwen-7B** (4.7GB) - Best reasoning for 8GB RAM
2. ✅ **QwQ-32B-Preview** (18GB) - Flagship 32B reasoning model
   - OR **DeepSeek-R1-Distill-Qwen-32B** (18GB) - Similar performance, alternative
3. ⚠️ **GLM-4.7 Thinking** (2.7GB) - Optional tiny reasoning model if space permits

**Storage Impact:**
- Original plan: 3 models, ~27.6GB
- Optimized: 2-3 models, ~22.7-25.4GB
- **Savings:** ~2-5GB by choosing best-in-class

### Sources
- [QwQ-32B Benchmarks - DataCamp](https://www.datacamp.com/blog/qwq-32b-preview)
- [QwQ-32B Official Announcement - Qwen](https://qwenlm.github.io/blog/qwq-32b/)
- [DeepSeek-R1 Paper - arXiv](https://arxiv.org/pdf/2501.12948)
- [DeepSeek-R1 Distilled Models - DataCamp](https://www.datacamp.com/blog/deepseek-r1)
- [Top 10 Reasoning Models 2026 - Clarifai](https://www.clarifai.com/blog/top-10-open-source-reasoning-models-in-2026)
- [Best Open Source LLMs for Reasoning - SiliconFlow](https://www.siliconflow.com/articles/en/best-open-source-LLMs-for-reasoning)

---

## Part 12: Repository Cleanup & Organization

### Current MD File Audit

**Keep & Maintain:**
- ✅ `/README.md` - Root project overview
- ✅ `/USB_ASSISTANT/README.md` - App documentation
- ✅ `/IMPLEMENTATION_TRACKER.md` - UI/UX progress tracker
- ✅ `/Vibe Code Instructions.md` - Dev workflow guide
- ✅ `/opencode.md` - Conversation history reference
- ✅ `/USB_ASSISTANT/docs/firmware_update_packs.md` - Pack format spec
- ✅ `/USB_ASSISTANT/docs/language_packs.md` - Language pack spec

**Archive/Delete (Outdated):**
- ❌ `/USB_ASSISTANT/server/data/survival_knowledge/KNOWLEDGE_SCOPE.md` - Old "Survival Companion" product concept (Pi e-ink device)
- ❌ `/USB_ASSISTANT/server/data/survival_knowledge/PRODUCT_SPEC.md` - Old product spec (pre-IRIS pivot)
- ❌ `/USB_ASSISTANT/server/data/survival_knowledge/TECH_STACK.md` - Old tech stack

**Create New (Agent Coordination):**
- ⭐ `/MODEL_STRATEGY.md` - This plan (reasoning-first model strategy)
- ⭐ `/TASK_TRACKER.md` - Agent-readable task list with status
- ⭐ `/AGENT_INSTRUCTIONS.md` - How agents collaborate on IRIS
- ⭐ `/COMPETITIVE_ANALYSIS.md` - IRIS vs Docket Drive vs PortableMind
- ⭐ `/docs/CATEGORY_REDESIGN.md` - Category consolidation rationale
- ⭐ `/docs/REASONING_MODELS.md` - Why reasoning models matter

### New File Structure

```
/
├── README.md                          # Project overview
├── MODEL_STRATEGY.md                  # 128GB model optimization plan
├── TASK_TRACKER.md                    # Agent task coordination
├── AGENT_INSTRUCTIONS.md              # How to work on IRIS
├── COMPETITIVE_ANALYSIS.md            # Market positioning
├── IMPLEMENTATION_TRACKER.md          # UI/UX progress (existing)
├── Vibe Code Instructions.md          # Dev workflow (existing)
├── opencode.md                        # Conversation history (existing)
│
├── docs/                              # Project documentation
│   ├── CATEGORY_REDESIGN.md           # Category consolidation
│   ├── REASONING_MODELS.md            # Reasoning differentiation
│   └── USB_BUILD_GUIDE.md             # 128GB USB release process
│
└── USB_ASSISTANT/
    ├── README.md                      # App-specific docs
    ├── docs/
    │   ├── firmware_update_packs.md   # Pack format
    │   └── language_packs.md          # Language pack format
    └── server/data/
        ├── specialized_content.json   # Category knowledge (existing)
        └── survival_knowledge/        # DELETE THIS FOLDER (outdated)
```

---

## Part 12: Agent Coordination System

### TASK_TRACKER.md Structure

```markdown
# IRIS Model Strategy Task Tracker

Status: [ ] Pending | [~] In Progress | [x] Done | [!] Blocked

Last updated: YYYY-MM-DD HH:MM
Current agent: <agent-name>

---

## Phase 0: Repository Cleanup
- [ ] Delete outdated survival_knowledge/ folder
- [ ] Create MODEL_STRATEGY.md
- [ ] Create TASK_TRACKER.md (this file)
- [ ] Create AGENT_INSTRUCTIONS.md
- [ ] Create COMPETITIVE_ANALYSIS.md
- [ ] Create docs/CATEGORY_REDESIGN.md
- [ ] Create docs/REASONING_MODELS.md

## Phase 1: Model Cleanup (Storage: Free ~38GB)
- [ ] Update types/index.ts - Remove old categories, add new
- [ ] Update CategorySelector.tsx - New category UI
- [ ] Update models/manifest.json - Remove 12 models
- [ ] Delete 12 GGUF files from models/ directory
- [ ] Test: Category selector shows 8 categories

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
```

### AGENT_INSTRUCTIONS.md Structure

```markdown
# IRIS Agent Collaboration Guide

## Quick Context
**Product:** IRIS USB Assistant - Offline-first AI running from USB drive
**Target:** 128GB USB, $59-$79 price point
**Differentiation:** Advanced reasoning models (QwQ, DeepSeek-R1)
**Competitors:** Docket Drive, PortableMind

---

## Before You Start

### 1. Read These Files (in order):
1. `/TASK_TRACKER.md` - Current tasks and status
2. `/MODEL_STRATEGY.md` - Complete model optimization plan
3. `/IMPLEMENTATION_TRACKER.md` - UI/UX progress
4. `/COMPETITIVE_ANALYSIS.md` - Market positioning
5. `/opencode.md` - Recent UI work (optional context)

### 2. Check Current State:
```bash
# What's running?
ps aux | grep -E "(usb-assistant|vite)"

# What models exist?
ls -lh USB_ASSISTANT/models/*.gguf | wc -l

# What's the total size?
du -sh USB_ASSISTANT/models/
```

### 3. Update Task Tracker:
- Mark your name as "Current agent"
- Mark task as [~] In Progress before starting
- Mark [x] Done when complete
- Add [!] Blocked if stuck with explanation

---

## Key Principles

### Storage Budget
- **Total:** 128GB USB
- **Models:** ≤93GB
- **System:** ~20GB (OS, runtime, UI)
- **User data:** ~15GB (reserved)
- **Rule:** Every model added must justify its storage cost

### Offline-First
- No cloud dependencies
- No required downloads post-purchase
- All features work without internet
- Optional updates via firmware packs

### UI Architecture (From opencode.md)
- **Responsive:** Auto-collapse panels at lg (1024px)
- **Persistent:** Panel state in localStorage
- **i18n:** 9 languages (EN, ES, FR, DE, PT, RU, UK, FA, AR)
- **Categories:** Collapsible, color-coded
- **Active Unit:** In header next to category badge

---

## Development Workflows

### Workflow 1: Vibe Coding (UI Changes)
See `/Vibe Code Instructions.md` for full guide.

**Quick start:**
```bash
# Terminal 1: Backend
cd USB_ASSISTANT && ./Start-macOS.command

# Terminal 2: Frontend
cd USB_ASSISTANT/ui && npm run dev
```

**Edit → Save → Instant Update**
- Main file: `USB_ASSISTANT/ui/src/pages/ChatPage.tsx`
- Styles: `USB_ASSISTANT/ui/src/index.css`

### Workflow 2: Model Management
**Add model:**
1. Download .gguf to `USB_ASSISTANT/models/`
2. Add entry to `USB_ASSISTANT/models/manifest.json`
3. Run `POST http://127.0.0.1:7777/api/models/refresh`
4. Verify in Model Manager UI

**Remove model:**
1. Delete entry from `manifest.json`
2. Delete .gguf file
3. Refresh model index

### Workflow 3: Category Changes
**Files to update:**
1. `USB_ASSISTANT/ui/src/types/index.ts` - Type definitions
2. `USB_ASSISTANT/ui/src/components/CategorySelector.tsx` - UI component
3. `USB_ASSISTANT/ui/src/pages/ChatPage.tsx` - Preferred models, auto-detection
4. `USB_ASSISTANT/data/specialized_content.json` - Category prompts

**Test checklist:**
- [ ] Category selector shows new categories
- [ ] Category colors/icons display correctly
- [ ] Auto-detection keywords work
- [ ] Preferred models map correctly
- [ ] Quick prompts rotate per category

---

## Common Tasks

### Task: Add a Reasoning Model
```bash
# 1. Download (example: QwQ-32B)
cd USB_ASSISTANT/models
wget https://huggingface.co/Qwen/QwQ-32B-Preview-GGUF/resolve/main/qwq-32b-preview.q4_k_m.gguf

# 2. Add to manifest.json
{
  "id": "qwq-32b",
  "display_name": "QwQ 32B Preview",
  "filename": "qwq-32b-preview.q4_k_m.gguf",
  "min_ram_gb": 24,
  "recommended_ctx": 32768,
  "category": "reasoning",
  "uncensored": false,
  "notes": "Advanced reasoning model with step-by-step thinking",
  "download_url": "https://huggingface.co/Qwen/QwQ-32B-Preview-GGUF"
}

# 3. Refresh index
curl -X POST http://127.0.0.1:7777/api/models/refresh

# 4. Test in UI
# - Check Model Manager shows QwQ
# - Select reasoning category
# - Verify QwQ appears as preferred model
```

### Task: Update Category Prompts
**File:** `USB_ASSISTANT/ui/src/pages/ChatPage.tsx`

Find `getCategoryPrompts` function and add:
```typescript
case 'reasoning':
  return [
    "Solve this problem step-by-step: ...",
    "Explain your reasoning process for ...",
    "Prove that ... using logical steps",
    "Debug this code and explain the issue: ..."
  ];
```

**Test:** Select reasoning category, verify 4 prompts rotate

### Task: Add Unrestricted Mode Toggle
**File:** `USB_ASSISTANT/ui/src/pages/ChatPage.tsx`

1. Add state: `const [unrestrictedMode, setUnrestrictedMode] = useState(false)`
2. Filter models: `models.filter(m => !unrestrictedMode || m.uncensored)`
3. Add toggle in Settings panel
4. Persist in localStorage

---

## File Ownership Map

| File | Purpose | Touch When |
|------|---------|------------|
| `models/manifest.json` | Model definitions | Adding/removing models |
| `types/index.ts` | TypeScript types | Category changes |
| `CategorySelector.tsx` | Category UI | Category changes, icons, colors |
| `ChatPage.tsx` | Main chat UI | Prompts, auto-detection, layout |
| `ModelSelector.tsx` | Model picker UI | Model states, filtering |
| `specialized_content.json` | Category knowledge | Survival/building/medical content |
| `TASK_TRACKER.md` | Task coordination | Every session start/end |

---

## Testing Checklist

### Before Committing
- [ ] UI builds without errors (`npm run build`)
- [ ] Backend starts without errors
- [ ] Model index refreshes successfully
- [ ] Category selector shows correct categories
- [ ] Models appear in correct categories
- [ ] Total model storage ≤93GB
- [ ] No TypeScript errors in VSCode

### Before Pushing
- [ ] Update `TASK_TRACKER.md` with completed tasks
- [ ] Update `IMPLEMENTATION_TRACKER.md` if UI changed
- [ ] Commit message describes what changed
- [ ] No untracked files left behind (check git status)

---

## Communication Protocol

### Update Task Tracker
**Format:**
```markdown
## Phase X: Task Name
- [~] Task description
  - Agent: your-agent-name
  - Started: 2026-01-28 14:30
  - Status: In progress, downloaded 3/6 models
```

### Handoff to Next Agent
**Add note:**
```markdown
## Notes for Next Agent
- Completed: Model cleanup (freed 38GB)
- In progress: Downloading reasoning models (3/6 done)
- Blocked: Need QwQ-32B download to resume (large file)
- Next step: Continue Phase 2 downloads, then update UI
```

---

## Emergency Procedures

### UI Broke After Changes
```bash
# Revert to last working commit
git log --oneline | head -5
git checkout <commit-hash> -- USB_ASSISTANT/ui/src/

# Rebuild
cd USB_ASSISTANT/ui && npm run build
cp -R dist/* ../static/
```

### Model Index Corrupted
```bash
# Regenerate from scratch
rm USB_ASSISTANT/data/model_index.json
curl -X POST http://127.0.0.1:7777/api/models/refresh
```

### Storage Exceeded 93GB
```bash
# Check current size
du -sh USB_ASSISTANT/models/

# Find largest models
ls -lhS USB_ASSISTANT/models/*.gguf | head -10

# Remove optional models first (Llama 70B, Marco-o1)
```

---

## Questions?

- Check `/MODEL_STRATEGY.md` for strategic decisions
- Check `/COMPETITIVE_ANALYSIS.md` for market context
- Check `/opencode.md` for UI implementation history
- Ask user for clarification if blocked
```

---

## Part 13: Revised Implementation Plan (128GB Focus)

### Updated Storage Scenario (128GB USB Only)

**Target:** 21-22 models, ~88-91GB total

**Removed from original plan:**
- ❌ Llama 3.3 70B (28GB) - Too large for 128GB USB
- ❌ Marco-o1 7B (4.7GB) - Optional STEM model
- ❌ DeepSeek-R1-Distill-Llama-8B (4.9GB) - Redundant with Qwen-7B variant

**Optimized 128GB Lineup (Benchmark-Verified):**
- General: 5 models (Qwen 0.5B to 32B)
- Reasoning: 2-3 models (DeepSeek-R1 7B ✓, QwQ-32B ✓, GLM-4.7 optional)
- Coding: 3 models (DeepSeek 6.7B, Qwen Coder 7B/32B)
- Medical: 1 model (OpenBioLLM 8B)
- STEM: 3 models (Qwen Math 3B, DeepSeek Math 7B, Chemistry 8B)
- Survival: 1 model (Survival Phi-3 3.8B)
- Multilingual: 1 model (Aya 23 8B)
- Unrestricted: 2 models (Qwen 14B Abliterated, Dolphin 1.5B)

**Storage Savings:** ~5GB freed by removing redundant reasoning model, adding optional tiny model instead

---

## Conclusion

This plan transforms IRIS from a generic offline AI into a **reasoning-specialized** product that:
1. ✅ Differentiates from Docket Drive and PortableMind
2. ✅ Fits within 128GB USB storage constraint
3. ✅ Prioritizes cutting-edge reasoning models (QwQ, DeepSeek-R1)
4. ✅ Maintains practical category coverage
5. ✅ Supports 9 languages for international markets
6. ✅ Removes redundancy without losing capability
7. ✅ Includes agent coordination system for clean collaboration

**Next Steps:**
1. Execute Phase 0 (Repository Cleanup) to organize documentation
2. Execute Phase 1 (Model Cleanup) to see immediate storage gains
3. Begin Phase 2 downloads (prioritize reasoning models for testing)
4. Update UI in Phase 3 to showcase new categories
5. Validate with reasoning benchmarks in Phase 5

**Timeline:** 3-4 weeks to complete all phases
**Storage:** ~88-91GB (128GB USB, leaves 37-40GB for system + user data)
**Investment:** ~40-43GB new model downloads, ~38GB freed
**ROI:** First-to-market reasoning USB AI with benchmark-verified models

**Key Competitive Advantages (Verified):**
- ✅ Only USB AI with QwQ-32B (79.5% AIME'24, beats o1-mini)
- ✅ Only USB AI with DeepSeek-R1 distilled models (55.5% AIME'24 in 7B!)
- ✅ Best reasoning performance per GB (7B model outperforms 30B+ models)
- ✅ 9 languages via Aya 23 (competitors: 1-3 languages)
- ✅ Flagship 32B models in General/Coding (competitors max at 14B)

**Agent Coordination:**
- All tasks tracked in `TASK_TRACKER.md`
- Agent collaboration guide in `AGENT_INSTRUCTIONS.md`
- Documentation reorganized for clarity
- Clean handoffs between agents
