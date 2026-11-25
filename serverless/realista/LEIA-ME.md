# Foto realista no RunPod serverless

O botão **"Ver esta vista realista"** da visita 3D (`/apresentar/moradas-da-serra?caminhar=1`) manda a vista atual para `api/realista.js` (função da Vercel), que chama um endpoint serverless do RunPod. O endpoint roda a receita **Qwen Image 2.1 (edição)**, a mesma do painel do estúdio, e devolve a foto.

## Por que serverless só para a foto, e não para o 3D
A visita 3D roda no navegador de quem acessa: placa de vídeo dele, custo zero e sem fila. O serverless do RunPod responde a pedidos e não transmite vídeo ao vivo; para o 3D isso daria atraso e custo por minuto de cada visitante. Então ele entra só onde precisa de GPU forte: transformar a vista em foto.

## Como ligar
1. **Imagem do trabalhador:** construir esta pasta (`Dockerfile` + `handler.py`) com `BASE` = a imagem do template do Pod. Pelo RunPod: Serverless → New Endpoint → GitHub repo (pasta `serverless/realista`), ou Docker Hub.
2. **Endpoint:** GPU com 48 GB ou mais (Qwen 2.1 int8 cabe; RTX PRO 6000 ou L40S), **volume de rede `mfcreate_01`** (força a região US-NC-2), *Max workers* = 1, *Idle timeout* = 30 s, *FlashBoot* ligado. Com *Active workers* = 0 ele não cobra parado.
3. **Vercel:** em `eme-spatial` → Settings → Environment Variables: `RUNPOD_API_KEY` e `RUNPOD_ENDPOINT_ID`. Opcional: `REALISTA_LIMITE_HORA` (padrão 6 por IP).

## Custos e cuidados
- A primeira imagem depois de um tempo parado espera o trabalhador acordar e carregar o modelo (1 a 3 min). As seguintes levam uns 20 a 40 s.
- *Max workers* = 1 é o teto de gasto: nunca roda mais de uma máquina ao mesmo tempo.
- O trabalhador apaga do volume a imagem gerada depois de enviá-la (o volume já encheu uma vez).
- O endpoint usa o mesmo volume dos Pods. Evite baixar modelos grandes por um lado enquanto o outro está gerando.
