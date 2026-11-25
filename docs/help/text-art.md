# Text art panel

The Text art panel decides which letters are drawn, and how. It runs from the simple settings to the rare ones:

1. **Look**: the style tiles and **Extra effects**, or a recipe.
2. The style itself, with its own settings, **Shuffle** and **Variations**.
3. **Words**: the text box. Styles made of single characters, such as Halftone and ASCII, call it **Characters**.
4. **Size**: letter size, line spacing and text size.
5. **Color**.
6. **Background**: the paper color.
7. Four folded sections: **Mirror**, **Shape**, **Finish** and **Tone**.
8. **Layers**, with **Layer blending** folded at the end.

Before text art is applied, the panel shows only the Look section. The style's settings appear once **Apply text art** or a style tile has chosen a style.

A short note sits under many controls. When there is more to say, a small **?** at the end of the note opens the rest on a line of its own, and the **?** stays filled while it is open.

## Look

**Styles** and **Recipes** are two tabs at the top of the panel. The left and right arrow keys move between them.

**Styles** shows a tile for each style. Click one to use it for the selected layer. **Extra effects** below them are styles from [plugins](plugins.md). Every style and every setting is listed in [Text art styles](styles.md).

**Word cloud** is the first tile, with a small star: it is the signature style of SungFluence, and the first look of **Apply text art**. Before text art is applied, no tile is marked. **Apply text art** starts from a Word cloud that takes its shape from your photo, in the photo's own colors, on warm black paper. A photo that gives no clear shape for it, such as a line drawing or a sunset, starts in the style that suits it best, and a note says so, with a **Word cloud** button. So does a dark subject full of detail, such as the cat, whose eyes and fur a Word cloud on dark paper would lose. A click on the Word cloud tile before you apply gives the signature look on any photo. A click on another tile starts from the same first look (the same words, colors and letter size) in the style you clicked, on white paper.

**Every style** (Shift E), beside the tiles, opens a wall with your own picture and your own words drawn in every style at once, including any extra effects from plugins.

- Click a tile to use that style. What every style shares, such as the color, the letters and the words, comes with you. The rest starts from that style's own settings, so the tile is close to what you will get.
- The style you are using now is marked. Type in **Find a style** to narrow the wall down.
- With more than one text art layer, a checkbox shows the others behind each tile, so the wall matches your artboard.
- Each tile shows the whole picture, so nothing is cut off. Styles that write along the Vector layer need lines: click their tile to trace or draw some.
- The tiles are drawn a few at a time, so the window stays usable while they fill in. A tile says Drawing until it is ready.

**Recipes** shows every recipe as a small picture of your photo, two to a row. Each one is a complete look: style, paper and colors, sometimes two layers together. Click one, then change anything you like. Your own text is kept, and the tab stays open, so you can try the next one. The first recipe, **Word cloud** with a small star, is the signature look: the Word cloud **Apply text art** gives, in your photo's colors on warm black paper. **Outlined cloud** takes the same kind of shape in dark ink on white, with an orange line around it. A Word cloud picture holds the same words in the same shape as the full-size art, only smaller. The pictures are drawn in quiet moments while the Text art panel is open, and they are kept for your photo and artboard, so the tab opens with them ready.

When the text art follows only the lines of the Vector layer, the Recipes tab offers two quick looks for lines instead: white letters on a dark shirt, or black letters on a light one.

## The style and its settings

Under the tiles is the name of the style, a line about what it does, and the settings that belong to that style alone, such as the shape of a Word cloud or the path of a Spiral. The rarer ones are under **More** at the end of the section, such as **More Word cloud settings**.

The two small buttons beside the style's name are **Shuffle** and **Variations**. Point at them to see their names.

