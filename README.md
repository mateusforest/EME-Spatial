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

## Navegação por clique · revisão 63

Na Torre M, entre em uma residência ou escolha “Caminhar aqui” em uma área comum. Com “Clicar no piso para caminhar” ativado, clique/toque em um ponto livre do piso do mesmo pavimento. O percurso contorna os obstáculos cadastrados e respeita os limites de circulação. Arrastar para olhar, usar as setas/WASD ou pressionar Esc interrompe o movimento. O modo pode ser desativado pela caixa de seleção.

`npm run test:walk` verifica trajetos diretos, desvio de móveis, paredes fechadas, limites, exclusões e áreas desconectadas. O acabamento Blender/Cycles do apartamento de estudo no nível 14, frente direita, está na galeria; não substitui automaticamente os materiais e modelos navegáveis.

### Apartamento refinado (64)
O apartamento 14 reutiliza o pavimento completo da fachada (mApartment69). Personalização v70 no próprio modelo: prévia, descarte e aprovação salva por navegador. Materiais privados dessa unidade, mapas PBR compartilhados. O recorte 64 e renders 63 foram retirados de public e arquivados localmente em conteudos/arquivo-estudo-descontinuado-70; fontes Blender preservadas. Testes: tests/apartment69.test.mjs e tests/design70.test.mjs.

### Configurador independente de cozinha (65)
Rota: /apresentar/cozinha. Modelo autorado no Blender a partir da área social do apartamento 14, com três módulos de layout e materiais independentes. Carrega apenas kitchen65.glb (~1 MB), cinco texturas locais e o decodificador Draco; não importa a torre ou o campus. Renderização por demanda com pausa em aba oculta, limite de densidade e sombras reduzidas em equipamentos modestos. Salva até quatro propostas localmente, compara A/B, exporta PNG e compartilha escolhas pelo link. Nenhuma chamada de IA ou gravação no servidor. Fonte Blender e exportação: conteudos/configurator65 (local, fora do Git). Validação de opções: tests/configurator65.test.mjs.
## Portal pessoal · primeira etapa

`/portal` abre o workspace independente. Rotas: `/portal/projetos`, `/portal/estudio`, `/portal/imagens`, `/portal/videos`, `/portal/orcamentos`, `/portal/contratos`, `/portal/notas`, `/portal/financeiro` e `/portal/configuracoes`.

- Front-end de demonstração, **sem autenticação**. Não inserir dados reais de clientes ou dados financeiros confidenciais. `noindex` é uma orientação a buscadores, não controle de acesso.
- Estúdio, oficina G400, estimador e proposta PDF reaproveitados de `EME-select` (base `6b0c3d6`), mantendo os modelos e o fluxo Three.js já presentes no Spatial. Nada foi removido ou alterado no repositório Select.
- Rascunhos do estúdio, briefings e registros de gestão são salvos apenas no `localStorage` deste domínio/navegador. Não há sincronização com o Select, banco, autenticação, IA, assinatura, serviço fiscal ou instituição financeira.
- O painel financeiro começa com exemplos identificados. A área de notas simula percentual de faturamento e reserva informada manualmente, sem emissão ou cálculo fiscal validado.
- `Configurações → Exportar rascunhos` baixa um JSON. Limpar os dados do navegador apaga os rascunhos locais; importar/restaurar backups ainda não foi implementado.
- `npm run test:portal` verifica persistência do estúdio, validação, conflito entre abas e falha de armazenamento. `npm run build` valida TypeScript e gera as três entradas separadas.

Antes de usar em produção com dados reais: integrar autenticação e autorização, migrar armazenamento para o servidor e revisar a emissão fiscal e a assinatura de contratos. A remoção do módulo no Select deve acontecer só depois de migrar os dados e validar o novo fluxo.

## Landing e soluções · direção visual aprovada

A entrada pública usa `src/marketing` (React), separada do portal e dos motores 3D. A homepage em `HomeLanding.tsx` segue a direção M aprovada em 9 de outubro: verde profundo, marfim, uma casa conceitual em destaque, três etapas de criação e acesso aos projetos existentes. As páginas de soluções, modelos de contratação e briefing continuam disponíveis nas rotas abaixo.

- As três imagens `public/assets/marketing/casa-m-{exterior,interior,aerea}.webp` foram geradas a partir da proposta visual aprovada. São vistas conceituais; não representam um modelo navegável já concluído. Os controles da Casa M alternam essas imagens com uma transição visual guiada e permitem ampliar a prévia.
- `SceneImage.tsx` prepara e decodifica cada vista antes da passagem de 1,45 s. Cliques rápidos convergem para a última escolha; uma falha mantém a imagem anterior. A preferência por movimento reduzido elimina a animação. Não há reprodução automática, vídeo obrigatório ou carregamento do motor 3D na landing.
- O botão principal identifica a Torre M como demonstração 3D real. “Começar meu projeto” abre o briefing existente, sem envio automático.
- A nova homepage tem versões para desktop e celular, seleção de vistas por teclado, janela ampliada com fechamento por Escape e devolução de foco.

- `/solucoes/edificios`, `/solucoes/mixed-use`, `/solucoes/casas`, `/solucoes/condominios`, `/solucoes/interiores`: páginas por categoria com escopo, entregáveis e seleção de modelo.
- `/projetos/torre-m` e `/projetos/mixed-use`: páginas autorais. Mixed Use permanece em desenvolvimento, com referência visual identificada.
- `/personalizar`: apresentação leve de materiais com preferências locais e ligação para a personalização real em `/apresentar/m?apartamento=14&personalizar=1`. Os seletores não alteram a fotografia de referência.
- `/criar-projeto`: briefing em três etapas, recebendo categoria, nível e interesse pela URL. Rascunho local e download JSON; nenhum pedido é enviado automaticamente.
- A landing não importa Three.js, não inicia vídeos e não baixa GLBs. As experiências são abertas sob demanda por links explícitos.
- A imagem `public/assets/casa-conceito.webp` é uma referência conceitual gerada para esta landing, não uma obra construída ou modelo 3D concluído. As demais imagens são do acervo existente.
- `app.js` e `style.css` permanecem como referência legada; não são carregados pela nova entrada pública.

Validação da implementação: build/TypeScript, navegação das 11 rotas principais em desktop e larguras 390/768, seleção de categoria/nível, persistência de briefing, download JSON, preferências de materiais e ausência de modelos 3D no carregamento da landing.
