# Lens Studio API — Agent Reference

**Purpose:** Use this doc for fast lookup and patterns. For **exact method/property signatures**, search `API.md` by type or method name (e.g. `SceneObject`, `getComponent`, `createSceneObject`).

---

## 1. How to Use This Document

- **Agents:** Read sections 2–4 first (entry points, lifecycle, events). Use section 7 (patterns) for copy-paste idioms. Use section 8 (module index) to find the right namespace, then grep `API.md` for that type for full signatures.
- **Full API:** All types and members are in `API.md` (raw dump). This file is a structured summary and pattern guide.

---

## 2. Entry Points (Global Namespace)

Available in script context:

| Symbol | Type | Description |
|--------|------|-------------|
| `script` | `ScriptComponent` | The component attached to the script's scene object. Use for `createEvent()`, `api`, and script lifecycle. |
| `scene` | `ScriptScene` | The scene. Use to create objects, get root objects, create render targets. |
| `global` | object | Container for systems and utilities (see below). |

**`global` members:**

| Member | Type | Use |
|--------|------|-----|
| `global.scene` | `ScriptScene` | Same as `scene`. |
| `global.debugRenderSystem` | `DebugRender` | Draw debug shapes (lines, boxes, spheres). |
| `global.deviceInfoSystem` | `DeviceInfoSystem` | OS, camera, mobile/desktop, Spectacles, screen scale. |
| `global.hapticFeedbackSystem` | `HapticFeedbackSystem` | Trigger haptics. |
| `global.launchParams` | `GeneralDataStore` | Key-value store for launch parameters. |
| `global.localizationSystem` | `LocalizationSystem` | Localized strings, dates, numbers. |
| `global.persistentStorageSystem` | `PersistentStorageSystem` | Persist data. |
| `global.textInputSystem` | `TextInputSystem` | Text input. |
| `global.touchSystem` | `TouchDataProvider` | Touch blocking and exceptions. |
| `global.userContextSystem` | `UserContextSystem` | Snapchat user/friends/context. |

**Other globals:**

- `console` — `log`, `warn`, `error`, `debug`, `info`, `trace`, `time`, `timeEnd`, `timeLog`
- `print(message: any)` — print to log
- `require(moduleName: string | ScriptAsset): any` — load module
- `requireAsset(name: string): Asset` — get asset by name
- `requireType(name: string): string` — type name
- `isNull(reference: any): boolean` — check null/destroyed reference
- `failAsync(error: any): void` — fail async flow
- `getDeltaTime(): number`, `getTime(): number`, `getAbsoluteStartTime(): number`, `getRealTimeNanos(): number` — time helpers

---

## 3. Lifecycle and Update

- **TurnOnEvent** — Fired when the lens turns on. Use for one-time setup (find objects, cache components, subscribe to events).
- **UpdateEvent** — Fired every frame. Use for per-frame logic. `getDeltaTime()` on the event for frame delta.
- **LateUpdateEvent** — After update. Use for logic that must run after other scripts’ UpdateEvent. Also has `getDeltaTime()`.

**Script events:** Create via `script.createEvent(eventType)`, then call `.bind(callback)` on the returned `SceneEvent`. Remove with `script.removeEvent(event)`.

**Example:**

```ts
const turnOn = script.createEvent('TurnOnEvent')
turnOn.bind(() => {
  // One-time setup
})

const update = script.createEvent('UpdateEvent')
update.bind(() => {
  const dt = update.getDeltaTime()
  // Per-frame logic
})
```

---

## 4. Event System (Generic Events)

Types: `event0` (no args) through `event7` (7 args). Used as properties on components (e.g. `onTap`, `onFaceFound`).

- **Subscribe:** `event.add(callback): EventRegistration`
- **Unsubscribe:** `event.remove(eventRegistration): void`

**Example:**

```ts
const reg = someComponent.onTap.add((args) => { /* ... */ })
// later
someComponent.onTap.remove(reg)
```

For **SceneEvent** (TurnOnEvent, UpdateEvent, etc.): use `script.createEvent('UpdateEvent')` then `.bind(callback)`; no `.add()`.

---

## 5. Scene and Hierarchy

**ScriptScene (`scene`):**

- `scene.createSceneObject(name: string): SceneObject`
- `scene.getRootObject(index: number): SceneObject`
- `scene.getRootObjectsCount(): number`
- `scene.createRenderTargetTexture(): Texture`
- `scene.createDepthStencilRenderTargetTexture(): Texture`
- `scene.captureTarget`, `scene.liveTarget`, `scene.liveOverlayTarget` — textures
- `scene.getCameraType(): string`
- `scene.isRecording(): boolean`
- `scene.isRayTracingSupported: boolean`

