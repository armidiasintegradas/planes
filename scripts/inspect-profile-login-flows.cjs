const fs=require('node:fs');const s=fs.readFileSync('index.html','utf8');
const needles=['Não foi possível atualizar e-mail/senha','Nenhuma credencial local foi alterada','Salvar Alterações','Segurança & Alteração de Senha','Biometria & Passkeys','Nova Senha','function saveUser','updateUser(','updateProfile','profile-edit','profile-modal'];
for (const q of needles){let at=-1,count=0;while((at=s.indexOf(q,at+1))>=0 && count++<4){
 console.log('===',q,'@',at,'===');const chunk=s.slice(Math.max(0,at-1800),at+3200).replace(/(?:password|senha|token|secret|apikey)\s*[:=]\s*['"][^'"]+['"]/gi,'[redacted]');console.log(chunk);
}}
