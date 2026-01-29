# IRIS Agent Collaboration Guide

## Quick Context

**Product:** IRIS USB Assistant - Offline-first AI running from USB drive
**Target:** 128GB USB, $59-$79 price point
**Differentiation:** Advanced reasoning models (QwQ-32B, DeepSeek-R1)
**Competitors:** Docket Drive, PortableMind
**Timeline:** 3-4 weeks to complete all phases
**Team:** Multi-agent collaboration with task coordination

---

## Before You Start

### 1. Read These Files (in order)

1. `/TASK_TRACKER.md` - Current tasks and status
2. `/MODEL_STRATEGY.md` - Complete model optimization plan
3. `/IMPLEMENTATION_TRACKER.md` - UI/UX progress
4. `/COMPETITIVE_ANALYSIS.md` - Market positioning
5. `/opencode.md` - Recent UI work (optional context)

### 2. Check Current State

```bash
# What's running?
ps aux | grep -E "(usb-assistant|vite|node)"

# What models exist?
ls -lh USB_ASSISTANT/models/*.gguf | wc -l

# What's the total size?
du -sh USB_ASSISTANT/models/

# What's the git status?
git status
```

### 3. Update Task Tracker

Before starting work:
- Mark your name as "Current agent"
- Mark task as [~] In Progress before starting
- Add timestamps for your work
- Update status with progress notes
- Mark [x] Done when complete
- Add [!] Blocked if stuck with explanation

---

## Key Principles

### Storage Budget

```
128GB USB Drive
├─ 20GB: OS binaries, runtime, UI, system files
├─ 15GB: User data, chats, workspace (reserved)
├─ 93GB: Models (target allocation) ← DO NOT EXCEED
└─ ~0GB: Buffer
```

**Rule:** Every model added must justify its storage cost. Use `du -sh USB_ASSISTANT/models/` frequently.

### Offline-First Architecture

- ✅ No cloud dependencies (all models local)
- ✅ No required downloads post-purchase
- ✅ All features work without internet
- ✅ Optional updates via firmware packs only

### UI Architecture (from opencode.md)

- **Responsive:** Auto-collapse panels at lg breakpoint (1024px)
- **Persistent:** Panel state in localStorage
- **i18n:** 9 languages (EN, ES, FR, DE, PT, RU, UK, FA, AR)
- **Categories:** Collapsible, color-coded
- **Active Unit:** Displayed in header next to category badge

---

## Development Workflows

### Workflow 1: Vibe Coding (UI Changes)

See `/Vibe Code Instructions.md` for full guide.

**Quick start:**

```bash
# Terminal 1: Backend
cd /Users/fabian/Desktop/02_Current\ Projects/01_Apps/USB_AI_Assistant_Build_Guide/USB_ASSISTANT
./Start-macOS.command

# Terminal 2: Frontend (in new terminal)
cd /Users/fabian/Desktop/02_Current\ Projects/01_Apps/USB_AI_Assistant_Build_Guide/USB_ASSISTANT/ui
npm run dev
```

**Edit → Save → Instant Update**
- Main file: `USB_ASSISTANT/ui/src/pages/ChatPage.tsx`
- Styles: `USB_ASSISTANT/ui/src/index.css`
- Components: `USB_ASSISTANT/ui/src/components/`

**Common edits:**
- Category colors: `USB_ASSISTANT/ui/src/index.css` (search `bg-reasoning`, `bg-multilingual`)
- Category icons: `USB_ASSISTANT/ui/src/components/CategorySelector.tsx`
- Chat prompts: `USB_ASSISTANT/ui/src/pages/ChatPage.tsx` (function `getCategoryPrompts`)

### Workflow 2: Model Management

**Add a new model:**

1. Download .gguf file to `USB_ASSISTANT/models/`
2. Add entry to `USB_ASSISTANT/models/manifest.json`
3. Run `POST http://127.0.0.1:7777/api/models/refresh`
4. Verify in Model Manager UI
5. Check total size: `du -sh USB_ASSISTANT/models/`

