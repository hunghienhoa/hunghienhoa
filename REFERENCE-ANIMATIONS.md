# Six original reference animations

Latest explicit choice from Hùng: use the actual artwork and animation from the six provided GIFs. This supersedes the earlier requirement to retain the CSS artwork in those six cards.

`tools/import-reference-gifs.py` imports the GIFs from Downloads in source-number order01–06, composites all GIF frames using Pillow, and encodes animated WebP at original dimensions, quality85. No AI redraw, cropping, CSS timing, or added moving overlays. The WebP encoder may merge identical consecutive frames; the combined duration stays unchanged. Each source frame is compared with the decoded output at the same timeline position to verify that no visible motion is dropped. Source GIFs remain in Downloads. Each manifest entry records source filename/hash, output hash, dimensions, source and encoded frame durations/counts, timeline visual error and loop setting. `python tools/import-reference-gifs.py --check` validates outputs locally; the Node regression test checks the WebP binary animation records in CI.

The images retain original in-image text/branding. Public captions identify them as reference material supplied by Hùng, not Hùng’s authored projects. Conversion keeps motion timing, but WebP uses lossy compression so colors/pixels are not byte-identical to GIF. Full-resolution assets are sizeable (about48MB combined); native lazy loading defers card requests. No new personal-photo/API behavior.

A static WebP source is selected by `prefers-reduced-motion: reduce`. Modal clones load eagerly. The image uses contain in cards and its full intrinsic aspect ratio in the modal, with no crop. Other page stickers and site colors/type remain unchanged.
