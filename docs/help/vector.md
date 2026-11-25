# Vector panel

The Vector layer holds lines and shapes. Lines are the paths that [Line text](styles.md#line-text) writes along; they can also be drawn as strokes.

The panel runs in this order: **Trace from the photo**, **Draw your own**, **Add shapes and text**, **Lines** (or **Selected** when a line is picked), **Bend lines**, and **Layer blending**, folded at the end, with the layer's opacity, blend mode and place in the stack.

## Add shapes and text

Text, rectangle, ellipse, polygon, star and image. They appear in the middle of the picture; move them with the Select tool (V).

With an object selected, the panel shows its settings: size, weight, italic, alignment, line height and letter spacing for text; round corners, sides, points and inner size for shapes; fill, outline, outline width and opacity for all. **On layer** moves it between the Vector layer and the Photo layer. **Front**, **Forward**, **Backward** and **Back** change the stacking order; **Duplicate** and the flips work as you expect.

Alt-drag copies an object. The arrow keys nudge it, by 10 px with Shift.

## Turn text into lines

Select a text object with the Select tool (V). The bar above the picture and the Vector panel then show **Convert to outlines** and **Convert to centerlines**. Both are also in the **Object** menu and in the command palette (Ctrl K).

- **Convert to outlines** (Shift Ctrl O) traces the edges of the letters. The result is one group of closed shapes. The holes of letters such as o, e and a stay open. Text in the plain default color gets a warm gradient; text in a color you chose keeps that color.
- **Convert to centerlines** runs a line down the middle of each stroke. Each line is as wide as the stroke, so it looks like the text and Line text fits it.
- **Size them to fill the artboard** (on at first) scales the result to most of the artboard and centers it.
- **Keep the text as well** leaves the text object in place.

Turned and mirrored text keeps its turn and mirror. Urdu and Arabic words are traced whole, with their letters joined.

## Groups

A group moves, scales, turns, fills and distorts as one shape.

- **Group** (Ctrl G) joins the selected lines and shapes. Rectangles, ellipses, polygons and stars become paths first; text becomes outlines first.
- **Ungroup** (Shift Ctrl G) splits a group into its parts. Each part keeps the group's fill and stroke.
- With the Select tool, a click picks the whole group. Drag inside the box to move it, drag its handles to scale it, and drag the round handle to turn it. Shift keeps 15° steps when turning and lets a corner scale freely.
- Double-click a group to go into it and pick its parts one by one. The box turns dotted. Press Esc, or click outside the group, to leave.
- The Edit points tool (A) still edits single points inside a group.

## Fill

Select a closed line, shape or group. Under **Selected**:

- **Fill the inside** fills it, with or without a stroke.
- **Fill with**: **Solid**, **Linear** or **Radial**. A gradient has a **From** and a **To** color, an **Angle** (linear) or a **Size** (radial), a **Swap** button, and four ready gradients.
- **Leave holes open (even-odd)** keeps shapes inside shapes empty, like the hole in an o.

**Fill every closed shape**, in the Object menu and the Lines section of the panel, gives every closed shape the fill of the selection, or the last fill you used.

Fills and gradients show the same on screen and in every export: PNG, SVG, the PDF for print and the CMYK PDF.

## Distort

The Distort tool (Shift D) bends the selected lines and groups, or every line when nothing is selected, around a point.

- Pick **Bulge**, **Pinch**, **Twist**, **Stretch** or **Arc** in the bar above the picture.
- The round point with a cross is the center. Drag it to move it; it snaps like the pen does.
- The dashed ring shows how far the effect reaches. Drag the ring, or its small square, to change it.
- Drag anywhere else to distort. Away from the center bulges; toward it pinches; around it twists. Stretch and Arc follow the dotted line through the center, set by **Angle**. Arc bends the text into a curve, like a badge.
- **Amount**, **Reach** and **Angle** in the bar change the last distortion again, so you can fine-tune it.
- Each drag is one step to undo. **Center the point** puts the point back in the middle.

## Text effect

The **Text effect** part of the Vector panel, also in the Object menu:

- **Fill the shapes with words** makes a Word cloud that fills the closed shapes, such as converted letters, in a color that reads on their fill. Word cloud and Calligram both have **Vector shapes** under **Shape**.
- **Write along the lines** sets up Line text, which writes your text along the lines.

**The whole layer**, further down the panel, has **Flip all ↔** and **Flip all ↕**. These mirror the lines and the shapes together, around the middle of the picture, so the drawing stays in the frame. Each shape keeps its own turn, mirrored with it. To flip one shape on its own, select it first and use the flips in its own settings. Both are in the Layer menu as **Flip all shapes across** and **Flip all shapes up and down**, and both can be undone.

## Lines

- **Trace from the photo**: Follow dark strokes, light strokes, edges, or **Tones**. Tones draws one line for each tone of a softened copy of the photo, like the contours on a map; it is the best choice for a photo of a face or an animal, and **How many tones** sets how many lines. **How many edges** and **Light and dark split** set how much is found for the others. **Skip wide areas like margins** ignores big flat parts. Click **Trace lines**.
- **Draw your own** with the Pen (P) or the Pencil (N). **Width of new lines** sets how thick they are, which also sets the letter size of Line text.
- Edit points with the Edit points tool (A). Delete removes a point or a line.
- **Draw this line as a stroke** shows a line in the artwork, with a stroke width, and **Fill the inside** fills a closed line. See **Fill** above.
- **Write along the lines**, under **Text effect**, sets up Line text in the Text art panel.

## Snapping

While you draw with the pen or the pencil, edit points and handles, draw shapes and lines, place text, or move, scale and turn shapes and lines, the pointer snaps to useful places. A small pink mark and a word show where it will land before you click.

The menu lists the kinds in four groups.

**Points**

| Snaps to | Where |
| --- | --- |
| End points | The two ends of a line. |
| Points and corners | Every point of a line, and the corners of shapes and the artboard. |
| Mid points | The middle of each piece of a line, of each side of a shape, and of the artboard's sides. |
| Centers | The middle of shapes, closed lines and the artboard. |
| Intersections | Where two lines or outlines cross. |

**Lines**

| Snaps to | Where |
| --- | --- |
| On lines | Anywhere along a line or an outline, including traced lines. |
| Extensions | Past the end of a line, in the direction it was going. A dotted line shows it. Where an extension meets another line or another extension, the word says "extension meets line". |
| Perpendicular | The point on a line that meets it at a right angle from the point you are drawing from. |
| Tangent and handle aim | The point where a line from your last point just touches a curve. When you drag a curve handle, it can also aim straight at the next point, or go on in line with the point before. |
| Centerlines of outlines | Halfway between the two sides of an outline stroke or a letter turned into outlines. Point near the middle of the stroke. |
| Text baselines | The line that text sits on. |
| Track from points you rest on | Rest the pointer on a point for a moment. A small cross marks it, and you can then line up with it and follow its extension. Traced lines join in only this way, so a traced picture does not pull the pointer everywhere. |

**Alignment**

| Snaps to | Where |
| --- | --- |
| Line up with other points | Straight across or straight down from another point. A dotted line shows it. |
| Equal spacing | When you move a shape or a line, the gap to its neighbor can match the other gaps in the row, or it can sit halfway between two neighbors. Short lines mark the equal gaps. |
| 15° angles | Lines from your last point at 0°, 15°, 30° and so on. Near a step, the word also says when the point lines up with another point. When you turn a shape, it clicks into a 15° step when it comes close. |
| Grid | Points land on the grid (off at first). The grid size is in Settings, and **View → Show grid** (Ctrl ') shows it. |
| Guides from the rulers | Onto a guide, where two guides cross, and where a guide meets a line. Pull guides from the rulers (**View → Show rulers**, Ctrl R). Hidden guides do not snap. |

**Photo**

| Snaps to | Where |
| --- | --- |
| Edges in the photo | Strong edges in the picture (off at first). |

The **Snap** button in the bar above the picture turns snapping on or off (Ctrl ;), and the small arrow next to it chooses what to snap to. The same list is under **View → Snapping**. Hold **Alt** while you drag or click to place something freely, just once. Hold **Shift** to keep a line from the pen or the Shape tool, a curve handle or a turn in 15° steps. Lines on a hidden Vector layer are left out.

## Bend lines

**Bulge out** and **Pinch in** bend the selected lines, or every line, around the middle of the picture. **Amount** sets how much. **More with the Distort tool (Shift D)** opens the Distort tool, which has more ways to bend and a center you can move.

## Step and repeat

Makes copies of the selected object. **Copies go**:

- **In a line**: a distance across and down for each copy, with turn, size and fade for each step.
- **Grid**: columns, rows and gaps.
- **Circle**: around a center, how many and how far, turned around the center or not.
- **Along a line**: copies spread along a selected line, turned to follow it or not.

Click **Make copies**.