- **Shuffle** (the crossed arrows, or the **R** key) lays the same style out again, differently. See [Shuffle](#shuffle).
- **Variations** (the four squares) shows six takes on the current style, and the panel scrolls to them. Click one to use it.

## Words

The text box, with **B**, **I** and **U** for bold, italic and a line under, **Type toolbox** for styled letters and symbols, and **Library** for ready-made words. Under the box, **Marks change the words** turns the [marks](#marks-typed-in-the-text) on or off, and the **?** beside it lists them. ASCII has its **Character set** here instead. In ASCII and Halftone the section is called **Characters**, because those styles draw single characters. In Line text the box is called **Text**: it is written along the lines of the Vector layer.

## Size

**Letter size** comes first. Styles that fill a grid, such as ASCII and Halftone, have **Columns** here too: fewer columns mean bigger letters. Word mosaic and Word cloud have **Largest word** and **Smallest word** instead. Then come **Line spacing** and **Text size**, which makes every letter of the layer bigger or smaller at once. **Typeface** is next.

**More size settings** at the end of the section has the rest: letter spacing, the weight from thin to bold, **Weight follows tone**, **Size follows tone**, italic and capitals. While Weight follows tone is on, the weight comes from the photo, so the weight slider is hidden until you turn it off.

Every style starts with letters big enough to read when the whole picture fits the window. **Text size** makes every letter of the layer bigger or smaller from there, by the same amount. At 150% every letter is half as big again, in every style and in every export. Where a style fills the picture, bigger letters mean fewer of them: ASCII, Braille, Halftone and Typewriter use fewer columns. Text size is saved with the layer, and it starts at 100%.

## Color

The color mode (Photo, Ink, Tone, Duotone, Palette and more), **Color strength**, **Fit colors to the paper**, the set of colors for Palette, and **Limit to inks**, which reduces the colors to 2 to 8 inks for screen print. Click any ink chip to choose another color for it. **+ Custom** picks any ink color, and the eyedropper at its end (where your system has one) takes a color from the screen. The swatch your ink matches is marked, and **Custom** is marked only for a color of your own. In Duotone, **From the photo** beside Shadows and Highlights shows the photo's colors for that ink. See [Color modes in detail](#color-modes-in-detail).

Line text also has **Letters**: **White on dark** sets dark paper and white letters, **Black on light** the other way round. **Printed on**, under Background, then goes back to Auto.

## Background

The paper color behind the letters. The note under the name says so; the swatches follow: a row of swatches, the checkered **Transparent** swatch, and **+ Custom** for any color you like. It is the same Background section as on the Output tab, shown here as well because this is where you are working when you want to change it. A recipe sets it too, so it can change when you pick one. On the T-shirt preview it is the T-shirt color. The Output tab has the rest: the output color model, the margin and the artboard width.

The checkered swatch is **Transparent**. Click it and the artboard shows a checkerboard behind the letters. The clear area stays clear in PNG, SVG and PDF; JPG gets the paper color. Click it again to bring the paper back. If the checkerboard is hard to tell from fine letters, **Show transparency as** right under the swatches shows the clear area as plain **Black** or **White** instead. It changes the screen only, never the file, and it is also under **View > Show transparency as**. The letters are still chosen to show on the paper color you picked, so pick the color you will print on, then Transparent. That paper swatch keeps a thin gray ring while Transparent is on. The Paper and T-shirt previews show the sheet or the shirt through a clear background, so there the choice is grayed out. It is also **Text art > Transparent background** in the menu.

A new picture starts on white. **Apply text art** starts the signature Word cloud on **Warm black**, the dark swatch, a near-black paper with a little warmth in it, and any other first look on white. A style you pick after that keeps the paper you have: from the signature Word cloud, a Text portrait stays on Warm black until you click **White**. The note under **Printed on** names the swatch you use. **Printed on** reads the paper you have, so the letter colors suit it. The note under the picture says what the art is made for, such as **Made for printing on light paper**, or **Transparent background**. Click it to come back to this section.

**Printed on** says what the art will really be printed on:

- **Auto** (the default) reads the paper color, or the T-shirt color on the T-shirt preview, and says what it found, such as "Auto: your paper reads as light". White, cream and pale colors read as light, black and deep colors as dark, and the middle grays as gray.
- **Light**, **Gray** and **Dark** set it by hand. Use them when the art is printed on something other than what the preview shows, for example with a transparent background on a dark T-shirt.

The letter colors are chosen to show on that paper: see **Fit colors to the paper** under Color.

With **Transparent** on, the checkerboard's tones follow Printed on, so you see the letters the way they will look on that kind of paper. On the Paper and T-shirt previews the sheet or the shirt shows through instead.

## Text art uses

**Source** chooses what the letters follow: the **Photo** (its tones), the **Lines** of the Vector layer, or **Both**. Line text needs lines. If there are none when you pick it, SungFluence asks: **Trace lines** follows the tones of the photo (or the strokes of a drawing), **Draw lines** opens the Vector panel with the Pen, and **Cancel** keeps your style. Source does not change on its own.

## Mirror, Shape, Finish and Tone

These four sections are folded. Click a name to open it. A section with something turned on says **(on)**.

- **Mirror**: mirror the writing of this layer, or the whole text art. See [Mirroring](#mirroring).
- **Shape**: **Draw on** puts the letters only on the dark parts, the light parts, or inside or outside a word, heart, circle or star. **Focus and fade** fades the letters toward an oval, a circle, a band or a column. The shape shows on the picture while this section is open: drag the dot to move it, the square handles for size, width and softness, and the round handle to turn it (Shift snaps to 15 degrees). **Strong part** keeps the center or the outside strong; **Fades** thins the letters out, makes them see-through, or both. **Turn the text** turns each piece where it stands; see [Turn the text](#turn-the-text). For a Word cloud it holds **Turn each word**, **Overall turn** and **Tilt at random**.
- **Finish**: **Letter fill** fills the letters with the photo, a soft photo, or cuts them out of a sheet; see [Letter fill](#letter-fill). **Letter effect** adds a shadow, an outline or a riso offset, and **Hand-set wobble** moves each letter a little. Under **See-through**, **Letter opacity** and **See-through in light areas** make the letters see-through. The opacity of the whole layer is in **Layer blending**.
- **Tone**: contrast, brightness and gamma of the tones this layer reads, photo color strength, invert and auto levels. ASCII, Braille and Halftone also have their tone curve here. These change only how this layer reads the picture. The Photo panel changes the picture itself, for every layer.

## Layers

Text art can have several layers of its own, drawn one over the other, for example fine Braille under bold words. **+ Add layer** adds one. On each row: the eye shows or hides it, the copy button duplicates it, the arrow moves it up, and the bin deletes it. Click a layer's name to edit it.

Once there are lines on the Vector layer, **Text art uses** appears here. It chooses what the letters follow: the **Photo** (its tones), the **Lines** of the Vector layer, or **Both**. Line text needs lines; trace or draw some in the Vector panel first.

**Layer blending**, folded at the very end, sets the opacity and blend of the whole Text art layer, moves it up or down the stack, and has **Keep this text art while I edit the photo**.

## The text library

The **Library** button above any text box opens ready-made words and phrases. Tick as many sets as you like and they are mixed together. Besides the general sets there are sets for **Water resources**, **Hydraulics and rivers**, **Flora** and **Fauna**, and one set for each of the 17 United Nations Sustainable Development Goals, named **SDG 1: No poverty** through **SDG 17: Partnerships for the goals**. The SDG names are the official goal titles; the words and phrases in them are ordinary English, written for this app. Type in **Find a set** to narrow the list, which also searches inside the sets, so looking for "flood" finds the sets that hold it. You can edit any set, add your own, and **Reset** puts a built-in set back as it was. Your changes stay on this device.

## Sizes in pixels

A setting measured in artboard pixels, such as Letter size, Line spacing or Largest word, has a box beside its slider. The slider covers the sizes most pictures want; the box takes anything up to five times its top end, so a poster of a dozen huge words is one typed number away. The sizes a style starts with, and those a recipe sets, follow the artboard width: a new layer looks the same on a 1600 px and a 4000 px artboard, and the sliders show the sizes in pixels of your artboard. A size you set by hand stays in pixels. Projects from before version 3.4.0 keep their sizes in pixels too. If you then change the artboard width, a note offers to scale those sizes with it.

### Flow lines, and letters that crowd

In Flow lines the letters sit along lines traced over the photo. **Keep the lines clear of each other**, which is on to begin with, moves those lines apart as the letters grow. Bigger letters then mean fewer of them, and the dark parts of the picture stay readable instead of filling in solid. **Room between the lines**, under Size, sets how much space they get.

Turn it off and **Line spacing** is yours to set on its own, as it was before. That is how to get letters deliberately packed on top of each other.

A line stops before it curls tighter than its letters can follow, and it never winds back over itself, so tight swirls do not fill in as dark knots. Each stretch of a line is written left to right, so no word is upside down. **Smallest letters, as a share of the size**, under More in the Size section, keeps letters in light areas readable.

### Word mosaic sizes

In Word mosaic, **Largest word** and **Smallest word** set the sizes, and **Size range, largest to smallest**, under More in the Size section, keeps any word from being more than that many times bigger than the smallest. At 5, the largest word is at most five times the smallest. Raise it for a few bold words over fine texture; lower it for an even texture.

### ASCII, Braille, Halftone and Typewriter tones

These three styles shape the tones before they choose a character, in the Tone section:

- **Local contrast** lifts features such as eyes and edges above the area around them.
- **Leave light areas empty** leaves pale skies, walls and paper empty instead of covering them with faint dots.
- **Tone curve** above 1 leaves more paper in the middle tones, so the dark parts carry the picture.

Halftone also has **Smallest dot**: dots smaller than that share of a cell are left out, so the light areas stay clean. **Dots for bright colors** gives a light but strong color, such as an orange sunset, dots of its own size, so it shows on white paper instead of turning into empty paper. Soft colors, such as cream or steam, keep the size their tone gives them. Apply text art sets it for photos in color.

In Typewriter, **Tone curve** works on the photo's tones before local contrast. **Most characters typed on one spot** limits the overstrikes. At 2, the default, the darks stay textured and faces read; 5 gives the heaviest darks. Typewriter starts with dithering off, so even tones get an even texture instead of scattered marks.

### Spiral, Rings and Relief contrast

**Tone contrast** makes the dark parts darker and the light parts lighter before the letters are sized, so the picture reads at a glance. Black and white stay as they are. It runs from 0, the plain tones of the photo, to 1. The default is 0.5.

Relief also has **Tone curve**. Below 1 it gives the light and middle tones more ink, so a pale face still reads on light paper. **Leave light areas empty** skips the palest parts, and **Smallest letters, as a share of the size** keeps the letters in light areas readable.

### Letter effects and fades

- **Shadow** puts a soft shadow under each letter, a little down and to the right. Bigger letters cast a longer shadow. **Shadow color** starts at **From the paper**: one even, deep tone of the paper, or on dark paper a soft light glow, where a dark shadow would not show. **Darker letters** uses a darker copy of each letter, and **One color** a color of your choice. **Shadow strength** sets how see-through it is.
- **Riso offset** prints each letter a second time in the **Offset ink**, a little out of register, like a two-color risograph print. The offset ink is strong under dark letters and faint under pale ones.
- **Outline** draws the letters as outlines. Bold letters get a heavier line than thin ones, so the tones of the picture still read. Letters too small to show an outline stay solid.
- A new **Focus and fade** starts with **Fades: Both**, as a soft vignette: the letters grow see-through toward the edge, and only the faintest ones thin out, in an even pattern with no clumps.
- A shape word under **Draw on** always fits inside the artboard with a margin, and inside the shape every part gets letters, even where the photo is as light as the paper, so the whole word reads.

## Letter fill

**Letter fill** turns the letters into a window onto the photo. It works in every style, extra effects from plugins included, and each text art layer keeps its own setting.

- **Ink colors**: the letters take their colors from **Color**, as always.
- **The photo**: the photo shows through the letters, on the paper. Outside the letters you see the paper.
- **A soft photo**: the same, with the photo blurred. **Softness** sets how much, as a share of the picture size, so the preview and every export blur alike.
- **Cut out**: the letters are holes in a sheet, and the photo shows through the holes. **Sheet** chooses its color; it starts dark, or light on dark paper. **See through the sheet** lets the photo show faintly through the sheet as well, so the whole picture reads and the letters shine through it; it starts at 35%, and at 0% the sheet is solid. **Soft photo in the holes** blurs the photo behind them.

**How much shows** makes the photo in the letters see-through. At 0% the letters show the paper, or the T-shirt, or nothing on a transparent background. **Photo strength** gives the photo richer color and a little more contrast, because small letters can make it look flat.

The photo is the one the Photo layer shows: with its edits, crop and removed areas. Removed areas leave the letters empty there. Locked text art keeps the photo it was locked with. Mirrored text art mirrors the photo in its letters too, so the iron-on transfer lines up.

Bold, heavy letters show more of the photo. Try a weight of 800 or more under **Letters**, or a bigger **Text size**.

Changing the fill does not move the letters; only their filling is drawn again.

In exports:

- PNG, JPG and the PDF for print look exactly like the screen.
- The SVG keeps the letters live: the photo is an embedded picture clipped to them, and Cut out is a sheet with the letters as a mask. A clip has no partly see-through edges, so letters that fade by tone are cut sharp there.
- The CMYK PDF carries a filled layer as one picture at print resolution, in RGB, placed exactly where the letters are. The other layers stay live letters.
- Text outputs (plain text, Markdown, HTML text, terminal text, code), Word and Excel use the letters only and ignore the fill.

## Color modes in detail

Most styles offer:

- **Ink**: one color. Pick a swatch, any color, a color from the photo, or (in the desktop app) the eyedropper to take a color from anywhere on screen.
- **Photo**: each letter takes the photo's color under it. **Average the color under each letter** gives truer color; **Color strength** makes it bolder.
- **Tone**: one ink, lighter or darker with the photo.
- **Duotone**: two inks, one for the shadows and one for the highlights.

**Fit colors to the paper** sits under the colors, in every style and in the plugin styles:

- **Gentle** (the default) moves a color that would fade into the paper just far enough that it shows, and keeps its hue. On light paper pale colors get deeper and dark colors stay as they are. On dark paper dark colors get lighter, so the browns of a coffee photo become warm light browns. On gray paper each color moves to the lighter or the darker side, whichever reads better.
- **Strong** asks for more contrast, for small letters or prints seen from far away.
- **Off** keeps the exact colors of the photo and your exact ink, even where they fade into the paper.

A solid ink that already shows stays exactly as you picked it. When an ink is changed to show, the panel says what it prints as. When the setting changes nothing, the panel says why: the colors already stand out from the paper, or the letters show the photo (Letter fill), which this setting does not change. Projects made before this setting open with it Off, so they look as they did.

## Spiral and Rings on the picture

With a Spiral style selected, the picture shows its center, where the text starts and where it ends, and an arrow for the direction. Drag them. **Text starts** (at the center or outside) and **Direction** (clockwise or anticlockwise) are in the style's settings.

A new Spiral is a round disc that stays inside the picture, so its edge is clean on every side. Turn off **Round, inside the picture**, under More controls, to let it reach into the corners; then the end radius is measured to the farthest corner. **Fade the middle turns** starts the text right at the middle in small letters that still follow the photo, so there is no empty hole and the middle does not look like a target. Set it to 0 to keep every turn at full strength. **Leave out pieces shorter than this many letters** removes scraps of a few letters where a light area cuts a turn, so the turns end cleanly. Set it to 0 to keep every letter.

## Word cloud: filling a shape with words

**Word cloud** packs your words inside a shape. The biggest words go in first, then smaller ones fill the gaps, down to small ones along the edge, so the outline of the shape still reads. The shape is smoothed first, and tiny specks and pinholes in it are left out, so the words and the outline follow the silhouette instead of the grain of the photo. A shape read from the photo is cleaned up more: narrow gaps are closed, so a head stays in one piece, and islands under 2% of the shape are dropped. **Tidy the shape**, on for a new Word cloud that takes its shape from the photo, keeps one clean piece: it stays clear of the edges of the artboard, so its outline closes, holes inside it are filled, and deep bites at its base are filled part of the way. A photo in two tones, such as one made into a silhouette, keeps its exact edge. When the tones of a photo give no clear shape, the words fill an oval over the picture instead, and a note says so. **Leave out small pieces** sets how big a piece of the shape must be to keep its words, as a share of the whole shape; raise it when stray words sit far from the subject. **Margin of paper** keeps a band of paper along every edge of the picture, so a shape that runs off the frame ends inside the page. The signature look also drops small pieces of the shape that touch the edge of the picture, such as a bright window behind a cup, so no island of words floats away from the subject. The words are packed on a grid that is the same at every size of the artboard, so the Fast preview, the Full preview and every export show the same number of words in the same shape. Projects from earlier versions keep their own grid, so they export as they did. The heaviest quarter of your list shares the largest sizes, so no single word takes every big spot.

1. **Make the shape.** The easiest way is **Photo**: the dark parts of the picture become the shape (on dark paper, the light parts). **Photo threshold** sets where the line falls, and **Swap the shape and the space around it** uses the other side. **Detailed parts of the photo** takes the sharp, busy parts instead, whatever their tone, so a subject in focus against a soft or plain background becomes the shape; here the threshold is the share of the picture left out. **Apply text art** starts every photo with a clear shape as a Word cloud, the signature style. It picks the shape, the threshold and the colors from your photo for you, on warm black paper: the light parts of a lit subject hold the words, or the dark parts of a plain dark subject on a light ground. Words are turned both ways, so the shape fills closely, and the biggest words go on the brightest parts. The colors come from the photo, lifted where they would sink into the dark paper. **Bigger words** can also go **On the light parts**, which suits a lit subject. For a clean edge, remove the background first (Image → Remove background), then turn on **Clean shape from the photo (silhouette)** right under **Shape**, or use **Image → Make a silhouette from the photo**. It shows when the shape is **Photo** or **Cutout**, in Word cloud and Calligram. You can also use **Cutout** (the part you kept), a **Word**, or a heart, circle or star.
2. **Write your words**, one per line, most important first. Add `: 5` after a word to make it count for more, so it comes out bigger and more often. For example:

   ```text
   an elephant never forgets: 5
   memory
   herd
   tusk
   ```
3. **Turn the words.** Open **Shape** and look under **Turn the text**. **Turn each word** has −90°, −45°, 0°, 45°, 90° and 180°; tick several and each word takes one of them at random. **Overall turn** turns everything together, and **Tilt at random** spreads the words a little around that angle. Every word turns on the spot, so the shape stays exactly where it is.
4. **Bigger words**, under **More Word cloud settings**, decides where the large ones go: everywhere the same, toward the middle of the shape, toward its edge, or on the dark parts of the photo. **How strongly** sets how firmly that is followed.
5. **Shape outline**, under More at the end of the Word cloud section, draws a smooth line just inside the edge of the shape, in a color of your choice. It is part of the artwork, so every export carries it. Around a ragged shape read from the photo an outline would only trace the noise, so there it is left off, and a note says so. The line grows with the artboard, so it looks the same at any size.

Whole words are placed, never single letters, so Urdu, Arabic and Persian keep their joined shapes.

**Letter effect → Outline**, in the Finish section, draws every word as an outline instead of solid.

### The silhouette

A silhouette makes the photo a clean two-tone picture: one solid shape on a plain background. It sits right under **Shape** in Word cloud and Calligram when the shape is **Photo** or **Cutout**. Turn on **Clean shape from the photo (silhouette)**, or use **Image → Make a silhouette from the photo**.

The split point between light and dark is chosen for you by Otsu's method, a standard way of picking it. **Split point** lets you set it by hand instead. **Close gaps and lose specks** cleans the edge, **Fill the holes inside** closes gaps in the middle, and **Swap which part is the shape** turns it around. While the silhouette is on, the silhouette sets the shape, so **Photo threshold** is hidden. A light part that reaches the edge of the picture, such as a white chest at the bottom, is not a hole: lower **Split point** to take it in.

The silhouette changes the photo itself, so the Photo layer shows the shape too. It is not offered for **Detailed parts of the photo**, because a two-tone photo has no detail left to find.

## Calligram

**Calligram** pours your text into a shape. It starts with **Subject**: your cutout when you have removed the background. Otherwise it finds the subject itself: the part of the photo that differs from the edges of the picture in tone, or is sharper and more detailed, toward the middle. The shape is smoothed and its holes are filled, so the lines of text run on. When no clear subject stands out, the text fills an oval in the middle. The letters take their tone from the photo, so the picture also reads inside the shape. Choose **Photo** to fill the dark parts at the **Photo threshold** you set, **Word** to fill your own word or words, or a heart, circle or star. The **Heart calligram** recipe gives the heart in two inks. Each word takes one color, read under the whole word. Lines are justified with a little extra room between the letters as well as between the words, so no line opens up wide gaps. Where a gap in the shape breaks a line, the next word moves on whole to the next part of the line. A word is split only at the end of a line, and then it keeps at least three letters on that line and two on the next.

## Mirroring

**Mirror**, folded below the Background section, holds two different kinds of mirror.

**Mirror the writing** works on the selected layer. The writing is turned around and the art is made again from it, so the picture keeps its shape and every letter still sits where its tone belongs.

- **Each letter, where it stands**: every letter turns around on the spot. The words read in the usual order.
- **Each word**: every word also reads backwards, so each word looks the way it does in a mirror.
- **Each line**: the whole text reads from right to left, the way a page looks in a mirror.

Urdu and Arabic words stay whole, because their letters join: each word is turned around as one. The letter sizes, weights and colors are worked out after the writing is turned around, at the place where each letter is drawn, so the art reads as the picture just as well as before. It is also in the **Text art** menu, under **Mirror the writing**.

**Mirror the whole text art across** and **Mirror the whole text art up and down** turn the finished artwork around, with every layer. It is a true mirror: the picture is reversed as well as the letters. That is what an iron-on T-shirt transfer needs, because the print reads the right way round once it is pressed on. Every export carries it, the PDFs and the SVG included. The same two switches are in the Text art and Layer menus.

## Turning the text

**Turn the text**, in the Shape section, works in every style except Word cloud, which has the same controls of its own.

- **Turn the pieces**: **Not at all**, **Each one**, or **Along the picture**, which points every piece along the edges it sits on, like the grain of an engraving.
- **Angles**: −90°, −45°, 0°, 45°, 90° and 180°. Tick several and each piece takes one of them at random.
- **Overall turn** turns everything together, from −180° to 180°.
- **Tilt at random** spreads the pieces a little around that angle, for a hand-set look.
- **Break lines and words into single letters first** turns each letter on its own instead of the word or line it belongs to.

What counts as a piece depends on the style: a letter in ASCII, Braille and Text portrait, a word in Word mosaic, a whole line in Calligram and Flow lines. Every piece turns about its own middle, so the picture keeps its place.

Turned pieces get room, so they never pile up. A turned letter is made just small enough to fit the room the style gave it, with a little air around it. A turned word or line takes the first angle that has room: the one it drew, the other angles you ticked, then the style's own. Where none has room it tries a little smaller, and a word with no room even then is left out.

Urdu, Arabic and Persian words are never broken into letters, because their letters join; they turn as whole words.

## Marks typed in the text

A few marks, typed straight into any text box, change the words they wrap. The marks themselves never reach the artwork or any export.

| You type | What you get |
| --- | --- |
| `**word**` | Bold |
| `*word*` | Italic |
| `__word__` | A line under the word |
| `^word^` | Bigger |
| `~word~` | Smaller and lighter |
| `[word]{#c0392b}` | That color, by code or by name |
| `# ` at the start of a line | The whole line bigger |
| `> ` at the start of a line | The whole line as a quote, in italic |

**Ctrl B**, **Ctrl I** and **Ctrl U** put the marks around whatever you have selected, and take them away again. The **B**, **I** and **U** buttons above the text box do the same.

Two things keep ordinary text safe:

- A mark only counts when its partner is on the same line, so `3 * 4` and `a_b` are left exactly as they are.
- A backslash in front of a mark keeps it as an ordinary character: `\*star\*`.

**Marks change the words**, the switch under the text box, turns the whole thing off for that layer. The **?** beside it lists the marks.

In **Text portrait**, a short text, or one with marks, starts each row at a different place in the text. Otherwise the same words would line up from row to row in diagonal stripes. A long text without marks reads on from row to row.

Urdu, Arabic and Persian words can be marked too: the word keeps its joined letters and comes out bold or colored like any other.

In **Calligram** the marks change the color and the slant but not the size or the weight, because its lines are justified to fit the shape.

## Word weights and filler words

In **Word mosaic** and **Word cloud**, the words at the top of the list count for most, so they come out bigger and appear more often. Writing `: 5` after a word gives it that weight instead:

```text
an elephant never forgets: 5
memory
herd
```

Once any word has a number, all the others count the same, so you only need to mark the ones that matter.

**Leave out filler words such as the, and, of**, under More at the end of the Word mosaic or Word cloud section, drops the small words that carry no meaning in a word picture. It knows English, Urdu and Arabic filler words, which is useful when you paste a whole paragraph as your word list.

## Shuffle

**Shuffle**, the crossed arrows beside the style's name, or the **R** key, lays the same style out again with a new variation number. Nothing else changes, so it is a quick way to try another arrangement of the same words. It can be undone.

## Ready sets of colors

Set **Color** to **Palette** and pick one of twelve ready sets: Sunset, Ocean, Forest, Earth, Ink and gold, Riso, Pastel, Neon, Rust and teal, Mono warm, Mono cool or Heat.

The set runs across the tones of the photo: the first color for the lightest parts, the last for the darkest, blending in between. That makes it a gradient tied to the picture rather than a flat color.

- **Turn the set around** swaps which end the dark parts use.
- **Steps, with no blending** uses only the colors of the set, with nothing in between, for a poster or screen-print look.
- **My own colors**, at the end of the list, lets you set each color yourself, from two to eight of them.
