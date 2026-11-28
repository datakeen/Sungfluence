# Photo panel

The Photo panel changes the picture that the text art reads. Changes here redraw the text art, unless you locked it in the Text art panel.

## Crop and turn

- **Crop**: choose the Crop tool (C), or click **Crop on the canvas** here. Drag the corners and sides; drag inside the box to move it. Pick a shape: Free, Original, 1:1, 4:5, 3:2, 2:3, 16:9 or 9:16. Enter, a double-click or **Apply crop** applies it. **Reset crop** brings back the whole photo.
- **⟲ Left** and **⟳ Right** turn the photo by a quarter. **Flip ↔** and **Flip ↕** mirror it.
- **Canvas size…** adds or removes space around the photo, with an anchor to choose which side grows. Exports come out at the size you type, and the artboard **Width** in the Output panel follows it. SungFluence keeps the photo at up to 3000 px inside, for speed. A picture you open after that asks first: **Place on this artboard** puts it on the Photo layer, fitted inside the artboard, so text art fills the whole artboard; **Open as a new picture** starts again with that picture at its own size. The same question comes up on a blank artboard.

All of these can be undone.

## Tones for text art

When you open a new photo, SungFluence sets its tones for text art. It looks at the photo's own numbers and picks:

- a **Black point** and a **White point**, so the photo uses the whole range from dark to light,
- **Midtones**, which lift a dark photo or deepen a pale one, so the detail sits in the middle tones where letters show it best,
- a little **Clarity** and **Sharpen** for a soft photo, and a little more color for a dull one.

A bright photo with good detail is left almost as it is. The settings show in the Adjust section, so you can see and change them. **Reset every effect on the photo** gives you the plain photo back, and **Auto tone** sets the tones again.

To open new photos plain, turn off **Set the tones of new photos for text art** in Settings. Projects always open with the settings they were saved with.

## Adjust

**Auto tone** comes first. It sets the black point, white point, midtones, clarity and sharpening from the photo, and leaves your other settings alone. While its values are in place the button reads **Auto tone: on**; click it again to turn it off.

Below it are **Brightness**, **Contrast**, **Color strength**, **Warmth** and **Tint**. **More** holds the rest:

- **Midtones**: above 1 makes the middle tones lighter, below 1 darker.
- **Black point** and **White point**: raise the black point to make dark grays black; lower the white point to make light grays white.
- **Grayscale** and **Invert**.
- **Detail**: sharpen, smooth and clarity. **Clarity** raises the contrast between nearby areas, about the size of a letter, so flat areas keep their shapes in text art. Sharpening grows with the size of the picture, so an export looks like the preview.
- **Color and tone**: hue, shadows, highlights, sepia and vignette.
- **Effects**: grain, posterize, a black and white cut, and pixelate.

A closed section says **(on)** when you changed something in it. The values Auto tone set do not count. The **Reset** next to the Adjust heading puts all of these back at once.

## Remove background

Removed areas get no letters, which makes a clean cutout. They stay clear in transparent files.

1. **Remove background** guesses the background from the edges of the photo. **Background tolerance** sets how far it reaches.
2. For more control, select an area with the **Wand**, **Lasso** or **Brush**, then click **Remove**, **Keep only** or **Restore**.
3. **Edge softness** feathers the edge. **Bring everything back** undoes all removal.

**Show removed areas as** chooses how removed parts look while you work: a checkerboard or a color. Exports never include it. On a paper background removed parts always show the checkerboard. With a transparent background they are clear in the file too, so they look like the other clear areas: with Black or White chosen under **View > Show transparency as**, they show plain black or white, and the first choice is named Black or White to match.

### See-through PNG files

The see-through parts of a PNG count as removed when the photo opens. Underneath they read as white paper, never as black. So **Bring everything back** gives a white background, and half see-through edges and shadows blend with white. **Compare** and the **Original** button show the photo on white too.

## Reshape

**Reshape: liquify, bulge and twirl** is one folded section. The **Reset** in its heading puts the photo back in shape, Liquify included.

**Bulge or pinch** and **Twirl** bend the photo around a point. **Center, across**, **Center, down** and **Size** set where and how far.

### Liquify

The **Liquify** tool (Y, or **Liquify by hand** under Reshape) bends the photo with a brush. Choose what the brush does in the bar above the canvas:

- **Push**: drag to move the photo along with the brush.
- **Bloat**: makes the area under the brush bigger. Hold the mouse still to keep growing it.
- **Pucker**: makes it smaller.
- **Twirl right** and **Twirl left**: turn it around the brush.
- **Restore**: brushes the photo back to how it was. Hold Alt for Restore with any mode.

**Size** is the brush size on screen, and **Strength** how much each touch changes. Every stroke can be undone. **Reset liquify** removes all of them. Liquify is saved in projects, and text art follows the changed photo.

## Draw on the photo

**Text**, **Rectangle**, **Ellipse** and **Image…** add an object that becomes part of the photo, so the text art draws it too. Use this to put a name into a portrait made of letters. **Image…** fits the picture inside the artboard. A picture placed where the photo was removed, such as the clear border from Canvas size, brings that area back, so it shows and text art uses it. The new object is selected and its settings open at the top of the Photo panel. If the photo is hidden, Photo view turns on so you can see it. Shapes on the Vector layer float above instead; see [Vector panel](vector.md).

## Layer blending

**Layer blending**, folded at the end of the panel, holds the Photo layer's **Opacity**, **Blend** mode, and **Move up** and **Move down** in the stack. The heading shows the opacity and blend when they are changed.

## Put the photo back

**Reset every effect on the photo**, at the bottom of the panel, puts every adjustment, effect, silhouette and reshape back as it was, Liquify included. The crop and any areas you removed are kept. Adjust and Reshape also have their own **Reset**. All of them can be undone.

## Silhouette

The silhouette is set in the Text art panel, under the **Shape** of Word cloud and Calligram. See [Text art: the silhouette](text-art.md#the-silhouette). It changes the photo itself, so **Reset every effect on the photo** turns it off too.
