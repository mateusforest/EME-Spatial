import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import type {Plugin} from 'vite';
import {readRegistry,deliveryHead,publicProjects} from './delivery-config.ts';

const marker='<!-- delivery:head -->';
export default function deliveryPlugin():Plugin {
  let output='dist';
  return {
    name:'eme-deliveries',
    configResolved(config){output=config.build.outDir;},
    resolveId(id){if(id==='virtual:delivery-public')return '\0delivery-public';},
    load(id){if(id==='\0delivery-public')return 'export default '+JSON.stringify(publicProjects(readRegistry()));},
    configureServer(server){
      server.watcher.add(resolve('config/deliveries.json'));
      server.watcher.on('change',file=>{if(file===resolve('config/deliveries.json')){const mod=server.moduleGraph.getModuleById('\0delivery-public');if(mod)server.moduleGraph.invalidateModule(mod);server.ws.send({type:'full-reload'});}});
      server.middlewares.use(async(req,res,next)=>{
        const path=(req.url||'').split('?')[0];
        if(!path.startsWith('/visitar/'))return next();
        try{
          const slug=path.replace(/^\/visitar\//,'').replace(/\/$/,'');
          const registry=readRegistry(),project=registry.projects.find(p=>p.slug===slug&&p.status!=='draft');
          const html=await server.transformIndexHtml(path,readFileSync('delivery.html','utf8').replace(marker,deliveryHead(registry,project)));
          res.statusCode=project?200:404;res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
        }catch(error){next(error);}
      });
    },
    closeBundle(){
      const registry=readRegistry(),template=readFileSync(resolve(output,'delivery.html'),'utf8');
      for(const p of registry.projects.filter(p=>p.status!=='draft'))for(const key of ['cover','shareImage','pdf','manifest'] as const){
        if(p[key]&&!existsSync(resolve('public','.'+p[key].split('?')[0])))throw Error(`Arquivo ausente na entrega ${p.slug}: ${key}`);
      }
      for(const p of registry.projects.filter(p=>p.status!=='draft'))for(const g of p.gallery||[])if(!existsSync(resolve('public','.'+g.image)))throw Error(`Imagem ausente na galeria ${p.slug}`);
      for(const project of registry.projects.filter(p=>p.status!=='draft')){
        const folder=resolve(output,'visitar',project.slug);mkdirSync(folder,{recursive:true});
        writeFileSync(resolve(folder,'index.html'),template.replace(marker,deliveryHead(registry,project)));
      }
      writeFileSync(resolve(output,'delivery.html'),template.replace(marker,deliveryHead(registry)));
      writeFileSync(resolve(output,'delivery-release.json'),JSON.stringify({revision:createHash('sha256').update(JSON.stringify(registry)).digest('hex')}));
      // Unknown and withdrawn presentation links receive a real HTTP 404 on the host.
      writeFileSync(resolve(output,'404.html'),template.replace(marker,deliveryHead(registry)));
    }
  };
}
