# Survival Companion - Product Specification

## Overview
A portable, offline survival knowledge device. Replaces carrying dozens of survival books with a conversational AI.

## Target Market
- Preppers building knowledge
- Campers/hikers wanting reference material
- Off-grid homesteaders
- Survival hobbyists

## Hardware

| Component | Selection | Notes |
|-----------|-----------|-------|
| Compute | Raspberry Pi 5, 16GB | Main processing unit |
| Display | 4.2" e-ink | Sunlight readable, low power |
| Voice Input | USB microphone | For conversational mode |
| Text Input | Thumb keyboard | Beepberry-style |
| Audio Output | Small speaker | Optional TTS |
| Storage | 128GB+ microSD | OS + model + knowledge base |
| Power | Battery + solar option | Details TBD |

## Input Modes
1. **Voice** - Hold button, speak question, release
2. **Text** - Type question on keyboard, press enter

## Output
- Answer displayed on e-ink screen
- Optional TTS audio playback

## Interaction Flow
```
Power on → Choose voice or text → Input question → "Thinking..." → Display answer → Repeat or auto-off (5 min idle)
```

## Performance Targets
- Response time: <20 seconds typical
- Battery life: Multiple days with moderate use
- Works fully offline

## Constraints
- No internet required
- Single user device (one query at a time)
- Educational reference tool (not emergency medical device)
