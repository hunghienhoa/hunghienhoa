import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

test('dán nội dung giữ chữ đậm/nghiêng từ style và bỏ mã thực thi', () => {
  const context = vm.createContext({document: {querySelector: () => null}});
  vm.runInContext(readFileSync('dist/admin/editor.js', 'utf8'), context);
  const text = value => ({nodeType: 3, textContent: value});
  const tag = (name, value, style = {}) => ({nodeType: 1, tagName: name.toUpperCase(), style, childNodes: [text(value)]});
  context.root = {childNodes: [tag('p', 'Mở đầu'), tag('span', 'In đậm', {fontWeight: '700'}), text(' và '), tag('span', 'in nghiêng', {fontStyle: 'italic'}), tag('script', 'không được giữ')]};
  const result = vm.runInContext('pastedMarkdown(root)', context);
  assert.match(result, /\*\*In đậm\*\*/);
  assert.match(result, /\*in nghiêng\*/);
  assert.ok(!result.includes('không được giữ'));
  context.root = {childNodes: [tag('strong', 'Đậm', {fontWeight: '700'}), tag('em', 'Nghiêng', {fontStyle: 'italic'})]};
  assert.equal(vm.runInContext('pastedMarkdown(root)', context), '**Đậm***Nghiêng*');
});
