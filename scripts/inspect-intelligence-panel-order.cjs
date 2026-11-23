const fs=require('node:fs');
const s=fs.readFileSync('index.html','utf8');
const markers=['<!-- Grid Principal: Perguntas Rápidas & Chat Analítico -->','renderIntelligenceMemoryFeed(false)','Painel de Respostas & Diagnósticos de Engenharia','SEU ASSISTENTE','Seu Assistente','Modelo Analítico Conectado','Empreendimento Ativo:',"intelligenceChatHistory.map(msg"];
for(const marker of markers){
 const pos=s.toLowerCase().indexOf(marker.toLowerCase(),800000);
 console.log('\n===== '+marker+' at '+pos+' =====\n');
 if(pos>=0)console.log(s.slice(Math.max(0,pos-4300),Math.min(s.length,pos+3800)).replace(/data:image\/[^\s'"]{200,}/g,'[IMAGE]').slice(0,8500));
}