**Remove a model:**

1. Delete entry from `USB_ASSISTANT/models/manifest.json`
2. Delete .gguf file: `rm USB_ASSISTANT/models/filename.gguf`
3. Run `POST http://127.0.0.1:7777/api/models/refresh`
4. Verify it disappeared from UI

**Note:** Keep models organized by size (larger models first) for quick scanning.

### Workflow 3: Category Changes

**Files to update (in order):**

1. `USB_ASSISTANT/ui/src/types/index.ts` - Type definitions
2. `USB_ASSISTANT/ui/src/components/CategorySelector.tsx` - UI component
3. `USB_ASSISTANT/ui/src/pages/ChatPage.tsx` - Preferred models, auto-detection
4. `USB_ASSISTANT/data/specialized_content.json` - Category prompts (if needed)

**Test checklist:**

- [ ] Category selector shows new categories
- [ ] Category colors/icons display correctly
- [ ] Auto-detection keywords work (test by typing related words)
- [ ] Preferred models map correctly to category
- [ ] Quick prompts rotate per category
- [ ] No TypeScript errors in VSCode

**Example: Adding "Reasoning" Category**

1. Edit `types/index.ts`:
```typescript
export type LLMCategory = 'general' | 'reasoning' | 'coding' | 'medical' | 'stem' | 'survival' | 'building' | 'multilingual';
```

2. Edit `CategorySelector.tsx` - Add to categories array:
```typescript
{ id: 'reasoning', label: 'Reasoning', color: 'bg-purple-500', icon: '🧠' }
```

3. Edit `ChatPage.tsx` - Add to `preferredModelIds`:
```typescript
reasoning: ['qwq-32b', 'deepseek-r1-distill-qwen-7b']
```

4. Add to `inferCategory` keywords:
```typescript
if (prompt.match(/solve|step-by-step|prove|logical|think|reason/i)) {
  return 'reasoning';
}
```

---

## Common Tasks with Code Examples

### Task 1: Add a Reasoning Model

**Context:** You're adding QwQ-32B-Preview to the reasoning category.

**Step 1: Download model**

```bash
cd /Users/fabian/Desktop/02_Current\ Projects/01_Apps/USB_AI_Assistant_Build_Guide/USB_ASSISTANT/models
wget https://huggingface.co/Qwen/QwQ-32B-Preview-GGUF/resolve/main/qwq-32b-preview.q4_k_m.gguf
# This will take 10-30 minutes depending on internet speed
# You can check progress with: ls -lh qwq-32b-preview.q4_k_m.gguf
```

**Step 2: Add to manifest.json**

Open `USB_ASSISTANT/models/manifest.json` and add:

```json
{
  "id": "qwq-32b",
  "display_name": "QwQ 32B Preview",
  "filename": "qwq-32b-preview.q4_k_m.gguf",
  "min_ram_gb": 24,
  "recommended_ctx": 32768,
  "category": "reasoning",
  "uncensored": false,
  "notes": "Advanced reasoning model with step-by-step thinking. Best for complex problem-solving.",
  "download_url": "https://huggingface.co/Qwen/QwQ-32B-Preview-GGUF",
  "benchmarks": {
    "aime": "79.5%",
    "livebench": "73.1%"
  }
}
```

**Step 3: Refresh model index**

```bash
# Backend must be running (Terminal 1 from Workflow 1)
curl -X POST http://127.0.0.1:7777/api/models/refresh
```

**Step 4: Test in UI**

- Open http://127.0.0.1:5173 (Vite dev server)
- Select "Reasoning" category
- Verify QwQ-32B appears as preferred model
- Try a reasoning prompt: "Prove that 2+2=4 step by step"

**Step 5: Check storage**

```bash
du -sh USB_ASSISTANT/models/
# Should be ≤93GB total
```

