// "Ver esta vista realista": recebe a imagem da vista 3D, manda para um endpoint serverless do RunPod
// (worker ComfyUI) com a receita Qwen Image 2.1 de edição e devolve a foto realista.
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   RUNPOD_API_KEY       chave da API do RunPod (nunca no código)
//   RUNPOD_ENDPOINT_ID   id do endpoint serverless (ver serverless/LEIA-ME.md)
//   REALISTA_LIMITE_HORA opcional: pedidos por IP por hora (padrão 6)
//
// POST /api/realista  {image: "data:image/jpeg;base64,...", context: {...}}  → {id}
// GET  /api/realista?id=...                                                → {status, image?}

const API = 'https://api.runpod.ai/v2';
const MAX_BYTES = 3_000_000;
const hits = new Map(); // limite simples por instância; o teto real de gasto fica no endpoint (máx. de workers)

function workflow(prompt, seed) {
  return {
    1: { class_type: 'UNETLoader', inputs: { unet_name: 'qwen_image_2.1_int8_convrot.safetensors', weight_dtype: 'default' } },
    2: { class_type: 'CLIPLoader', inputs: { clip_name: 'qwen3vl_8b_int8_convrot.safetensors', type: 'qwen_image', device: 'default' } },
    3: { class_type: 'VAELoader', inputs: { vae_name: 'qwen_image_2.1_vae_bf16.safetensors' } },
    10: { class_type: 'LoadImage', inputs: { image: 'vista.jpg' } },
    4: { class_type: 'TextEncodeQwenImage21', inputs: { prompt, negative_prompt: 'cartoon, 3d render, cgi, plastic, flat lighting, low detail, blurry, distorted geometry, text, watermark, people', resolution: 1024, clip: ['2', 0], vae: ['3', 0], 'images.image_1': ['10', 0] } },
    6: { class_type: 'QwenImage21Cache', inputs: { device: 'auto', dtype: 'default', model: ['1', 0] } },
    7: { class_type: 'KSampler', inputs: { seed, steps: 20, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: 1, model: ['6', 0], positive: ['4', 0], negative: ['4', 1], latent_image: ['4', 2] } },
    8: { class_type: 'VAEDecode', inputs: { samples: ['7', 0], vae: ['3', 0] } },
    9: { class_type: 'SaveImage', inputs: { filename_prefix: 'moradas_realista', images: ['8', 0] } },
  };
}

function promptFor(ctx = {}) {
  const light = typeof ctx.sunElevation === 'number'
    ? ctx.sunElevation < -4 ? 'night time, warm interior lights glowing, street lamps on, deep blue sky'
      : ctx.sunElevation < 12 ? `golden hour sunlight around ${ctx.hour}, long soft shadows, warm sky`
        : `natural daylight around ${ctx.hour}, crisp sun and soft shadows`
    : 'natural daylight';
  const where = String(ctx.where || 'residential condominium').slice(0, 160);
  return `Turn <image 1>, a simplified 3D preview of a ${where} in southern Brazil, into a high-end photorealistic architectural photograph. ` +
    `Keep exactly the same camera position, framing, perspective, building geometry, window and door positions, furniture layout and color palette. ` +
    `Replace the flat 3D surfaces with realistic materials: textured plaster, real wood grain, natural stone, glass with reflections, detailed lush vegetation. ` +
    `${light}, physically accurate global illumination, soft ambient occlusion, 24mm architectural lens, sharp focus, magazine quality. No people, no text.`;
}

export default async function handler(req, res) {
  const key = process.env.RUNPOD_API_KEY, endpoint = process.env.RUNPOD_ENDPOINT_ID;
  res.setHeader('Cache-Control', 'no-store');
  if (!key || !endpoint) return res.status(503).json({ error: 'A foto realista ainda não foi ligada neste site.' });
  const auth = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  if (req.method === 'GET') {
    const id = String(req.query?.id || '');
    if (!/^[\w-]{6,80}$/.test(id)) return res.status(400).json({ error: 'Pedido inválido.' });
    const r = await fetch(`${API}/${endpoint}/status/${id}`, { headers: auth });
    const data = await r.json().catch(() => ({}));
    if (data.status !== 'COMPLETED') return res.status(200).json({ status: data.status || 'UNKNOWN', error: data.status === 'FAILED' ? 'A geração falhou.' : undefined });
    const out = data.output || {};
    const img = out.images?.[0];
    const b64 = img?.data || (typeof out.message === 'string' ? out.message : null);
    if (!b64) return res.status(200).json({ status: 'FAILED', error: 'O serviço não devolveu imagem.' });
    return res.status(200).json({ status: 'COMPLETED', image: b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}` });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'anon';
  const now = Date.now(), limit = Number(process.env.REALISTA_LIMITE_HORA || 6);
  const list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  if (list.length >= limit) return res.status(429).json({ error: 'Limite de imagens por hora atingido. Tente mais tarde.' });
  const { image, context } = req.body || {};
  if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) return res.status(400).json({ error: 'Imagem inválida.' });
  const b64 = image.split(',')[1];
  if (b64.length * .75 > MAX_BYTES) return res.status(413).json({ error: 'Imagem grande demais.' });
  list.push(now); hits.set(ip, list);
  const body = { input: { workflow: workflow(promptFor(context), Math.floor(Math.random() * 1e9)), images: [{ name: 'vista.jpg', image: b64 }] } };
  const r = await fetch(`${API}/${endpoint}/run`, { method: 'POST', headers: auth, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.id) return res.status(502).json({ error: 'O serviço de imagem não respondeu. Tente de novo.' });
  return res.status(200).json({ id: data.id });
}
