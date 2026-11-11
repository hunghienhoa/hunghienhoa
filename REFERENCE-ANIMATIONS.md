# Six original reference animations

Historical implementation: the actual artwork and animation from the six provided GIFs were used before the material reconstruction approved below.

`tools/import-reference-gifs.py` imports the GIFs from Downloads in source-number order01–06, composites all GIF frames using Pillow, and encodes animated WebP at original dimensions, quality85. No AI redraw, cropping, CSS timing, or added moving overlays. The WebP encoder may merge identical consecutive frames; the combined duration stays unchanged. Each source frame is compared with the decoded output at the same timeline position to verify that no visible motion is dropped. Source GIFs remain in Downloads. Each manifest entry records source filename/hash, output hash, dimensions, source and encoded frame durations/counts, timeline visual error and loop setting. `python tools/import-reference-gifs.py --check` validates outputs locally; the Node regression test checks the WebP binary animation records in CI.

The images retain original in-image text/branding. Public captions identify them as reference material supplied by Hùng, not Hùng’s authored projects. Conversion keeps motion timing, but WebP uses lossy compression so colors/pixels are not byte-identical to GIF. Full-resolution assets are sizeable (about48MB combined); native lazy loading defers card requests. No new personal-photo/API behavior.

A static WebP source is selected by `prefers-reduced-motion: reduce`. Modal clones load eagerly. The image uses contain in cards and its full intrinsic aspect ratio in the modal, with no crop. Other page stickers and site colors/type remain unchanged.

## Approved material reconstruction — 2026-11-11

Hùng approved the isolated card01 prototype and then approved applying its cream/indigo/yellow carton, paper labels and translucent bubble-wrap treatment to all six cards. The homepage now uses scoped `material-cards.css` scenes. Card01 keeps the reviewed markup and 4.96-second choreography; cards02–06 each have independent 3.6-second choreography based on their respective GIF, rather than one shared animation. The reconstruction adapts artwork and text to Hùng’s site; it does not claim pixel-identical GIF reproduction.

The native WebP files and manifest above remain an archive and prototype comparison, not homepage downloads. Existing card filters and accessible detail dialogs still work. Reduced-motion users see static, visible props and both paper flags. The isolated preview remains at `/preview-card-01.html` for reviewing the approved starting point. No external animation library or new raster assets are required.

### Artwork balance

The live cards use a 4:3 stage, with enlarged package bodies, titles and labels. Portrait/compact bodies now fill at least42% of the stage width; carton/cassette are wider. Sticker anchors and the record travel distance are adjusted for the new proportions, retaining each loop and duration. The standalone approved prototype remains unchanged as the original review reference.