---

### Task 2: Update Category Prompts

**Context:** You're adding prompts for the new Reasoning category.

**File:** `USB_ASSISTANT/ui/src/pages/ChatPage.tsx`

Find the `getCategoryPrompts` function and add:

```typescript
case 'reasoning': {
  return [
    "Solve this problem step-by-step: [problem]",
    "Explain your reasoning process for [question]",
    "Prove that [statement] using logical steps",
    "Debug this code and explain the issue: [code]",
    "What's the best approach to solve [problem]?",
    "Walk me through the mathematical proof for [theorem]"
  ];
}
```

**Test:**
- Select "Reasoning" category
- Verify 6 prompts appear in quick select
- Verify they rotate on refresh

---

### Task 3: Add "Unrestricted Mode" Toggle

**Context:** Converting from "Uncensored" category to global toggle.

**File:** `USB_ASSISTANT/ui/src/pages/ChatPage.tsx`

**Step 1: Add state**

Add to component state (near top of ChatPage function):

```typescript
const [unrestrictedMode, setUnrestrictedMode] = useState(() => {
  return localStorage.getItem('unrestricted-mode') === 'true';
});
```

**Step 2: Persist to localStorage**

Add effect to save when toggle changes:

```typescript
useEffect(() => {
  localStorage.setItem('unrestricted-mode', String(unrestrictedMode));
}, [unrestrictedMode]);
```

**Step 3: Filter models**

When getting models for UI, filter:

```typescript
const availableModels = models.filter(m => {
  if (unrestrictedMode) return true; // Show all if enabled
  return !m.uncensored; // Hide uncensored models if disabled
});
```

**Step 4: Add toggle in UI**

Add to the Settings panel or header:

```typescript
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    checked={unrestrictedMode}
    onChange={(e) => setUnrestrictedMode(e.target.checked)}
    className="w-4 h-4"
  />
  <span>Enable Unrestricted Mode</span>
</label>
```

**Step 5: Update manifest.json**

Mark uncensored models with `"uncensored": true`:

```json
{
  "id": "qwen-14b-abliterated",
  "display_name": "Qwen 2.5 14B Abliterated",
  "uncensored": true,
  ...
}
```

**Test:**
- Toggle appears in UI
- When OFF: uncensored models hidden
- When ON: uncensored models appear in model selector
- Setting persists after page reload

---

### Task 4: Merge Mathematics + Chemistry into STEM

**Context:** Consolidating two small categories into one.

**Step 1: Update types**

Edit `USB_ASSISTANT/ui/src/types/index.ts`:

```typescript
// Remove: 'mathematics' | 'chemistry'
// Add: 'stem'
export type LLMCategory = 'general' | 'reasoning' | 'coding' | 'medical' | 'stem' | 'survival' | 'building' | 'multilingual';
```

**Step 2: Update CategorySelector**

Edit `USB_ASSISTANT/ui/src/components/CategorySelector.tsx`:

```typescript
const categories = [
  // ... other categories
  { id: 'stem', label: 'STEM', color: 'bg-blue-500', icon: '🧪' }
  // Remove: mathematics, chemistry
];
```

**Step 3: Reassign models in manifest**

In `USB_ASSISTANT/models/manifest.json`:

```bash
# All math models → "stem"
# All chemistry models → "stem"
```

Find and change:
```json
{
  "id": "qwen-2.5-math-3b",
  "category": "stem",  // was "mathematics"
  ...
}
```

**Step 4: Update preferred models**

Edit `USB_ASSISTANT/ui/src/pages/ChatPage.tsx`:

```typescript
const preferredModelIds: Record<LLMCategory, string[]> = {
  // ... others
  stem: ['qwen-2.5-math-3b', 'deepseek-math-7b', 'llama-chemistry-8b'],
  // Remove: mathematics, chemistry entries
};
```

**Step 5: Merge auto-detection keywords**

In `inferCategory` function:

