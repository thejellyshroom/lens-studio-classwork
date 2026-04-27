---
name: agentic-spectacles-pack
description: Routes Spectacles and Lens Studio work to the correct bundled skill under agentic-tools/skills. Use when building or debugging Spectacles templates, Lens Studio TypeScript, Sync Kit, Snap ML, Snap Cloud, SIK, MCP wiring, or any API listed in the catalog below.
---

# Agentic Spectacles skills pack

This workspace includes curated skills in **`agentic-tools/skills/<skill-name>/SKILL.md`**. Before implementing or advising on a topic below, **read that file with the Read tool** and follow it. Prefer **`spectacles-conventions`** for any Lens Studio TypeScript authoring or review unless a more specific skill fully covers the task.

Supplementary material: **`agentic-tools/rules/`** (Cursor rules), **`agentic-tools/agents/`** (subagent/delegation hints), and **`agentic-tools/README.md`** (layout and usage).

## Skill catalog (read the matching SKILL.md)

| Skill folder | Use when |
|--------------|----------|
| `spectacles-conventions` | TypeScript conventions, `@component`, decorators, logging, structure |
| `new-lens-script` | New component/script file scaffolding |
| `new-template` | New template/example project layout |
| `lens-debug` | Bugs, TS errors, runtime issues, missing refs |
| `mcp-how-to` | Lens Studio MCP, Developer Mode, IDE connection, ChatTools |
| `sik-interaction` | Hand tracking, pinch, SIK interactables, world camera |
| `api-gesture` | Low-level Gesture Module (custom input, not SIK) |
| `api-camera` | Camera frames, capture, intrinsics, 2D/3D mapping |
| `api-depth` | Depth frames, back-projection, depth AR |
| `api-world-query` | Surface raycast, placement on real surfaces |
| `api-spatial-anchors` | Persistent world anchors |
| `api-custom-locations` | Scanned-space, location-locked AR |
| `api-location` | GPS, Places, outdoor / map features |
| `api-motion-controller` | Phone as 6DoF controller, haptics |
| `api-keyboard` | Text input / keyboards |
| `api-asr` | Speech-to-text |
| `api-internet` | HTTP, fetch, remote media |
| `api-websocket` | WebSockets via InternetModule |
| `api-web-view` | WebView embedding (experimental) |
| `api-bluetooth` | BLE GATT |
| `api-leaderboard` | Scores and leaderboards |
| `snap-ml` | SnapML / on-device vision models |
| `snap-cloud` | Snap Cloud / backend persistence |
| `sync-kit` | Multiplayer / shared state (SpectaclesSyncKit) |
| `api-spatial-image` | Spatial Image / 3D photo meshes |
| `ai-remote-service` | RSG, Gemini/OpenAI/Snap3D remote AI |

## Workflow

1. Match the user task to one or more rows above (start with `spectacles-conventions` for TS).
2. Read **`agentic-tools/skills/<folder>/SKILL.md`** for each.
3. Implement or answer using those instructions; cite official Spectacles/Lens Studio docs when the skill points there.

If multiple skills apply (e.g. `api-internet` + `api-websocket`), read both and reconcile constraints (experimental APIs, platform limits).
