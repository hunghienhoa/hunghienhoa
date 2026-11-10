"""Annotate static text slots without rewriting the surrounding HTML or behavior."""
from html.parser import HTMLParser
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]/'dist'
fields=[]
class Slots(HTMLParser):
    def __init__(self,source,page):
        super().__init__(convert_charrefs=True)
        self.source,self.page=source,page
        self.lines=[0]
        for line in source.splitlines(keepends=True):self.lines.append(self.lines[-1]+len(line))
        self.stack=[];self.edits=[]
        self.next=max([int(x) for x in re.findall(fr'data-edit="{page}-(\d+)"',source)]+[0])+1
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag in {'input','img','meta','link','br','hr','source','wbr'}:return
        line,col=self.getpos()
        node={'tag':tag,'attrs':attrs,'pos':self.lines[line-1]+col,'raw':self.get_starttag_text(),'texts':[], 'parents':list(self.stack)}
        self.stack.append(node)
    def handle_data(self,data):
        if self.stack and data.strip():self.stack[-1]['texts'].append(data)
    def handle_endtag(self,tag):
        if not any(n['tag']==tag for n in self.stack):return
        while self.stack:
            node=self.stack.pop()
            if node['tag']==tag:break
        eligible={'p','h1','h2','h3','span','small','legend','a','b','em','summary','label'}
        excluded={'customize-form','auth-title','auth-note','auth-status','page-status','status','camera-status','photo-count','design-status','community-status','wechat-status'}
        lineage=node['parents']+[node]
        if tag not in eligible or len(node['texts'])!=1 or not any(n['tag']=='body' for n in lineage):return
        if any(n['tag'] in {'script','style','select'} or n['attrs'].get('id') in excluded or n['attrs'].get('aria-hidden')=='true' for n in lineage):return
        value=node['texts'][0].strip()
        if not value or len(value)>3000:return
        key=node['attrs'].get('data-edit')
        if not key:
            key=f'{self.page}-{self.next:03d}';self.next+=1
            self.edits.append((node['pos']+len(node['raw'])-1,f' data-edit="{key}"'))
        fields.append({'key':key,'page':self.page,'label':value[:100],'default':value})
for page,folder in [('main',root),('blog',root/'blog'),('photobooth',root/'photobooth'),('admin',root/'admin')]:
    path=folder/'index.html';source=path.read_text(encoding='utf-8');parser=Slots(source,page);parser.feed(source)
    for pos,addition in sorted(parser.edits,reverse=True):source=source[:pos]+addition+source[pos:]
    path.write_text(source,encoding='utf-8')
for folder in [root,root/'blog',root/'photobooth',root/'admin']:(folder/'content-fields.json').write_text(json.dumps(fields,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert len({f['key'] for f in fields})==len(fields)
print(f'PASS: {len(fields)} validated text slots across four pages.')
