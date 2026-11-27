"""Sinh thanh điều hướng và footer dùng chung cho mọi trang công khai từ một mẫu.

Chạy: python tools/site-chrome.py [trang.html …]  (ghi đè <header class="sitebar">…</header> và <footer class="site-footer">…</footer>)
Giữ data-edit sẵn có trong trang nếu chữ không đổi, nên ô chữ chỉnh trong trang quản trị không bị mất.
"""
from pathlib import Path
import re

DIST = Path(__file__).resolve().parents[1] / 'dist'

PAGES = {
    'index.html': ('main', '', [('#bai-viet', 'Bài viết', ''), ('#cong-cu', 'Công cụ', ''), ('/game/', 'Game Pixel', ''), ('#ve-hung', 'Về mình', '')], '#contact'),
    'blog/index.html': ('blog', 'Góc tò mò', [('#bai-viet', 'Bài viết', ' id="list-nav"'), ('#ve-goc-nho', 'Về góc nhỏ', '')], '#contact'),
    'photobooth/index.html': ('photobooth', 'Hộp Ảnh', [('shoot', 'Phòng chụp', ''), ('#khung-cong-dong', 'Khung ảnh', ''), ('#cach-choi', 'Cách chơi', ''), ('#rieng-tu', 'Riêng tư', '')], '#contact'),
    'photobooth/shoot.html': ('photobooth', 'Hộp Ảnh', [('./', 'Về Hộp Ảnh', '')], '/#contact'),
    'snaptik/index.html': ('snaptik', 'Snap Video', [('#cach-dung', 'Cách dùng', ''), ('#rieng-tu', 'Riêng tư', '')], '#contact'),
    'lamnet/index.html': ('lamnet', 'Làm Nét', [('#cach-dung', 'Cách dùng', ''), ('#rieng-tu', 'Riêng tư', '')], '#contact'),
    'cotuong/index.html': ('cotuong', 'Cờ Tướng', [('/game/', 'Tất cả game', ''), ('#ban-co', 'Bàn cờ', ''), ('#cach-choi', 'Cách chơi', '')], '#contact'),
    'game/index.html': ('game', 'Game Pixel', [('#tro-choi', 'Trò chơi', ''), ('#cach-choi', 'Chơi online', ''), ('#rieng-tu', 'Chơi lành mạnh', '')], '#contact'),
    'game/tien-len/index.html': ('game', 'Tiến Lên', [('/game/', 'Tất cả game', ''), ('#choi', 'Bàn chơi', ''), ('#cach-choi', 'Luật chơi', '')], '#contact'),
    'game/ca-ngua/index.html': ('game', 'Cá Ngựa', [('/game/', 'Tất cả game', ''), ('#choi', 'Bàn chơi', ''), ('#cach-choi', 'Luật chơi', '')], '#contact'),
    'game/o-an-quan/index.html': ('game', 'Ô Ăn Quan', [('/game/', 'Tất cả game', ''), ('#choi', 'Bàn chơi', ''), ('#cach-choi', 'Luật chơi', '')], '#contact'),
    'chinh-sach-rieng-tu.html': (None, '', [], '#contact'),
    'dieu-khoan-su-dung.html': (None, '', [], '#contact'),
    'bao-cao-ban-quyen.html': (None, '', [], '#contact'),
    'cookie-va-quang-cao.html': (None, '', [], '#contact'),
}

SOCIALS = [
    ('Facebook', 'https://www.facebook.com/quanghungdethuong', 'facebook.webp'),
    ('Instagram', 'https://www.instagram.com/im.bqhung/', 'instagram.webp'),
    ('Threads', 'https://www.threads.com/@im.bqhung', 'threads.svg'),
    ('TikTok', 'https://www.tiktok.com/@im.bqhung', 'tiktok.webp'),
    ('Zalo', 'https://zalo.me/0898298886', 'zalo.webp'),
    ('YouTube', 'https://www.youtube.com/@hunghienhoa98886', 'youtube.webp'),
]


