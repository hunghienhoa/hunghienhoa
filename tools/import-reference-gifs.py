"""Import the six supplied animations without rebuilding their motion or artwork."""
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
import hashlib,json,sys
root=Path(__file__).resolve().parent.parent
output=root/'dist/assets/reference-cards'
names=['557c57244803829.699ff3865e3fa.gif','4ed855244803829.69a300cc866f1.gif','72b8e2244803829.69a521935359d.gif','53c013244803829.69a5af26c8c43.gif','22b98e244803829.69a6549c07029.gif','ed8fc2244803829.69a67dab5423e.gif']
if '--check' in sys.argv:
 records=json.loads((output/'manifest.json').read_text(encoding='utf8'))
 assert len(records)==6
 for row in records:
  with Image.open(output/row['file']) as im:
   assert im.format=='WEBP' and im.size==tuple(row['size']) and im.n_frames==row['encodedFrames']
   duration=[]
   for i in range(im.n_frames):
    im.seek(i);im.load();duration.append(im.info['duration'])
   assert duration==row['encodedDurations'] and sum(duration)==sum(row['durations']) and im.info.get('loop')==row['loop']
  assert hashlib.sha256((output/row['file']).read_bytes()).hexdigest()==row['sha256']
  with Image.open(output/row['poster']) as im:assert im.size==tuple(row['size']) and not getattr(im,'is_animated',False)
 print('PASS: six actual source animations, dimensions, every frame duration, loop, hashes and reduced-motion posters.')
 raise SystemExit(0)
def timeline_error(source,target,source_durations,encoded_durations):
 with Image.open(source) as original,Image.open(target) as encoded:
  time=elapsed=frame=0
  worst=0
  for i,duration in enumerate(source_durations):
   midpoint=time+duration/2
   while elapsed+encoded_durations[frame]<=midpoint:
    elapsed+=encoded_durations[frame];frame+=1
   original.seek(i);encoded.seek(frame)
   error=sum(ImageStat.Stat(ImageChops.difference(original.convert('RGB'),encoded.convert('RGB'))).mean)/3
   worst=max(worst,error)
   assert error<8,(source.name,i,frame,error)
   time+=duration
  return round(worst,4)
source=Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'Downloads'
output.mkdir(parents=True,exist_ok=True)
records=[]
for index,name in enumerate(names,1):
 path=source/name
 with Image.open(path) as im:
  frames=[];durations=[];loop=im.info.get('loop',0)
  for i in range(im.n_frames):
   im.seek(i);frames.append(im.convert('RGBA'));durations.append(im.info.get('duration',80))
  target=output/f'card-{index:02d}.webp';poster=output/f'card-{index:02d}-still.webp'
  frames[0].save(target,'WEBP',save_all=True,append_images=frames[1:],duration=durations,loop=loop,quality=85,method=4)
  frames[0].save(poster,'WEBP',quality=90,method=4)
  with Image.open(target) as encoded:
   encoded_durations=[]
   for j in range(encoded.n_frames):
    encoded.seek(j);encoded.load();encoded_durations.append(encoded.info['duration'])
   encoded_count=encoded.n_frames
  assert sum(encoded_durations)==sum(durations)
  records.append(dict(timelineMaxMeanPixelError=timeline_error(path,target,durations,encoded_durations),encodedFrames=encoded_count,encodedDurations=encoded_durations,card=index,source=name,sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),file=target.name,poster=poster.name,size=im.size,frames=len(frames),durations=durations,loop=loop,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
  print(target.name,target.stat().st_size,'bytes',len(frames),'frames',sum(durations),'ms',flush=True)
(output/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