```typescript
if (prompt.match(/math|equation|calculus|algebra|geometry|chemistry|molecule|compound|reaction|periodic|element/i)) {
  return 'stem';
}
```

**Test:**
- Category selector shows STEM (not math/chemistry)
- All math/chemistry models appear in STEM
- Auto-detection works for both math and chemistry queries
- Preferred models show correctly

---

### Task 5: Remove a Model (Storage Optimization)

**Context:** Removing "Dolphin 2.9.3 Mistral Nemo 12B" to free space.

**Step 1: Check current size**

```bash
du -sh USB_ASSISTANT/models/
ls -lh USB_ASSISTANT/models/*.gguf | grep -i "dolphin\|nemo"
```

**Step 2: Remove from manifest**

Edit `USB_ASSISTANT/models/manifest.json`:
- Find entry with `"id": "dolphin-mistral-nemo-12b"`
- Delete the entire JSON object

**Step 3: Delete GGUF file**

```bash
rm USB_ASSISTANT/models/dolphin-mistral-nemo-12b.gguf
```

**Step 4: Refresh index**

```bash
curl -X POST http://127.0.0.1:7777/api/models/refresh
```

**Step 5: Verify it's gone**

```bash
# Should no longer appear
curl http://127.0.0.1:7777/api/models/list

# Check freed space
du -sh USB_ASSISTANT/models/
```

**Step 6: Update TASK_TRACKER.md**

```
- [x] Remove Dolphin 2.9.3 Mistral Nemo 12B (freed 7.0GB)
  - Agent: [your name]
  - New total: 86GB (was 93GB)
```

---

## File Ownership Map

| File | Purpose | When to Touch | Owner |
|------|---------|---------------|-------|
| `models/manifest.json` | Model definitions | Adding/removing models | Model Manager |
| `types/index.ts` | TypeScript types | Category changes | Type Manager |
| `CategorySelector.tsx` | Category UI | Category changes, icons, colors | UI Developer |
| `ChatPage.tsx` | Main chat UI | Prompts, auto-detection, layout | Chat Developer |
| `ModelSelector.tsx` | Model picker UI | Model states, filtering | UI Developer |
| `specialized_content.json` | Category knowledge | Survival/building/medical content | Content Manager |
| `TASK_TRACKER.md` | Task coordination | Every session start/end | All agents |
| `IMPLEMENTATION_TRACKER.md` | UI/UX progress | UI changes | UI Team |
| `MODEL_STRATEGY.md` | Strategic decisions | Phase decisions | Architect |
| `Start-macOS.command` | Backend startup | System changes (rare) | Architect |

**Rule:** Only edit files you own. Coordinate in TASK_TRACKER.md for cross-cutting changes.

---

## Testing Checklist

### Unit Testing (Before committing)

- [ ] UI builds without errors: `npm run build` (from `USB_ASSISTANT/ui/`)
- [ ] Backend starts without errors: `./Start-macOS.command`
- [ ] Model index refreshes successfully
- [ ] Category selector shows correct categories
- [ ] Models appear in correct categories
- [ ] Total model storage ≤93GB: `du -sh USB_ASSISTANT/models/`
- [ ] No TypeScript errors in VSCode
- [ ] No console errors in browser dev tools (F12)

### Integration Testing (Before pushing)

- [ ] Model selector loads all models correctly
- [ ] Chat accepts messages in all categories
- [ ] Auto-detection assigns correct category (test 3+ queries)
- [ ] Preferred models show for each category
- [ ] Quick prompts rotate and work
- [ ] Category toggle persists after page reload
- [ ] Unrestricted mode toggle works
- [ ] All 9 languages display correctly

### Regression Testing (Spot checks)

- [ ] General chat still works
- [ ] Model switching doesn't crash
- [ ] Storage requirement still met
- [ ] Previous tasks still work (check git history)

---

## Communication Protocol

### Update Task Tracker Before/During/After