def header(section, app, links, cta):
    brand = '<a class="sitebar-brand" href="/" aria-label="Hùng Hiền Hòa, về trang chủ"><img class="brand-mark" src="/assets/logo.svg" alt="" width="32" height="32" aria-hidden="true">hhh<span>.</span>' + (f'<small>{app}</small>' if app else '') + '</a>'
    nav = ''.join(f'<a href="{href}"{extra}>{label}</a>' for href, label, extra in links)
    # Trang con có liên kết "Trang chủ" đứng đầu (icon ngôi nhà + chữ) để quay về rõ ràng, không chỉ dựa vào logo.
    if section != 'main':
        nav = ('<a class="sitebar-home" href="/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-6h4v6"/></svg>Trang chủ</a>'
               + ('<span class="sitebar-sep" aria-hidden="true"></span>' if links else '') + nav)
    return ('<header class="sitebar"><div class="sitebar-in">' + brand +
            '<button class="sitebar-toggle" type="button" aria-expanded="false" aria-controls="sitebar-menu" aria-label="Mở menu"><span aria-hidden="true">☰</span></button>'
            '<nav class="sitebar-nav" id="sitebar-menu" aria-label="Điều hướng">' + nav +
            f'<a class="sitebar-cta" href="{cta}">Kết nối <span aria-hidden="true">↗</span></a></nav></div></header>')


def footer():
    """Footer kiểu footer.design: thẻ mời liên hệ màu xanh có hàng icon tròn, nhóm liên kết nhãn ngắn trên nền giấy, hàng lời chúc và bản quyền ở cuối."""
    icon = lambda name, file: f'<img src="/assets/social/{file}" alt="" width="22" height="22" aria-hidden="true">'
    socials = ''.join(f'<li><a class="social-link" href="{url}" target="_blank" rel="noopener noreferrer" aria-label="{name} (mở trong thẻ mới)" title="{name}">{icon(name, file)}</a></li>' for name, url, file in SOCIALS[:5])
    socials += '<li><button class="social-link" type="button" id="wechat-copy" data-wechat-id="bqhtit" aria-label="Sao chép mã WeChat bqhtit" title="WeChat bqhtit">' + icon('WeChat', 'wechat.webp') + '</button></li>'
    name, url, file = SOCIALS[5]
    socials += f'<li><a class="social-link" href="{url}" target="_blank" rel="noopener noreferrer" aria-label="{name} (mở trong thẻ mới)" title="{name}">{icon(name, file)}</a></li>'
    policies = [('chinh-sach-rieng-tu', 'Riêng tư'), ('dieu-khoan-su-dung', 'Điều khoản'), ('bao-cao-ban-quyen', 'Bản quyền'), ('cookie-va-quang-cao', 'Cookie')]
    return ('<footer class="site-footer">'
            '<section class="footer-cta" id="contact" aria-labelledby="contact-title">'
            '<div class="footer-cta-copy"><span class="eyebrow">Cùng trò chuyện</span><h2 id="contact-title">Có ý tưởng hay? <em>Nhắn Hùng nhé.</em></h2>'
            '<p>Trao đổi dự án, chia sẻ ý tưởng hay đơn giản là chào nhau một tiếng.</p></div>'
            '<div class="footer-cta-actions"><a class="btn btn-sun contact-button" href="mailto:hunghienhoa2110@gmail.com?subject=Ch%C3%A0o%20H%C3%B9ng">Gửi email cho Hùng <span aria-hidden="true">↗</span></a>'
            '<div class="footer-cta-lines"><a class="contact-email" id="contact-email" href="mailto:hunghienhoa2110@gmail.com">hunghienhoa2110@gmail.com</a><a class="contact-phone" href="tel:+84898298886">0898.29.8886</a></div>'
            f'<ul class="social-links" aria-label="Mạng xã hội">{socials}</ul><p class="social-note" id="wechat-status" role="status"></p></div></section>'
            '<div class="footer-main"><div class="footer-about"><a class="footer-logo" href="/"><img class="brand-mark" src="/assets/logo.svg" alt="" width="48" height="48" aria-hidden="true">hhh<span>.</span></a><p>Góc chia sẻ của Hùng Hiền Hòa: chuyện sáng tạo, hình ảnh và vài công cụ nhỏ hữu ích.</p></div>'
            '<nav class="footer-col" aria-label="Khám phá"><h2>Khám phá</h2><ul><li><a href="/">Trang chủ</a></li><li><a href="/blog/">Góc tò mò</a></li><li><a href="/#ve-hung">Về Hùng</a></li><li><a href="#contact">Liên hệ</a></li></ul></nav>'
            '<nav class="footer-col" aria-label="Công cụ"><h2>Công cụ</h2><ul><li><a href="/photobooth/">Hộp Ảnh</a></li><li><a href="/snaptik/">Snap Video</a></li><li><a href="/lamnet/">Làm Nét Ảnh</a></li></ul></nav>'
            '<nav class="footer-col" aria-label="Game Pixel"><h2>Game Pixel</h2><ul><li><a href="/game/">Tất cả game</a></li><li><a href="/cotuong/">Cờ Tướng</a></li><li><a href="/game/tien-len/">Tiến Lên</a></li><li><a href="/game/ca-ngua/">Cờ Cá Ngựa</a></li><li><a href="/game/o-an-quan/">Ô Ăn Quan</a></li></ul></nav>'
            '<nav class="footer-col policy-links" aria-label="Chính sách website"><h2>Chính sách</h2><ul>' + ''.join(f'<li><a href="https://hunghienhoa.com/{slug}">{label}</a></li>' for slug, label in policies) + '</ul></nav></div>'
            '<div class="footer-bottom"><div class="footer-legal"><span>© 2026 Hùng Hiền Hòa</span><p class="footer-wish">Nếu bạn kéo xuống hết trang này, tôi chúc bạn một ngày tốt lành!</p><a class="footer-top" href="#">Về đầu trang <span aria-hidden="true">↑</span></a></div>'
            '</div>'
            '</footer>')


