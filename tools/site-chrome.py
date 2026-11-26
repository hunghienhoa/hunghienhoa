"""Sinh thanh điều hướng và footer dùng chung cho mọi trang công khai từ một mẫu.

Chạy: python tools/site-chrome.py [trang.html …]  (ghi đè <header class="sitebar">…</header> và <footer class="site-footer">…</footer>)
Giữ data-edit sẵn có trong trang nếu chữ không đổi, nên ô chữ chỉnh trong trang quản trị không bị mất.
"""
from pathlib import Path
import re

DIST = Path(__file__).resolve().parents[1] / 'dist'

EXPLORE = [
    ('/', 'Trang chủ', 'Blog chia sẻ và công cụ tiện ích', 'main'),
    ('/blog/', 'Góc tò mò', 'Bài chia sẻ những điều nhỏ mà thú vị', 'blog'),
    ('/photobooth/', 'Hộp Ảnh', 'Photobooth bốn khoảnh khắc', 'photobooth'),
    ('/snaptik/', 'Snap Video', 'Tải video TikTok, Instagram, Facebook', 'snaptik'),
    ('/lamnet/', 'Làm Nét Ảnh', 'Làm nét và tạo ảnh bằng AI', 'lamnet'),
]

PAGES = {
    'index.html': ('main', '', [('#bai-viet', 'Bài viết', ''), ('#cong-cu', 'Công cụ', ''), ('#ve-hung', 'Về mình', '')], '#contact'),
    'blog/index.html': ('blog', 'Góc tò mò', [('#bai-viet', 'Bài viết', ' id="list-nav"'), ('#ve-goc-nho', 'Về góc nhỏ', '')], '#contact'),
    'photobooth/index.html': ('photobooth', 'Hộp Ảnh', [('shoot', 'Phòng chụp', ''), ('#khung-cong-dong', 'Khung ảnh', ''), ('#cach-choi', 'Cách chơi', ''), ('#rieng-tu', 'Riêng tư', '')], '#contact'),
    'photobooth/shoot.html': ('photobooth', 'Hộp Ảnh', [('./', 'Về Hộp Ảnh', '')], '#contact'),
    'snaptik/index.html': ('snaptik', 'Snap Video', [('#cach-dung', 'Cách dùng', ''), ('#rieng-tu', 'Riêng tư', '')], '#contact'),
    'lamnet/index.html': ('lamnet', 'Làm Nét', [('#cach-dung', 'Cách dùng', ''), ('#rieng-tu', 'Riêng tư', '')], '#contact'),
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
    brand = '<a class="sitebar-brand" href="/" aria-label="Hùng Hiền Hòa, về trang chủ">hhh<span>.</span>' + (f'<small>{app}</small>' if app else '') + '</a>'
    nav = ''.join(f'<a href="{href}"{extra}>{label}</a>' for href, label, extra in links)
    items = ''.join(f'<li><a href="{href}"{" aria-current=\"page\"" if key == section else ""}>{name}<small>{desc}</small></a></li>' for href, name, desc, key in EXPLORE)
    return ('<header class="sitebar"><div class="sitebar-in">' + brand +
            '<button class="sitebar-toggle" type="button" aria-expanded="false" aria-controls="sitebar-menu" aria-label="Mở menu"><span aria-hidden="true">☰</span></button>'
            '<nav class="sitebar-nav" id="sitebar-menu" aria-label="Điều hướng">' + nav +
            f'<details class="sitebar-projects"><summary>Khám phá</summary><ul class="sitebar-list">{items}</ul></details>'
            f'<a class="sitebar-cta" href="{cta}">Kết nối <span aria-hidden="true">↗</span></a></nav></div></header>')


def footer():
    socials = ''.join(f'<li><a class="social-link" href="{url}" target="_blank" rel="noopener noreferrer" aria-label="{name} (mở trong thẻ mới)"><img class="social-icon" src="/assets/social/{icon}" alt="" width="26" height="26" aria-hidden="true">{name}<span aria-hidden="true">↗</span></a></li>' for name, url, icon in SOCIALS[:5])
    socials += '<li><button class="social-link" type="button" id="wechat-copy" data-wechat-id="bqhtit" aria-label="Sao chép mã WeChat bqhtit"><img class="social-icon" src="/assets/social/wechat.webp" alt="" width="26" height="26" aria-hidden="true">WeChat <small>bqhtit</small><span aria-hidden="true">⧉</span></button></li>'
    name, url, icon = SOCIALS[5]
    socials += f'<li><a class="social-link" href="{url}" target="_blank" rel="noopener noreferrer" aria-label="{name} (mở trong thẻ mới)"><img class="social-icon" src="/assets/social/{icon}" alt="" width="26" height="26" aria-hidden="true">{name}<span aria-hidden="true">↗</span></a></li>'
    policies = [('chinh-sach-rieng-tu', 'Chính sách riêng tư'), ('dieu-khoan-su-dung', 'Điều khoản sử dụng và đóng góp'), ('bao-cao-ban-quyen', 'Báo cáo nội dung và bản quyền'), ('cookie-va-quang-cao', 'Cookie và quảng cáo')]
    return ('<footer class="site-footer">'
            '<section class="footer-contact" id="contact" aria-labelledby="contact-title"><span class="eyebrow">Cùng trò chuyện</span>'
            '<h2 id="contact-title">Có ý tưởng? <em>Gửi một lời chào.</em></h2>'
            '<div class="footer-contact-grid"><div class="contact-postcard">'
            '<a class="contact-email" id="contact-email" href="mailto:hunghienhoa2110@gmail.com">hunghienhoa2110@gmail.com</a>'
            '<a class="contact-phone" href="tel:+84898298886">0898.29.8886 <span>Gọi điện ↗</span></a>'
            '<p>Trao đổi dự án, chia sẻ ý tưởng hay đơn giản là chào nhau một tiếng.</p>'
            '<a class="btn btn-sun contact-button" href="mailto:hunghienhoa2110@gmail.com?subject=Ch%C3%A0o%20H%C3%B9ng">Gửi email cho Hùng <span aria-hidden="true">↗</span></a></div>'
            f'<div class="contact-socials"><ul class="social-links">{socials}</ul><p class="social-note" id="wechat-status" role="status"></p></div></div></section>'
            '<div class="footer-columns"><div class="footer-about"><a class="footer-logo" href="/">hhh<span>.</span></a><p>Góc chia sẻ của Hùng Hiền Hòa: chuyện sáng tạo, hình ảnh và vài công cụ nhỏ hữu ích.</p></div>'
            '<nav class="footer-col" aria-label="Chia sẻ"><h2>Chia sẻ</h2><ul><li><a href="/blog/">Góc tò mò</a></li><li><a href="/#bai-viet">Bài viết mới</a></li><li><a href="/#cong-cu">Công cụ &amp; tiện ích</a></li></ul></nav>'
            '<nav class="footer-col" aria-label="Công cụ"><h2>Công cụ</h2><ul><li><a href="/photobooth/">Hộp Ảnh</a></li><li><a href="/snaptik/">Snap Video</a></li><li><a href="/lamnet/">Làm Nét Ảnh</a></li></ul></nav>'
            '<nav class="footer-col" aria-label="Về trang"><h2>Về trang</h2><ul><li><a href="/#ve-hung">Về Hùng</a></li><li><a href="#contact">Liên hệ</a></li><li><a href="https://hunghienhoa.com/chinh-sach-rieng-tu">Riêng tư</a></li></ul></nav></div>'
            '<p class="footer-wish">Nếu bạn kéo xuống hết trang này, tôi chúc bạn một ngày tốt lành!</p>'
            '<nav class="policy-links" aria-label="Chính sách website">' + ''.join(f'<a href="https://hunghienhoa.com/{slug}">{label}</a>' for slug, label in policies) + '</nav>'
            '<div class="footer-bottom"><p class="footer-wordmark" aria-hidden="true">Hùng Hiền Hòa</p><div class="footer-legal"><span>© 2026 Hùng Hiền Hòa</span><a class="footer-top" href="#">Về đầu trang <span aria-hidden="true">↑</span></a></div></div>'
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


import sys
only = set(sys.argv[1:])
for name, (section, app, links, cta) in PAGES.items():
    if only and name not in only:
        continue
    path = DIST / name
    source = path.read_text(encoding='utf-8')
    new_header = header(section, app, links, cta)
    new_footer = footer()
    old_header = re.search(r'<header class="sitebar[^"]*">.*?</header>', source, re.S)
    old_footer = re.search(r'<footer class="(?:site-footer|unified-footer|policy-footer)[^"]*">.*?</footer>', source, re.S)
    assert old_header and old_footer, name
    source = source[:old_header.start()] + keep_edits(old_header.group(0), new_header) + source[old_header.end():]
    old_footer = re.search(r'<footer class="(?:site-footer|unified-footer|policy-footer)[^"]*">.*?</footer>', source, re.S)
    source = source[:old_footer.start()] + keep_edits(old_footer.group(0), new_footer) + source[old_footer.end():]
    path.write_text(source, encoding='utf-8')
print(f'PASS: thanh điều hướng và footer chung cho {len(PAGES)} trang.')
