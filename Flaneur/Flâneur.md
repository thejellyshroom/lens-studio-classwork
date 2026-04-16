# **Flâneur**

## **Genre / Market Sector**

Flâneur lives in the space between social coordination apps and experiential travel tools. The closest analogs are audio tour apps and live location sharing tools like Find My Friends. The market is anyone who explores shared spaces in a loose group: museums, farmers markets, festivals, flea markets, college campuses, street fairs. The experience is designed for people who want to be together without being glued together.

## **App Description**

Flâneur is a shared spatial layer that lives on top of any physical environment you're moving through with other people. Once a group pairs up, each member gets a persistent awareness of where the others are and what they're finding without anyone having to stop, pull out a phone, or text. 

The experience is built around knowing where your people are, sharing what catches your eye in the moment, and ending with something that captures what the visit actually felt like. You can pin places you see, which integrates directly with the device camera: frame something you want to share and the pin is dropped automatically from the live viewfinder. Flâneur grows more useful the more you use it together. A group that visits the same farmers market every Sunday builds up a shared history of pins, favorites, and stall recommendations that makes each visit richer than the last. Because pins aren't tied to in-person sessions, the social layer stays alive between visits. When a friend drops a pin somewhere across the city, friends get a notification and can react, ask, or save it to their own history. Flâneur works as well on a solo Tuesday errand as it does on a group outing.

## **Design Challenges**

The primary challenge is spatial awareness without information overload. The goal is a light, ambient layer. Flâneur is designed for small groups of two to four people. Larger groups create too many simultaneous signals and the spatial layer becomes cluttered. Another challenge is environment variability. A museum is relatively contained and predictable; a street festival is chaotic, crowded, and loud. Wayfarer needs to work in both without requiring precise GPS or perfect spatial anchoring. 

The last challenge is anchor reliability. Rather than anchoring content to specific physical surfaces (which can drift or fail), most of Flâneur’s UI is body-relative or direction-relative. The one exception is the "meet here" drop, which anchors to a physical location, but this is designed to be approximate and forgiving, functioning more like a beacon than a precise pin.

**Interaction and Physics**

Interactions are designed to be fast, one-handed, and interruptible. You should be able to do anything Flâneur offers without stopping walking or breaking conversation.

**The Compass** is always present as a subtle peripheral element that indicates where your group members are. Each person has a color. 

**Pinning** is the core active interaction. You look at something — a painting, a market stall, a dish at a food stand — and perform a simple pinch gesture to drop a pin on it. The pin is visible to your whole group as a floating marker above the object. Pins are lightweight and temporary by default, fading after a few hours unless someone explicitly saves them.

**Reactions** let you respond to someone else's pin without words. A small radial of three options appears when you look at a pin: a glow of approval, a floating question mark, and a "come see this" pulse that briefly brightens the pin for everyone in the group.

**Meet Here** lets anyone in the group drop an AR beacon on a physical spot. Everyone else's compass immediately reorients toward it, and a marker hovers above the spot.

**The Recap** assembles automatically at the end of a session. When the group disbands, Flâneur generates a shared visual summary of everything that got pinned, organized by who found it. Each person's pins are clustered by their color, with the most-reacted-to items larger. It's saved to the group's shared history and gets richer over multiple visits.

## **Rewards**

The immediate reward is the experience itself of moving through a space with people with Flâneur and gaining the low-level awareness of where your friends are,and the ability to share a moment of discovery without interrupting the flow. The social reward is seeing what other people in your group pin and how they react to what you pin.

The accumulative reward is the shared history. Every visit adds to a group's archive of pins, reactions, and recaps. Returning to a place you've visited with Flâneur before surfaces your old pins as faint ghost markers. 

The last layer of rewards is the point system. The more reactions someone’s pin gets, the more points they earn. Points can be spent on a more diverse set of reaction stickers. Friends can issue Challenges to each other to visit a specific stall, try something unfamiliar, or explore a part of a space you'd normally walk past. Completing a challenge earns double points on every pin dropped during that visit. Challenges can be as loose or specific as the friendship allows: *find something orange*, *try the new ramen spot*, *make it to the back half of the market*.

## **Visual Render Style**

The visual language is minimal in the moment. The AR layer is sparse with glows, directional indicators, and small floating markers. UI elements are simple in muted colors. The end-of-visit summary is more spatial, and pins are rendered as illustrated cards and arranged as a collage.

