export const ADSENSE_CLIENT = 'ca-pub-1643127618182542';
export function adsenseHtml(html, nonce) {
  if (!html.includes(`name="google-adsense-account" content="${ADSENSE_CLIENT}"`)) return null;
  return {
    body: html.replace(/<script\b/g, `<script nonce="${nonce}"`),
    csp: `default-src 'self'; script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' https:; connect-src 'self' https:; frame-src https:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`
  };
}
