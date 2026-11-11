let usageRequest=0,usageProvider='supabase';
const usageNumber=value=>value>0 && value<0.01?'<0,01':value.toLocaleString('vi-VN',{maximumFractionDigits:2});
const usagePeriod={day:'Hôm nay · UTC',month:'Tháng này · UTC',storage:'Dung lượng'};
async function loadUsage() {
  const version=authVersion,request=++usageRequest,button=$('#refresh-usage');
  button.disabled=true;message($('#usage-status'),'Đang đồng bộ API…');
  try {
    const report=await api('/api/admin/usage');
    if(version!==authVersion || request!==usageRequest) return;
    renderUsage(report);
    message($('#usage-status'),'Tự đồng bộ mỗi 5 phút khi đang xem. Cập nhật '+new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})+'.');
  } catch(error) {if(version===authVersion && request===usageRequest) {$('#usage-list').replaceChildren();$('#usage-summary').textContent='';message($('#usage-status'),error.message,true);}}
  finally {if(request===usageRequest) button.disabled=false;}
}
function selectUsageProvider(provider) {
  usageProvider=provider;
  for(const button of document.querySelectorAll('[data-usage-provider]')) button.setAttribute('aria-pressed',String(button.dataset.usageProvider===provider));
  for(const card of document.querySelectorAll('.usage-provider')) card.dataset.active=String(card.id==='usage-'+provider);
}
function renderUsage(report) {
  const list=$('#usage-list'),navigation=$('#usage-services');list.replaceChildren();navigation.replaceChildren();
  const available=report.metrics.filter(row=>row.used!==null).length,warnings=report.metrics.filter(row=>['warning','exceeded'].includes(row.status)).length;
  $('#usage-summary').textContent=available+' chỉ số đã đồng bộ'+(warnings?' · '+warnings+' cảnh báo':'');
  for(const [provider,info] of Object.entries(report.providers)) {
    const button=make('button',info.name);button.type='button';button.dataset.usageProvider=provider;button.setAttribute('aria-controls','usage-'+provider);button.addEventListener('click',()=>selectUsageProvider(provider));navigation.append(button);
    const card=make('section',undefined,'paper usage-provider'),heading=make('div',undefined,'view-head');card.id='usage-'+provider;
    heading.append(make('h2',info.name));
    const link=make('a','Dashboard ↗','outline');link.href=info.dashboard;link.target='_blank';link.rel='noopener noreferrer';heading.append(link);card.append(heading);
    const metrics=report.metrics.filter(row=>row.provider===provider),known=metrics.filter(row=>row.used!==null),unknown=metrics.filter(row=>row.used===null);
    if(!known.length) card.append(make('p','Chưa nhận được dữ liệu API của dịch vụ này. Hệ thống sẽ tự thử lại.','view-note'));
    for(const metric of known) card.append(usageMetric(metric));
    if(unknown.length) {
      const details=make('details',undefined,'usage-unavailable');details.append(make('summary',unknown.length+' chỉ số chưa lấy được tự động'));
      for(const metric of unknown) {const item=make('div',undefined,'usage-missing');item.append(make('h3',metric.label),make('p',metric.reason));if(metric.limit!==null)item.append(make('small','Gói Free: '+usageNumber(metric.limit)+' '+metric.unit));details.append(item);}
      card.append(details);
    }
    const explanation=make('details',undefined,'usage-explanation');explanation.append(make('summary','Kết nối & cách tính'),make('p',report.connections?.[provider]||'Số liệu cloud được đồng bộ trên bản online.'),make('p',info.note));
    const source=make('a','Tài liệu hạn mức Free ↗');source.href=info.source;source.target='_blank';source.rel='noopener noreferrer';explanation.append(source);card.append(explanation);list.append(card);
  }
  selectUsageProvider(usageProvider);
}
function usageMetric(metric) {
  const row=make('article',undefined,'usage-metric'),title=make('div',undefined,'usage-title');
  title.append(make('h3',metric.label),make('span',usagePeriod[metric.period],'usage-period'));row.append(title);
  row.append(make('p',usageNumber(metric.used)+' '+metric.unit,'usage-value'));
  if(metric.limit!==null) {
    const state=metric.status==='exceeded'?'Đã chạm hạn mức':metric.status==='warning'?'Sắp hết hạn mức':'Trong hạn mức';
    row.append(make('p',state,'usage-state '+metric.status));
    const progress=make('progress');progress.max=100;progress.value=Math.min(100,metric.percent);progress.setAttribute('aria-label',metric.label+': '+usageNumber(metric.percent)+'%');row.append(progress);
    row.append(make('p',usageNumber(metric.percent)+'% / '+usageNumber(metric.limit)+' '+metric.unit+' · Còn '+usageNumber(metric.remaining)+' '+metric.unit,'usage-balance'));
  } else row.append(make('p','Phạm vi: '+(metric.provider==='cloudflare'?'toàn tài khoản':metric.provider==='github'?'repo này':'dự án này'),'usage-balance'));
  const updated=make('small','API · '+new Date(metric.entry.updatedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}));updated.title=new Date(metric.entry.updatedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});row.append(updated);
  return row;
}
document.querySelector('[data-panel="usage"]').addEventListener('click',loadUsage);
$('#refresh-usage').addEventListener('click',loadUsage);
setInterval(()=>{if(document.visibilityState==='visible' && !$('#workspace').hidden && !document.querySelector('[data-view="usage"]').hidden && !$('#refresh-usage').disabled) loadUsage();},5*60*1000);
