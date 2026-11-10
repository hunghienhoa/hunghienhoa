const contentEditor = document.querySelector('#post-form textarea[name="content"]');
function pastedMarkdown(root) {
  const walk = node => {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    if (['script','style','iframe','object','svg','img'].includes(tag)) return '';
    if (tag === 'pre') {
      const code=node.querySelector('code')||node;
      const language=(code.className||'').match(/language-([\w+-]+)/)?.[1]||'';
      const text=code.textContent.replace(/\n$/,'');
      const fence='`'.repeat(Math.max(3,...(text.match(/`+/g)||[]).map(run=>run.length+1)));
      return '\n\n'+fence+language+'\n'+text+'\n'+fence+'\n\n';
    }
    let value=Array.from(node.childNodes,walk).join('');
    const style=node.style;
    if (!['b','strong'].includes(tag) && (style?.fontWeight === 'bold' || Number(style?.fontWeight) >= 600)) value='**'+value+'**';
    if (!['i','em'].includes(tag) && style?.fontStyle === 'italic') value='*'+value+'*';
    if(tag==='br')return '\n';
    if(/^h[1-6]$/.test(tag))return '\n\n'+'#'.repeat(Math.min(3,Number(tag[1])))+' '+value.trim()+'\n\n';
    if(['strong','b'].includes(tag))return '**'+value+'**';
    if(['em','i'].includes(tag))return '*'+value+'*';
    if(tag==='code') {const fence='`'.repeat(Math.max(1,...(value.match(/`+/g)||[]).map(run=>run.length+1)));return fence+value+fence;}
    if(tag==='a') {const href=node.getAttribute('href')||'';return /^(https?:\/\/|mailto:)/i.test(href)&&!/[\s()]/.test(href)?'['+value+']('+href+')':value;}
    if(tag==='li')return (node.parentElement?.tagName==='OL'?'1. ':'- ')+value.trim()+'\n';
    if(tag==='blockquote')return '\n\n'+value.trim().split('\n').map(line=>'> '+line).join('\n')+'\n\n';
    if(tag==='hr')return '\n\n---\n\n';
    if(['p','div','section','ul','ol','table','tr'].includes(tag))return '\n\n'+value.trim()+'\n\n';
    if(['td','th'].includes(tag))return value+' | ';
    return value;
  };
  return Array.from(root.childNodes,walk).join('').trim();
}
if(contentEditor) {
  const toolbar=document.createElement('div');toolbar.className='editor-tools';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Định dạng nội dung');
  for(const [label,before,after] of [['Tiêu đề','\n## ','\n'],['Đậm','**','**'],['Danh sách','\n- ','\n'],['Trích dẫn','\n> ','\n'],['Đoạn mã','\n```\n','\n```\n']]) {
    const button=document.createElement('button');button.type='button';button.className='outline';button.textContent=label;
    button.addEventListener('click',()=>{const start=contentEditor.selectionStart,end=contentEditor.selectionEnd;const selected=contentEditor.value.slice(start,end);const value=before+selected+after;if(contentEditor.value.length-(end-start)+value.length>contentEditor.maxLength)return;contentEditor.setRangeText(value,start,end,'end');contentEditor.focus();contentEditor.dispatchEvent(new Event('input',{bubbles:true}));});toolbar.append(button);
  }
  contentEditor.before(toolbar);
  contentEditor.addEventListener('paste',event=>{
    const data=event.clipboardData;if(!data)return;
    const html=data.getData('text/html'),plain=data.getData('text/plain');
    let value;
    if(html) value=pastedMarkdown(new DOMParser().parseFromString(html,'text/html').body);
    if((!html || !/<pre[\s>]/i.test(html)) && /^\s*(?:<\/?[a-z][^>]*>|(?:const|let|var|function|import|export)\s|(?:def|class)\s+\w+.*:)/i.test(plain)) {
      const fence='`'.repeat(Math.max(3,...(plain.match(/`+/g)||[]).map(run=>run.length+1)));
      value='\n'+fence+'\n'+plain+'\n'+fence+'\n';
    }
    if(!value)return;
    event.preventDefault();
    const start=contentEditor.selectionStart,end=contentEditor.selectionEnd;
    if(contentEditor.value.length-(end-start)+value.length>contentEditor.maxLength){document.querySelector('#post-status').textContent='Nội dung vượt giới hạn 80.000 ký tự. Hãy dán đoạn ngắn hơn.';return;}
    contentEditor.setRangeText(value,start,end,'end');contentEditor.dispatchEvent(new Event('input',{bubbles:true}));
  });
}
