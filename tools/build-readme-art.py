#!/usr/bin/env python3
"""Sinh ảnh pixel 32-bit cho README, ghi vào .github/profile.

Chữ được vẽ bằng từng ô vuông (font 5x7 tự dựng, có dấu tiếng Việt) nên không
phụ thuộc phông của GitHub. Màu theo tông giấy kem / xanh tím / vàng của site.

    python tools/build-readme-art.py
"""
import pathlib
import unicodedata

OUT = pathlib.Path(__file__).resolve().parent.parent / '.github' / 'profile'

C = dict(
    cream='#fbf2e3', paper='#fff4e3', blue='#303487', ink='#1f1d5c', yellow='#ffdc38',
    gold='#f0b400', coral='#ec6550', lilac='#9aa0ff', mint='#7cc7a5', mintD='#4fa383',
    sky='#56bbdf', pink='#f08cb4', card='#d99a58', cardL='#efc084', cardD='#b87738',
    hole='#4a2f18', white='#ffffff',
)

# ---------------------------------------------------------------- font 5x7
G = {}


def g(ch, *rows):
    G[ch] = rows


g('A', '.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#')
g('B', '####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.')
g('C', '.####', '#....', '#....', '#....', '#....', '#....', '.####')
g('D', '####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.')
g('E', '#####', '#....', '#....', '####.', '#....', '#....', '#####')
g('F', '#####', '#....', '#....', '####.', '#....', '#....', '#....')
g('G', '.####', '#....', '#....', '#..##', '#...#', '#...#', '.####')
g('H', '#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#')
g('I', '#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####')
g('J', '..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..')
g('K', '#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#')
g('L', '#....', '#....', '#....', '#....', '#....', '#....', '#####')
g('M', '#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#')
g('N', '#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#')
g('O', '.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.')
g('P', '####.', '#...#', '#...#', '####.', '#....', '#....', '#....')
g('Q', '.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#')
g('R', '####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#')
g('S', '.####', '#....', '#....', '.###.', '....#', '....#', '####.')
g('T', '#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..')
g('U', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.')
g('V', '#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..')
g('W', '#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#')
g('X', '#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#')
g('Y', '#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..')
g('Z', '#####', '....#', '...#.', '..#..', '.#...', '#....', '#####')
g('0', '.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.')
g('1', '..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.')
g('2', '.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####')
g('3', '####.', '....#', '....#', '.###.', '....#', '....#', '####.')
g('4', '...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.')
g('5', '#####', '#....', '####.', '....#', '....#', '#...#', '.###.')
g('6', '.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.')
g('7', '#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...')
g('8', '.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.')
g('9', '.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.')
g('.', '.', '.', '.', '.', '.', '.', '#')
g(',', '..', '..', '..', '..', '..', '.#', '#.')
g(':', '.', '.', '#', '.', '#', '.', '.')
g('!', '#', '#', '#', '#', '#', '.', '#')
g('?', '.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..')
g('-', '.....', '.....', '.....', '#####', '.....', '.....', '.....')
g('/', '....#', '....#', '...#.', '..#..', '.#...', '#....', '#....')
g('·', '.', '.', '.', '#', '.', '.', '.')
g('▶', '#....', '##...', '###..', '####.', '###..', '##...', '#....')
g('Đ', '.####.', '.#...#', '.#...#', '######', '.#...#', '.#...#', '.####.')
SPACE = 3


def glyph(ch):
    nf = unicodedata.normalize('NFD', ch)
    base, marks = nf[0], set(nf[1:])
    rows = G.get(base) or G['?']
    w = len(rows[0])
    px = {(x, y) for y, r in enumerate(rows) for x, c in enumerate(r) if c == '#'}
    circ, breve = '̂' in marks, '̆' in marks
    if circ:
        px |= {(2, -3), (1, -2), (3, -2)}
    if breve:
        px |= {(0, -3), (4, -3), (1, -2), (2, -2), (3, -2)}
    t = -5 if (circ or breve) else -3
    combo = circ or breve
    if '̀' in marks:
        px |= {(0, t), (1, t + 1)} if combo else {(1, t), (2, t + 1)}
    if '́' in marks:
        px |= {(4, t), (3, t + 1)} if combo else {(3, t), (2, t + 1)}
    if '̉' in marks:
        px |= {(2, t), (3, t), (3, t + 1)}
    if '̃' in marks:
        px |= {(1, t), (2, t), (4, t), (0, t + 1), (3, t + 1)}
    if '̣' in marks:
        px.add((2, 8))
    if '̛' in marks:
        px |= {(5, 1), (5, 2)}
        w = 6
    return px, w


def layout(s):
    px, cx = set(), 0
    for ch in s.upper():
        if ch == ' ':
            cx += SPACE + 1
            continue
        gp, w = glyph(ch)
        px |= {(x + cx, y) for x, y in gp}
        cx += w + 1
    return px, max(cx - 1, 0)


def runs(px, x, y, sc, fill):
    rows = {}
    for cx, cy in px:
        rows.setdefault(cy, []).append(cx)
    d = []
    for cy in sorted(rows):
        xs = sorted(rows[cy])
        start = prev = xs[0]
        for v in xs[1:] + [None]:
            if v is not None and v == prev + 1:
                prev = v
                continue
            d.append(f'M{x + start * sc} {y + cy * sc}h{(prev - start + 1) * sc}v{sc}h-{(prev - start + 1) * sc}z')
            if v is not None:
                start = prev = v
    return f'<path fill="{fill}" d="{"".join(d)}"/>'


def text_w(s, sc):
    return layout(s)[1] * sc


def text(s, x, y, sc, fill, shadow=None, anchor='start'):
    px, cols = layout(s)
    w = cols * sc
    if anchor == 'middle':
        x -= w // 2
    elif anchor == 'end':
        x -= w
    out = ''
    if shadow:
        out += runs(px, x + sc, y + sc, sc, shadow)
    return out + runs(px, x, y, sc, fill)


# ---------------------------------------------------------------- sprites
def sprite(rows, pal, u, x, y):
    by = {}
    for cy, r in enumerate(rows):
        for cx, c in enumerate(r):
            if c != '.':
                by.setdefault(c, set()).add((cx, cy))
    return ''.join(runs(px, x, y, u, pal[c]) for c, px in by.items())


def rect(x, y, w, h, fill, u, ox=0, oy=0):
    return f'<rect x="{ox + x * u}" y="{oy + y * u}" width="{w * u}" height="{h * u}" fill="{fill}"/>'


HEART = ('.kk..kk.', 'kwpkkppk', 'kwpppppk', 'kpppppdk', '.kppppk.', '..kppk..', '...kk...')
HEART_PAL = dict(k=C['ink'], w='#ffd0c8', p=C['coral'], d='#c4412f')
SPARK = ('...y...', '...y...', '..yyy..', 'yyyywyy', '..yyy..', '...y...', '...y...')
SPARK_PAL = dict(y=C['yellow'], w=C['white'])
PHOTO = ('kkkkkkkkkk', 'kwwwwwwwwk', 'kwbbbbbbwk', 'kwbyybbbwk', 'kwbyybbbwk', 'kwbbbbbbwk',
         'kwbbbggbwk', 'kwbgggggwk', 'kwwwwwwwwk', 'kkkkkkkkkk')
PHOTO_PAL = dict(k=C['ink'], w=C['cream'], b=C['sky'], y=C['yellow'], g=C['mint'])


def anim_y(dy, dur, begin='0s'):
    return (f'<animateTransform attributeName="transform" type="translate" values="0 0;0 {dy};0 0" '
            f'dur="{dur}" begin="{begin}" calcMode="discrete" repeatCount="indefinite"/>')


def blink(dur='1.2s', begin='0s'):
    return f'<animate attributeName="opacity" values="1;0" dur="{dur}" begin="{begin}" calcMode="discrete" repeatCount="indefinite"/>'


def flap(rows, fill, u, ox, oy):
    o = ''.join(rect(x0 - 1, y - 1, x1 - x0 + 3, 3, C['ink'], u, ox, oy) for y, x0, x1 in rows)
    return o + ''.join(rect(x0, y, x1 - x0 + 1, 1, fill, u, ox, oy) for y, x0, x1 in rows)


def box(ox, oy, u):
    s = []
    s.append(rect(1, 6, 18, 2, C['hole'], u, ox, oy))
    s.append(flap([(7, 1, 9), (6, 0, 8), (5, -1, 7), (4, -2, 6)], C['cardL'], u, ox, oy))
    s.append(flap([(7, 10, 18), (6, 11, 19), (5, 12, 20), (4, 13, 21)], C['card'], u, ox, oy))
    # đồ vật trong hộp
    s.append(f'<g>{anim_y(-u, "1.6s")}{sprite(PHOTO, PHOTO_PAL, u, ox + 3 * u, oy - 3 * u)}</g>')
    s.append(f'<g>{anim_y(-u, "1.6s", "-0.8s")}{sprite(HEART, HEART_PAL, u, ox + 12 * u, oy - 1 * u)}</g>')
    # thân hộp
    s.append(rect(0, 7, 20, 12, C['ink'], u, ox, oy))
    s.append(rect(1, 8, 18, 10, C['card'], u, ox, oy))
    s.append(rect(1, 8, 18, 1, C['cardL'], u, ox, oy))
    s.append(rect(15, 9, 4, 9, C['cardD'], u, ox, oy))
    s.append(rect(1, 17, 18, 1, C['cardD'], u, ox, oy))
    s.append(rect(8, 8, 4, 10, C['yellow'], u, ox, oy))
    s.append(rect(8, 8, 1, 10, C['gold'], u, ox, oy))
    s.append(rect(2, 11, 5, 4, C['ink'], u, ox, oy))
    s.append(rect(3, 12, 3, 2, C['cream'], u, ox, oy))
    s.append(rect(4, 12, 1, 1, C['coral'], u, ox, oy))
    s.append(rect(13, 12, 1, 1, C['cardL'], u, ox, oy))
    s.append(rect(14, 14, 1, 1, C['cardL'], u, ox, oy))
    return ''.join(s)


def confetti(items, u):
    out = []
    for i, (x, y, w, h, col) in enumerate(items):
        out.append(f'<g>{anim_y(-u, "1.8s", f"-{(i % 4) * 0.45}s")}{rect(x, y, w, h, col, u)}</g>')
    return ''.join(out)


def sparkle(x, y, u, begin='0s', dur='1.4s'):
    return f'<g opacity="1">{blink(dur, begin)}{sprite(SPARK, SPARK_PAL, u, x, y)}</g>'


# ---------------------------------------------------------------- khung
def notch(x0, y0, x1, y1, n):
    return (f'M{x0 + n} {y0}H{x1 - n}V{y0 + n}H{x1}V{y1 - n}H{x1 - n}V{y1}H{x0 + n}'
            f'V{y1 - n}H{x0}V{y0 + n}H{x0 + n}Z')


def defs(grid='#303487', gop='.09', scan=True):
    d = (f'<pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">'
         f'<path d="M40 0H0V40" fill="none" stroke="{grid}" stroke-opacity="{gop}" stroke-width="2"/></pattern>')
    if scan:
        d += ('<pattern id="s" width="4" height="4" patternUnits="userSpaceOnUse">'
              '<rect width="4" height="2" fill="#000" fill-opacity=".035"/></pattern>')
    return d


def panel(w, h, bg, border, n=12, b=10, grid=True):
    o = [f'<path d="{notch(0, 0, w, h, n)}" fill="{border}"/>',
         f'<path d="{notch(b, b, w - b, h - b, n)}" fill="{bg}"/>']
    if grid:
        o.append(f'<path d="{notch(b, b, w - b, h - b, n)}" fill="url(#g)"/>')
        o.append(f'<path d="{notch(b, b, w - b, h - b, n)}" fill="url(#s)"/>')
    return ''.join(o)


def svg(w, h, title, desc, body, d=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'role="img" aria-labelledby="t d" shape-rendering="crispEdges">'
            f'<title id="t">{title}</title><desc id="d">{desc}</desc><defs>{d}</defs>{body}</svg>\n')


def chip(x, y, label, sc, bg, fg, padx=16, pady=12, shadow=None):
    w = text_w(label, sc) + padx * 2
    h = 7 * sc + pady * 2
    return (rect(0, 0, w, h, C['ink'], 1, x, y) + rect(3, 3, w - 6, h - 6, bg, 1, x, y)
            + text(label, x + padx, y + pady, sc, fg, shadow)), w, h


# ---------------------------------------------------------------- ảnh
def hero():
    W, H = 1140, 520
    b = [panel(W, H, C['cream'], C['blue'])]
    b.append(rect(10, 10, W - 20, 54, C['blue'], 1))
    b.append(text('HUNGHIENHOA.COM', 36, 24, 4, C['cream']))
    for i, col in enumerate((C['coral'], C['yellow'], C['mint'])):
        b.append(rect(W - 130 + i * 30, 29, 16, 16, col, 1))
    c, _, _ = chip(56, 96, 'XIN CHÀO, MÌNH LÀ', 4, C['yellow'], C['blue'], 18, 12)
    b.append(c)
    b.append(text('HÙNG HIỀN HÒA', 56, 206, 8, C['blue'], C['yellow']))
    b.append(text('MỘT HỘP ĐẦY Ý TƯỞNG', 58, 304, 5, C['blue']))
    x = 56
    for label, col in (('THIẾT KẾ', C['yellow']), ('KỂ CHUYỆN', C['mint']), ('KHÁM PHÁ', C['lilac'])):
        c, w, _ = chip(x, 366, label, 4, col, C['blue'], 14, 14)
        b.append(c)
        x += w + 14
    b.append(f'<g>{blink("1.2s")}{text("▶ NHẤN ĐỂ BẮT ĐẦU", 58, 466, 4, C["coral"])}</g>')
    # hộp ý tưởng
    u = 12
    b.append(rect(766, 424, 316, 12, C['ink'], 1))
    b.append(rect(766, 424, 316, 4, C['mint'], 1))
    for i in range(0, 316, 24):
        b.append(rect(766 + i, 428, 12, 8, C['mintD'], 1))
        b.append(box(806, 196, u))
    cf = confetti([(-1, -4, 1, 1, C['coral']), (22, -2, 1, 1, C['mint']), (19, -6, 1, 1, C['lilac']),
                   (3, -7, 2, 1, C['yellow']), (24, 3, 1, 1, C['sky']), (-3, 1, 1, 1, C['pink'])], u)
    b.append(f'<g transform="translate(806 196)">{cf}</g>')
    b.append(sparkle(1000, 112, 6))
    b.append(sparkle(776, 132, 4, '-0.5s'))
    b.append(sparkle(1076, 296, 4, '-0.9s'))
    b.append(sparkle(900, 96, 3, '-0.3s'))
    return svg(W, H, 'Xin chào, mình là Hùng Hiền Hòa',
               'Cảnh pixel 32-bit: chiếc hộp các tông phát ra ảnh, trái tim và những mảnh giấy màu. '
               'Một hộp đầy ý tưởng: thiết kế, kể chuyện và khám phá.', ''.join(b), defs())


def closing():
    W, H = 1140, 230
    b = [panel(W, H, C['blue'], C['ink'], 12, 10)]
    b[0] = (f'<path d="{notch(0, 0, W, H, 12)}" fill="{C["ink"]}"/><path d="{notch(10, 10, W - 10, H - 10, 12)}" fill="{C["blue"]}"/>'
            f'<path d="{notch(10, 10, W - 10, H - 10, 12)}" fill="url(#g)"/><path d="{notch(10, 10, W - 10, H - 10, 12)}" fill="url(#s)"/>')
    b.append(text('Ý TƯỞNG HAY THƯỜNG BẮT ĐẦU', 56, 66, 5, C['cream']))
    b.append(text('TỪ MỘT LỜI CHÀO.', 56, 124, 5, C['yellow'], C['ink']))
    b.append(f'<g>{blink("1.2s")}{text("▶ RẤT VUI ĐƯỢC GẶP BẠN!", 58, 178, 4, C["mint"])}</g>')
    u = 10
    b.append(f'<g>{anim_y(-u, "1.4s")}{sprite(HEART, HEART_PAL, u, 930, 70)}</g>')
    b.append(sparkle(1030, 48, 5))
    b.append(sparkle(884, 56, 4, '-0.6s'))
    b.append(sparkle(1050, 150, 4, '-0.2s'))
    return svg(W, H, 'Ý tưởng hay thường bắt đầu từ một lời chào',
               'Dải pixel xanh tím với trái tim hồng đang nhún nhảy và dòng chữ chào hỏi.', ''.join(b),
               defs(grid='#fff4e3', gop='.07'))


def section(num, label, col):
    W, H = 1140, 84
    b = [f'<path d="{notch(0, 0, W, H, 8)}" fill="{C["ink"]}"/>',
         f'<path d="{notch(6, 6, W - 6, H - 6, 6)}" fill="{C["blue"]}"/>',
         rect(6, 6, 96, H - 12, col, 1),
         rect(102, 6, 6, H - 12, C['ink'], 1),
         text(num, 54, H // 2 - 17, 5, C['blue'], anchor='middle'),
         text(label, 132, H // 2 - 14, 4, C['cream'], C['ink'])]
    for i in range(6):
        b.append(rect(W - 40 - i * 22, 24 + (i % 2) * 24, 12, 12, (C['yellow'], C['coral'], C['mint'], C['lilac'], C['sky'], C['pink'])[i], 1))
    return svg(W, H, label, f'Đầu mục {num}: {label}', ''.join(b))


ICONS = {
    'camera': [(1, 4, 12, 9, C['ink']), (2, 5, 10, 7, C['cream']), (5, 6, 4, 4, C['ink']), (6, 7, 2, 2, C['sky']),
               (2, 2, 4, 2, C['ink']), (10, 6, 2, 1, C['coral'])],
    'page': [(3, 1, 8, 12, C['ink']), (4, 2, 6, 10, C['cream']), (5, 4, 4, 1, C['blue']), (5, 6, 4, 1, C['blue']),
             (5, 8, 3, 1, C['blue']), (5, 10, 2, 1, C['coral'])],
    'down': [(6, 1, 2, 6, C['ink']), (3, 6, 8, 1, C['ink']), (4, 7, 6, 1, C['ink']), (5, 8, 4, 1, C['ink']),
             (6, 9, 2, 1, C['ink']), (6, 2, 2, 5, C['cream']), (4, 6, 6, 1, C['cream']), (5, 7, 4, 1, C['cream']),
             (6, 8, 2, 1, C['cream']), (1, 11, 12, 2, C['ink']), (2, 11, 10, 1, C['cream'])],
    'spark': [(6, 1, 2, 12, C['ink']), (1, 6, 12, 2, C['ink']), (5, 3, 4, 8, C['ink']), (3, 5, 8, 4, C['ink']),
              (6, 2, 2, 10, C['cream']), (2, 6, 10, 2, C['cream']), (5, 5, 4, 4, C['white'])],
}


def project_card(num, label, icon, col):
    W, H = 560, 80
    b = [f'<path d="{notch(0, 0, W, H, 8)}" fill="{C["ink"]}"/>',
         f'<path d="{notch(6, 6, W - 6, H - 6, 6)}" fill="{C["blue"]}"/>',
         rect(6, 6, 68, H - 12, col, 1), rect(74, 6, 6, H - 12, C['ink'], 1)]
    for x, y, w, h, fill in ICONS[icon]:
        b.append(rect(x, y, w, h, fill, 4, 12, 12))
    b.append(text(f'LV {num}', W - 30, 26, 4, C['yellow'], anchor='end'))
    b.append(text(label, 100, 26, 4, C['cream'], C['ink']))
    return svg(W, H, f'Nhiệm vụ {num}: {label}', f'Thẻ dự án {label} với biểu tượng pixel.', ''.join(b))


def profile():
    W, H = 1140, 400
    b = [panel(W, H, C['cream'], C['blue'])]
    b.append(rect(10, 10, W - 20, 54, C['blue'], 1))
    b.append(text('HỒ SƠ NGƯỜI CHƠI', 36, 24, 4, C['cream']))
    b.append(text('P1', W - 38, 24, 4, C['yellow'], anchor='end'))
    rows = (('TÊN', 'HÙNG HIỀN HÒA'), ('VAI TRÒ', 'THIẾT KẾ · KỂ CHUYỆN · KHÁM PHÁ'),
            ('CĂN CỨ', 'HUNGHIENHOA.COM'), ('NHIỆM VỤ', '04 DỰ ÁN ĐANG CHẠY'), ('NGÔN NGỮ', 'TIẾNG VIỆT · ENGLISH'))
    y = 92
    for k, v in rows:
        b.append(text(k, 56, y + 3, 3, C['blue']))
        b.append(rect(250, y - 6, 3, 36, C['blue'], 1).replace('<rect', '<rect opacity=".3"'))
        b.append(text(v, 280, y - 1, 4, C['blue']))
        y += 44
    b.append(text('BẢNG MÀU', 56, 349, 3, C['blue']))
    for i, col in enumerate((C['cream'], C['blue'], C['yellow'], C['coral'], C['lilac'], C['mint'])):
        b.append(rect(250 + i * 44, 336, 36, 28, C['ink'], 1))
        b.append(rect(253 + i * 44, 339, 30, 22, col, 1))
    # nhân vật hộp nhỏ bên phải
    u = 8
    b.append(f'<g transform="translate(0 0)">{box(860, 215, u)}</g>')
    b.append(sparkle(1050, 200, 4))
    b.append(sparkle(840, 230, 3, '-0.7s'))
    return svg(W, H, 'Hồ sơ người chơi: Hùng Hiền Hòa',
               'Tên Hùng Hiền Hòa, vai trò thiết kế, kể chuyện và khám phá, căn cứ hunghienhoa.com, '
               'bốn dự án, hai ngôn ngữ Việt và Anh, cùng bảng màu kem, xanh tím, vàng, san hô, tím nhạt, bạc hà.',
               ''.join(b), defs())


STACK = (('HT', 'HTML', 'TRANG WEB', C['coral']), ('CS', 'CSS', 'GIAO DIỆN', C['sky']),
         ('JS', 'JS', 'TƯƠNG TÁC', C['yellow']), ('NO', 'NODE.JS', 'MÁY CHỦ', C['mint']),
         ('SB', 'SUPABASE', 'DỮ LIỆU', C['mint']), ('CF', 'WORKERS', 'CLOUD', C['coral']),
         ('GA', 'ACTIONS', 'TỰ ĐỘNG', C['lilac']), ('AI', 'ONNX WEB', 'AI', C['yellow']))


def inventory():
    W, H = 1140, 320
    b = [panel(W, H, C['cream'], C['blue'])]
    b.append(rect(10, 10, W - 20, 54, C['blue'], 1))
    b.append(text('TÚI ĐỒ NGHỀ', 36, 24, 4, C['cream']))
    b.append(text('8 MÓN', W - 38, 24, 4, C['yellow'], anchor='end'))
    sw, gap = 262, 8
    for i, (code, name, cat, col) in enumerate(STACK):
        x = 28 + (i % 4) * (sw + gap)
        y = 86 + (i // 4) * 108
        b.append(rect(x, y, sw, 96, C['ink'], 1))
        b.append(rect(x + 4, y + 4, sw - 8, 88, C['paper'], 1))
        b.append(rect(x + 14, y + 20, 56, 56, C['ink'], 1))
        b.append(rect(x + 18, y + 24, 48, 48, col, 1))
        b.append(rect(x + 18, y + 24, 48, 6, C['white'], 1).replace('<rect', '<rect opacity=".35"'))
        b.append(text(code, x + 42, y + 38, 4, C['blue'], anchor='middle'))
        nsc = 4 if len(name) <= 6 else 3
        b.append(text(name, x + 82, y + 24, nsc, C['blue']))
        b.append(text(cat, x + 82, y + 60, 3, C['blue']).replace('<path', '<path opacity=".72"'))
    return svg(W, H, 'Túi đồ nghề',
               'Tám món nghề: HTML, CSS, JavaScript, Node.js, Supabase, Cloudflare Workers, GitHub Actions và ONNX Runtime Web.',
               ''.join(b), defs())


def button():
    label = 'GỬI EMAIL CHO MÌNH'
    sc = 4
    W = text_w(label, sc) + 150
    H = 92
    b = [f'<path d="{notch(0, 0, W, H, 8)}" fill="{C["ink"]}"/>',
         f'<path d="{notch(6, 6, W - 6, H - 6, 6)}" fill="{C["yellow"]}"/>',
         rect(6, H - 22, W - 12, 16, C['gold'], 1),
         text(label, 40, 31, sc, C['blue']),
         text('▶', W - 56, 31, sc, C['coral'])]
    return svg(W, H, 'Gửi email cho mình', 'Nút pixel màu vàng: gửi email cho Hùng Hiền Hòa.', ''.join(b))


FILES = {
    'chao-hung.svg': hero,
    'loi-chao.svg': closing,
    'ho-so.svg': profile,
    'kho-do.svg': inventory,
    'nut-email.svg': button,
    'muc-hop.svg': lambda: section('01', 'CÓ GÌ TRONG CHIẾC HỘP?', C['yellow']),
    'muc-xuong.svg': lambda: section('02', 'BÊN TRONG XƯỞNG NHỎ', C['mint']),
    'muc-chao.svg': lambda: section('03', 'BẮT ĐẦU BẰNG MỘT LỜI CHÀO', C['coral']),
    'the-hop-anh.svg': lambda: project_card('01', 'HỘP ẢNH', 'camera', C['coral']),
    'the-goc-to-mo.svg': lambda: project_card('02', 'GÓC TÒ MÒ', 'page', C['yellow']),
    'the-snap.svg': lambda: project_card('03', 'SNAP', 'down', C['sky']),
    'the-lam-net.svg': lambda: project_card('04', 'LÀM NÉT', 'spark', C['mint']),
}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in FILES.items():
        (OUT / name).write_text(fn(), encoding='utf-8')
        print('ghi', name)
