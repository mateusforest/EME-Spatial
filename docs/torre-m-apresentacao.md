# Torre M — demonstração por link

Entrada: `/visitar/torre-m-apresentacao` (unlisted, fora da vitrine e com `noindex`). A página tem galeria, filme existente do Apartamento 14, download do filme, seletor demonstrativo de andares e duas entradas 3D. Nenhuma cena é carregada antes do clique. O vídeo pausa quando a visita abre e o iframe é destruído ao sair.

## Demonstração atual

- O Apartamento 14 é o modelo visitável principal; a visita entra diretamente no living. Outros andares no seletor levam explicitamente ao apartamento modelo.
- Estoque comercial: todos os andares **A consultar**. Não há integração com unidades disponíveis, reservas ou preços da construtora.
- Sol: horário e iluminação ilustrativos. A Torre M não tem norte, data e localização confirmados para um estudo de insolação.
- A galeria e o filme são materiais existentes. Os ajustes atuais no navegador não regeneram esses renders. O acabamento interativo ainda não equivale ao realismo da imagem conceitual de capa.
- O modo de apresentação (`apresentacao=1`) preserva as rotas tradicionais. Limita luzes pontuais, agrupa objetos opacos, reduz detalhe de folhagem e substitui refração da água por transparência e reflexão do ambiente, evitando renderizar todo o empreendimento duas vezes.
- Os sete GLBs de acabamento são transportados com compressão sem perdas: **52.165.732 → 18.922.151 bytes**. Os arquivos originais permanecem como fallback. Regeneração: `node tools/prepare-m-presentation87.mjs`.

## Validação em 27/10/2026

TypeScript, build Vite e testes de registro, integridade dos assets, agrupamento, orçamento de luzes e fallback de transporte passaram. O teste em Chrome/D3D11 verificou vídeo, pausa ao abrir 3D, troca de ambientes, materiais, horário, planta, retorno, descarte do iframe e aviso após perda simulada do contexto gráfico. Viewports 1440×900 e 390×844 sem transbordamento horizontal.

No computador local: apartamento aproximadamente 30 quadros/s durante seis segundos de movimento; exterior aproximadamente 29–30 quadros/s em arraste. A preparação local do exterior passou de aproximadamente 41 s para 10 s após corrigir a preparação do ambiente e eliminar o passe de transmissão. A carga de desenho caiu de 2.580 chamadas/11,2 milhões de triângulos para 1.397/5,6 milhões no enquadramento testado. São medidas locais, com influência de cache; não são garantia em outro aparelho ou rede. A versão compilada abriu apartamento em 9,2 s e exterior em 7,7 s em uma execução local.

## Unreal e produto comercial

Unreal 5.8.3 e Pixel Streaming 2 foram testados localmente com uma cópia separada `/Game/EME/TorreM_Reuniao87`. Houve reprodução de vídeo no navegador local em 1280×720. A cena importada ainda tem problemas visuais; não está aprovada para apresentação comercial. Não foi publicado um servidor GPU, nem validado acesso externo do notebook, concorrência ou TURN. Os processos usados no teste foram encerrados. O empacotamento também requer resolver a validação do Windows SDK.

Para uso público no site da imobiliária, dimensionar após a reunião: dispositivos e rede alvo, número de visitas simultâneas, prazo de disponibilidade, hospedagem/CDN ou sessões GPU, suporte, dados de estoque e integração com o site. Orçar implantação e operação recorrente separadamente. Validar a orientação solar com a planta de implantação e uma data de referência. Antes da reunião, abrir o link no notebook real e baixar o filme como alternativa sem rede.
