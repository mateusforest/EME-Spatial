# Apresentações por link

O endereço estável de cada entrega é `https://www.emespatial.com/visitar/<identificador>`.
O Botanique usa `/visitar/botanique`. O cliente pode encaminhar o mesmo endereço.

## Gerenciamento nesta máquina

Execute **Gerenciar entregas.ps1**, na pasta do projeto. O painel abre em
`http://127.0.0.1:4197`. Ele está restrito a esta máquina e não é enviado à hospedagem.

- **Rascunho:** a página de entrega não é gerada; o endereço responde como indisponível após publicar.
- **Somente por link:** gera a página, sem entrada na vitrine e com `noindex`.
- **Público na vitrine:** gera a página e inclui o cartão no catálogo público.

Alterar a seleção salva um rascunho em `config/deliveries.json`.
**Publicar alterações** verifica e compila o projeto, registra apenas esse arquivo e envia à
branch principal. O painel aguarda a assinatura da nova versão aparecer na hospedagem antes
de informar que a atualização foi confirmada. Ele recusa a publicação quando há outra
alteração do site em andamento ou a branch local está fora de sincronia.
O computador precisa ter o acesso Git já configurado. A hospedagem continua na Vercel.

Os projetos autorais usados como demonstração nas páginas comerciais têm chamadas próprias;
o estado controla o catálogo de entregas e seus novos endereços. Endereços antigos
`/apresentar/...` e arquivos já públicos não são revogados por esse mecanismo.
“Somente por link” não significa confidencialidade, login ou senha. Quem possui o endereço
pode abrir e encaminhar. Desativar a entrega também não recolhe downloads já realizados.

## Personalização e publicação

O cadastro permite título, descrição, capa, crédito, endereço do 3D, PDF opcional e imagem
para compartilhamento. Novos projetos começam como `draft` ou `unlisted`; a publicação na
vitrine exige a escolha explícita de `public`. A capa e a prévia social devem identificar
quando mostram uma referência, em vez de uma captura da experiência.

Os metadados são gerados no HTML servido, para que o WhatsApp possa ler título, imagem e
descrição sem executar JavaScript. O aplicativo pode manter uma prévia antiga em cache;
não é possível garantir quando ele a atualiza. Os botões apenas abrem o compartilhamento,
sem enviar mensagens automaticamente.

No Botanique, o visualizador é carregado após o clique, na mesma apresentação, com retorno
à capa e troca entre apartamento e empreendimento. PDF abre separadamente. O link copiado
sempre aponta para a capa, independentemente da câmera ou do cenário atual. Não exige conta.

## Hospedagem e uso da GPU

Arquivos, PDF, capa e link continuam disponíveis na hospedagem, mesmo com os computadores
do escritório desligados. Hoje o navegador do visitante renderiza o 3D. Hospedar esses
arquivos em uma RTX 3060 não transfere esse trabalho para a GPU do escritório.

Renderização remota é uma etapa independente: um aplicativo renderiza na GPU, envia vídeo
por WebRTC e recebe os comandos do visitante. A experiência atual usa Three.js; adotar
Unreal Pixel Streaming exige preparar uma aplicação Unreal e sua infraestrutura, não apenas
mover o site. O link de apresentação pode permanecer o mesmo quando um serviço remoto
validado estiver disponível.

Antes de ativar: confirmar a VRAM real da GPU (separada da RAM do computador), medir conexão
de upload/latência, testar uma sessão interativa isolada e dimensionar sessões simultâneas.
Não há transmissão pela 3060 ativada nesta entrega.
