// Cria o endpoint serverless "eme-realista" (template xy6qkxqtry, já criado em 25/11/2026). Exige saldo > US$ 0,01.
// Uso: node serverless/realista/criar-endpoint.js  (lê a chave do painel do estúdio; nunca imprime a chave)
const cfg = require('C:/Users/mateu/estudio-video/painel/dados/config.json').runpod;
const gql = async (query, variables) => { const r = await fetch('https://api.runpod.io/graphql', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.chave}` }, body: JSON.stringify({ query, variables }) }); return r.json(); };
(async () => {
  const e = await gql(`mutation($i: EndpointInput!) { saveEndpoint(input: $i) { id name gpuIds workersMax networkVolumeId locations idleTimeout } }`, { i: {
    name: 'eme-realista', templateId: 'xy6qkxqtry', gpuIds: 'BLACKWELL_96,ADA_48_PRO', networkVolumeId: 'n932t5kwxm', locations: 'US-NC-2',
    idleTimeout: 30, scalerType: 'QUEUE_DELAY', scalerValue: 4, workersMin: 0, workersMax: 1, flashBootType: 'FLASHBOOT',
  } });
  console.log(JSON.stringify(e));
})();
