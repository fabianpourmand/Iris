# Technical Stack

## Hardware Platform
**Raspberry Pi 5 (16GB RAM)**
- Rationale: Good balance of cost, power efficiency, and community support
- Alternative considered: Jetson Orin Nano (faster but higher cost/power)

## LLM Runtime
**llama.cpp**
- Best ARM optimization for Pi
- Supports quantized models
- Active development

## Base Model (for fine-tuning)
**Candidates to benchmark:**
1. Llama 3.2 3B
2. Phi-3 Mini 3.8B

**Quantization:** Q4_K_M (balance of speed and quality)

## Speech-to-Text
**Whisper.cpp**
- Offline capable
- Whisper small or distil-whisper for speed
- Runs efficiently on Pi 5

## Text-to-Speech (Optional)
**Piper TTS**
- Fast, offline
- Low resource usage
- Clear voices

## Application Layer
**Python**
- Orchestrates all components
- Handles UI logic
- Manages input/output

## Display Driver
**E-ink library TBD**
- Depends on specific display chosen
- Need partial refresh support

## Operating System
**Raspberry Pi OS (64-bit Lite)**
- Minimal footprint
- Good hardware support

## Data Storage
**SQLite**
- For any structured data (history, settings)
- Simple, no server needed

## Development Tools
- Git for version control
- VS Code / remote SSH for development
- Python venv for dependencies
