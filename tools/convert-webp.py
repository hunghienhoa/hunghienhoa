"""Chuyển PNG phục vụ trên web sang WebP lossless; giữ bản nguồn ngoài dist."""
from pathlib import Path
from shutil import copy2
import os
import sys

project = Path(__file__).resolve().parent.parent
web = (project / 'dist').resolve()
originals = project / 'source-assets' / 'original-png'
files = sorted(path for path in web.rglob('*') if path.is_file() and path.suffix.lower() == '.png')
if '--check' in sys.argv:
    if files:
        raise SystemExit('Còn PNG trong web: ' + ', '.join(str(path.relative_to(web)) for path in files))
    print('PASS: không có PNG được phục vụ trong dist.')
    raise SystemExit(0)

from PIL import Image

old_total = new_total = 0
for source in files:
    source.resolve().relative_to(web)
    target = source.with_suffix('.webp')
    with Image.open(source) as image:
        rgba = image.convert('RGBA')
        if target.exists():
            with Image.open(target) as existing:
                if existing.convert('RGBA').tobytes() != rgba.tobytes() or existing.size != rgba.size:
                    raise FileExistsError(f'Không ghi đè ảnh WebP khác nội dung: {target}')
        else:
            rgba.save(target, 'WEBP', lossless=True, quality=100, method=6, exact=True, icc_profile=image.info.get('icc_profile', b''))
        with Image.open(target) as converted:
            assert converted.size == rgba.size and converted.convert('RGBA').tobytes() == rgba.tobytes()
    backup = originals / source.relative_to(web)
    backup.parent.mkdir(parents=True, exist_ok=True)
    if backup.exists() and backup.read_bytes() != source.read_bytes():
        raise FileExistsError(f'Bản nguồn đã tồn tại và khác nội dung: {backup}')
    copy2(source, backup)
    for document in web.rglob('*'):
        if not document.is_file() or document.suffix.lower() not in {'.html', '.css', '.js', '.mjs', '.json'}:
            continue
        changes = {
            os.path.relpath(source, document.parent).replace('\\', '/'): os.path.relpath(target, document.parent).replace('\\', '/'),
            '/' + source.relative_to(web).as_posix(): '/' + target.relative_to(web).as_posix(),
        }
        content = document.read_text(encoding='utf-8')
        updated = content
        for old, new in sorted(changes.items(), key=lambda pair: len(pair[0]), reverse=True):
            updated = updated.replace(old, new)
        if updated != content:
            document.write_text(updated, encoding='utf-8')
    old_total += source.stat().st_size
    new_total += target.stat().st_size
    print(f'{source.relative_to(web)} -> {target.name}: {source.stat().st_size} -> {target.stat().st_size} bytes')
    source.unlink()
if old_total:
    print(f'{len(files)} ảnh: {old_total} -> {new_total} bytes, giảm {(1-new_total/old_total)*100:.1f}%; RGBA giữ nguyên.')
else:
    print('Không có PNG mới để chuyển.')
