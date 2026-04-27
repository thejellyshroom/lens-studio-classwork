# **Flâneur**

## **Current build target (MVP — scoped)**

Flâneur’s full vision includes persistent history, ghost pins, and end-of-session recaps. **For the current Lens Studio build, the scope is intentionally smaller** so we can reliably ship a working multiplayer loop:

- **Session-scoped multiplayer (2–4 people)** via Connected Lens / Sync Kit
- **Peer compass**: always-on direction indicators to your group members
- **Shared pins**: drop a pin, everyone sees it, and it reconstructs in the right place
- **Guide me here (navigation target)**: tap a pin row in the sidebar (`RectangleButton` per row) → your compass retargets to that pin. The label under the arrow uses the **possessive pin label** (for example **“Jess’s pin”**), not the raw pin title alone. **Persistent navigation line** (`Navigation` → `Text`): shows where the group is headed—for example when someone else picks a pin, everyone sees that status here. **Navigate** jumps you to the same shared target; **Reset** clears your nav target and returns the compass to **peers**. Short **toasts** stay **transient** (remote notifications), not the home for local nav status.
- **UI feedback:** pin drop, button presses, and “someone navigated to a pin” can drive `AudioComponent`s via `FlaneurUiSfx.js` (UISFX prefab in scene).

**Explicitly deferred (post-MVP):** Custom Locations anchoring, Snap Cloud persistence, ghost pin reveal, recap collage generation, world-radial reactions, points/challenges, clutter/LOD systems beyond basic sanity.

## **Genre / Market Sector**

Flâneur lives in the space between social coordination apps and experiential travel tools. The closest analogs are audio tour apps and live location sharing tools like Find My Friends. The market is anyone who explores shared spaces in a loose group: museums, farmers markets, festivals, flea markets, college campuses, street fairs. The experience is designed for people who want to be together without being glued together.

## **App Description**

Flâneur is a shared spatial layer that lives on top of any physical environment you're moving through with other people. Once a group pairs up, each member gets a persistent awareness of where the others are and what they're finding without anyone having to stop, pull out a phone, or text. 

The experience is built around knowing where your people are, sharing what catches your eye in the moment, and staying in motion. You can pin places you see, which integrates directly with the device camera: frame something you want to share and the pin is dropped from the live view. When someone drops a pin you care about, you can tap its row in the sidebar to **Guide me here**—your compass retargets so you can converge without stopping to text. A dedicated **navigation** readout shows who is navigating where (persistent for the session UI); optional **Navigate** / **Reset** controls match others to the shared target or snap the compass back to people.

Over time (later versions), Flâneur grows into a shared history of places and moments: saved pins, return-visit ghost pins, and recaps that capture what the visit felt like. Those persistence features are part of the product vision, but intentionally **not required** for the MVP build.

## **Design Challenges**

The primary challenge is spatial awareness without information overload. The goal is a light, ambient layer. Flâneur is designed for small groups of two to four people. Larger groups create too many simultaneous signals and the spatial layer becomes cluttered. Another challenge is environment variability. A museum is relatively contained and predictable; a street festival is chaotic, crowded, and loud. Flâneur needs to work in both without requiring precise GPS or perfect spatial anchoring. 

The last challenge is anchor reliability. Rather than anchoring content to specific physical surfaces (which can drift or fail), most of Flâneur’s UI is body-relative or direction-relative. The one exception is the "meet here" drop, which anchors to a physical location, but this is designed to be approximate and forgiving, functioning more like a beacon than a precise pin.

**Interaction and Physics**

Interactions are designed to be fast, one-handed, and interruptible. You should be able to do anything Flâneur offers without stopping walking or breaking conversation.

**The Compass** is always present as a subtle peripheral element that indicates where your group members are. Each person has a color. 

**Pinning** is the core active interaction. You look at something — a painting, a market stall, a dish at a food stand — and perform a simple pinch gesture to drop a pin on it. The pin is visible to your whole group as a floating marker above the object. Pins are lightweight and temporary by default, fading after a few hours unless someone explicitly saves them.

**Guide me here (MVP)** lets you select a pin (sidebar row) and retarget your compass toward it so you can converge quickly without texting. While a pin is the active target, the compass label shows the **possessive** form (**“Jess’s pin”**). A persistent **navigation** line shows group-wide “who is going where”; **Navigate** and **Reset** align you with the shared target or return the compass to peers. Toasts remain brief alerts (for example remote activity), not the main nav readout.

**Reactions** let you respond to someone else's pin without words. A small radial of three options appears when you look at a pin: a glow of approval, a floating question mark, and a "come see this" pulse that briefly brightens the pin for everyone in the group.

**Meet Here (later)** lets anyone in the group drop an AR beacon on a physical spot. Everyone else's compass immediately reorients toward it, and a marker hovers above the spot.

**The Recap (later)** assembles automatically at the end of a session. When the group disbands, Flâneur generates a shared visual summary of everything that got pinned, organized by who found it. Each person's pins are clustered by their color, with the most-reacted-to items larger. It's saved to the group's shared history and gets richer over multiple visits.

## **Rewards**

The immediate reward is the experience itself of moving through a space with people with Flâneur and gaining the low-level awareness of where your friends are,and the ability to share a moment of discovery without interrupting the flow. The social reward is seeing what other people in your group pin and how they react to what you pin.

The accumulative reward is the shared history. Every visit adds to a group's archive of pins, reactions, and recaps. Returning to a place you've visited with Flâneur before surfaces your old pins as faint ghost markers. 

The last layer of rewards is the point system. The more reactions someone’s pin gets, the more points they earn. Points can be spent on a more diverse set of reaction stickers. Friends can issue Challenges to each other to visit a specific stall, try something unfamiliar, or explore a part of a space you'd normally walk past. Completing a challenge earns double points on every pin dropped during that visit. Challenges can be as loose or specific as the friendship allows: *find something orange*, *try the new ramen spot*, *make it to the back half of the market*.

## **Visual Render Style**

The visual language is minimal in the moment. The AR layer is sparse with glows, directional indicators, and small floating markers. UI elements are simple in muted colors. The end-of-visit summary is more spatial, and pins are rendered as illustrated cards and arranged as a collage.

