import assert from 'node:assert/strict';
import { fold, readingMinutes, filterPosts, articleBlocks, safeCoverURL } from './core.mjs';

assert.equal(fold('Điều thú vị Ở ĐÂY'), 'dieu thu vi o day');
assert.equal(readingMinutes(''), 1);
assert.equal(readingMinutes(Array(181).fill('chữ').join(' ')), 2);
const posts = [
  { slug: 'anh', title: 'Ảnh giữ kỷ niệm', content: 'Một tấm ảnh đẹp', category: 'Hình ảnh', tags: ['Kỷ niệm'] },
  { slug: 'mau', title: 'Bảng màu quanh mình', content: 'Nhặt sắc màu', category: 'Sáng tạo', tags: [] },
  { slug: 'nhap', title: 'Bản nháp ảnh', status: 'draft', category: 'Hình ảnh' }
];
assert.deepEqual(filterPosts(posts, 'anh ky niem').map(p => p.slug), ['anh']);
assert.deepEqual(filterPosts(posts, '', 'Sáng tạo').map(p => p.slug), ['mau']);
assert.equal(filterPosts(posts, 'không tìm thấy').length, 0);
assert.equal(filterPosts(posts).length, 2);
assert.deepEqual(articleBlocks('# Mở đầu\n\nDòng một\nDòng hai\n\n- Ý nhỏ\n- Ý khác\n\n> Chút nhớ\n### Kết'), [
  { type: 'h2', text: 'Mở đầu' }, { type: 'p', text: 'Dòng một Dòng hai' }, { type: 'li', text: 'Ý nhỏ' }, { type: 'li', text: 'Ý khác' }, { type: 'quote', text: 'Chút nhớ' }, { type: 'h3', text: 'Kết' }
]);
assert.deepEqual(articleBlocks('<img src=x onerror=alert(1)>'), [{ type: 'p', text: '<img src=x onerror=alert(1)>' }]);
assert.equal(safeCoverURL('/api/posts/1/cover.webp', '', 'http://localhost:4180'), 'http://localhost:4180/api/posts/1/cover.webp');
assert.equal(safeCoverURL('/api/cover.webp', 'https://api.example.test', 'https://blog.example.test'), 'https://api.example.test/api/cover.webp');
for (const url of ['javascript:alert(1)', 'data:image/svg+xml,x', 'https://tracker.example/a.webp', 'http://user:pass@localhost:4180/x']) {
  assert.equal(safeCoverURL(url, '', 'http://localhost:4180'), '');
}
console.log('PASS: Vietnamese search, reading time, published-post filtering, safe article blocks and cover origin.');

const {inlineTokens}=await import('./core.mjs');
assert.deepEqual(articleBlocks('```html\n<div>Xin chào</div>\n  giữ thụt dòng\n```\n\nSau mã'),[{type:'code',text:'<div>Xin chào</div>\n  giữ thụt dòng',language:'html'},{type:'p',text:'Sau mã'}]);
assert.deepEqual(articleBlocks('~~~js\nconst x = 1;\n~~~'),[{type:'code',text:'const x = 1;',language:'js'}]);
assert.deepEqual(articleBlocks('```\nchưa đóng'),[{type:'code',text:'chưa đóng',language:''}]);
assert.deepEqual(articleBlocks('1. Một\n2. Hai\n\n---'),[{type:'oli',text:'Một'},{type:'oli',text:'Hai'},{type:'hr',text:''}]);
assert.equal(inlineTokens('[x](javascript:alert(1))')[0].type,'text');
assert.deepEqual(inlineTokens('**đậm** và `x < y`'),[{type:'strong',text:'đậm'},{type:'text',text:' và '},{type:'code',text:'x < y'}]);
assert.equal(inlineTokens('[Trang](https://example.com)')[0].href,'https://example.com');
const vm=await import('node:vm');const fs=await import('node:fs');
const context=vm.createContext({document:{querySelector:()=>null}});
vm.runInContext(fs.readFileSync('dist/admin/editor.js','utf8'),context);
const text=value=>({nodeType:3,textContent:value});
const tag=(name,children=[],attrs={})=>({nodeType:1,tagName:name.toUpperCase(),childNodes:children,getAttribute:key=>attrs[key]||null,...attrs});
context.root={childNodes:[tag('h2',[text('Tiêu đề')]),tag('p',[tag('b',[text('Đậm')]),text(' nội dung')]),tag('pre',[],{querySelector:()=>null,className:'',textContent:'<script>alert(1)</script>\n'}),tag('script',[text('không được chạy')]),tag('a',[text('xấu')],{href:'javascript:alert(1)'})]};
const pasted=vm.runInContext('pastedMarkdown(root)',context);
assert.match(pasted,/## Tiêu đề/);assert.match(pasted,/\*\*Đậm\*\*/);assert.match(pasted,/```\n<script>alert\(1\)<\/script>\n```/);assert.ok(!pasted.includes('không được chạy'));assert.ok(!pasted.includes('javascript:'));
console.log('PASS: fenced code preserves indentation, inline formatting and safe rich clipboard conversion.');
const body={replaceChildren(...children){this.children=children;}};
const makeNode=(tag,className='',value='')=>({tagName:tag.toUpperCase(),className,textContent:value,children:[],append(...children){this.children.push(...children);},setAttribute(){},addEventListener(name,fn){this[name]=fn;}});
let copied='',denied=false;
const renderContext=vm.createContext({articleBlocks,inlineTokens,element:makeNode,document:{createTextNode:text=>({textContent:text})},$:()=>body,navigator:{clipboard:{writeText:async value=>{if(denied)throw Error();copied=value;}}},setTimeout:()=>{}});
const source=fs.readFileSync('dist/blog/app.js','utf8');
vm.runInContext(source.slice(source.indexOf('function appendInline('),source.indexOf('async function openArticle(')),renderContext);
vm.runInContext('renderBody("```js\\nconst x = 1;\\n```")',renderContext);
const codeBox=body.children[0],bar=codeBox.children[0],button=bar.children[1],status=bar.children[2];
assert.equal(status.textContent,'');await button.click();assert.equal(copied,'const x = 1;');assert.equal(status.textContent,'Đã sao chép');
denied=true;await button.click();assert.match(status.textContent,/Chưa sao chép/);
