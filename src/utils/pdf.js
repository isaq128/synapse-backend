import pdf from 'pdf-parse';

export async function extractTextFromPDF(buffer){
  try{
    const data = await pdf(buffer);
    return (data && data.text) ? data.text : '';
  }catch(err){
    // return empty string on parse error so caller can handle gracefully
    console.error('pdf parse error:', err.message || err);
    return '';
  }
}