**SceneObject:**

- Hierarchy: `getParent(): SceneObject`, `getChild(index): SceneObject`, `getChildrenCount(): number`, `children: SceneObject[]`, `hasParent()`, `isDescendantOf(obj)`
- Components: `getComponent(componentType): Component`, `getComponentByIndex(componentType, index)`, `getComponentCount(componentType)`, `getComponents(componentType)[]`, `getFirstComponent(componentType)`, `getAllComponents()`, `getComponentInDescendants(...)`, `getComponentInAncestors(...)`, `createComponent(typeName): Component`, `copyComponent(component): Component`
- Copy/destroy: `copySceneObject(so): SceneObject`, `copyWholeHierarchy(so): SceneObject`, `destroy(): void`
- State: `enabled: boolean`, `name: string`, `layer: LayerSet`, `getRenderLayer(): number`, `isEnabledInHierarchy`, `onEnabled`, `onDisabled`

**Transform (from `sceneObject.getTransform()`):**

- Position: `getLocalPosition(): vec3`, `setLocalPosition(vec3)`, `getWorldPosition(): vec3`, `setWorldPosition(vec3)`
- Rotation: `getLocalRotation(): quat`, `setLocalRotation(quat)`, `getWorldRotation(): quat`, `setWorldRotation(quat)`
- Scale: `getLocalScale(): vec3`, `setLocalScale(vec3)`, `getWorldScale(): vec3`, `setWorldScale(vec3)`
- Matrix: `getMatrix(): mat4`, `getWorldTransform(): mat4`, `getInvertedWorldTransform(): mat4`, `setLocalTransform(mat4)`, `setWorldTransform(mat4)`
- Directions: `forward`, `back`, `up`, `down`, `left`, `right` (vec3)

**Component (base):**

- `getSceneObject(): SceneObject`
- `getTransform(): Transform`
- `enabled: boolean`, `isEnabledInHierarchy: boolean`
- `destroy(): void`

---

## 6. Math Types (Summary)

- **vec2 / vec3 / vec4** — `x,y` (and `z`, `w`). Methods: `add`, `sub`, `mult`, `div`, `normalize`, `length`, `distance`, `lerp`, `dot`, `cross` (vec3), etc. Properties: `length`, `lengthSquared`.
- **quat** — Rotation. `x,y,z,w`. Methods: `multiply`, `slerp`, `lerp`, `fromEulerAngles`, `toEulerAngles`, `angleAxis`, `lookAt`, `invert`, etc.
- **mat4** — 4×4 matrix. `compose(translation, rotation, scale)`, `fromTranslation`, `fromScale`, `fromRotation`, `perspective`, `orthographic`, `lookAt`, `inverse`, `multiplyPoint`, `multiplyDirection`, etc.
- **Rect** — `left`, `right`, `bottom`, `top`; `create(left, right, bottom, top)`, `getCenter()`, `getSize()`, `setCenter`, `setSize`.

For full method lists, grep `^vec3$`, `^quat$`, `^mat4$`, etc. in `API.md`.

---

## 7. Common Patterns

**Create a new scene object and get Transform:**

```ts
const so = scene.createSceneObject('MyObject')
const t = so.getTransform()
t.setLocalPosition(new vec3(0, 0, 0))
```

**Get a component from a scene object (by type name):**

```ts
const cam = scene.getRootObject(0).getComponent('Component.Camera')
const mesh = someObject.getComponent('Component.MeshVisual')
```

**Find an object by name (walk hierarchy):**

```ts
function findByName(root: SceneObject, name: string): SceneObject | null {
  if (root.name === name) return root
  for (let i = 0; i < root.getChildrenCount(); i++) {
    const found = findByName(root.getChild(i), name)
    if (found) return found
  }
  return null
}
// Usage: iterate scene.getRootObject(i) for each root
```

**Subscribe to UpdateEvent and use delta time:**

```ts
const ev = script.createEvent('UpdateEvent')
ev.bind(() => {
  const dt = ev.getDeltaTime()
  // move, animate, etc.
})
```

**Camera: project world to screen / unproject screen to world:**

```ts
const cam = someObject.getComponent('Component.Camera')
const screenPos = cam.worldSpaceToScreenSpace(worldPos)   // vec3 -> vec2
const worldPos = cam.screenSpaceToWorldSpace(normalizedScreenPos, depth)  // vec2 + depth -> vec3
const clipPos = cam.project(worldPos)
const worldFromClip = cam.unproject(clipPos)
```

