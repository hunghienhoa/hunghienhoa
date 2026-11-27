"""Generate 150 photobooth frames (30 series x 5 colorways) inspired by 5 Instagram studios:
- @memora.film (30 frames)
- @everyspace.saigon (30 frames)
- @cava.saigon (30 frames)
- @pixie.photo_ (30 frames)
- @linhlinhphotobooth (30 frames)
"""
import json, math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist/photobooth/assets/imported-frames"
MANIFEST = ROOT / "dist/photobooth/imported-frames.mjs"

W, H = 720, 2180


def load_font(kind, size):
    candidates = {
        "bold": ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"],
        "reg": ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"],
        "serif": ["C:/Windows/Fonts/georgeab.ttf", "C:/Windows/Fonts/georgiab.ttf", "C:/Windows/Fonts/timesbd.ttf"],
        "italic": ["C:/Windows/Fonts/georgiai.ttf", "C:/Windows/Fonts/timesi.ttf"],
        "mono": ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/courbd.ttf"],
    }[kind]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F_TITLE = load_font("bold", 40)
F_SUB = load_font("reg", 22)
F_SERIF = load_font("serif", 42)
F_ITALIC = load_font("italic", 32)
F_MONO = load_font("mono", 22)
F_MONO_SM = load_font("mono", 17)
F_SMALL = load_font("bold", 18)
F_BIG = load_font("serif", 54)


def hex_rgba(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)) + (255,)


def make_gradient(c_top, c_bot, aura_color=None):
    im = Image.new("RGBA", (W, H), c_top)
    px = im.load()
    for y in range(H):
        t = y / (H - 1)
        c = lerp_color(c_top, c_bot, t)
        for x in range(W):
            px[x, y] = c
    if aura_color:
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        ac = hex_rgba(aura_color, 135)
        gd.ellipse([80, 260, 640, 1020], fill=ac)
        gd.ellipse([60, 1120, 660, 1880], fill=ac)
        glow = glow.filter(ImageFilter.GaussianBlur(95))
        im = Image.alpha_composite(im, glow)
    return im


def draw_star4(d, cx, cy, r, fill, outline=None):
    pts = []
    for i in range(8):
        ang = i * math.pi / 4
        rad = r if i % 2 == 0 else r * 0.32
        pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
    d.polygon(pts, fill=fill, outline=outline)


def draw_heart(d, cx, cy, size, fill, outline=None, width=2):
    pts = []
    for deg in range(0, 360, 6):
        t = math.radians(deg)
        x = 16 * (math.sin(t) ** 3)
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((cx + x * size / 16, cy + y * size / 16))
    d.polygon(pts, fill=fill, outline=outline)
    if outline and width > 1:
        d.line(pts + [pts[0]], fill=outline, width=width)


def draw_bow(d, cx, cy, s, fill, ink):
    d.polygon([(cx, cy), (cx - s, cy - s * 0.65), (cx - s * 0.85, cy + s * 0.65)], fill=fill, outline=ink)
    d.polygon([(cx, cy), (cx + s, cy - s * 0.65), (cx + s * 0.85, cy + s * 0.65)], fill=fill, outline=ink)
    d.line([(cx - 4, cy + 4), (cx - s * 0.55, cy + s * 1.15)], fill=ink, width=4)
    d.line([(cx + 4, cy + 4), (cx + s * 0.55, cy + s * 1.15)], fill=ink, width=4)
    d.ellipse([cx - s * 0.25, cy - s * 0.25, cx + s * 0.25, cy + s * 0.25], fill=fill, outline=ink, width=3)


def draw_flower(d, cx, cy, r, petal_fill, center_fill, ink=None):
    for i in range(5):
        a = i * 2 * math.pi / 5
        px = cx + math.cos(a) * r * 0.65
        py = cy + math.sin(a) * r * 0.65
        d.ellipse([px - r * 0.48, py - r * 0.48, px + r * 0.48, py + r * 0.48], fill=petal_fill, outline=ink, width=2 if ink else 0)
    d.ellipse([cx - r * 0.36, cy - r * 0.36, cx + r * 0.36, cy + r * 0.36], fill=center_fill, outline=ink, width=2 if ink else 0)


def draw_clover(d, cx, cy, r, fill, ink):
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        px = cx + math.cos(a) * r * 0.58
        py = cy + math.sin(a) * r * 0.58
        d.ellipse([px - r * 0.48, py - r * 0.48, px + r * 0.48, py + r * 0.48], fill=fill, outline=ink, width=2)
    d.arc([cx - 4, cy, cx + r * 0.9, cy + r * 1.3], 110, 200, fill=ink, width=3)


def draw_cloud(d, cx, cy, w, fill, ink=None):
    h = w * 0.55
    for dx, dy, rw in [(-0.28, 0.08, 0.28), (-0.05, -0.12, 0.34), (0.22, 0.04, 0.3), (0, 0.16, 0.38)]:
        r = w * rw
        d.ellipse([cx + dx * w - r, cy + dy * h - r * 0.8, cx + dx * w + r, cy + dy * h + r * 0.8], fill=fill, outline=ink, width=2 if ink else 0)


# Layout presets (all well inside 720x2180)
SLOTS_4_STD = [[76, 88, 568, 396], [76, 520, 568, 396], [76, 952, 568, 396], [76, 1384, 568, 396]]
SLOTS_4_FILM = [[104, 88, 512, 392], [104, 516, 512, 392], [104, 944, 512, 392], [104, 1372, 512, 392]]
SLOTS_4_ZIG = [[60, 88, 536, 392], [124, 516, 536, 392], [60, 944, 536, 392], [124, 1372, 536, 392]]
SLOTS_4_SIDE = [[184, 92, 472, 396], [184, 524, 472, 396], [184, 956, 472, 396], [184, 1388, 472, 396]]
SLOTS_4_TOP = [[76, 176, 568, 384], [76, 592, 568, 384], [76, 1008, 568, 384], [76, 1424, 568, 384]]
SLOTS_3_BIG = [[80, 96, 560, 504], [80, 644, 560, 504], [80, 1192, 560, 504]]
SLOTS_4_2X2 = [[52, 132, 292, 668], [376, 132, 292, 668], [52, 844, 292, 668], [376, 844, 292, 668]]
SLOTS_6_2X3 = [
    [52, 120, 292, 476], [376, 120, 292, 476],
    [52, 636, 292, 476], [376, 636, 292, 476],
    [52, 1152, 292, 476], [376, 1152, 292, 476],
]

