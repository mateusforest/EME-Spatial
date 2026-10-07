# Produção visual — apartamento 14

## Implementado

- Portal `/portal/producao`: pedidos versionados, biblioteca IndexedDB, importação verificada por SHA-256, aprovação/revogação e exportação da entrega aprovada. Mídia não é publicada automaticamente.
- Conexão com MF Video IA por **troca explícita de arquivos**. Não há API pública de renderização, processamento na Vercel, sincronização entre dispositivos ou autenticação adicionada nesta etapa.
- Adaptador local MF `/spatial`: fila existente, cancelamento existente, importação de pedidos, renderização Blender e biblioteca por projeto. Arquivos já existentes na MF podem ser vinculados a projetos, inclusive sem modelo 3D.
- Montagens, edições de imagem e variações com imagem de referência preservam vínculo e pais. Cada derivação volta a revisão. Animação de fotos com aproximação, afastamento e dois movimentos laterais é movimento de enquadramento, não reconstrução tridimensional nem modelo IA image-to-video instalado.
- Blender: validação Cycles 1280×720; prévia Eevee de living/cozinha/sacada + percurso de 6 s; modo final Cycles com imagens 1600×900 e percurso 1280×720. Os nomes não prometem 4K.
- Produção final exige aprovação local de uma validação da mesma planta, acabamentos, arquivo Blender e versão dos scripts. Pedido repetido não duplica trabalho.
- Renderização OptiX quando disponível, CPU limitada a quatro threads como alternativa. Um trabalho por vez na fila MF. Não executa Blender pelo navegador.
- Detalhamento de produção: folhagem nos centros das plantas originais, costuras e trama dos tecidos, microacabamento de madeira e pedra e bordas dos móveis. Não altera posições do mobiliário, paredes ou extensão da sacada. A fonte sincronizada 73 permanece preservada.

## Uso

1. Reabrir a MF após instalar a atualização, com a fila ociosa. O instalador não encerra processos.
2. No portal, preparar um pedido para o apartamento 14 e importar o JSON em `http://127.0.0.1:7860/spatial`.
3. Renderizar e revisar. Exportar o resultado da MF e importá-lo na Produção visual do portal.
4. Aprovar explicitamente a validação na MF antes da produção final; aprovar cada resultado no portal antes da entrega. São revisões locais, não assinaturas digitais.
5. Outros projetos: gerar/importar mídia na MF, vincular ao código do projeto e exportar para o portal. A renderização Blender automatizada está limitada ao piloto M14.

Instalação: `python tools/install-mf74.py <pasta MF> --blender <executável> --source <pavimento sincronizado.blend>`.
Os caminhos locais ficam em `MF VIDEO AI/data/spatial-config.json`, fora do site. O instalador faz backup dos arquivos modificados em `MF VIDEO AI/work`.

## Validação e limites

Testes em `tests/production74.test.mjs`, `tests/mf-production74.py` e `tools/validate-portal74.mjs`. O teste MF usa uma biblioteca isolada em `conteudos/test-mf74`; não modifica projetos/arquivos existentes do usuário. Aprovações usadas pelo teste são fictícias e não aprovam o material do usuário.

O render ainda não equivale a fotografia: conserva a base de mobiliário do cenário web e o exterior é céu procedural, sem entorno urbano modelado. O usuário aprovou a revisão do living para gerar as três imagens e o percurso final em Cycles. Os resultados produzidos entram em revisão antes da entrega/publicação. Eevee valida vistas e movimento; Cycles é a referência de luz final.

A tentativa de reiniciar a instância MF existente foi bloqueada pela revisão automática. A instância foi mantida; reabrir o aplicativo carrega o adaptador instalado.
