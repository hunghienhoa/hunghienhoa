"""Package tracked project files only, never live data or credentials."""
from pathlib import Path
from datetime import datetime, timezone
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parents[1]
def git(*args):
    return subprocess.check_output(['git', *args],cwd=root)
sha = git('rev-parse','HEAD').decode().strip()
if git('status','--porcelain','--untracked-files=no').strip():
    raise SystemExit('Hãy commit các thay đổi trước khi đóng gói để backup khớp đúng phiên bản.')
stamp = datetime.fromtimestamp(int(git('show','-s','--format=%ct','HEAD')),timezone.utc).strftime('%Y%m%d-%H%M%S')
tag = f'web-{stamp}-{sha[:7]}'
output = root/'outputs/release'
output.mkdir(parents=True,exist_ok=True)
tracked = [Path(name.decode('utf-8')) for name in git('ls-files','-z').split(b'\0') if name]
allowed_roots = {'dist','server','worker','tools','supabase','.github','source-assets'}
allowed_files = {'package.json','package-lock.json','.node-version','.gitignore','check.cjs','cloudflare.config.ts','wrangler.config.ts'}
def permitted(path):
    if any(part.lower() in {'private-data','outputs','tmp','node_modules','.git','.wrangler','.cloudflare','__pycache__','sessions'} for part in path.parts): return False
    if path.name.startswith(('.env','.dev.vars')) or path.suffix.lower() in {'.db','.sqlite','.sqlite3','.pem','.key','.zip','.pyc'} or path.name.endswith(('-wal','-shm')): return False
    return path.parts[0] in allowed_roots or (len(path.parts)==1 and (path.name in allowed_files or path.suffix=='.md'))
files = sorted(path for path in tracked if permitted(path))
assert all(Path(name) in files for name in ['package.json','package-lock.json','server/server.mjs','worker/index.mjs','dist/index.html','RESTORE.md'])
assert not any(permitted(Path(name)) for name in ['.env','dist/.env.production','server/private-data/a.db','tools/session.key','tmp/a.txt','outputs/a.zip'])
manifest = {'version':tag,'commit':sha,'files':{p.as_posix():hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files}}
archives = []
for kind, entries in [('source',files),('web',[p for p in files if p.parts[0]=='dist'])]:
    target = output/f'hunghienhoa-{kind}-{tag}.zip'
    with ZipFile(target,'w',ZIP_DEFLATED) as archive:
        for path in entries: archive.write(root/path,path.as_posix())
        archive.writestr('BACKUP-MANIFEST.json',json.dumps(manifest if kind=='source' else {**manifest,'files':{p.as_posix():manifest['files'][p.as_posix()] for p in entries}},ensure_ascii=False,indent=2))
        archive.write(root/'RESTORE.md','HUONG-DAN-KHOI-PHUC.md')
    with ZipFile(target) as archive:
        assert archive.testzip() is None
        assert set(p.as_posix() for p in entries).issubset(archive.namelist())
    archives.append(target)
(output/'SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in archives),encoding='utf-8')
(output/'tag.txt').write_text(tag,encoding='utf-8')
(output/'notes.md').write_text(f'''Bản sao lưu website Hùng Hiền Hòa.

- Mã nguồn: `{sha}`.
- **source.zip**: mã nguồn, giao diện, cấu hình mẫu, migration và hướng dẫn khôi phục.
- **web.zip**: thư mục giao diện `dist`; cần backend để đăng nhập quản trị và duyệt nội dung.
- `SHA256SUMS.txt`: kiểm tra toàn vẹn các gói ZIP.
- Không bao gồm ảnh cá nhân, database, nội dung động trên Supabase, bản chờ duyệt, tài khoản, mật khẩu hay token. Đây là backup mã nguồn/giao diện; dữ liệu cloud cần sao lưu riêng.

Giải nén gói source, đọc `HUONG-DAN-KHOI-PHUC.md`, chạy `npm ci` và `node server/server.mjs` để xem trên máy. Xem `FRAME-SOURCES.md` cho các mẫu khung mới.
''',encoding='utf-8')
print(f'PASS: {tag}; {len(files)} tracked source files; two ZIPs verified without runtime data.')