SERIES = [
    # ==================== 1. @memora.film (6 series x 5 = 30) ====================
    dict(
        code="memora_film35", name="Thước phim Memora", category="Nhật ký & vintage",
        slots=SLOTS_4_FILM, shape="rect", title="MEMORA · FILM 400", sub="SAIGON ANALOG ARCHIVE · 36 EXP",
        palettes=[
            ("#17161a", "#26232b", "#f4ecd8", "#e89b3c"),
            ("#241917", "#382622", "#faeedc", "#e06d53"),
            ("#132026", "#1d313a", "#eef6f7", "#eab64d"),
            ("#2b2723", "#3f3933", "#f7f0e4", "#d67a5c"),
            ("#f5efe3", "#e8decb", "#211e1c", "#c84b31"),
        ],
    ),
    dict(
        code="memora_vhs", name="Máy quay VHS", category="Nhật ký & vintage",
        slots=SLOTS_4_STD, shape="round16", title="PLAY >> VHS-C 1998", sub="REC ● 00:04:26 · MEMORA CAM",
        palettes=[
            ("#12151f", "#1e2436", "#f0f4ff", "#ff4757"),
            ("#1c1b22", "#2d2b38", "#f6f2e8", "#2ed573"),
            ("#211624", "#36233b", "#fceef9", "#ffa502"),
            ("#14211d", "#20362f", "#eafff7", "#ff6b81"),
            ("#e6e4dc", "#d1cfc5", "#1c1e26", "#e84118"),
        ],
    ),
    dict(
        code="memora_ticket", name="Vé rạp chiếu bóng", category="Nhật ký & vintage",
        slots=SLOTS_3_BIG, shape="round16", title="ADMIT ONE · CINEMA", sub="ROW F · SEAT 08 · MEMORA NIGHT",
        palettes=[
            ("#f7ead7", "#ebd7bc", "#6e211f", "#c94a38"),
            ("#631d22", "#471317", "#fbf0df", "#e6b35a"),
            ("#1b2a42", "#121c2e", "#f7eedc", "#df6c55"),
            ("#e3ece6", "#cbdcd1", "#1e3d33", "#c95b44"),
            ("#2b2523", "#1c1817", "#f5e7d0", "#d99b4e"),
        ],
    ),
    dict(
        code="memora_contact", name="Phòng tối Contact", category="Tối giản",
        slots=SLOTS_4_SIDE, shape="rect", title="PROOF SHEET #26", sub="f/2.8 · 1/125s · ISO 400",
        palettes=[
            ("#fbf8f2", "#efeae0", "#1e1e22", "#d93829"),
            ("#1a1a1d", "#28282d", "#f4f1ea", "#e85d3f"),
            ("#eef1f5", "#dce2ea", "#1d2738", "#d64550"),
            ("#f5eee6", "#e6dacb", "#3b2820", "#c44536"),
            ("#222925", "#161c19", "#edf2ee", "#e69f45"),
        ],
    ),
    dict(
        code="memora_washi", name="Nhật ký băng keo", category="Nhật ký & vintage",
        slots=SLOTS_4_ZIG, shape="round16", title="Dear Memory,", sub="giữ lại một thước phim dịu dàng",
        palettes=[
            ("#fbf3e4", "#f0e2c8", "#4a372b", "#d97b58"),
            ("#f5e8ea", "#e8d1d5", "#592b36", "#c96a7d"),
            ("#e8f0e8", "#d2e2d2", "#2e4736", "#87a878"),
            ("#eaeef7", "#d5def0", "#2d3b59", "#7892c9"),
            ("#f7f0d9", "#ebe0bc", "#544526", "#cc8b3c"),
        ],
    ),
    dict(
        code="memora_polaroid2x2", name="Bưu thiếp Polaroid", category="Nhật ký & vintage",
        slots=SLOTS_4_2X2, shape="rect", title="INSTANT MEMORIES", sub="four snapshots · one warm day",
        palettes=[
            ("#f7f1e5", "#e8dec9", "#2e2824", "#c95c44"),
            ("#e6dfd5", "#d4c9ba", "#332922", "#8c583c"),
            ("#242220", "#171615", "#f5eee2", "#d99252"),
            ("#eef2ec", "#dae3d6", "#25382c", "#668f72"),
            ("#f7e8e6", "#ebd1cd", "#4d2624", "#b85550"),
        ],
    ),

    # ==================== 2. @everyspace.saigon (6 series x 5 = 30) ====================
    dict(
        code="every_metro", name="Trạm tàu Sài Gòn", category="Việt Nam",
        slots=SLOTS_4_TOP, shape="round16", title="SAIGON STATION · 01", sub="BẾN THÀNH — THẢO ĐIỀN · EVERYSPACE",
        palettes=[
            ("#eef4fb", "#d8e6f5", "#153d73", "#e84a35"),
            ("#153866", "#0e2647", "#f5f8fc", "#ffb833"),
            ("#f5f2ea", "#e6e0d2", "#1e523a", "#e05a36"),
            ("#fff3d9", "#f5e1b8", "#8f241e", "#22577a"),
            ("#21262e", "#15181e", "#f2f5fa", "#38b6ff"),
        ],
    ),
    dict(
        code="every_receipt", name="Hóa đơn kỷ niệm", category="Nhật ký & vintage",
        slots=SLOTS_4_STD, shape="rect", title="RECEIPT OF MEMORIES", sub="EVERYSPACE SAIGON · TOTAL: 100% JOY",
        palettes=[
            ("#f7f6f2", "#eae8e1", "#222326", "#2b50aa"),
            ("#fff5f7", "#f5e1e6", "#4a1c2a", "#c93b63"),
            ("#f2f7f4", "#dfece4", "#1b3b2b", "#2d7a53"),
            ("#fcf7e8", "#f0e6ca", "#42341b", "#b86b28"),
            ("#eef2fa", "#dae2f2", "#1e2942", "#4762a6"),
        ],
    ),
    dict(
        code="every_music", name="Trình phát nhạc", category="Nhạc pop & Y2K",
        slots=SLOTS_4_STD, shape="round24", title="NOW PLAYING · TRACK 04", sub="01:28 ●────────── 03:45   |<<   ||   >>|",
        palettes=[
            ("#161824", "#24283b", "#f4f6ff", "#1ed760"),
            ("#2b1938", "#1c1026", "#fcedff", "#ff6bd6"),
            ("#f5f7ff", "#dfe5fa", "#1e2547", "#5468ff"),
            ("#ffe8f0", "#f7cfe0", "#4d1930", "#e83e76"),
            ("#182b29", "#0f1c1b", "#ebfffb", "#ffd15c"),
        ],
    ),
    dict(
        code="every_cyber", name="Sao bạc Y2K", category="Nhạc pop & Y2K",
        slots=SLOTS_4_STD, shape="round24", title="CYBER SPACE // 2026", sub="SAIGON METALLIC EDITION",
        palettes=[
            ("#171b30", "#283054", "#f0f4ff", "#9bb8ff"),
            ("#e6ecf7", "#cbd7ed", "#1e2747", "#5c7cfa"),
            ("#291836", "#402654", "#faedff", "#e599f7"),
            ("#16292b", "#224042", "#e8fdff", "#66d9e8"),
            ("#2b1d28", "#452e40", "#fff0f8", "#ff85c0"),
        ],
    ),
    dict(
        code="every_cafe", name="Cà phê vỉa hè", category="Việt Nam",
        slots=SLOTS_4_STD, shape="round16", title="CÀ PHÊ SỮA ĐÁ", sub="Sài Gòn buổi sáng · ghế đẩu chuyện trò",
        palettes=[
            ("#f7ebd9", "#e8d3b5", "#52301c", "#c96b38"),
            ("#4a2d1b", "#331e12", "#faeedc", "#e6a15c"),
            ("#fff5e0", "#f2dfc0", "#7a231d", "#d9822b"),
            ("#e8efe6", "#d0dfd0", "#234233", "#c46238"),
            ("#f5e4dc", "#e6c9bc", "#592820", "#b85d3b"),
        ],
    ),
    dict(
        code="every_grid2x3", name="Lưới studio 2×3", category="Tối giản",
        slots=SLOTS_6_2X3, shape="rect", title="STUDIO 6-CUT · SGN", sub="10°46'N 106°42'E · EVERYSPACE",
        palettes=[
            ("#f7f7f5", "#eaeae6", "#1d1e22", "#303487"),
            ("#1b1c20", "#292b30", "#f5f5f2", "#ffdc38"),
            ("#eef3f8", "#d9e4f0", "#1e324d", "#4a76b8"),
            ("#f7efe8", "#e8d9cc", "#3d2b22", "#a66347"),
            ("#edf5ef", "#d7e8dc", "#1f3d2b", "#4c8c64"),
        ],
    ),

    # ==================== 3. @cava.saigon (6 series x 5 = 30) ====================
    dict(
        code="cava_cheers", name="Tiệc sâm panh", category="Sinh nhật & lễ hội",
        slots=SLOTS_4_STD, shape="round24", title="CHEERS & SPARKLE", sub="CAVA NIGHT · CELEBRATE GOOD TIMES",
        palettes=[
            ("#1c1824", "#2e273b", "#fff5dc", "#f0c45a"),
            ("#fbf4e6", "#f0e1c6", "#4a3222", "#d49b35"),
            ("#4a1828", "#33101b", "#fff2e6", "#f2c166"),
            ("#fcedf2", "#f5d5e0", "#612038", "#d96b8f"),
            ("#172926", "#223d39", "#f5efe0", "#e6b85c"),
        ],
    ),
    dict(
        code="cava_gallery", name="Triển lãm tối giản", category="Tối giản",
        slots=SLOTS_3_BIG, shape="rect", title="CAVA EXHIBITION", sub="COLLECTION N°04 · CURATED MOMENTS",
        palettes=[
            ("#fcfaf5", "#f0ece1", "#222120", "#8c7a66"),
            ("#ebe6dc", "#dcd4c6", "#292522", "#6e5a47"),
            ("#1e1e1c", "#2b2b28", "#f7f4ec", "#b8a68e"),
            ("#eff2f0", "#dde3df", "#202e28", "#5c7568"),
            ("#f5eef0", "#e6d8dc", "#38242b", "#8f6270"),
        ],
    ),
    dict(
        code="cava_magazine", name="Bìa tạp chí", category="Nhạc pop & Y2K",
        slots=SLOTS_4_TOP, shape="rect", title="THE SAIGON ISSUE", sub="VOL. 26 · SPECIAL EDITION · CAVA",
        palettes=[
            ("#f7f4ee", "#eae4d8", "#17171a", "#c8323c"),
            ("#17171a", "#26262b", "#f7f4ee", "#e6c15a"),
            ("#f5e8ec", "#e8d0d8", "#2b1620", "#b8335a"),
            ("#e8eef5", "#d4e0ed", "#162436", "#2b5999"),
            ("#f2ede2", "#e3dac8", "#2e241b", "#a64b2a"),
        ],
    ),
    dict(
        code="cava_coquette", name="Ren ngọc trai", category="Dễ thương & thiên nhiên",
        slots=SLOTS_4_STD, shape="round36", title="Coquette Ribbon", sub="ngọc trai, nơ lụa & một chút điệu đà",
        palettes=[
            ("#fdeef3", "#f7d7e3", "#732c48", "#e888ab"),
            ("#fbf7f0", "#f2e8d8", "#61483b", "#d9a796"),
            ("#eef3fc", "#d8e4f7", "#2e446e", "#88a8e8"),
            ("#f4eefc", "#e4d7f7", "#4c3270", "#ab8ce8"),
            ("#2b1c24", "#1f141a", "#fdeef3", "#f29bb8"),
        ],
    ),
    dict(
        code="cava_bistro", name="Quán nhỏ chiều thu", category="Nhật ký & vintage",
        slots=SLOTS_4_STD, shape="round16", title="CAFÉ & CROISSANT", sub="bánh thơm bơ ấm · chiều Sài Gòn",
        palettes=[
            ("#fbf3e6", "#f0e0c6", "#5c3420", "#c96e38"),
            ("#f2f6ef", "#dce6d5", "#294732", "#759c7e"),
            ("#faeee8", "#f0d7cc", "#632b24", "#c95b4c"),
            ("#edf2f7", "#d7e2ed", "#233954", "#587ca6"),
            ("#36241b", "#261912", "#fbf1e3", "#d9985b"),
        ],
    ),
    dict(
        code="cava_arch", name="Khung vòm hẹn hò", category="Sinh nhật & lễ hội",
        slots=SLOTS_3_BIG, shape="arch", title="Mon Chéri · Date Night", sub="giữ trọn khoảnh khắc bên nhau",
        palettes=[
            ("#fbf2ee", "#f2ddd5", "#6e2932", "#c96b75"),
            ("#631b26", "#47121b", "#fbf2ec", "#e6b875"),
            ("#f7f3eb", "#ebe2d3", "#47392b", "#b8925a"),
            ("#eef4f2", "#d9e6e2", "#24473e", "#68998c"),
            ("#f3eef7", "#e2d7ed", "#422c59", "#9575b8"),
        ],
    ),

    # ==================== 4. @pixie.photo_ (6 series x 5 = 30) ====================
    dict(
        code="pixie_fairy", name="Khu vườn tiên nhỏ", category="Dễ thương & thiên nhiên",
        slots=SLOTS_4_STD, shape="round36", title="PIXIE FAIRY DUST ★", sub="khu vườn phép thuật & đôi cánh nhỏ",
        palettes=[
            ("#eef7f0", "#d5ecd9", "#245438", "#7cc48e"),
            ("#f5eefc", "#e4d4f7", "#482a6b", "#b388eb"),
            ("#fdeef6", "#f7d4e8", "#6e2850", "#f088ba"),
            ("#eef6fc", "#d4e8f7", "#23496b", "#72b4eb"),
            ("#fcf8e8", "#f5ebc6", "#59481d", "#d9b44a"),
        ],
    ),
    dict(
        code="pixie_tama", name="Máy nuôi thú ảo", category="Nhạc pop & Y2K",
        slots=SLOTS_4_STD, shape="round24", title="PIXIE PET · LV.99 ♥♥♥", sub="[A] FEED   [B] PLAY   [C] SNAP",
        palettes=[
            ("#ffd6e8", "#ffb8d6", "#591d3b", "#ff4d94"),
            ("#d6f0ff", "#b3e0ff", "#1a3f66", "#2b8cff"),
            ("#e6ffd6", "#c8f7ab", "#22521d", "#4eb83b"),
            ("#ead6ff", "#d4b3ff", "#3d1e66", "#8c4dff"),
            ("#fff2c2", "#ffe28a", "#5c3d14", "#ff7a2b"),
        ],
    ),
    dict(
        code="pixie_berry", name="Bánh kem dâu tây", category="Sinh nhật & lễ hội",
        slots=SLOTS_4_STD, shape="round24", title="Strawberry Shortcake", sub="ngọt ngào như chiếc bánh kem dâu",
        palettes=[
            ("#fff5f7", "#ffdbe3", "#8c1d36", "#e83e5e"),
            ("#fcf7eb", "#f7e8c8", "#7a2432", "#e0485a"),
            ("#f7dce3", "#f0becb", "#6e192b", "#fff7f0"),
            ("#eef7f2", "#d7ede0", "#26543b", "#e84d62"),
            ("#f5eefc", "#e5d6f5", "#4c266b", "#e05378"),
        ],
    ),
    dict(
        code="pixie_moon", name="Trăng sao mộng mơ", category="Dễ thương & thiên nhiên",
        slots=SLOTS_4_STD, shape="oval", title="Dreamy Moonlight", sub="trăng lưỡi liềm, mây bông & giấc mơ đêm",
        palettes=[
            ("#1a2142", "#2b3566", "#fff6d6", "#ffd966"),
            ("#2b1e42", "#402d61", "#fceeff", "#f7c663"),
            ("#dce8fa", "#c2d6f5", "#223461", "#f0b840"),
            ("#f5e6f7", "#e6ccf0", "#452859", "#e8a838"),
            ("#172e36", "#224552", "#ebfcff", "#f5cf60"),
        ],
    ),
    dict(
        code="pixie_clover", name="Cỏ bốn lá may mắn", category="Dễ thương & thiên nhiên",
        slots=SLOTS_4_ZIG, shape="round24", title="LUCKY CLOVER · 777", sub="gửi bạn một chiếc cỏ bốn lá may mắn",
        palettes=[
            ("#edf7ed", "#d3ebd3", "#1e4f29", "#4ca65a"),
            ("#f7f9e8", "#e8efc7", "#364f1d", "#72a638"),
            ("#e6f5f2", "#ccebe5", "#1b4a42", "#3b9c8c"),
            ("#fcf4e3", "#f5e3be", "#473b1b", "#4f9952"),
            ("#1c3824", "#122618", "#eef7ef", "#7ed98c"),
        ],
    ),
    dict(
        code="pixie_sticker", name="Sổ sticker Y2K", category="Nhạc pop & Y2K",
        slots=SLOTS_4_STD, shape="round16", title="STICKER BOOK ★ POP!", sub="dán đầy nụ cười lên trang sổ nhỏ",
        palettes=[
            ("#fff0f6", "#ffd6e7", "#4a1936", "#ff4785"),
            ("#eef4ff", "#d4e3ff", "#1c2c59", "#3b6eff"),
            ("#fff7d6", "#ffea9e", "#4d3314", "#ff6238"),
            ("#f2ebff", "#dfd1ff", "#311c59", "#8c47ff"),
            ("#e8fff2", "#c8f7dc", "#194a30", "#22b86b"),
        ],
    ),

    # ==================== 5. @linhlinhphotobooth (6 series x 5 = 30) ====================
    dict(
        code="linh_aura", name="Hào quang Aura", category="Tối giản",
        slots=SLOTS_4_STD, shape="round16", title="AURA · GOOD VIBES", sub="breathe in the soft moment",
        palettes=[
            ("#f7f2fc", "#e6dcf7", "#32244d", "#ff9ec4"),
            ("#eef6fc", "#d9eaf7", "#1e3854", "#ffd180"),
            ("#fcf4ee", "#f7e3d4", "#4d2c1e", "#ff8a80"),
            ("#effaf2", "#dbf2e2", "#1e472d", "#80d8ff"),
            ("#fcf0f5", "#f7dae6", "#4d1e34", "#b388ff"),
        ],
    ),
    dict(
        code="linh_teddy", name="Gấu bông & Thỏ trắng", category="Dễ thương & thiên nhiên",
        slots=SLOTS_4_STD, shape="round24", title="Teddy & Bunny Club", sub="ấm áp như một cái ôm ngày nắng",
        palettes=[
            ("#faefe3", "#edd9c2", "#593a24", "#b87a52"),
            ("#fceef2", "#f5d7e0", "#5e2a38", "#d97a96"),
            ("#eef5fa", "#d6e6f2", "#264059", "#729ec9"),
            ("#f0f7ee", "#d9ebd4", "#2b4a26", "#7aa672"),
            ("#f5f0fa", "#e3d6f0", "#422b59", "#9c7ac9"),
        ],
    ),
    dict(
        code="linh_school", name="Lưu bút học trò", category="Sinh nhật & lễ hội",
        slots=SLOTS_4_STD, shape="rect", title="LƯU BÚT THANH XUÂN", sub="những năm tháng rực rỡ nhất cùng nhau",
        palettes=[
            ("#fbf9f2", "#f0ece0", "#1f365c", "#d9483b"),
            ("#eef4fa", "#d8e5f2", "#1b3354", "#e68a2e"),
            ("#1b3b2b", "#12291e", "#f7f5eb", "#f2c94c"),
            ("#fcf3e8", "#f2dfc7", "#4a2e1b", "#2e6b9e"),
            ("#f5eef7", "#e5d6eb", "#3b234a", "#d95b7a"),
        ],
    ),
    dict(
        code="linh_vietnam", name="Sắc xuân Việt Nam", category="Việt Nam",
        slots=SLOTS_4_STD, shape="round16", title="SẮC XUÂN VIỆT NAM", sub="hoa nở rộn ràng · vạn sự bình an",
        palettes=[
            ("#9e1b24", "#751219", "#fff4d6", "#ffcf40"),
            ("#fff6e3", "#f5e3be", "#991b22", "#e69d24"),
            ("#c9342b", "#9e241c", "#fff7e8", "#ffd954"),
            ("#f7e8ea", "#edd0d4", "#8c1926", "#d99b2e"),
            ("#1c3b4f", "#122736", "#fff3d9", "#f2b840"),
        ],
    ),
    dict(
        code="linh_birthday", name="Vương miện sinh nhật", category="Sinh nhật & lễ hội",
        slots=SLOTS_4_STD, shape="round24", title="HAPPY BIRTHDAY ★", sub="make a wish & shine all year long",
        palettes=[
            ("#fff0f5", "#ffd6e4", "#701b3b", "#ff5c94"),
            ("#fff8dc", "#ffeba8", "#5c3b14", "#ff8533"),
            ("#eef4ff", "#d4e3ff", "#1e3466", "#4d88ff"),
            ("#f4edff", "#e2d1ff", "#3d1e66", "#995cff"),
            ("#1f1b2e", "#14111f", "#fff5db", "#ffd24d"),
        ],
    ),
    dict(
        code="linh_bestie2x2", name="Đôi bạn thân 2×2", category="Dễ thương & thiên nhiên",
        slots=SLOTS_4_2X2, shape="round24", title="BESTIES FOREVER ♥", sub="cùng cười thật tươi bên nhau nhé",
        palettes=[
            ("#ffeef4", "#fad4e2", "#6b213c", "#ec6292"),
            ("#eef6ff", "#d4e7fc", "#1f3e66", "#5496e8"),
            ("#f2faee", "#d9f0cf", "#254d22", "#68b85c"),
            ("#f6eefc", "#e4d1f5", "#432263", "#9b66d9"),
            ("#fff6e6", "#fae4c0", "#5c3818", "#e68a3b"),
        ],
    ),
]


