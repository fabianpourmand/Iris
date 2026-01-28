# USB AI Assistant - Build Tasks

Last updated: 2026-01-27

## Phase 1 - Foundations
- [x] Lock workspace root to user-selected folder on all tools
- [x] Add file write/edit/delete APIs with atomic writes
- [x] Add SSE streaming endpoint for chat
- [x] Wire streaming chat in UI (useChat + ChatPage)

## Phase 2 - Sandbox Runtime (Wasmtime)
- [x] Add WASI sandbox runner (Wasmtime) with strict FS mapping
- [x] Add tool execution bridge to sandbox runner
- [x] Add resource limits (CPU/time/memory) and cancellation

## Phase 3 - Model Manager (GGUF + manifest)
- [x] Add model indexer (GGUF metadata cache)
- [x] Add model manager UI (list, load, unload, compatibility)
- [x] Add model hot-swap with compatibility checks

## Phase 4 - File Editing UI
- [x] Add FileEditor component (read/write)
- [x] Add file open/save actions to FileExplorer
- [x] Add diff preview + conflict checks
- [x] Add edit transaction log + undo hooks

## Phase 5 - Quality + Polish
- [x] Add error-state UX for LLM not running (auto-start)
- [x] Add safety rails: path validation + denylist
- [x] Add integration tests for tools + chat streaming

## Phase 6 - Language Packs
- [x] Add language pack manifest spec + validation
- [x] Add install/remove/activate with rollback
- [x] Add Settings UI manager

## Phase 7 - Firmware Updates
- [x] Add firmware update pack format + checksum validation
- [x] Add apply/rollback logic
- [x] Add Settings UI status/apply flow

## Phase 8 - Diagnostics + Guides
- [x] Add diagnostics endpoint + Settings panel
- [x] Add offline Guides page + content

## Phase 9 - Pack Creator CLI
- [x] Add pack creator CLI script
- [x] Update pack docs with CLI usage

## Phase 10 - USB Release Packaging
- [x] Add USB release build script
- [x] Sync UI build into static assets during release
- [x] Add GitHub Actions binaries workflow
- [x] Add binary sync helper script