**Touch / interaction:** Use `InteractionComponent` on a scene object; subscribe to `onTap`, `onTouchStart`, `onTouchEnd`, `onPanStart`, `onPanMove`, `onPanEnd`, `onPinchStart`, etc. Touch system access: `global.touchSystem`.

**Debug draw:**

```ts
global.debugRenderSystem.drawLine(posA, posB, color)
global.debugRenderSystem.drawSphere(position, radius, color)
global.debugRenderSystem.drawBox(position, width, height, depth, color)
// clear: debugRenderSystem.clear(); isAutoClear
```

**Persistent storage:**

```ts
global.persistentStorageSystem.get(key, (value) => { /* string */ })
global.persistentStorageSystem.put(key, value, () => { /* saved */ })
```

**Async / assets:** Many APIs use callbacks (e.g. `onSuccess`, `onFailure`). Use `requireAsset(name)` for assets by name. Use `isNull(ref)` to guard destroyed references.

---

## 8. Module Index (Where to Look in API.md)

Use this to find the right type; then grep `API.md` for that type for full members.

| Module / area | Purpose |
|---------------|--------|
| **SceneObject, Transform, Component** | Hierarchy, transform, component access. |
| **ScriptComponent, ScriptScene** | Script entry point and scene root/creation. |
| **Camera** | Projection, view matrix, render layers, render targets. |
| **AnimationPlayer, AnimationMixer, AnimationClip** | Playback and mixing. |
| **InteractionComponent** | Touch, tap, pan, pinch, scroll, hover. |
| **GestureModule** | Hand gestures (pinch, grab, palm tap, etc.). |
| **DeviceTracking, DeviceTrackingModule** | World/surface/rotation tracking, hit test, point cloud. |
| **WorldQueryModule, HitTestSession** | Raycast / hit test vs world mesh. |
| **FaceMeshVisual, FaceRenderObjectProvider, Head** | Face mesh, landmarks, expressions. |
| **BodyTrackingAsset, BodyComponent** | Body tracking and physics. |
| **Physics (BodyComponent, ColliderComponent, WorldComponent)** | Rigid body, colliders, constraints, raycast. |
| **ClothVisual, HairVisual** | Cloth and hair simulation. |
| **Material, Pass, MeshVisual, RenderMesh** | Rendering and materials. |
| **Texture, TextureProvider** | Textures and sources (camera, screen, etc.). |
| **AudioComponent, AudioTrackAsset** | Audio playback. |
| **VideoTextureProvider** | Video playback. |
| **AsrModule** | Speech recognition (ASR). |
| **VoiceMLModule** | Voice ML (listening, NLP intents/keywords). |
| **CameraModule** | Request camera frame / image. |
| **CameraRollModule** | Camera roll / media picker. |
| **BitmojiModule** | Bitmoji 2D/3D resources. |
| **ConnectedLensModule, MultiplayerSession** | Multiplayer and real-time stores. |
| **CloudStorageModule, CloudStore** | Cloud key-value storage. |
| **LeaderboardModule, Leaderboard** | Leaderboards. |
| **CommerceKitModule, Commerce.Client** | In-app purchases. |
| **InternetModule, RemoteServiceModule** | HTTP, WebSocket, WebView, fetch. |
| **DeepLinkModule** | Open URI, handle incoming URI. |
| **DeviceInfoSystem** | OS, device type, camera, screen scale. |
| **LocalizationSystem** | Localized strings and formats. |
| **UserContextSystem** | Snapchat user, friends, context. |
| **TextInputModule** | Text input. |
| **TextToSpeechModule** | TTS. |
| **HapticFeedbackSystem** | Haptics. |
| **DebugRender** | Debug drawing. |
| **MachineLearning, MLComponent** | ML inference, placeholders. |
| **GeneralDataStore** | In-memory key-value (put* / get* for primitives and arrays). |
| **PersistentStorageSystem** | Persist key-value. |
| **event0 … event7** | Generic event subscription (add/remove). |

---

## 9. Full Signatures

- **Exact method and property signatures** for every type are in **`API.md`**.
- Search by type name (e.g. `SceneObject`, `Camera`, `AnimationPlayer`) or by method name (e.g. `createSceneObject`, `getComponent`, `worldSpaceToScreenSpace`).

---

## 10. ScriptComponent Quick Reference

- `script.api: Record` — custom API surface you can attach to.
- `script.createEvent(eventType: K): SceneEvent` — create TurnOnEvent, UpdateEvent, LateUpdateEvent, etc.
- `script.removeEvent(event: SceneEvent): void` — remove a created event.
- `script.sceneObject` / `script.getSceneObject()` — the scene object this script is on (same as getting from component base).

Use this document for structure and patterns; use **API.md** for exact types and signatures.
