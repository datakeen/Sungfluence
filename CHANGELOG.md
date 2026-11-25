# Changelog

All notable changes to SungFluence are listed here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers follow [Semantic Versioning](https://semver.org/): a bug fix raises the last number (3.1.1), a new feature the middle one (3.2.0), and a change that can break old projects or plugins the first one (4.0.0).

## [Unreleased]

## [3.4.0] - 2026-11-25

### Added

- **Made for light paper, and it says so.** SungFluence assumes the art is printed on light paper. A note under the picture says "Made for printing on light paper" (or gray or dark paper, or "Transparent background"). Click it to open the Background section.
- **Printed on**, in the Background section of the Text art and Output panels: Auto, Light, Gray or Dark. Auto reads the paper color, or the T-shirt color on the T-shirt preview, and says what it found.
- **Fit colors to the paper**, for every style and plugin style: Off, Gentle (the default) or Strong. Colors that would fade into the paper move just far enough to show and keep their hue: pale colors deepen on light paper, dark colors lighten on dark paper, and on gray paper each color goes to the side that reads better. A solid ink that already shows stays as picked, and the panel says when an ink was changed. It replaces "Brighten dark colors" and "Deepen pale colors". Projects from earlier versions keep their exact colors.
- **Letter fill**, a new shared section in every style: the letters can show the photo, a soft photo, or be cut out of a sheet with the photo behind. **How much shows** makes them see-through down to 0%, and **Photo strength** gives the photo richer color inside the letters. PNG, JPG and the PDF for print show it exactly as the screen does, the SVG clips the photo to the live letters, and the CMYK PDF carries the filled layer as one picture. Text, Word and Excel outputs ignore it.
- A transparent background shows as a clearly visible checkerboard at any zoom, in both themes, and see-through parts of a PNG show the same checkerboard in the photo view.
- Word cloud: **Bigger words** can go **On the light parts**.
- **Text to vector lines.** Text on the Vector layer turns into outlines (Shift Ctrl O) or center lines, from the new Object menu, the option bar or the Vector panel. Outlines keep the holes of letters open, turned and mirrored text keeps its turn, and Urdu and Arabic words are traced whole. The result can be sized to fill the artboard, and the text can be kept as well.
- **Groups.** Ctrl G groups lines and shapes, Shift Ctrl G ungroups. The Select tool picks a whole group, with handles to scale and turn it. Double-click goes into a group.
- **Distort tool** (Shift D): bulge, pinch, twist, stretch or arc lines around a point you drag, with a ring that shows how far it reaches. Each drag is one undo step.
- **Fills.** Closed lines and groups can be filled with a solid color, a linear gradient or a radial gradient, with or without a stroke. Holes stay open. **Fill every closed shape** fills them all at once.
- **Text effect for vector shapes.** **Fill the shapes with words** makes a Word cloud inside the shapes, and **Write along the lines** sets up Line text. Word cloud and Calligram have a new shape, **Vector shapes**.
- **More snapping.** Snapping now works on the geometry of drawn lines: intersections, on line, perpendicular, tangent, extensions and the centers of closed lines. New snaps: **centerline** (halfway between the two sides of an outline stroke or a letter turned into outlines), **extension meets line**, **equal spacing**, and **track from points you rest on**. A curve handle can aim straight at the next point. Turning a shape clicks into 15° steps near them. The snap menu is grouped into Points, Lines, Alignment and Photo.
- **Text size**, a control for every style, plugins included. It makes every letter of the layer bigger or smaller by the same amount, and exports match the preview.
- **Tones set for text art.** A new photo gets its black point, white point, midtones, and a little clarity and sharpening for soft photos, chosen from the photo itself. **Auto tone** in the Photo panel and the Image menu does it again, Reset gives the plain photo back, and Settings can turn it off. The Photo panel has new **Midtones**, **Black point**, **White point** and **Clarity** settings.
- Word cloud has a new shape, **Detailed parts of the photo**, and a new switch, **Swap the shape and the space around it**.
- **Family**, a new word set in the text library, and the words new layers start with.
- The version number shows next to the app name, in the window title and in About.
- **A box to type a size into**, beside the slider of every setting measured in artboard pixels: Letter size, Line spacing, Largest and Smallest word, and the same settings in plugins. The box takes up to five times the top of the slider, so a size the slider cannot reach is one typed number away.
- **Flow lines keeps its lines clear of each other.** Its Letter size is now a size in artboard pixels instead of a multiple of the line spacing, and the traced lines move apart as the letters grow, so bigger letters mean fewer of them instead of letters growing into the line next to them. **Room between the lines**, under More controls, sets how much space they get; turn the new tick off to set Line spacing on its own, as before. Projects and recipes saved earlier keep their old look.
- **Sharp when zoomed in.** Past 100%, the part of the picture on screen is drawn again at the resolution of the screen, so the letters no longer go blocky. It runs a moment after the view settles, only for what is visible, so a deep zoom costs no more than a shallow one, and it never blocks the window.
- **Background** now also sits in the Text art panel, right after Color, with the same swatches as the Output tab. People looking for the background were looking there, not on Output. The custom color reads **+ Custom**, so it is not taken for one more swatch. A new artboard starts on white paper instead of black.
- **Transparent**, a checkered swatch in the Background row of the Text art panel and the Output tab, next to the paper colors, and **Text art → Transparent background** in the menu. The note under the picture lands on it. It replaces the separate switch on the Output tab.

- **Type toolbox** (Text art → Type toolbox, or Shift Ctrl T, or the button above any text box). Five sections over one piece of text:
  - **Styled text:** 31 Unicode styles in six families, each showing your own text live, with favorites. Letters can take turns between styles, be mixed at random, or come out as a ransom note. Lines through, under and over the letters, and marks above, through and below with a limit that keeps chat apps happy.
  - **Before you paste it:** the three honest counts, a check that draws every character and warns about empty boxes, a warning about how screen readers read fancy letters, and a plain copy to use as alt text. Fancy text pasted in can be turned back into plain letters, upside-down text included.
  - **Symbols:** eighteen sets, with search by name, by a word with a star in it, by code point, by HTML entity or by Windows Alt code, and a line showing how to type each one elsewhere.
  - **Faces:** ready-made faces in categories, and a builder that puts one together part by part.
  - **Decorations:** decorations on one or both sides, mirrored so brackets and arrows turn around for Urdu and Arabic, and dividers at any width.
  - **Expansions:** type `(shrug)` or `:shrug:` in any text box in SungFluence and it becomes the sign. Your list can be saved for Espanso, AutoHotkey, or Mac and iPhone text replacements.
- Anything from the toolbox can be copied, placed on the canvas as a text object, or put into a text box, so styled letters and symbols can also become the letters of a portrait, a spiral or a calligram.
- **Sharing**, a sixth tab in the Type toolbox: pick where the text is going (Instagram, X, Bluesky, TikTok, LinkedIn, YouTube, WhatsApp) and see how it will look there, how it will be counted there, and how much would be cut off. **Make the line breaks stick** keeps the shape of a bio when it is pasted, **Cut it to fit** shortens it at a space, and **Take the styling off** returns plain letters. The limits came from public guides in November 2026, not from the apps, and the panel says so.
- **Excel letters in color**: the characters themselves, each one colored and no cell filled, so a small view is the picture and a close view is still editable text. The letters can take the colors of the picture, grey by tone, or one ink of your choice.
- **Fixed:** the text twins read the paper as black whatever it really was, so artwork on light paper came out inverted: empty paper filled with the densest characters and the letters came out blank. It now reads the real paper color, which also fixes the background of the HTML and SVG twins. Plain text, Markdown, HTML, terminal colors, the README SVG, the code outputs, the login message and the new Word and Excel files all gain from it.
- **Word and Excel exports**, a new Office group in the Export window. **Word document**: the art as real text in a `.docx`, one paragraph per row, in Consolas at the size that fills the page, in color if you want, on A4 or Letter, portrait or landscape. **Excel picture in cells**: an `.xlsx` where each character is one square colored cell, so the sheet is the picture. **Excel color by number**: a hidden picture to fill in, numbers in bordered cells with the key on a second sheet. The files are written by SungFluence itself and open in Word, Excel, LibreOffice and Google.
- **Mirror**, one section in the shared settings of every style, holds both kinds of mirror, each with a short note. **Mirror the writing** turns the writing around **each letter where it stands**, **each word** or **each line**, then lays the art out again, so every letter takes its size, weight and color from the place where it is drawn and the picture keeps its shape. Typed marks stay on their letters, and Urdu and Arabic words stay whole. It is also in the Text art menu. Canvas, SVG and the CMYK PDF all carry it.
- **Flip all shapes** (Layer menu, or **The whole layer** in the Vector panel): the lines and the shapes on the Vector layer mirrored together, around the middle of the picture. Each shape keeps its own turn, mirrored with it.
- **Mirror the whole text art** (the Mirror section, or the Text art and Layer menus): the finished artwork mirrored across or up and down. It is a true mirror, so the letters come out reversed, which is what an iron-on T-shirt transfer needs. It is part of the layer, so the preview, the PNG, the SVG, both PDFs and the text twins all carry it, and it is saved with the project and with a recipe.
- **More word and phrase sets** in the text library: Water resources, Hydraulics and rivers, Flora, Fauna, and one set for each of the 17 United Nations Sustainable Development Goals. A **Find a set** line at the top of the list searches the names and the words inside the sets.
- **Every style**, a wall of your own picture in every style at once (Text art → Every style, the button next to Variations, or Shift E). Click a tile to use that style: the color, the letters and the words come with you, and the rest starts from that style's own settings. The style in use is marked, **Find a style** narrows the wall down, extra effects from plugins are on it too, and when you have several text art layers a checkbox draws the others behind each tile. The tiles fill in a few milliseconds at a time, so nothing freezes.
- **Search by drawing**, in the Symbols tab of the Type toolbox: sketch a shape on the pad and SungFluence shows the symbols that look most like it. Where you draw it and how large make no difference.
- **Place each separately**, when more than one symbol is picked: each becomes its own object on the canvas, so you can move, scale, turn and color them one by one.
- **Ready sets of colours.** A new **Palette** choice under Color, with twelve sets (Sunset, Ocean, Forest, Earth, Ink and gold, Riso, Pastel, Neon, Rust and teal, Mono warm, Mono cool, Heat). The set runs across the tones of the photo, so it works as a gradient. You can turn the set around, use steps with no blending, or set two to eight colours of your own.
- **Word weights** in Word mosaic as well as Word cloud: write `: 5` after a word and it comes out bigger and more often.
- **Leave out filler words**, in both word styles, for when you paste a whole paragraph. It knows English, Urdu and Arabic filler words.
- **Shuffle**, next to Variations in the Text art panel, the **R** key, or the Text art menu: lays the same style out again with a new variation number.
- **Marks typed in the text.** Type `**bold**`, `*italic*`, `__a line under__`, `^big^`, `~small~` or `[word]{#c0392b}` in any text box and the words come out that way in the artwork. A line starting with `# ` is bigger, one starting with `> ` is a quote. Ctrl B, Ctrl I and Ctrl U put the marks around what you have selected, and B, I and U buttons sit above the text box. The marks never reach the artwork or any export. A mark only counts when its partner is on the same line, so `3 * 4` is left alone, and a backslash keeps a mark as an ordinary character. Urdu and Arabic words can be marked too and keep their joined letters. **Marks in the text change the words**, under More controls, turns it off.
- **Turn the text**, a new section in the shared settings that works in every style and every plugin. Turn each piece to the angles you tick (−90°, −45°, 0°, 45°, 90°, 180°), add an overall turn and a random tilt, or point every piece **along the picture**, following the edges it sits on. **Break lines and words into single letters first** turns each letter on its own. What a piece is depends on the style: a letter in ASCII and Text portrait, a word in Word mosaic, a line in Calligram. Every piece turns about its own middle, so the picture keeps its place, and Urdu and Arabic words are never broken apart.
- **Word cloud**, a new text art style: your words packed inside a shape, biggest first, down to tiny ones at the edge, so the outline of the shape still reads. The shape comes from the photo, from your cutout, from a word, or from a heart, circle or star.
  - Add `: 5` after a word to make it count for more, so it comes out bigger and more often.
  - **Turn each word** at −90°, −45°, 0°, 45°, 90° or 180°, several at once; an **Overall turn**; and **Tilt at random**. Every word turns on the spot, so the shape never moves.
  - **Bigger words** toward the middle of the shape, toward its edge, or on the dark parts of the photo.
  - **Shape outline** draws a line around the shape in any color, as part of the artwork, so every export carries it.
  - Whole words are placed, never single letters, so Urdu, Arabic and Persian keep their joined shapes.
- **Silhouette**, in the Shape setting of Word cloud and Calligram (when the shape is Photo or Cutout) and as **Image → Make a silhouette from the photo**: one setting turns a photo into a clean two-tone shape. The split point is found for you, small gaps are closed, specks are lost, and holes inside the shape are filled. You can set the split point by hand or swap which part is the shape.
- A **Word cloud** recipe, and the old one is now called **Word mosaic**, after the style it uses.
- **Reset every effect on the photo**, in the Photo panel and the Image menu, with a small Reset for each group of settings. The crop and removed areas are kept, and it can be undone.

- **Rulers and guides.** View → Show rulers (Ctrl R) puts rulers along the top and left of the picture. They count the artboard in export pixels, millimeters or inches (right-click a ruler or click the corner square), follow zoom and scroll, and mark where the pointer is.
  - Drag from the top ruler for a horizontal guide or from the left ruler for a vertical one; Alt gives the other direction. Drag a guide to move it, double-click it to type its place, or drag it back onto a ruler to delete it. A small tag shows its place and what it snapped to.
  - View → New guide, Show guides, Lock guides and Clear guides. New guide adds a guide by typing, without a mouse.
  - Shapes, lines, the pen and edited points snap to guides, to where guides cross and to where a guide meets a line. A shape or handle on a guide comes first; hold Ctrl to pick up the guide instead.
  - Guides are saved with the project, are part of undo, and never appear in exports.
- **A website** at https://datakeen.github.io/Sungfluence/ with a before and after slider, every style made from real photos, and the downloads. Addresses that do not exist get a friendly 404 page.
- The web app moved to https://datakeen.github.io/Sungfluence/try/. Old links to the app go on to the new address, and the old offline copy is cleared. A small note at the end of its menu bar points to the installed version; it shows during the first visit only and never on phones.
- **Download SungFluence for your computer**, a new command in the command palette (Ctrl K).
- The website shows Word cloud in its before and after slider, on all four photos. A Background choice for its examples shows the art on its own paper, on a checkerboard that shows the transparency, or on black or white; on black and white each example is drawn for that ground.
- **A fresh app icon.** The S and F are now serif letters like the website's wordmark: an ivory S and a gold F on the same deep ink square. Behind them, at large sizes, the name is written over and over in tiny letters. The taskbar, title bar and browser tab icons are drawn for their own size, so they stay clean, and the Android and macOS icons fit those systems.
- **Show transparency as**: Checkerboard, Black or White. It sits right under the Transparent swatch while Transparent is on, under **View > Show transparency as**, and in Settings. It changes only how clear areas look on screen, removed photo areas included while the background is transparent; exported files stay clear. It is grayed out on the Paper and T-shirt previews, which show the sheet itself. SungFluence remembers the choice on this computer; it is not part of the project or of undo.

### Changed

- SungFluence opens on the coffee sample the first time.
- **Letters big enough to see at first look.** Text portrait starts at 24 px (was 12), Calligram at 22 (was 14), Flow lines at 15 (was 11), Spiral ring spacing at 18 (was 11) and Relief row spacing at 16 (was 13), and the recipes that use them grew too. **Text size** still makes every letter bigger or smaller from there.
- **Letter sizes follow the artboard width.** A new layer, a style tile, a recipe or Apply text art looks the same on a 1600 px and a 3671 px artboard, and the sliders show sizes in pixels of your artboard. A size you set yourself stays in pixels, and so do projects from earlier versions. When you change the width, a note offers to scale those sizes too.
- Word mosaic no longer puts a few giant words over a carpet of specks. A new **Size range** setting keeps the sizes together, and the heaviest quarter of the word list shares the large sizes.
- Word cloud: the shape is smoothed, specks are left out, and the shape outline is a smooth line instead of a staircase. Long words get placed as often as short ones.
- Halftone draws every dot again (every other dot was a blank space), the Offset grid is a true even screen, and drawing is many times faster.
- ASCII, Braille and Halftone have new tone settings under More controls: **Local contrast**, **Keep light areas blank** and **Tone curve**. Braille no longer leaves trails of dots across white paper.
- Flow lines has no more dark knots where lines curl and no upside-down words, and small letters stay readable.
- Letters along a path (Flow lines, Relief, Line text, Spiral, Contours and plugins) are centered on the stretch they use, so narrow letters are no longer covered by wide ones.
- Line text keeps letters of different lines from printing over each other and follows the paper color by default.
- Spiral and Relief read the tone over each letter's own area, and light areas stay clean.
- Text portrait: each letter shows the photo inside it, in slightly tighter rows, so eyes, fur and edges still read with big letters. Weight follows the tone, and white areas stay empty. Projects from earlier versions keep their plain-colored letters, and so does the Word window recipe.
- Calligram fills the subject of your photo: your cutout when the background is removed, otherwise the part that stands out from its background, as one smooth shape, with letters in the photo's tones. A word is never cut where a gap breaks a line, so the text reads as sentences. Each word takes one color, and lines justify without wide gaps. The new **Heart calligram** recipe keeps the heart look.
- Contours has calmer defaults with fewer small loops.
- See-through parts of a PNG read as white paper, not black, everywhere, including after Bring everything back. Original and Compare show them on white too.
- Making a silhouette, rotate, flip, remove background, the crop tool, Reset every effect and the Full preview no longer freeze the window.
- Sharpening grows with the picture size, so an export is sharpened like the preview.
- Both PDF exports include the Vector layer. The CMYK PDF draws lines and shapes as real vector paths.
- Save names lose spaces and characters such as × and colons. Exporting an empty Vector layer as SVG shows a message instead of saving an empty file.
- The Weight slider is hidden while Weight follows tone is on, since it had no effect, and the duplicate Color strength slider is gone.
- Recipe thumbnails and the style wall no longer pause the window while they draw.
- Word mosaic, Flow lines and Typewriter no longer pause the window while they read the picture.
- **Panels in the order you work.** The Text art panel runs Look (Styles and Recipes tabs, with Every style beside the tiles), the style's own settings, Words, Size, Color and Background, then Mirror, Shape, Finish and Tone folded, and Layers with **Layer blending** folded at the end. Recipes show as a grid of whole pictures, two to a row, kept for your photo and artboard. Shuffle and Variations are small icon buttons beside the style's name. Long notes show one line, and a small **?** opens the rest. The Variation slider and the second Layer opacity slider are gone.
- The Photo panel runs Crop and turn, Adjust (Auto tone first, with one Reset), Remove background, Reshape, one **Draw on the photo** row, and Layer blending, with **Reset every effect on the photo** at the bottom. **Auto tone** shows when it is on, and a click turns it off.
- The Vector panel runs Trace from the photo, Draw your own, Add shapes and text, Lines, Bend lines, and Layer blending. **Trace from the photo** can follow **Tones**: one line for each tone of a softened copy of the photo, like the contours on a map.
- The Output panel runs Artboard (width, margin and height), Background, Output color, Print and Show on. **Photo strength in Mix view** moved to the Mix button: click Mix again while it is on. **Gentle on this computer** moved to Settings.
- The Export window lists PNG at artboard size, PDF for print and SVG with live text first, under **Most used**. Every format has a one-line hint, and a **More formats** button shows while more wait below.
- The Every style wall shows the whole picture in each tile, in the shape of the artboard, and says Drawing until each tile is ready, extra effects included.
- Picking Line text with no lines on the Vector layer asks: **Trace lines**, **Draw lines** or **Cancel**. Source no longer sticks at Both.
- Spiral and Rings make a round disc inside the picture, start at the middle in small letters that follow the photo instead of a bull's-eye, and leave out short scraps where a light area cuts a turn. **Tone contrast** in Spiral, Rings and Relief gives deeper darks. The Spiral recipe is a strong full-bleed spiral.
- Relief has closer rows and a new **Tone curve**, so a face or a cat reads on light paper.
- Typewriter has more columns, no dithering and at most two characters typed on one spot, so faces and ears read. ASCII has more columns and gentler tones, so faces read instead of turning to noise. The setting that leaves pale areas blank is called **Leave light areas empty** everywhere.
- The Contours effect draws more contour lines with less smoothing, so the subject reads.
- **Focus and fade** starts as a soft vignette: the letters grow see-through toward the edge and only the faintest drop out, a whole word at a time in Text portrait.
- **Shadow** has its own **Shadow color**, starting at **From the paper**, a deep tone of the paper (a soft glow on dark paper), and no longer tints the picture orange. **Riso offset** follows the tone of each letter. **Outline** is thin and heavier on bold letters, and small letters stay solid.
- Letter fill **Cut out** holds the photo in the sheet too, softened and deep, so the whole picture reads around the letters.
- **Turn each** gives turned letters room in their row, so nothing piles up. A shape word under **Draw on** fits inside the artboard with a margin. A short or marked text in Text portrait starts each row at a different place, so no stripes form.
- The Word cloud recipe takes its shape from the photo. **Tidy the shape** keeps one clean piece clear of the edges, so its outline closes; when a photo gives no clear shape, the words fill an oval and a note says so. **Leave out small pieces** and **Margin of paper** keep stray words away and the shape inside the page. The shape outline grows with the artboard.
- Halftone has **Dots for bright colors**, so a light but strong color such as an orange sunset keeps its dots. Zoomed far out, a Halftone is drawn again at its shown size, so it shows no stripes.
- Fixed white bands across small Calligram previews, and settings such as 1.05 now show both decimals.
- Releases list only the files people download: one Windows installer for each kind of PC, the portable Windows app, the Mac disk image and the three Linux files. The combined Windows installer and the update files (.yml, .blockmap) are gone, because the app does not update itself.
- Clicking a style tile before Apply text art applies that style, from the same first look as Apply text art. Until then the Text art panel shows only the styles and recipes, with a short note. A style that writes along lines asks to trace or draw lines first.
- Redo of Apply text art brings back the view that was on screen. Mirror the text art, picked before there is text art, applies text art first.
- On a phone the top bar takes three short rows and the menu bar wraps, so every menu is in reach; on a tablet it takes two rows. On a touch screen the hint above the picture lists only what a finger can do.
- The Export window: on a phone the format list gets more room, the Word and Excel rows have hint lines, SVG and PNG of an empty Vector layer are dimmed with the same reason, and Login message saves a plain file named motd.
- The Text art menu has one Type toolbox entry for the window and each tab. The Type toolbox shows Above, Through and Below only while there are marks, and its tabs sit in two rows on a phone.
- The Halftone text box is called Characters, the status bar counts letters, and the Typewriter tile has a clearer icon.
- Help pages have space between paragraphs, and the Search help box follows dark mode. A command picked in the command palette closes any window left open behind it.
- The bar above the picture keeps its height while you work with one tool, so selecting or deselecting something no longer moves the picture or changes the Fit zoom. A long hint there ends in an ellipsis before any button wraps; the whole hint shows on hover.
- The website works when opened from disk, and its title never runs under the picture beside it, even before its font loads.
- Fixed: the window had a stray 8 px margin; a photo dropped on a panel made the browser leave the app; Duplicate was not dimmed with nothing to duplicate; undo could leave removed lines selected; tracing that found nothing said "Traced 0 lines".
- **Word cloud is the signature style of SungFluence.** Apply text art now starts from a Word cloud that takes its shape from the photo, in the photo's own colors, on a new warm black paper. Words such as love, family, home and care are turned both ways and fill the shape closely; the biggest ones go on the brightest parts. **Text size** still starts at 100%.
- A photo with no clear shape for a Word cloud, such as a line drawing, a sunset, several subjects or a dark subject that runs into its background, starts in the style that suits it best: a Halftone in the photo's own colors for busy or soft photos and fine line patterns, a Text portrait for line drawings, on white paper. So does a dark subject full of detail, such as the drawn cat, whose eyes and fur a Word cloud would lose. A short note says so, with a **Word cloud** button one click away. The card under the picture names the style it will make and says why, and the photo stays on screen until the letters are ready. The welcome hint waits until the note has gone, and on a narrow window the note sits above the zoom bar, nearly as wide as the window.
- Word cloud comes first wherever the styles are listed: the style tiles, where it has a small star, the Every style wall, the menus and the help. A click on the Word cloud tile before Apply text art gives the signature look on any photo.
- The first recipe is **Word cloud**, the signature look. The former Word cloud recipe, in dark ink on white with an orange outline, is now called **Outlined cloud**.
- **Warm black** replaces Black among the paper swatches; the two looked the same. The note under **Printed on** names the swatch. In the dark theme a fine light line goes around the artboard, so dark paper keeps its edge.
- Projects from earlier versions open exactly as they were saved.
- The transparency checkerboard is easier to see: its two squares are further apart in tone on gray paper, a little quieter on dark paper so small gray letters still read, and a clear artboard gets a thin edge so it does not melt into the dark stage. Its squares stay about 9 screen pixels at any zoom, with sharp edges.
- While Transparent is on, the paper swatch keeps a thin gray ring: it is the color JPG and the letters use.
- The note under the picture, **Transparent background**, now says in its tooltip how clear areas are shown and where to change that.
- **A Word cloud exports as it looks in the preview.** The words are packed on a grid that is the same at every artboard width, so the Fast preview, the Full preview and the PNG, SVG and PDF at 1600 or 3671 px show the same number of words in the same shape. Before, a bigger export packed many more, smaller words. Projects from earlier versions export as they did.
- The signature Word cloud drops small pieces of the shape that touch the edge of the picture, such as a bright window behind the coffee cup, so no island of words floats away from the subject.
- The Word cloud pictures on the Every style wall and in Recipes are small copies of the real art, no longer a few giant words.

## [3.3.0] - 2026-11-05

One Export window, project files, text twins and code, print settings, Liquify, and smooth motion.

### Added

- **Export window.** Export (Ctrl E) now opens a window with every format on the left and its options on the right, with a line that shows the size of the result. It remembers your last choice. Picture formats and projects let you choose which layers to include.
- **Project files as `.sungfluence`.** Save project (Ctrl S) writes one zip file with the settings, the photo, placed images and a preview. You can choose which layers a project keeps. Projects saved as `.json` still open.
- **Text twins.** Any style can be saved as plain text, Markdown, an HTML page, terminal colors (16, 256 or full color) or an SVG for README files.
- **Text options.** Width in characters (40 to 160), the cell shape of the font where the text will be read, spaces for white areas, swap ink and paper, and the characters to use: keyboard characters, shade blocks, Braille, the letters A to Z in order, digits, letters only, symbols only, or your own.
- **Code outputs.** The art as a string or a comment block in 16 languages, a shell script whose `--help` starts with the art, and a login message (`motd`) file.
- **Letter size** slider in Flow lines, Spiral and Relief, and at the top of Halftone. ASCII, Braille and Typewriter now say that fewer columns mean bigger letters.
- **Motion.** Buttons, windows, menus, panels and messages move with short, quiet transitions. When text art appears, the letters fly in from outside the picture and land in their places. Settings → Motion chooses Full, Calm or Off, and fly in, fade in or at once. A computer set to reduce motion keeps everything still.
- **Compare at any angle**: up and down, across, slanted, or any angle with a slider. Shift and the arrow keys on the divider turn it.
- **Liquify tool** (Y): brush the photo with Push, Bloat, Pucker, Twirl right, Twirl left and Restore, with a size and a strength. Hold still to keep going; Alt restores. Saved in projects, with undo.
- **More print settings**: 31 print sizes (ISO A and B, US paper, photo prints, posters, clothes and small things) and a custom size in mm, cm or inches; portrait or landscape; turning the art on the page at any angle; a page margin; and any dpi from 30 to 2400, with 72, 150, 300 and 600 one click away.
- A help page, **Printing**, on print sizes and which dpi to use for screens, posters, T-shirts and close-up prints, with sources.
- **JPG export** of the visible layers. JPG cannot be transparent, so the background gets the paper color.
- **Style settings inside PNG and SVG files**, if you turn it on. Opening such a file applies its look to the open photo. The photo itself is never stored.

### Fixed

- Zoom and Compare now work on the Paper and T-shirt previews. You can also drag to move around there.
- The Paper preview shows the paper color even with a transparent background, so light letters chosen for dark paper no longer vanish on a white sheet.
- Choosing a paper the ink cannot be seen on, such as navy letters on black, now switches that ink to a light or dark one and says so, with Undo.

### Changed

- The background section is called **Paper color (background)**, or **T-shirt color (background)** on the T-shirt preview, where it shows shirt colors.
- The transparent background note says which formats keep it clear and what color JPG files get instead.
- Clearer license wording in the README, the About window and the installers: SungFluence is free and open source software.
- The About window's LinkedIn button is now just called LinkedIn.
- README: links to the latest download and the web version, the 3.2 features, and an up-to-date project layout.
- `docs/BUILDING.md` explains running from source, building installers and publishing the web version, for anyone working on their own copy.
- `DEVELOPMENT.md`: a developer guide to how the code is laid out and the rules that keep the app good.
- A download guide, `docs/downloads/README.md`: which file to pick for each computer, and how to install it.

## [3.2.0] - 2026-11-01

Menus for everything, a command finder, snapping, and help inside the app.

### Added

- **Menu bar** with File, Edit, Image, Layer, Text art, Effects, Export, View and Help. The desktop app shows it as its normal menu bar; the web version shows it at the top of the page. Every item shows its shortcut, and checkmarks show what is on.
- **Find any command** with Ctrl K: commands, styles, recipes, samples, export formats and tools.
- **Snapping** while drawing and editing vectors: end points, points and corners, mid points, centers, intersections, extensions, perpendicular, tangent, on lines, text baselines, edges in the photo, lining up with other points, 15° angles and a grid. A mark shows where the point will land. Alt places a point freely; a Snap button and View → Snapping choose what to snap to.
- **Grid**: View → Show grid (Ctrl '), with its size in Settings.
- New shortcuts: Ctrl O opens, Ctrl A selects all shapes, Ctrl ; turns snapping on or off.
- **Help inside the app.** Press F1, or choose **?** → **Help and tutorial**, or **Help → SungFluence Help** in the desktop app. Topics on the left, search, links between pages. It works offline and ships with every installer.
- **Getting started tutorial** in five steps, with pictures. New users see a one-time hint that points to it.
- **User reference** for the window, the Photo, Vector, Text art and Output panels, export, plugins, Urdu and Arabic, and common problems.
- **Style reference** with every style, setting, range and starting value. It is written from the app's own definitions on every build, so it always matches the app. The keyboard shortcut page is made the same way.
- A one-sentence description under each style's name in the Text art panel.
- `docs/RELEASING.md`: the release checklist. `docs/wiki`: pages for the GitHub wiki.
- `ROADMAP.md`: where the project is heading. This changelog.

### Changed

- Every action is now one command that menus, shortcuts, the palette and tests all share. Shortcuts work the same as before.
- New icon: a light S and a gold F on deep ink, in the style of the wordmark.
- The desktop Help menu has Help and Getting started at the top.

## [3.1.0] - 2026-11-01

First public release.

### Added

- **Three layers:** Photo, Vector and Text art, each with its own visibility, opacity and blend mode. Drag to reorder. Lock the text art and put an edited photo on top of it.
- **Photo tools:** crop with handles, free or fixed ratio; rotate, flip and canvas size; brightness, contrast, color, warmth, hue, shadows, highlights, sepia, vignette, grain, posterize, black and white cut, pixelate, bulge, pinch and twirl; magic wand, lasso and brush to remove areas.
- **Vector tools:** pen, pencil and tracing; shapes, text and images; move, scale, rotate, align, flip, copy and paste; step and repeat in a line, a grid, a circle or along a line; bend lines.
- **Text art styles:** Line text, Text portrait, Word mosaic, Flow lines, ASCII, Braille, Halftone, Calligram, Spiral, Rings, Relief and Typewriter.
- **Extra effects** from plugins, with Confetti and Contours built in. A Plugins window, a Plugins menu in the desktop app, and a plugin template for authors.
- **Urdu and Arabic:** Calligram, Text portrait, Spiral and Rings set whole joined words, right to left, in the bundled Noto Nastaliq Urdu and Noto Naskh Arabic fonts. Calligram shape words can have several lines.
- **Fade shapes** (oval, circle, band, column) that can be moved, sized, softened and turned by dragging handles on the picture.
- **Spiral and Rings** can start at the center or outside and run either way, with handles for the center, the start and the end.
- **Letter controls:** opacity, see-through light areas, weight, letter spacing, italic and capitals.
- **Color:** photo colors averaged under each letter and kept bright on dark paper, colors picked from the photo or the screen, and inks that can be swapped after "Limit to inks".
- **Blank artboards** in pixels, inches, millimeters or grid cells, with presets for social media and print.
- **Compare** with a divider: any look on each side.
- **Smooth zoom** with settings for speed, glide, steps and wheel behavior.
- **Exports:** PNG and SVG of what you see or of single layers; text art as PNG, SVG with live text, PDF, CMYK PDF and plates, Braille or ASCII text; project files.
- **Installers** for Windows, macOS and Linux, built by GitHub Actions. The app also runs in a browser and offline.
- Sample pictures made for the project, and a new icon.

### Changed

- Licensed under the GNU Affero General Public License, version 3 or later.

[Unreleased]: https://github.com/datakeen/Sungfluence/compare/v3.4.0...HEAD
[3.4.0]: https://github.com/datakeen/Sungfluence/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/datakeen/Sungfluence/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/datakeen/Sungfluence/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/datakeen/Sungfluence/releases/tag/v3.1.0
