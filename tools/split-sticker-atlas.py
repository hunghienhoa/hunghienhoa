"""Cắt ba atlas sticker 4×4 (PNG nguồn ngoài dist) thành 48 tệp WebP riêng.

Mỗi trang chỉ tải đúng các sticker nó dùng thay vì cả ba atlas (~1,35 MB).
Giữ nguyên kích thước ô và chất lượng nén như atlas cũ; CSS hiển thị mỗi tệp bằng background-size:100% 100%.
Chạy lại khi thay PNG nguồn: python tools/split-sticker-atlas.py
"""
from pathlib import Path
from shutil import copy2

from PIL import Image

project = Path(__file__).resolve().parent.parent
sources = project / 'source-assets' / 'original-png' / 'assets'
folders = [project / 'dist', project / 'dist' / 'blog', project / 'dist' / 'photobooth']
# Cùng chất lượng với atlas WebP trước đây (STICKER-SOURCES.md).
atlases = [('sticker-atlas.png', 1, 88), ('sticker-atlas-2.png', 17, 84), ('sticker-atlas-3.png', 33, 84)]

target = folders[0] / 'assets' / 'stickers'
target.mkdir(parents=True, exist_ok=True)
total = 0
for name, first, quality in atlases:
    with Image.open(sources / name) as atlas:
        rgba = atlas.convert('RGBA')
        width, height = rgba.size
        assert width == height, f'{name} phải là ảnh vuông'
        for index in range(16):
            column, row = index % 4, index // 4
            box = (round(column * width / 4), round(row * height / 4), round((column + 1) * width / 4), round((row + 1) * height / 4))
            cell = rgba.crop(box)
            output = target / f'sticker-{first + index:02d}.webp'
            cell.save(output, 'WEBP', quality=quality, alpha_quality=100, method=6, exact=True)
            total += output.stat().st_size
for folder in folders[1:]:
    copy = folder / 'assets' / 'stickers'
    copy.mkdir(parents=True, exist_ok=True)
    for file in sorted(target.glob('sticker-*.webp')):
        copy2(file, copy / file.name)
print(f'Đã tạo 48 sticker WebP ({total // 1024} KB tổng) trong dist, dist/blog và dist/photobooth.')