**Format for ongoing work:**

```markdown
## Phase X: Task Name
- [~] Task description
  - Agent: your-agent-name
  - Started: 2026-01-28 14:30
  - Status: In progress
    - Downloaded 3/6 models
    - Updated manifest.json
    - Testing now...
```

**Format when completing:**

```markdown
## Phase X: Task Name
- [x] Task description
  - Agent: your-agent-name
  - Completed: 2026-01-28 15:45
  - Changes:
    - Removed 12 models (freed 38GB)
    - Added 6 reasoning models (added 25GB)
    - Net: -13GB storage
```

### Handoff to Next Agent

Add to TASK_TRACKER.md:

```markdown
## Notes for Next Agent
- Completed: Model cleanup Phase 1 (freed 38GB)
- In progress: Downloading reasoning models (3/6 done, took 45min total)
- Blocked: None
- Next step: Continue Phase 2, update UI for new categories
- Important: Total storage now 75GB, can fit 2 more large models before hitting limit
```

---

## Emergency Procedures

### Procedure 1: UI Broke After Changes

```bash
# 1. Identify what broke
git status  # See what changed
git diff USB_ASSISTANT/ui/src/  # See exact changes

# 2. Revert to last working commit
git log --oneline | head -5
git checkout <commit-hash> -- USB_ASSISTANT/ui/src/

# 3. Rebuild
cd USB_ASSISTANT/ui
npm run build
cp -R dist/* ../static/

# 4. Test
# Visit http://127.0.0.1:5173 in browser
# Check for errors in browser console (F12)
```

### Procedure 2: Model Index Corrupted

```bash
# 1. Backup current manifest
cp USB_ASSISTANT/models/manifest.json USB_ASSISTANT/models/manifest.json.backup

# 2. Regenerate index
rm USB_ASSISTANT/data/model_index.json 2>/dev/null
curl -X POST http://127.0.0.1:7777/api/models/refresh

# 3. Verify
curl http://127.0.0.1:7777/api/models/list | jq . | head -20

# 4. If still broken, restore backup
cp USB_ASSISTANT/models/manifest.json.backup USB_ASSISTANT/models/manifest.json
```

### Procedure 3: Storage Exceeded 93GB

```bash
# 1. Check current size
du -sh USB_ASSISTANT/models/

# 2. Find largest models
ls -lhS USB_ASSISTANT/models/*.gguf | head -10

# 3. Remove optional models first (in priority order):
# - Llama 3.3 70B (28GB) - not in 128GB plan
# - Marco-o1 7B (4.7GB) - optional STEM model
# - GLM-4.7 Thinking (2.7GB) - optional tiny model
# - Duplicates (check for models in same category)

# 4. Use Task 5 (Remove Model) procedure
```

### Procedure 4: Backend Won't Start

```bash
# 1. Kill any lingering processes
pkill -f "usb-assistant"
pkill -f "node"
sleep 2

# 2. Check logs
cd USB_ASSISTANT
./Start-macOS.command 2>&1 | head -50

# 3. Check if port is in use
lsof -i :7777  # If something is using it, kill it

# 4. Last resort: restore clean start
git status
# If too many changes, reset to last commit
git checkout HEAD -- USB_ASSISTANT/

# 5. Restart
./Start-macOS.command
```

---

## Code Examples by Task Type

### Example: Detecting Category from User Input

