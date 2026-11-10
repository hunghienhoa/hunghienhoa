export function fold(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi-VN');
}

export function readingMinutes(content) {
  const words = String(content ?? '').trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function filterPosts(posts, query = '', category = '') {
  const terms = fold(query).trim().split(/\s+/).filter(Boolean);
  return posts.filter(post => {
    if (!post || post.status === 'draft' || typeof post.slug !== 'string' || !post.slug || typeof post.title !== 'string') return false;
    if (category && post.category !== category) return false;
    const text = fold([post.title, post.excerpt, post.content, post.category, ...(Array.isArray(post.tags) ? post.tags : [])].join(' '));
    return terms.every(term => text.includes(term));
  });
}

export function articleBlocks(content) {
  const blocks = [];
  let paragraph = [];
  const flush = () => { if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join(' ') }); paragraph = []; };
  let fence = null, code = [];
  for (const raw of String(content ?? '').slice(0, 100000).split(/\r?\n/)) {
    const line = raw.trim();
    const marker = /^(`{3,}|~{3,})([\w+-]*)\s*$/.exec(line);
    if (fence) {
      if (marker && !marker[2] && marker[1][0] === fence.marker[0] && marker[1].length >= fence.marker.length) { blocks.push({type:'code',text:code.join('\n'),language:fence.language}); fence=null; code=[]; }
      else code.push(raw);
      continue;
    }
    if (marker) { flush(); fence={marker:marker[1],language:marker[2]}; continue; }
    if (/^\s{4}|^\t/.test(raw)) { flush(); const previous=blocks.at(-1); const text=raw.replace(/^( {4}|\t)/,''); if(previous?.type==='code'&&!previous.language)previous.text+='\n'+text;else blocks.push({type:'code',text,language:''});continue; }
    if (/^(?:---+|\*\*\*+)\s*$/.test(line)) {flush();blocks.push({type:'hr',text:''});continue;}
    if (/^\d+[.)]\s+/.test(line)) {flush();blocks.push({type:'oli',text:line.replace(/^\d+[.)]\s+/,'')});continue;}

    if (!line) { flush(); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) { flush(); blocks.push({ type: heading[1].length === 3 ? 'h3' : 'h2', text: heading[2] }); continue; }
    if (/^[-*]\s+/.test(line)) { flush(); blocks.push({ type: 'li', text: line.replace(/^[-*]\s+/, '') }); continue; }
    if (/^>\s?/.test(line)) { flush(); blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '') }); continue; }
    paragraph.push(line);
  }
  if(fence)blocks.push({type:'code',text:code.join('\n'),language:fence.language});
  flush();
  return blocks;
}

export function safeCoverURL(value, apiBase, pageOrigin) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const trustedOrigin = new URL(apiBase || pageOrigin).origin;
    const url = new URL(value, apiBase || pageOrigin);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === trustedOrigin && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}


export function inlineTokens(text) {
  const tokens=[], pattern=/(`+)([\s\S]*?)\1|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|(https?:\/\/[^\s<>]+)/g;
  let start=0;
  for(const match of String(text).matchAll(pattern)) {
    if(match.index>start)tokens.push({type:'text',text:text.slice(start,match.index)});
    if(match[2]!==undefined)tokens.push({type:'code',text:match[2]});
    else if(match[3])tokens.push({type:'strong',text:match[3]});
    else if(match[4])tokens.push({type:'em',text:match[4]});
    else tokens.push({type:'a',text:match[5]||match[7],href:match[6]||match[7]});
    start=match.index+match[0].length;
  }
  if(start<text.length)tokens.push({type:'text',text:text.slice(start)});
  return tokens;
}
