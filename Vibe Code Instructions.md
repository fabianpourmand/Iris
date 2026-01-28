# Vibe Code Instructions

Quick setup guide for live preview development of the IRIS chat dashboard. Follow these steps to get everything running and start redesigning with instant visual feedback.

---

## Quick Start (2 Commands)

### Step 1: Start Backend Server
```bash
cd "/Users/fabian/Desktop/02_Current Projects/01_Apps/USB_AI_Assistant_Build_Guide/USB_ASSISTANT"
./Start-macOS.command
```
**Wait for:** "IRIS Server is running!" message
**Backend URL:** http://127.0.0.1:7777

### Step 2: Start Vite Dev Server
```bash
cd "/Users/fabian/Desktop/02_Current Projects/01_Apps/USB_AI_Assistant_Build_Guide/USB_ASSISTANT/ui"
npm run dev
```
**Frontend URL:** Usually http://localhost:5173 or http://localhost:5174
**Look for:** "VITE ready" message with the Local URL

---

## Open Live Preview

### Method 1: External Browser (Recommended)
1. Open Chrome/Safari/Firefox
2. Go to the Vite URL shown in terminal (e.g., `http://localhost:5173`)
3. Arrange windows:
   - **Left**: VSCode with ChatPage.tsx
   - **Right**: Browser with your app
4. Edit + Save = Instant update!

### Method 2: VSCode Simple Browser
1. Press `Cmd+Shift+P`
2. Type: `Simple Browser: Show`
3. Enter the Vite URL from Step 2
4. Split editor view: Code left, browser right

---

## What to Edit

### Main Dashboard File
**File:** `/USB_ASSISTANT/ui/src/pages/ChatPage.tsx` (1,098 lines)

**Key sections:**
- **Line 703-725:** Header/Navigation with Active Unit selector
- **Line 722-730:** Category grid panel (top panel)
- **Line 735:** Message area (adjust spacing here)
- **Line 749-850:** Input composer
- **Line 689-699:** Left sidebar (chat history)
- **Line 943-1097:** Right panel (settings)

### Styling
**File:** `/USB_ASSISTANT/ui/src/index.css`

**Colors:**
- `--accent: #1f6d5a` - Forest teal
- `--paper: #f9f7f0` - Cream background
- `--ink: #2d2a23` - Dark text

---

## Layout Structure (Current)

### Header Layout
**Line 703-725:**
- Back button → Category badge (Auto/General/Code/etc)
- **Active Unit selector** (moved from top panel, hidden on mobile < sm)
- Panel toggles (Left/Top/Right), Zen mode, Ready status pill

### Top Panel (Categories)
**Line 722-730:**
- Shows only when Top Panel is toggled on
- Category grid (5 columns on md, can be adjusted)
- Compact sizing: 40px height, 12px icons, small text labels

### Main Message Area
**Line 735-747:**
- Flexible spacing: py-6 sm:py-8 md:py-10 (scales from 24px → 32px → 40px)
- Message gaps: space-y-4 sm:space-y-6 md:space-y-8 (scales from 16px → 24px → 32px)
- Responsive padding: px-3 sm:px-4 md:px-5 lg:px-6

### Input Composer
**Line 749-850:**
- Responsive padding: p-3 sm:p-4 md:p-5 lg:p-6
- Same padding as message area for visual balance

---

## Quick Design Experiments

### 1. Adjust Message Spacing
**Line 735 in ChatPage.tsx:**
```tsx
// Very compact
className="...py-4 sm:py-6 space-y-2 sm:space-y-4..."

// Current (balanced)
className="...py-6 sm:py-8 md:py-10 space-y-4 sm:space-y-6 md:space-y-8..."

// Spacious
className="...py-12 sm:py-14 md:py-16 space-y-8 sm:space-y-10 md:space-y-12..."
```

### 2. Category Grid Layout
**Line 724 in ChatPage.tsx:**
```tsx
// 4 columns (larger cards)
<div className="...md:grid-cols-4...">

// 5 columns (current, balanced)
<div className="...md:grid-cols-5...">

// 6 columns (compact, more categories visible)
<div className="...md:grid-cols-6...">

// 10 columns (ultra-compact for xl screens)
<div className="...md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10...">
```

### 3. Toggle Active Unit in Header
**Line 709-714 in ChatPage.tsx:**
The Active Unit selector is now in the header. To hide it on all screens:
```tsx
// Hide Active Unit (remove the entire div)
// OR hide on specific breakpoints:
className="hidden sm:flex..."  // Currently hidden on mobile
className="hidden md:flex..."  // Hide on tablet and up
className="hidden lg:flex..."  // Hide on large screens and up
```

### 3. Change Colors
**In index.css:**
```css
/* Lighter teal */
--accent: #2d8a70;

/* Darker teal */
--accent: #164a3e;

/* Gold accent */
--accent: #b07b2c;
```

---

## Vibe Coding Workflow

1. **Make a small change** in ChatPage.tsx or index.css
2. **Save** (`Cmd+S`)
3. **See instant update** in browser (< 100ms)
4. **Keep iterating** - trust your visual instincts
5. **No build step needed** - Vite HMR is instant

### Tips:
- Change one thing at a time
- Save frequently to see updates
- Use Tailwind classes for quick styling changes
- Adjust padding/spacing with: `p-4`, `py-6`, `space-y-8`, etc.
- Test responsive design by resizing browser

---

## VSCode Extensions (Already Installed)

- **Live Server** - For preview functionality
- **Tailwind CSS IntelliSense** - Autocomplete for Tailwind classes
- **ES7+ React Snippets** - Fast component creation
- **Auto Rename Tag** - Sync JSX tag changes

---

## Troubleshooting

**Port already in use?**
- Vite will auto-switch to next port (5174, 5175, etc.)
- Use the URL shown in the terminal

**Backend not responding?**
- Check `server.log` in USB_ASSISTANT directory
- Restart: Kill terminal and run `./Start-macOS.command` again

**Preview not updating?**
- Check Vite terminal for errors
- Hard refresh browser: `Cmd+Shift+R`
- Restart Vite: `Ctrl+C` then `npm run dev`

**TypeScript errors?**
- Look for red underlines in VSCode
- Check terminal for error messages
- Error Lens extension shows inline errors

---

## Reference Files

**Mockups for inspiration:**
- `/mockups/chat_page_finance_dashboard_mockup.html`
- `/mockups/chat_page_dashboard_v3_sidebar_secondary_menu.html`

**Component examples:**
- `/USB_ASSISTANT/ui/src/components/CategoryGrid.tsx`
- `/USB_ASSISTANT/ui/src/components/ChatMessage.tsx`

**Design screenshots:**
- `/Ideas/` folder has various dashboard mockups

---

## For Next Agent/Session

**To resume vibe coding:**
1. Run the 2 commands above (backend + vite)
2. Open browser to Vite URL
3. Open ChatPage.tsx in VSCode
4. User says what they want to change
5. Make edits, save, show instant updates
6. Iterate based on visual feedback

**Remember:**
- Both servers must be running
- Edit → Save → Instant visual update
- Keep changes small and iterative
- Trust the user's aesthetic instincts
- Use Tailwind utilities for quick changes

---

## URLs Checklist

- ✓ Backend: http://127.0.0.1:7777
- ✓ Frontend: http://localhost:5173 (or 5174, check terminal)
- ✓ Split view: Code left, preview right
- ✓ Save file = instant update

**Ready to vibe code!** 🎨