```typescript
function inferCategory(prompt: string): LLMCategory {
  const lowerPrompt = prompt.toLowerCase();

  // Reasoning category
  if (lowerPrompt.match(/solve|step-by-step|prove|logical|think|reason|deduce/i)) {
    return 'reasoning';
  }

  // STEM category (merged from mathematics + chemistry)
  if (lowerPrompt.match(/math|equation|calculus|algebra|geometry|chemistry|molecule|compound|reaction/i)) {
    return 'stem';
  }

  // Coding category
  if (lowerPrompt.match(/code|program|debug|function|class|algorithm|javascript|python/i)) {
    return 'coding';
  }

  // Medical category
  if (lowerPrompt.match(/medicine|health|doctor|disease|symptom|treatment|patient/i)) {
    return 'medical';
  }

  // Survival category
  if (lowerPrompt.match(/survival|wilderness|emergency|outdoor|camp|knot|fire/i)) {
    return 'survival';
  }

  // Building category
  if (lowerPrompt.match(/build|construct|architecture|blueprint|material|tool/i)) {
    return 'building';
  }

  // Multilingual detection (non-English text)
  if (lowerPrompt.match(/\p{Script=Arabic}|\p{Script=Cyrillic}|café|naïve/u)) {
    return 'multilingual';
  }

  // Default
  return 'general';
}
```

### Example: Manifest Entry Structure

```json
{
  "id": "qwq-32b",
  "display_name": "QwQ 32B Preview",
  "filename": "qwq-32b-preview.q4_k_m.gguf",
  "size_gb": 18,
  "min_ram_gb": 24,
  "recommended_ram_gb": 32,
  "recommended_ctx": 32768,
  "category": "reasoning",
  "uncensored": false,
  "notes": "Advanced reasoning model with step-by-step thinking. Best for complex problem-solving, mathematical proofs, and code debugging.",
  "download_url": "https://huggingface.co/Qwen/QwQ-32B-Preview-GGUF",
  "benchmarks": {
    "aime": "79.5%",
    "livecode": "63.4%",
    "livebench": "73.1%"
  },
  "tags": ["reasoning", "math", "code", "thinking"],
  "default_for_category": true
}
```

### Example: Category Color Mapping

```typescript
const categoryColors: Record<LLMCategory, string> = {
  general: 'bg-blue-500',
  reasoning: 'bg-purple-500',
  coding: 'bg-green-500',
  medical: 'bg-red-500',
  stem: 'bg-yellow-500',
  survival: 'bg-orange-500',
  building: 'bg-amber-600',
  multilingual: 'bg-pink-500'
};

const categoryIcons: Record<LLMCategory, string> = {
  general: '💬',
  reasoning: '🧠',
  coding: '💻',
  medical: '⚕️',
  stem: '🧪',
  survival: '🏕️',
  building: '🏗️',
  multilingual: '🌍'
};
```

---

## Workflow Examples

### Example Workflow: Complete a Phase

**Scenario:** You're assigned Phase 2 (Model Downloads)

**Day 1 Morning:**
1. Read `/TASK_TRACKER.md` - See Phase 2 status
2. Check storage: `du -sh USB_ASSISTANT/models/` (currently 55GB)
3. Start downloading: `cd USB_ASSISTANT/models && wget [url for QwQ-32B]`
4. Update TASK_TRACKER: Mark Phase 2 as [~] In Progress

**Day 1 Afternoon:**
- Download 1 model (18GB took 2 hours)
- Add to manifest.json
- Update TASK_TRACKER: "Downloaded QwQ-32B (1/6 models)"

**Day 2:**
- Download remaining 5 models (spans full day)
- Add all to manifest.json
- Update TASK_TRACKER: "All 6 models downloaded, adding to manifest"
- Run refresh: `curl -X POST http://127.0.0.1:7777/api/models/refresh`
- Verify all appear in UI

**Day 2 End:**
- Update TASK_TRACKER: Mark Phase 2 as [x] Done
- Add handoff note: "All 6 new models added, total storage now 92GB (within limit). UI updates ready for Phase 3."
- Commit: `git add . && git commit -m "Phase 2: Add 6 reasoning + multilingual models"`

---

## Performance Tips

### Speeding Up Model Downloads

```bash
# Use multiple connections for faster download
aria2c -x 8 -s 8 "https://huggingface.co/path/to/model.gguf"

# Monitor progress
watch -n 1 'du -sh USB_ASSISTANT/models/'
```

