# EME Spatial

Landing e experiências imersivas independentes do EME Select.

## Desenvolvimento

Node.js 22.12 ou superior:

```sh
npm ci
npm start
```

Abra http://127.0.0.1:4195. `npm run build` verifica TypeScript e gera `dist/`. `npm run preview` serve a compilação na porta 4196.

## Páginas

- `/`: landing da plataforma, sem carregar o motor 3D.
- `/criar-projeto`: referências e briefing salvo no navegador, com download em texto; sem envio automático.
- `/apresentar/m`: Torre M, iluminação, navegação e estúdio de vídeo drone.
- `/apresentar/g400`: apresentação G400.
- `/apresentar/cenario`: apresentações personalizadas, com configuração no fragmento da URL.
- `/apresentar/moradas-da-serra`: apresentação Moradas da Serra.
- `/apresentar/residencial-vacaria`: estudo original; `?alternativa=compacta` abre a alternativa.
- `/galeria-m.html`: imagens renderizadas em Cycles.

## Hospedagem e integração

Vercel compila com Vite e publica `dist/`. Endereço de produção: https://www.emespatial.com. As experiências e seus modelos são servidos pelo próprio EME Spatial. Somente a consulta pública de disponibilidade do Moradas da Serra usa uma reescrita específica para o EME Select; o portal e os bancos permanecem no Select.

Rotas de drone e rascunhos ficam no armazenamento deste domínio. Dados previamente salvos no navegador em emeselect.com não são transferidos automaticamente. Vídeos podem ser baixados na própria sessão. O serviço opcional de gravação em disco do ambiente local não está hospedado na Vercel.

## Organização

`index.html`, `app.js` e `style.css`: landing e criação. `experience.html` e `src/experience.tsx`: entrada das experiências, carregadas sob demanda. `src/developments`, `src/presentation` e `shared`: código da experiência migrado da versão local atual. `public/assets`: modelos, texturas e imagens publicados.

Os arquivos pesados de produção de Blender e Unreal ficam fora do repositório. Imagens fornecidas ou produzidas para o projeto não têm licença aberta presumida. O código do site EME Select e suas credenciais não fazem parte deste projeto.
