import {defineConfig,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import deliveryPlugin from './tools/delivery-plugin.ts';
const pageFor=(url:string)=>/^\/apresentar\/botanique(?:\?|\/|$)/.test(url)?'/botanique.html':url.startsWith('/apresentar/')?'/experience.html':/^\/portal(?:\?|\/|$)/.test(url)?'/portal.html':/^\/(?:criar-projeto|solucoes|projetos|personalizar)(?:\?|\/|$)/.test(url)?'/index.html':null;
const routes=():Plugin=>({name:'spatial-routes',configureServer(server){server.middlewares.use((req,_res,next)=>{const page=pageFor(req.url||'');if(page)req.url=page;next();});},configurePreviewServer(server){server.middlewares.use((req,_res,next)=>{const page=pageFor(req.url||'');if(page)req.url=page;next();});}});
export default defineConfig({plugins:[react(),deliveryPlugin(),routes()],build:{target:'es2022',rollupOptions:{input:{landing:'index.html',experience:'experience.html',portal:'portal.html',botanique:'botanique.html',delivery:'delivery.html'}}},server:{watch:{ignored:['**/unreal/**','**/conteudos/**']},proxy:{'/api/public/developments/moradas-da-serra':{target:'https://www.emeselect.com',changeOrigin:true}}}});
