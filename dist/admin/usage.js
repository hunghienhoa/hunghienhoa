let usageRequest = 0;
const usageNumber = value => value.toLocaleString('vi-VN',{maximumFractionDigits:2});
const usagePeriod = {day:'Trong ngày UTC',month:'Trong kỳ tháng',storage:'Đang lưu trữ'};
async function loadUsage() {
  const version=authVersion, request=++usageRequest, button=$('#refresh-usage');
  button.disabled=true; message($('#usage-status'),'Đang tải số liệu…');
  try {
    const report=await api('/api/admin/usage');
    if(version!==authVersion || request!==usageRequest) return;
    renderUsage(report);
    message($('#usage-status'),'Đã tải. Hạn mức đối chiếu tài liệu ngày '+report.verifiedAt+'. '+report.databaseNote);
  } catch(error) { if(version===authVersion && request===usageRequest) { $('#usage-list').replaceChildren(); message($('#usage-status'),error.message,true); } }
  finally { if(request===usageRequest) button.disabled=false; }
}
function renderUsage(report) {
  const list=$('#usage-list'); list.replaceChildren();
  for(const [provider,info] of Object.entries(report.providers)) {
    const card=make('section',undefined,'paper usage-provider'), heading=make('div',undefined,'view-head');
    heading.append(make('h2',info.name));
    const link=make('a','Mở dashboard ↗','outline');link.href=info.dashboard;link.target='_blank';link.rel='noopener noreferrer';heading.append(link);
    card.append(heading,make('p',info.note,'view-note'));
    const automatic=report.metrics.filter(row=>row.provider===provider && row.entry?.source==='api').length;
    card.append(make('p',`${automatic} chỉ số tự động · `+(report.connections?.[provider]||'Bản cục bộ: cập nhật số liệu từ dashboard.'),'view-note usage-connection'));
    for(const metric of report.metrics.filter(row=>row.provider===provider)) {
      const row=make('article',undefined,'usage-metric'), title=make('div',undefined,'usage-title');
      title.append(make('h3',metric.label),make('span',usagePeriod[metric.period],'usage-period'));row.append(title);
      const state=metric.status==='unknown' ? (metric.expired?'Hết kỳ — cần cập nhật':'Chưa có số liệu') : metric.status==='exceeded'?'Đã chạm hoặc vượt hạn mức':metric.status==='warning'?'Sắp hết hạn mức':'Trong hạn mức';
      row.append(make('p',state,'usage-state '+metric.status));
      const limit=metric.limit===null?(metric.period==='month'?'Không có trần tháng riêng':'Thông tin dung lượng repo'):usageNumber(metric.limit)+' '+metric.unit;
      row.append(make('p',(metric.used===null?'Chưa biết':usageNumber(metric.used)+' '+metric.unit)+' / '+limit,'usage-value'));
      if(metric.percent!==null) {
        const progress=make('progress');progress.max=100;progress.value=Math.min(100,metric.percent);progress.setAttribute('aria-label',metric.label+': '+usageNumber(metric.percent)+'%');row.append(progress);
        row.append(make('p',usageNumber(metric.percent)+'% · Còn '+usageNumber(metric.remaining)+' '+metric.unit));
      }
      if(metric.entry) {
        row.append(make('small',(metric.entry.source==='api'?'Đo tự động':'Nhập từ dashboard')+' · '+new Date(metric.entry.updatedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+(metric.stale?' · Số liệu hơn 24 giờ, nên cập nhật.':'')));
        if(metric.period!=='storage') row.append(make('small','Kỳ: '+metric.entry.start+' → '+metric.entry.end+' (UTC)'));
      }
      if(metric.entry?.source!=='api') row.append(usageForm(metric,report.today));
      card.append(row);
    }
    const source=make('a','Tài liệu hạn mức Free ↗');source.href=info.source;source.target='_blank';source.rel='noopener noreferrer';card.append(source);
    if(provider==='cloudflare') {const source=make('a','Hạn mức Durable Objects ↗');source.href='https://developers.cloudflare.com/durable-objects/platform/pricing/';source.target='_blank';source.rel='noopener noreferrer';card.append(source);}
    list.append(card);
  }
}
function usageForm(metric,today) {
  const details=make('details'), summary=make('summary','Cập nhật từ dashboard'), form=make('form',undefined,'usage-form');
  details.append(summary,form);
  const label=make('label','Đã dùng ('+metric.unit+')'), input=make('input');input.type='number';input.min='0';input.max=String(Number.MAX_SAFE_INTEGER);input.step=['request','dòng','người'].includes(metric.unit)?'1':'any';input.required=true;
  if(metric.used!==null) input.value=metric.used;
  label.append(input);form.append(label);
  let start,end;
  if(metric.period==='month') {
    const month=today.slice(0,7), last=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),0)).toISOString().slice(0,10);
    for(const [name,value] of [['Bắt đầu kỳ',metric.used!==null?metric.entry.start:month+'-01'],['Ngày cuối kỳ',metric.used!==null?metric.entry.end:last]]) {
      const label=make('label',name+' (theo dashboard)'),field=make('input');field.type='date';field.required=true;field.value=value;label.append(field);form.append(label);if(!start)start=field;else end=field;
    }
  }
  const save=make('button','Lưu số liệu','outline'), feedback=make('p',undefined,'status');save.type='submit';feedback.setAttribute('role','status');form.append(save,feedback);
  form.addEventListener('submit',async event=>{
    event.preventDefault();const version=authVersion;save.disabled=true;
    try {
      await api('/api/admin/usage',{method:'PUT',body:JSON.stringify({id:metric.id,used:Number(input.value),...(start?{start:start.value,end:end.value}:{})})});
      if(version===authVersion) await loadUsage();
    } catch(error) {if(version===authVersion) message(feedback,error.message,true);}
    finally {save.disabled=false;}
  });
  return details;
}
document.querySelector('[data-panel="usage"]').addEventListener('click',loadUsage);
$('#refresh-usage').addEventListener('click',loadUsage);
