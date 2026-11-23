const fs=require('node:fs');
const src=fs.readFileSync('index.html','utf8');
const terms=['async function askPlanesIntelligence','function askPlanesIntelligence','function buildPlanesIntelligenceAnalysis','planes-v2-input','Consultar Copiloto','intelligenceTextApiEnabled','function renderIntelligence','const askPlanesIntelligence','function handleIntelligence'];
console.log('INDEX_LENGTH',src.length);
for(const term of terms){
 const p=src.indexOf(term);console.log('===',term,'at',p,'===');
 if(p>=0)console.log(src.slice(Math.max(0,p-1500),Math.min(src.length,p+5500)));
}