### Checking What's Taking Up Space

```bash
# See top 10 largest models
ls -lhS USB_ASSISTANT/models/*.gguf | head -10

# See all models sorted by size
ls -lhS USB_ASSISTANT/models/*.gguf
```

### Optimizing Quantization

```bash
# If a model is too large, check its quantization
# Q4_K_M = good balance (recommended)
# Q3_K_M = smaller but lower quality
# Q5_K_M = larger but better quality

# Llama 3.3 70B examples:
# - Q3_K_M: ~28GB (128GB USB only option)
# - Q4_K_M: ~41GB (too large)
# - Q5_K_M: ~51GB (too large)
```

---

## Questions & Troubleshooting

### "How do I know if a model is good?"

Check benchmarks:
- AIME (math): Higher % = better reasoning
- LiveCodeBench (code): Higher % = better coding
- MATH-500: Higher % = better mathematical reasoning
- For general: Compare MMLU, HellaSwag, ARC, TruthfulQA

All recommended models have verified benchmarks in `/MODEL_STRATEGY.md` Part 11.

### "What if my branch diverges from main?"

```bash
# Check current status
git status
git log --oneline -5

# Rebase on main
git fetch origin
git rebase origin/main

# If conflicts occur
git status  # See what conflicted
# Edit conflicts manually, then:
git add .
git rebase --continue
```

### "How do I revert my changes?"

```bash
# Revert one file
git checkout HEAD -- USB_ASSISTANT/ui/src/pages/ChatPage.tsx

# Revert everything (careful!)
git checkout HEAD -- .

# See what you reverted
git status
```

### "Storage calculation seems wrong?"

```bash
# Get accurate total
du -sh USB_ASSISTANT/models/

# Or count individual files
du -sh USB_ASSISTANT/models/*.gguf | awk '{s+=$1} END {print s}'

# Compare to manifest
jq '[.[] | .size_gb] | add' USB_ASSISTANT/models/manifest.json
```

---

## Next Steps After Onboarding

1. **Read** all reference files (30 min)
2. **Check** current status: `git status`, `du -sh USB_ASSISTANT/models/`
3. **Update** TASK_TRACKER.md with your name
4. **Pick** one task from current phase
5. **Ask** questions before starting
6. **Commit** with descriptive messages
7. **Handoff** with clear notes for next agent

---

## Quick Reference Commands

```bash
# Backend start
cd USB_ASSISTANT && ./Start-macOS.command

# Frontend dev
cd USB_ASSISTANT/ui && npm run dev

# Model management
curl -X POST http://127.0.0.1:7777/api/models/refresh  # Rebuild index
curl http://127.0.0.1:7777/api/models/list | jq .       # List all models

# Storage checks
du -sh USB_ASSISTANT/models/                             # Total size
ls -lhS USB_ASSISTANT/models/*.gguf | head -10          # Top 10 largest
find USB_ASSISTANT/models/ -name "*.gguf" | wc -l       # Model count

# Git workflow
git status                                               # Check changes
git add USB_ASSISTANT/models/manifest.json               # Stage changes
git commit -m "Add QwQ-32B reasoning model"              # Commit
git log --oneline | head -10                            # See history

# UI build
cd USB_ASSISTANT/ui && npm run build                    # Production build
cp -R dist/* ../static/                                 # Sync to backend
```

---

## Contact & Escalation

- **Blocked on task?** Update TASK_TRACKER.md with `[!] Blocked` and explanation
- **Storage exceeded?** See Emergency Procedure 3
- **UI broken?** See Emergency Procedure 1
- **Model won't load?** Check manifest.json syntax, run refresh endpoint
- **Not sure about next step?** Check `/MODEL_STRATEGY.md` Part 7 (Implementation Steps)

---

**Last Updated:** 2026-01-28
**Version:** 1.0 - Agent Collaboration Guide
**Status:** Ready for multi-agent development