def draw_decorations(im, d, s, c_bg1, c_bg2, c_ink, c_acc, variant):
    code = s["code"]
    ink = hex_rgba(c_ink)
    acc = hex_rgba(c_acc)
    acc_soft = hex_rgba(c_acc, 75)
    ink_soft = hex_rgba(c_ink, 45)
    white = (255, 255, 255, 235)
    rng = random.Random(hash(code) + variant * 97)

    # Outer subtle border
    d.rectangle([16, 16, W - 17, H - 17], outline=hex_rgba(c_ink, 70), width=2)

    # 1. Film 35mm sprocket holes & edge numbers
    if code == "memora_film35":
        for y in range(44, H - 60, 74):
            for x in [28, W - 68]:
                d.rounded_rectangle([x, y, x + 40, y + 46], radius=7, fill=hex_rgba(c_ink, 220))
                d.rounded_rectangle([x + 3, y + 3, x + 37, y + 43], radius=5, fill=hex_rgba(c_bg1))
        for idx, (_, sy, _, sh) in enumerate(s["slots"]):
            d.text((82, sy + sh // 2 - 10), f"{idx+1}A", fill=acc, font=F_MONO_SM)
            d.text((W - 96, sy + sh // 2 - 10), f"#{idx+1}", fill=acc, font=F_MONO_SM)

    # 2. VHS Camcorder HUD
    elif code == "memora_vhs":
        d.ellipse([78, 38, 102, 62], fill=acc)
        d.text((112, 34), "REC ● 00:04:26", fill=ink, font=F_MONO)
        d.rounded_rectangle([W - 156, 36, W - 78, 64], radius=4, outline=ink, width=2)
        d.rectangle([W - 150, 42, W - 98, 58], fill=acc)
        for sx, sy, sw, sh in s["slots"]:
            L = 22
            for cx, cy, dx, dy in [(sx - 10, sy - 10, 1, 1), (sx + sw + 10, sy - 10, -1, 1), (sx - 10, sy + sh + 10, 1, -1), (sx + sw + 10, sy + sh + 10, -1, -1)]:
                d.line([(cx, cy), (cx + dx * L, cy)], fill=acc, width=4)
                d.line([(cx, cy), (cx, cy + dy * L)], fill=acc, width=4)

    # 3. Cinema Ticket Stub notches & dashed lines
    elif code == "memora_ticket":
        for x in range(80, W - 60, 56):
            d.ellipse([x - 14, -14, x + 14, 14], fill=ink)
            d.ellipse([x - 14, H - 14, x + 14, H + 14], fill=ink)
        for y in [620, 1168, 1740]:
            for x in range(44, W - 44, 24):
                d.line([(x, y), (x + 12, y)], fill=acc, width=3)
            d.ellipse([-18, y - 18, 18, y + 18], fill=ink)
            d.ellipse([W - 18, y - 18, W + 18, y + 18], fill=ink)

    # 4. Contact sheet sidebar
    elif code == "memora_contact":
        d.line([(152, 48), (152, 1820)], fill=acc, width=3)
        for idx, (_, sy, _, sh) in enumerate(s["slots"]):
            d.rounded_rectangle([40, sy + 20, 132, sy + 88], radius=10, outline=acc, width=3)
            d.text((54, sy + 34), f"#{idx+1:02d}", fill=ink, font=F_TITLE)
            d.text((42, sy + 110), "ISO 400", fill=ink, font=F_MONO_SM)
            d.text((42, sy + 136), "35MM", fill=acc, font=F_MONO_SM)

    # 5. Washi tape corners
    elif code == "memora_washi":
        for idx, (sx, sy, sw, sh) in enumerate(s["slots"]):
            d.polygon([(sx - 18, sy + 22), (sx + 48, sy - 18), (sx + 66, sy + 4), (sx, sy + 44)], fill=hex_rgba(c_acc, 180), outline=ink)
            d.polygon([(sx + sw - 48, sy + sh + 18), (sx + sw + 18, sy + sh - 22), (sx + sw, sy + sh - 44), (sx + sw - 66, sy + sh - 4)], fill=hex_rgba(c_acc, 180), outline=ink)

    # 6. Polaroid 2x2 pins & stamp
    elif code == "memora_polaroid2x2":
        for sx, sy, sw, sh in s["slots"]:
            d.rectangle([sx - 12, sy - 18, sx + sw + 12, sy + sh + 54], fill=white, outline=ink, width=2)
            cx = sx + sw // 2
            d.ellipse([cx - 12, sy - 26, cx + 12, sy - 2], fill=acc, outline=ink, width=2)
        d.rounded_rectangle([68, 1610, W - 68, 1790], radius=18, outline=acc, width=3)
        d.text((108, 1648), "POSTCARD FROM SAIGON", fill=ink, font=F_MONO)
        d.text((108, 1694), "STAMPED WITH WARM MEMORIES · 2026", fill=acc, font=F_SUB)

    # 7. Saigon Metro header sign
    elif code == "every_metro":
        d.rounded_rectangle([56, 44, W - 56, 144], radius=22, fill=ink)
        bg_c = hex_rgba(c_bg1)
        d.ellipse([80, 66, 136, 122], fill=acc)
        d.text((92, 74), "M1", fill=bg_c, font=F_SMALL)
        d.text((156, 62), "SAIGON METRO LINE 01", fill=bg_c, font=F_MONO)
        d.text((156, 94), "BẾN THÀNH  ●───●───●  THẢO ĐIỀN", fill=acc, font=F_MONO_SM)

    # 8. Receipt zigzag teeth & barcode
    elif code == "every_receipt":
        for x in range(20, W - 20, 28):
            d.polygon([(x, 16), (x + 14, 34), (x + 28, 16)], fill=acc_soft)
        by = 1835
        for x in range(120, W - 120, 8):
            bw = 2 if (x // 8) % 3 == 0 else 5
            d.rectangle([x, by, x + bw, by + 56], fill=ink)
        for y in [504, 936, 1368, 1805]:
            for x in range(60, W - 60, 18):
                d.line([(x, y), (x + 9, y)], fill=ink_soft, width=2)

    # 9. Music player progress & vinyl disc
    elif code == "every_music":
        d.ellipse([580, 1840, 680, 1940], fill=ink, outline=acc, width=3)
        d.ellipse([616, 1876, 644, 1904], fill=acc)
        for idx, (sx, sy, sw, _) in enumerate(s["slots"]):
            d.text((sx, sy - 28), f"0{idx+1} · FAVOURITE TRACK", fill=acc, font=F_MONO_SM)

    # 10. Cyber Y2K stars & orbits
    elif code == "every_cyber":
        d.arc([24, 1810, W - 24, 2120], 0, 360, fill=acc, width=3)
        for cx, cy, r in [(54, 80, 28), (W - 54, 310, 32), (48, 940, 30), (W - 50, 1380, 34), (92, 1860, 36), (W - 92, 1920, 30)]:
            draw_star4(d, cx, cy, r, acc, ink)

    # 11. Saigon Cafe pattern
    elif code == "every_cafe":
        for x in range(48, W - 48, 64):
            d.rounded_rectangle([x, 1820, x + 48, 1868], radius=10, outline=acc, width=3)
            draw_flower(d, x + 24, 1844, 14, acc, hex_rgba(c_bg1), ink)

    # 12. 2x3 Studio Grid markers
    elif code == "every_grid2x3":
        for idx, (sx, sy, sw, sh) in enumerate(s["slots"]):
            d.text((sx, sy - 24), f"CUT 0{idx+1}", fill=acc, font=F_MONO_SM)
        d.line([(52, 1680), (W - 52, 1680)], fill=ink, width=3)
        d.text((52, 1700), "EVERYSPACE STUDIO · 6 CUTS ARCHIVE", fill=acc, font=F_MONO)

    # 13. Cava Champagne bubbles & sparkles
    elif code == "cava_cheers":
        for _ in range(36):
            bx = rng.randint(28, W - 28)
            by = rng.randint(40, H - 120)
            br = rng.randint(5, 16)
            d.ellipse([bx - br, by - br, bx + br, by + br], outline=acc, width=2)
        for cx, cy in [(60, 70), (W - 60, 260), (56, 1140), (W - 56, 1580), (110, 1910), (W - 110, 1910)]:
            draw_star4(d, cx, cy, 24, acc)

    # 14. Minimalist Gallery coordinates
    elif code == "cava_gallery":
        d.line([(80, 64), (W - 80, 64)], fill=ink, width=2)
        d.line([(80, 1740), (W - 80, 1740)], fill=ink, width=2)
        for idx, (sx, sy, sw, sh) in enumerate(s["slots"]):
            d.text((sx, sy + sh + 8), f"FIG. 0{idx+1} — UNTITLED MOMENT", fill=acc, font=F_MONO_SM)

    # 15. Magazine Masthead
    elif code == "cava_magazine":
        d.text((76, 52), "CAVA · SAIGON", fill=acc, font=F_BIG)
        d.line([(76, 128), (W - 76, 128)], fill=ink, width=4)
        d.text((76, 138), "ISSUE N°26   ·   YOUTH, ART & PHOTOGRAPHY", fill=ink, font=F_MONO_SM)

    # 16. Coquette Pearl Lace & Bows
    elif code == "cava_coquette":
        for sx, sy, sw, sh in s["slots"]:
            for px in range(sx + 16, sx + sw - 8, 26):
                d.ellipse([px - 6, sy - 10, px + 6, sy + 2], fill=white, outline=acc, width=2)
                d.ellipse([px - 6, sy + sh - 2, px + 6, sy + sh + 10], fill=white, outline=acc, width=2)
        for y in [498, 930, 1362]:
            draw_bow(d, W // 2, y, 30, acc, ink)

    # 17. Bistro Awning Stripes
    elif code == "cava_bistro":
        stripe_w = 45
        for i, x in enumerate(range(0, W, stripe_w)):
            c = acc if i % 2 == 0 else white
            d.rectangle([x, 0, x + stripe_w, 42], fill=c)
            d.pieslice([x, 22, x + stripe_w, 64], 0, 180, fill=c, outline=ink)

    # 18. Romantic Arch borders & hearts
    elif code == "cava_arch":
        for y in [618, 1166]:
            draw_heart(d, W // 2, y, 22, acc, ink)
        draw_heart(d, 110, 1930, 26, acc, ink)
        draw_heart(d, W - 110, 1930, 26, acc, ink)

    # 19. Pixie Fairy Garden flowers & sparkles
    elif code == "pixie_fairy":
        for cx, cy in [(46, 140), (W - 46, 290), (46, 680), (W - 46, 860), (46, 1220), (W - 46, 1440), (96, 1890), (W - 96, 1890)]:
            draw_flower(d, cx, cy, 24, acc, white, ink)
        for cx, cy in [(W - 48, 95), (48, 490), (W - 48, 1080), (48, 1680)]:
            draw_star4(d, cx, cy, 20, white, ink)

    # 20. Tamagotchi Console Buttons & Pixel Hearts
    elif code == "pixie_tama":
        d.rounded_rectangle([36, 36, W - 36, H - 36], radius=64, outline=ink, width=6)
        for bx, label in [(220, "A"), (360, "B"), (500, "C")]:
            d.ellipse([bx - 34, 1835, bx + 34, 1903], fill=acc, outline=ink, width=4)
            d.text((bx - 8, 1853), label, fill=white, font=F_SMALL)
        for hx in [100, 148, 196]:
            draw_heart(d, hx, 58, 15, acc, ink)

    # 21. Strawberry Cake Piping & Cherries
    elif code == "pixie_berry":
        for y in [502, 934, 1366]:
            for cx in [140, 360, 580]:
                d.ellipse([cx - 16, y - 12, cx + 16, y + 18], fill=acc, outline=ink, width=2)
                d.polygon([(cx - 8, y - 14), (cx, y - 24), (cx + 8, y - 14)], fill=hex_rgba("#2e9e5b"))

    # 22. Dreamy Moon & Clouds
    elif code == "pixie_moon":
        for cx, cy in [(110, 74), (W - 110, 504), (105, 936), (W - 105, 1368), (130, 1880), (W - 130, 1880)]:
            draw_cloud(d, cx, cy, 92, white, ink)
        d.ellipse([W - 140, 36, W - 64, 112], fill=acc, outline=ink, width=2)
        d.ellipse([W - 122, 32, W - 54, 96], fill=hex_rgba(c_bg1))

    # 23. Lucky 4-leaf Clovers
    elif code == "pixie_clover":
        for cx, cy in [(W - 64, 240), (64, 690), (W - 64, 1120), (64, 1550), (110, 1910), (W - 110, 1910)]:
            draw_clover(d, cx, cy, 26, acc, ink)

    # 24. Y2K Sticker Book Collage
    elif code == "pixie_sticker":
        for cx, cy, kind in [(56, 95, "star"), (W - 56, 320, "heart"), (52, 510, "flower"), (W - 52, 935, "star"), (54, 1368, "heart"), (W - 54, 1740, "flower"), (108, 1920, "star"), (W - 108, 1920, "heart")]:
            if kind == "star":
                draw_star4(d, cx, cy, 30, acc, ink)
            elif kind == "heart":
                draw_heart(d, cx, cy, 24, acc, ink, 3)
            else:
                draw_flower(d, cx, cy, 24, acc, white, ink)

    # 25. Korean Aura Gradient Minimal
    elif code == "linh_aura":
        d.ellipse([W // 2 - 44, 1836, W // 2 + 44, 1924], fill=acc_soft, outline=ink, width=2)
        draw_heart(d, W // 2, 1880, 18, acc, ink)

    # 26. Teddy & Bunny Ears + Paw Prints
    elif code == "linh_teddy":
        for sx, sy, sw, _ in s["slots"]:
            for ex in [sx + 38, sx + sw - 38]:
                d.ellipse([ex - 24, sy - 26, ex + 24, sy + 22], fill=acc, outline=ink, width=3)
                d.ellipse([ex - 12, sy - 14, ex + 12, sy + 10], fill=white)
        for px, py in [(96, 1900), (W - 96, 1900)]:
            d.ellipse([px - 16, py - 12, px + 16, py + 16], fill=acc, outline=ink, width=2)
            for dx, dy in [(-16, -20), (0, -24), (16, -20)]:
                d.ellipse([px + dx - 7, py + dy - 7, px + dx + 7, py + dy + 7], fill=acc, outline=ink, width=2)

    # 27. School Notebook Lines & Margin
    elif code == "linh_school":
        for y in range(60, H - 60, 44):
            d.line([(24, y), (W - 24, y)], fill=hex_rgba(c_acc, 55), width=2)
        d.line([(56, 20), (56, H - 20)], fill=acc, width=3)
        for y in [260, 1080, 1900]:
            d.ellipse([22, y - 12, 46, y + 12], fill=white, outline=ink, width=2)

    # 28. Vietnamese Blossom & Lanterns
    elif code == "linh_vietnam":
        for cx, cy in [(52, 120), (W - 52, 480), (52, 930), (W - 52, 1365), (96, 1900), (W - 96, 1900)]:
            draw_flower(d, cx, cy, 26, acc, white, ink)

    # 29. Birthday Crown & Confetti
    elif code == "linh_birthday":
        cx, cy = W // 2, 54
        d.polygon([(cx - 48, cy + 20), (cx - 36, cy - 18), (cx - 14, cy + 4), (cx, cy - 24), (cx + 14, cy + 4), (cx + 36, cy - 18), (cx + 48, cy + 20)], fill=acc, outline=ink)
        for _ in range(30):
            rx, ry = rng.randint(28, W - 28), rng.randint(60, H - 80)
            d.ellipse([rx - 6, ry - 6, rx + 6, ry + 6], fill=acc)

    # 30. Bestie 2x2 Chat Bubbles & Hearts
    elif code == "linh_bestie2x2":
        d.rounded_rectangle([84, 1590, W - 84, 1785], radius=28, fill=white, outline=ink, width=3)
        draw_heart(d, 148, 1688, 34, acc, ink)
        d.text((206, 1648), "100% BESTIE MATCH!", fill=ink, font=F_TITLE)
        d.text((206, 1706), "chụp chung một tấm, nhớ nhau thật lâu", fill=acc, font=F_SUB)


def cut_slot_mask(mask_draw, slot, shape):
    x, y, w, h = [int(round(v)) for v in slot]
    if shape == "round16":
        mask_draw.rounded_rectangle([x, y, x + w, y + h], radius=16, fill=0)
    elif shape == "round24":
        mask_draw.rounded_rectangle([x, y, x + w, y + h], radius=24, fill=0)
    elif shape == "round36":
        mask_draw.rounded_rectangle([x, y, x + w, y + h], radius=36, fill=0)
    elif shape == "oval":
        mask_draw.ellipse([x, y, x + w, y + h], fill=0)
    elif shape == "arch":
        r = w // 2
        mask_draw.pieslice([x, y, x + w, y + w], 180, 360, fill=0)
        mask_draw.rectangle([x, y + r, x + w, y + h], fill=0)
    else:
        mask_draw.rectangle([x, y, x + w, y + h], fill=0)


def stroke_slot(d, slot, shape, ink, acc):
    x, y, w, h = [int(round(v)) for v in slot]
    if shape == "round16":
        d.rounded_rectangle([x - 4, y - 4, x + w + 4, y + h + 4], radius=18, outline=acc, width=4)
        d.rounded_rectangle([x - 1, y - 1, x + w + 1, y + h + 1], radius=16, outline=ink, width=3)
    elif shape == "round24":
        d.rounded_rectangle([x - 4, y - 4, x + w + 4, y + h + 4], radius=26, outline=acc, width=4)
        d.rounded_rectangle([x - 1, y - 1, x + w + 1, y + h + 1], radius=24, outline=ink, width=3)
    elif shape == "round36":
        d.rounded_rectangle([x - 5, y - 5, x + w + 5, y + h + 5], radius=38, outline=acc, width=5)
        d.rounded_rectangle([x - 1, y - 1, x + w + 1, y + h + 1], radius=36, outline=ink, width=3)
    elif shape == "oval":
        d.ellipse([x - 5, y - 5, x + w + 5, y + h + 5], outline=acc, width=5)
        d.ellipse([x - 1, y - 1, x + w + 1, y + h + 1], outline=ink, width=3)
    elif shape == "arch":
        r = w // 2
        d.arc([x - 3, y - 3, x + w + 3, y + w + 3], 180, 360, fill=acc, width=5)
        d.line([(x - 3, y + r), (x - 3, y + h + 3), (x + w + 3, y + h + 3), (x + w + 3, y + r)], fill=acc, width=5)
        d.arc([x, y, x + w, y + w], 180, 360, fill=ink, width=3)
        d.line([(x, y + r), (x, y + h), (x + w, y + h), (x + w, y + r)], fill=ink, width=3)
    else:
        d.rectangle([x - 4, y - 4, x + w + 4, y + h + 4], outline=acc, width=4)
        d.rectangle([x - 1, y - 1, x + w + 1, y + h + 1], outline=ink, width=3)


def draw_footer(d, s, c_ink, c_acc):
    ink = hex_rgba(c_ink)
    acc = hex_rgba(c_acc)
    title = s["title"]
    sub = s["sub"]
    font_t = F_SERIF if s["category"] in ("Nhật ký & vintage", "Tối giản") else F_TITLE
    tb = d.textbbox((0, 0), title, font=font_t)
    tw = tb[2] - tb[0]
    d.text(((W - tw) // 2, 1955), title, fill=ink, font=font_t)

    sb = d.textbbox((0, 0), sub, font=F_SUB)
    sw = sb[2] - sb[0]
    d.text(((W - sw) // 2, 2016), sub, fill=acc, font=F_SUB)

    tag = "HỘP ẢNH · HUNGHIENHOA.COM"
    gb = d.textbbox((0, 0), tag, font=F_MONO_SM)
    gw = gb[2] - gb[0]
    d.line([(W // 2 - 110, 2074), (W // 2 + 110, 2074)], fill=hex_rgba(c_ink, 95), width=2)
    d.text(((W - gw) // 2, 2092), tag, fill=hex_rgba(c_ink, 175), font=F_MONO_SM)


def render_frame(s, variant_idx, pal):
    c_bg1, c_bg2, c_ink, c_acc = pal
    aura = c_acc if s["code"] in ("linh_aura", "pixie_fairy", "every_cyber") else None
    im = make_gradient(hex_rgba(c_bg1), hex_rgba(c_bg2), aura_color=aura)
    d = ImageDraw.Draw(im)

    draw_decorations(im, d, s, c_bg1, c_bg2, c_ink, c_acc, variant_idx)

    ink = hex_rgba(c_ink)
    acc = hex_rgba(c_acc)
    for slot in s["slots"]:
        stroke_slot(d, slot, s["shape"], ink, acc)

    draw_footer(d, s, c_ink, c_acc)

    # Punch transparent photo cutouts
    alpha = im.getchannel("A")
    md = ImageDraw.Draw(alpha)
    for slot in s["slots"]:
        cut_slot_mask(md, slot, s["shape"])
    im.putalpha(alpha)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    raw = MANIFEST.read_text(encoding="utf-8").strip()
    prefix = "export const importedFrames = "
    assert raw.startswith(prefix)
    existing = json.loads(raw[len(prefix):].rstrip(";"))
    base_records = [r for r in existing if not r["id"].startswith("ig150-")]

    new_records = []
    idx = 0
    for s in SERIES:
        for v_idx, pal in enumerate(s["palettes"], start=1):
            idx += 1
            fid = f"ig150-{idx:03d}"
            im = render_frame(s, v_idx, pal)
            src_rel = f"assets/imported-frames/{fid}.webp"
            thumb_rel = f"assets/imported-frames/{fid}-thumb.webp"
            im.save(OUT / f"{fid}.webp", "WEBP", quality=88, method=4)
            im.resize((144, 436), Image.Resampling.LANCZOS).save(OUT / f"{fid}-thumb.webp", "WEBP", quality=82, method=4)
            new_records.append(
                dict(
                    id=fid,
                    name=f"{s['name']} · {v_idx:02d}",
                    category=s["category"],
                    slots=s["slots"],
                    src=src_rel,
                    thumb=thumb_rel,
                )
            )

    all_records = base_records + new_records
    MANIFEST.write_text(
        prefix + json.dumps(all_records, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Generated {len(new_records)} new IG-inspired frames. Total importedFrames: {len(all_records)}")


if __name__ == "__main__":
    main()
