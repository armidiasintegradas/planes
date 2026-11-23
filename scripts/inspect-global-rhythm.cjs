const fs=require('node:fs');const s=fs.readFileSync('index.html','utf8');console.log('SIZE',s.length);
for(const query of ['RITMO GLOBAL','Ritmo Global','Arena:','Aptos:','Infra:','stroke-dasharray','strokeDasharray','dashoffset','globalRhythm','Ritmo global']){
  let pos=-1,n=0;while((pos=s.toLowerCase().indexOf(query.toLowerCase(),pos+1))>=0 && n++<6){
    console.log('\n===',query,'index',pos,'===\n',s.slice(Math.max(0,pos-2000),Math.min(s.length,pos+3200)));
  }
}
