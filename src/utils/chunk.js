export function splitIntoChunks(text, maxLen=1200){
  if(!text) return [];
  const paragraphs = text.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
  const chunks = [];
  let cur = '';
  for(const p of paragraphs){
    if((cur + '\n\n' + p).length > maxLen){
      if(cur) { chunks.push(cur); cur = p; }
      else { chunks.push(p); }
    } else {
      cur = cur ? cur + '\n\n' + p : p;
    }
  }
  if(cur) chunks.push(cur);
  return chunks;
}
