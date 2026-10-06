// Fonte: Briefing-Condominio-Vacaria.pdf, 05/10/2026. Medidas de estudo.
export const VACARIA_ROUTE = '/apresentar/residencial-vacaria';
export const VACARIA = {
  name: 'Residencial Vacaria', location: 'Vacaria · Rio Grande do Sul', status: 'Estudo conceitual',
  house: { width: 6, depth: 7.5, builtArea: 45, bedrooms: 2, wall: .15,
    front: { width: 6, depth: 5 }, backyard: { width: 6, depth: 2 },
    rooms: [
      { name: 'Estar, jantar e cozinha', dimensions: '2,80 × 7,20 m', area: '20,16 m²', note: 'Inclui circulação' },
      { name: 'Quarto de casal', dimensions: '2,75 × 2,85 m', area: '7,84 m²', note: 'Janela para os fundos' },
      { name: 'Segundo quarto', dimensions: '2,75 × 2,70 m', area: '7,43 m²', note: 'Janela para a frente' },
      { name: 'Banheiro', dimensions: '2,75 × 1,35 m', area: '3,71 m²', note: 'Ventilação a definir' },
    ] },
  // A área informada não dimensiona o contorno. A contagem ainda não está consolidada.
  land: { reportedArea: 7000, reportedEntranceWidth: 12, confirmedUnitCount: null },
  spatial: { status: 'prototype', modelUrl: null, visits: ['Entrada', 'Condomínio', 'Casa', 'Lazer'] },
} as const;
export const vacariaImages = [
  { id: 'fachadas', label: 'Fachadas', src: '/assets/vacaria/fachadas.webp', text: 'Volumes simples, platibandas retas e vagas abertas. Uma arquitetura pensada para o cotidiano.' },
  { id: 'entrada', label: 'Entrada', src: '/assets/vacaria/entrada.webp', text: 'Acesso entre muros, com portão metálico e passagem de pedestres. O corredor permanece livre de casas e vagas.' },
  { id: 'sala-cozinha', label: 'Sala e cozinha', src: '/assets/vacaria/sala-cozinha.webp', text: 'Estar, jantar e cozinha integrados, com saída direta para o quintal.' },
  { id: 'quarto', label: 'Quarto', src: '/assets/vacaria/quarto.webp', text: 'Dois quartos com janelas voltadas para a frente ou para os fundos da casa.' },
  { id: 'lazer', label: 'Lazer', src: '/assets/vacaria/lazer.webp', text: 'Um espaço comum simples, com brinquedos, bancos e caminhos para os encontros do dia a dia.' },
];
export const vacariaPlans = [
  { id: 'planta', label: 'Planta da casa', src: '/assets/vacaria/planta.webp', text: 'Casa-base de 6,00 × 7,50 m. Os 45 m² incluem paredes; dimensões e aberturas serão compatibilizadas no modelo.' },
  { id: 'implantacao', label: 'Implantação conceitual', src: '/assets/vacaria/implantacao.webp', text: 'Último estudo de organização. Proporções, manobras e quantidade de casas ainda serão revistas a partir do levantamento do terreno.' },
  { id: 'terreno', label: 'Terreno de referência', src: '/assets/vacaria/terreno.webp', text: 'Demarcação original fornecida para o estudo. O contorno amarelo indica a área de interesse; não substitui divisas medidas.' },
];