def keep_edits(old, new):
    """Gắn lại data-edit cũ cho phần tử có cùng chữ để giữ chữ Hùng đã chỉnh trong admin."""
    known = {}
    for tag, key, text in re.findall(r'<(\w+)\b[^>]*data-edit="([^"]+)"[^>]*>([^<]+)<', old):
        known.setdefault(text.strip(), key)
    def attach(match):
        start, text = match.group(1), match.group(2)
        key = known.get(text.strip())
        if not key or 'data-edit=' in start or start.startswith('<img'):
            return match.group(0)
        return start[:-1] + f' data-edit="{key}">' + text + '<'
    return re.sub(r'(<(?:a|span|p|h2|small|em|b)\b[^>]*>)([^<]+)<', attach, new)


# Dải băng chủ đề (mọi trang công khai, trừ admin): chữ in Be Vietnam Pro, nghiêng nhẹ, chạy ngang.
# Mỗi trang một bộ chữ hợp nội dung; vị trí đặt: (kiểu, mốc) — 'after' chèn sau mốc, 'before' chèn trước mốc.
RIBBONS = {
    'index.html': (['Chia sẻ điều hay mỗi ngày', 'Tò mò là khởi đầu', 'Công cụ nhỏ, tiện lợi to', 'Đọc một chút, vui cả ngày'], 'after', '<section class="home-hero"', ''),
    'blog/index.html': (['Mỗi trang một chuyện nhỏ', 'Hay thì giữ, vui thì kể', 'Đọc chậm, nghĩ sâu', 'Cứ tò mò thêm chút nữa'], 'after', '<section class="blog-hero', 'ribbon-shell '),
    'photobooth/index.html': (['Cười lên nào', 'Bốn tấm, một kỷ niệm', 'Chụp vui, giữ lâu', 'Cứ là chính mình'], 'after', '<section class="booth-hero', ''),
    # Phòng chụp là nơi làm việc: không đặt dải băng để khỏi rối mắt.
    'photobooth/shoot.html': ([], 'before', '</main>', ''),
    'snaptik/index.html': (['Gặp video hay, giữ lại ngay', 'Dán link là xong', 'Nhớ ghi nguồn tác giả'], 'before', '<section id="cach-dung"', ''),
    'lamnet/index.html': (['Ảnh mờ hóa ảnh rõ', 'Phóng to gấp 4 lần', 'Ảnh ở yên trên máy bạn'], 'before', '<section id="cach-dung"', ''),
    'cotuong/index.html': (['Pháo đầu mã đội', 'Chiếu tướng!', 'Một ván cờ, một ly trà', 'Rủ bạn chơi chung'], 'before', '<section id="cach-choi"', ''),
    'game/index.html': (['Chơi là vui', 'Một link mời', 'Không cược tiền', 'Pixel như ngày xưa'], 'before', '<section id="cach-choi"', ''),
    'game/tien-len/index.html': (['Chặt heo!', 'Đôi thông chặt chồng', 'Về nhất nào', 'Chỉ tính điểm cho vui'], 'before', '<section id="cach-choi"', ''),
    'game/ca-ngua/index.html': (['Đổ được sáu', 'Xuất quân!', 'Đá ngựa về chuồng', 'Cả nhà cùng chơi'], 'before', '<section id="cach-choi"', ''),
    'game/o-an-quan/index.html': (['Bốc quân rải quân', 'Cách ô thì ăn', 'Hết quan tàn dân', 'Trò chơi tuổi thơ'], 'before', '<section id="cach-choi"', ''),
    'chinh-sach-rieng-tu.html': (['Rõ ràng từng điều', 'Riêng tư được tôn trọng', 'Có thắc mắc cứ hỏi'], 'before', '<footer class="site-footer">', ''),
    'dieu-khoan-su-dung.html': (['Rõ ràng từng điều', 'Riêng tư được tôn trọng', 'Có thắc mắc cứ hỏi'], 'before', '<footer class="site-footer">', ''),
    'bao-cao-ban-quyen.html': (['Rõ ràng từng điều', 'Riêng tư được tôn trọng', 'Có thắc mắc cứ hỏi'], 'before', '<footer class="site-footer">', ''),
    'cookie-va-quang-cao.html': (['Rõ ràng từng điều', 'Riêng tư được tôn trọng', 'Có thắc mắc cứ hỏi'], 'before', '<footer class="site-footer">', ''),
    '404.html': (['Ơ, lạc mất rồi', 'Về trang chủ nhé'], 'before', '</body>', ''),
}
BAND_RE = re.compile(r'<div class="(?:ribbon-shell )?topic-band"[^>]*>.*?(?:</div><!--/band-->|</div></div>)', re.S)


