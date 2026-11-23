const fs=require('node:fs');
const s=fs.readFileSync('index.html','utf8');
const terms=['MEMÓRIA DE DECISÕES','Memória de Decisões','Seu histórico nesta obra','PAINEL DE RESPOSTAS','Painel de Respostas','DIAGNÓSTICOS RÁPIDOS PARA REUNIÃO'];
console.log('SIZE',s.length);
for(const term of terms){
 let p=-1,count=0;
 while((p=s.toLowerCase().indexOf(term.toLowerCase(),p+1))>=0 && count++<8){
  console.log('\n===',JSON.stringify(term),'offset',p,'===');
  console.log(s.slice(Math.max(0,p-1800),Math.min(s.length,p+900)).replace(/data:image\/[^\s'"]{300,}/g,'[DATA_IMAGE]'));
 }
}
