import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('.', import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
createServer(async(req,res)=>{
  try{
    const raw=(req.url||'/').split('?')[0];
    const rel=raw==='/'?'index.html':raw.replace(/^\/+/, '');
    const safe=normalize(rel).replace(/^\.\.(\/|\\|$)/,'');
    const path=join(root,safe);
    const data=await readFile(path);
    res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Not found');}
}).listen(8787,()=>console.log('Planes MVP em http://localhost:8787'));