def ribbon(items, extra_class=''):
    """Hai nhóm giống nhau, mỗi nhóm rộng ít nhất một màn hình, để chạy vòng liền mạch trên mọi độ rộng."""
    group = ''.join(f'<span>{item}</span><i>✳</i>' for item in items * 2)
    return (f'<div class="{extra_class}topic-band" aria-hidden="true"><div class="band-track">'
            f'<div class="band-group">{group}</div><div class="band-group">{group}</div></div></div><!--/band-->')


def place_ribbon(name, source):
    items, mode, anchor, extra = RIBBONS[name]
    source = BAND_RE.sub('', source)
    if not items:
        return source
    band = ribbon(items, extra)
    if mode == 'after':
        start = source.index(anchor)
        end = source.index('</section>', start) + len('</section>')
        return source[:end] + '\n' + band + source[end:]
    position = source.index(anchor)
    return source[:position] + band + '\n' + source[position:]


import sys
NO_FOOTER = {'photobooth/shoot.html'}
only = set(sys.argv[1:])
for name in RIBBONS:
    if only and name not in only:
        continue
    path = DIST / name
    path.write_text(place_ribbon(name, path.read_text(encoding='utf-8')), encoding='utf-8')
for name, (section, app, links, cta) in PAGES.items():
    if only and name not in only:
        continue
    path = DIST / name
    source = path.read_text(encoding='utf-8')
    new_header = header(section, app, links, cta)
    new_footer = footer()
    old_header = re.search(r'<header class="sitebar[^"]*">.*?</header>', source, re.S)
    old_footer = re.search(r'<footer class="(?:site-footer|unified-footer|policy-footer)[^"]*">.*?</footer>', source, re.S)
    assert old_header and (old_footer or name in NO_FOOTER), name
    source = source[:old_header.start()] + keep_edits(old_header.group(0), new_header) + source[old_header.end():]
    old_footer = re.search(r'<footer class="(?:site-footer|unified-footer|policy-footer)[^"]*">.*?</footer>', source, re.S)
    if name in NO_FOOTER:
        # Phòng chụp là màn làm việc toàn màn hình: không có chân trang, nút Kết nối dẫn về trang chủ.
        if old_footer: source = source[:old_footer.start()] + source[old_footer.end():]
    else:
        source = source[:old_footer.start()] + keep_edits(old_footer.group(0), new_footer) + source[old_footer.end():]
    path.write_text(source, encoding='utf-8')
print(f'PASS: thanh điều hướng và footer chung cho {len(PAGES)} trang.')
