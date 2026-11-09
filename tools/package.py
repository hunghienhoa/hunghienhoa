"""Đóng gói mã nguồn và giao diện, không chứa database, phiên hay tệp thử."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from shutil import copy2

root = Path(__file__).resolve().parent.parent
output = root / 'outputs'
output.mkdir(exist_ok=True)
roots = ['dist', 'server', 'tools', 'source-assets', '.github/profile']
docs = ['README.md', 'PROJECT.md', 'DEPLOYMENT.md', 'FONT-SOURCES.md', 'AGENTS.md', 'API-CONTRACT.md', 'COMMUNITY-ADMIN-QA.md', 'HOP-ANH-QA.md', 'MOBILE-QA.md', 'SOCIAL-LOGO-SOURCES.md', 'IMAGEGEN.md', 'check.cjs', '.gitignore', '.openai/hosting.json']
files = [path for name in roots for path in (root / name).rglob('*') if path.is_file() and '__pycache__' not in path.parts]
files += [root / name for name in docs if (root / name).is_file()]
full = root / 'Portfolio-Hung-Hien-Hoa.zip'
with ZipFile(full, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(files):
        assert path.suffix not in {'.sqlite', '.db'}
        assert not any(part in {'private-data', 'tmp', '.git', 'outputs'} for part in path.relative_to(root).parts)
        archive.write(path, path.relative_to(root).as_posix())
copy2(full, output / 'Website-Hung-Khung-Blog-Quan-Tri.zip')
for folder, name in [('photobooth', 'Hop-Anh-Photobooth-Rieng.zip'), ('blog', 'Goc-To-Mo-Blog-Rieng.zip'), ('admin', 'Quan-Tri-Hung-Rieng.zip')]:
    base = root / 'dist' / folder
    target = output / name
    with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
        for path in sorted(base.rglob('*')):
            if path.is_file(): archive.write(path, path.relative_to(base).as_posix())
    if folder == 'photobooth': copy2(target, root / name)
for path in [output / 'Website-Hung-Khung-Blog-Quan-Tri.zip', output / 'Hop-Anh-Photobooth-Rieng.zip', output / 'Goc-To-Mo-Blog-Rieng.zip', output / 'Quan-Tri-Hung-Rieng.zip']:
    with ZipFile(path) as archive:
        assert archive.testzip() is None
        assert not any('\\' in name or name.endswith(('.sqlite', '.db')) or name.startswith(('private-data/', 'tmp/', '.env')) for name in archive.namelist())
        print(f'PASS: {path.name}: {len(archive.namelist())} files, {path.stat().st_size} bytes; no private data.')
copy2(root / 'COMMUNITY-ADMIN-QA.md', output / 'COMMUNITY-ADMIN-QA.md')
