"""Build original UI glyphs so OS fallback fonts cannot change control icons."""
from pathlib import Path
import math
import re
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
glyphs = {}
def shape(lines):
    pen = TTGlyphPen(None)
    for points in lines:
        pen.moveTo(points[0])
        for point in points[1:]: pen.lineTo(point)
        pen.closePath()
    return pen.glyph()
def stroke(a, b, width=65):
    dx, dy = b[0]-a[0], b[1]-a[1]
    length = math.hypot(dx, dy)
    x, y = -dy/length*width/2, dx/length*width/2
    return [(round(a[0]+x),round(a[1]+y)),(round(b[0]+x),round(b[1]+y)),(round(b[0]-x),round(b[1]-y)),(round(a[0]-x),round(a[1]-y))]
arrow = [[(170,327),(690,327),(690,392),(170,392)],[(450,120),(690,360),(450,600),(495,645),(780,360),(495,75)]]
for char, degrees in [('→',0),('↗',45),('↑',90),('↖',135),('←',180),('↘',-45),('↓',-90)]:
    angle = math.radians(degrees)
    glyphs[char] = shape([[(round(500+(x-500)*math.cos(angle)-(y-360)*math.sin(angle)),round(360+(x-500)*math.sin(angle)+(y-360)*math.cos(angle))) for x,y in points] for points in arrow])
glyphs['＋'] = shape([stroke((200,360),(800,360)),stroke((500,60),(500,660))])
cross = shape([stroke((260,120),(740,600)),stroke((260,600),(740,120))])
glyphs['×'] = glyphs['✕'] = cross
glyphs['⧉'] = shape([stroke(a,b,48) for a,b in [((200,120),(200,640)),((200,640),(640,640)),((640,640),(640,120)),((640,120),(200,120)),((360,0),(800,0)),((800,0),(800,480)),((800,480),(710,480))]])
arc = [(round(500+270*math.cos(math.radians(a))),round(360+270*math.sin(math.radians(a)))) for a in range(45,331,15)]
glyphs['↻'] = shape([stroke(a,b,60) for a,b in zip(arc,arc[1:])] + [[(770,570),(770,320),(530,400)]])
for char, rays in [('✦',4),('✧',4),('✳',8)]:
    points = [(round(500+(340 if i%2==0 else 105)*math.cos(math.pi/2+i*math.pi/rays)),round(360+(340 if i%2==0 else 105)*math.sin(math.pi/2+i*math.pi/rays))) for i in range(rays*2)]
    glyphs[char] = shape([points])
diamond = [(500,680),(800,360),(500,40),(200,360),(500,680)]
glyphs['◇'] = shape([stroke(a,b,45) for a,b in zip(diamond,diamond[1:])])
glyphs['☂'] = shape([[(160,340),(210,490),(340,610),(500,650),(660,610),(790,490),(840,340)],stroke((500,650),(500,120),45),stroke((500,120),(440,55),45),stroke((440,55),(360,110),45)])
glyphs['♫'] = shape([[(300,130),(345,130),(345,540),(690,600),(690,190),(735,190),(735,680),(300,600)],[(160,60),(300,60),(345,130),(300,200),(160,200)],[(550,120),(690,120),(735,190),(690,260),(550,260)]])
glyphs['▰'] = shape([[(180,200),(740,200),(820,520),(260,520)]])
glyphs['▥'] = shape([stroke((x,80),(x,640),45) for x in range(220,781,100)])
circle = [(round(500+310*math.cos(i*math.pi/16)),round(360+310*math.sin(i*math.pi/16))) for i in range(33)]
glyphs['⊕'] = shape([stroke(a,b,40) for a,b in zip(circle,circle[1:])] + [stroke((300,360),(700,360),45),stroke((500,160),(500,560),45)])
builder = FontBuilder(1000,isTTF=True)
names = {char:'ui'+str(ord(char)) for char in glyphs}
builder.setupGlyphOrder(['.notdef']+list(names.values()))
builder.setupCharacterMap({ord(char):name for char,name in names.items()})
builder.setupGlyf({'.notdef':shape([]),**{names[char]:glyph for char,glyph in glyphs.items()}})
builder.setupHorizontalMetrics({name:(1000,0) for name in ['.notdef']+list(names.values())})
builder.setupHorizontalHeader(ascent=850,descent=-150)
builder.setupNameTable({'familyName':'Hung UI Symbols','styleName':'Regular','uniqueFontIdentifier':'HungUISymbols1','fullName':'Hung UI Symbols','psName':'HungUISymbols'})
builder.setupOS2(sTypoAscender=850,sTypoDescender=-150,usWinAscent=850,usWinDescent=150)
builder.setupPost()
builder.font.flavor='woff2'
for folder in [root/'dist',*(root/'dist'/name for name in ['blog','photobooth','admin'])]:
    builder.font.save(folder/'fonts/ui-symbols.woff2')
    html = folder/'index.html'
    markup = html.read_text(encoding='utf-8')
    markup = re.sub(r'(href="(?:style|completed-work|contact)\.css)(?:\?[^"\s]*)?', r'\1?v=ui-icons-1', markup)
    html.write_text(markup,encoding='utf-8')
    css = folder/'style.css'
    text = css.read_text(encoding='utf-8')
    coverage = ','.join('U+'+format(ord(char),'X') for char in glyphs)
    face = "@font-face{font-family:'Hung UI Symbols';src:url('fonts/ui-symbols.woff2') format('woff2');font-weight:100 900;font-style:normal;unicode-range:"+coverage+";font-display:block}"
    text = re.sub(r"@font-face\{font-family:'Hung UI Symbols';[^}]+\}\s*",'',text)
    css.write_text(face+'\n'+text,encoding='utf-8')
for css in (root/'dist').rglob('*.css'):
    text = css.read_text(encoding='utf-8')
    def patch(match):
        block = match.group()
        if '@font-face' in block: return block
        return re.sub(r"font-family:(?!'Hung UI Symbols')", "font-family:'Hung UI Symbols',",block)
    css.write_text(re.sub(r'[^{}]+\{[^{}]*\}',patch,text),encoding='utf-8')
for folder in [root/'dist',*(root/'dist'/name for name in ['blog','photobooth','admin'])]:
    font = TTFont(folder/'fonts/ui-symbols.woff2')
    assert set(font.getBestCmap()) == {ord(char) for char in glyphs}
    assert ord('A') not in font.getBestCmap()  # Text still uses Be Vietnam Pro / Playfair.
    assert (folder/'fonts/ui-symbols.woff2').read_bytes() == (root/'dist/fonts/ui-symbols.woff2').read_bytes()
print('PASS: identical UI glyphs on all four pages; text fonts preserved.')
