async function normalizedAdminImage(file) {
  if(!file || !['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>12*1024*1024) throw new Error('Chọn PNG, JPEG hoặc WebP dưới 12 MB.');
  const url=URL.createObjectURL(file),image=new Image();
  try {
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Không đọc được ảnh.'));image.src=url;});
    if(image.naturalWidth*image.naturalHeight>45000000) throw new Error('Chọn ảnh dưới 45 triệu điểm ảnh.');
    const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/webp',.82);
    if(!data.startsWith('data:image/webp;base64,') || data.length>1398103) throw new Error('Ảnh sau chuyển đổi vượt 1 MB. Hãy chọn ảnh nhỏ hơn.');
    return data;
  } finally {URL.revokeObjectURL(url);}
}
async function uploadAdminImage(file,scope) {
  const version=authVersion,imageDataUrl=await normalizedAdminImage(file);
  if(version!==authVersion) throw new Error('Phiên chỉnh sửa đã thay đổi.');
  const asset=await api('/api/admin/media',{method:'POST',body:JSON.stringify({scope,imageDataUrl})});
  if(version!==authVersion) throw new Error('Phiên chỉnh sửa đã thay đổi.');
  return asset;
}
