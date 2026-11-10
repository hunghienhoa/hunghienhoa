"""Import only PNG frame artwork; derive photo windows from transparent components."""
import io, json, zipfile
from pathlib import Path
from collections import deque
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GROUPS = ['Cơ bản pastel','Cơ bản đậm','Nơ điệu đà','Bong bóng tiệc','Việt Nam phố thị','Tim kem','Trái cây','Nhạc pop','Nét vẽ trắng','Chữ bên cạnh','Mạng xã hội','Đom đóm','Mèo đen','Pastel nghiêng']
GROUPS2 = ['Mây trời','Trái tim','Bầu dục tối giản','Ảnh lấy liền','Phim cuộn','Y2K lấp lánh','Sổ tay','Báo chí','Việt Nam','Sinh nhật','Dễ thương','Dải ngân hà','Cherry caro','Pop art','Vòm boho','Mùa lễ hội','Bưu thiếp 2×2','Bộ ảnh 2×3','Đám cưới','Tốt nghiệp']

def windows(im):
    small = im.getchannel('A').resize((180,540),Image.Resampling.NEAREST)
    alpha=small.load(); seen=set(); result=[]
    for y in range(540):
        for x in range(180):
            if alpha[x,y]>10 or (x,y) in seen: continue
            queue=deque([(x,y)]);seen.add((x,y)); xs=[];ys=[]
            while queue:
                a,b=queue.popleft();xs.append(a);ys.append(b)
                for c,d in [(a-1,b),(a+1,b),(a,b-1),(a,b+1)]:
                    if 0<=c<180 and 0<=d<540 and (c,d) not in seen and alpha[c,d]<=10:
                        seen.add((c,d));queue.append((c,d))
            if len(xs)>900 and min(xs)>0 and max(xs)<179 and min(ys)>0 and max(ys)<539:
                result.append([min(xs)*4,min(ys)*2180/540,(max(xs)-min(xs)+1)*4,(max(ys)-min(ys)+1)*2180/540])
    return sorted(result,key=lambda r:(round(r[1]/100),r[0]))

def main():
    out=ROOT/'dist/photobooth/assets/imported-frames';out.mkdir(parents=True,exist_ok=True)
    source=ROOT/'source-assets/original-png/frame-packs';source.mkdir(parents=True,exist_ok=True)
    records=[]
    for pack,names in [(70,GROUPS),(100,GROUPS2)]:
        with zipfile.ZipFile(Path.home()/f'Downloads/photobooth_{pack}_frames_v{3 if pack==70 else 2}.zip') as z:
            for entry in z.infolist():
                if not entry.filename.endswith('.png'): continue
                raw=z.read(entry);im=Image.open(io.BytesIO(raw)).convert('RGBA')
                group=int(entry.filename.split('_')[0])-1
                number=int(Path(entry.filename).stem.split('_')[-1]);key=f'pack{pack}-{number:03}'
                slots=windows(im)
                assert 2<=len(slots)<=6,(entry.filename,slots)
                (source/f'{key}.png').write_bytes(raw)
                im.resize((720,2180),Image.Resampling.LANCZOS).save(out/f'{key}.webp','WEBP',quality=90,method=2)
                im.resize((144,436),Image.Resampling.LANCZOS).save(out/f'{key}-thumb.webp','WEBP',quality=83,method=2)
                label=names[group]
                category='Việt Nam' if 'Việt Nam' in label else 'Sinh nhật & lễ hội' if label in ['Sinh nhật','Bong bóng tiệc','Mùa lễ hội','Tốt nghiệp','Đám cưới'] else 'Nhạc pop & Y2K' if label in ['Nhạc pop','Y2K lấp lánh','Mạng xã hội','Chữ bên cạnh'] else 'Tối giản' if label.startswith('Cơ bản') or label=='Bầu dục tối giản' else 'Nhật ký & vintage' if label in ['Ảnh lấy liền','Phim cuộn','Sổ tay','Báo chí','Bưu thiếp 2×2','Bộ ảnh 2×3'] else 'Dễ thương & thiên nhiên'
                records.append(dict(id=key,name=f'{label} · {(number-1)%5+1:02}',category=category,slots=slots,src=f'assets/imported-frames/{key}.webp',thumb=f'assets/imported-frames/{key}-thumb.webp'))
    (ROOT/'dist/photobooth/imported-frames.mjs').write_text('export const importedFrames = '+json.dumps(records,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
    print('Imported',len(records),'frames;',sum(len(r['slots'])!=4 for r in records),'layouts with other than four windows')

if __name__=='__main__': main()
