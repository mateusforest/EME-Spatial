import publicProjects from 'virtual:delivery-public';
const listedExperience=(path:string)=>publicProjects.find(p=>p.experience.split('?')[0]===path)?.href||'';
export const solutions = [
 {id:'edificios',name:'Edifícios',image:'torre',tag:'ARQUITETURA EM NOVA ESCALA',headline:'Grandes projetos. Novas perspectivas.',description:'Apresente a torre, as unidades e as áreas comuns em uma experiência que aproxima as pessoas do empreendimento.',scope:['Fachadas e volumetria','Apartamentos e tipologias','Áreas comuns','Apresentação para lançamento'],experience:'/visitar/torre-m',demo:'Explorar a Torre M'},
 {id:'mixed-use',name:'Mixed Use',image:'marketing/mixed-use',tag:'MORAR, TRABALHAR E CONVIVER',headline:'Diferentes usos. Um novo lugar.',description:'Comércio, serviços e residências conectados em um mesmo conceito. Desenvolva e apresente a relação entre os espaços.',scope:['Implantação e acessos','Comércio e serviços','Residências e convivência','Apresentação do conceito'],experience:'',demo:'Modelo autoral em desenvolvimento'},
 {id:'casas',name:'Casas',image:'marketing/hero-casa',tag:'DO SEU JEITO, DESDE O COMEÇO',headline:'Sua casa começa com uma visão.',description:'Do zero, da planta ou de um espaço existente. Explore a fachada, os interiores e as possibilidades de viver no seu próximo lugar.',scope:['Conceito e distribuição','Fachada e área externa','Interiores e mobiliário','Imagens e experiência 3D'],experience:listedExperience('/apresentar/casa-m'),demo:'Explorar a Casa M'},
 {id:'condominios',name:'Condomínios e loteamentos',image:'marketing/condominio',tag:'O PROJETO ALÉM DA UNIDADE',headline:'Um lugar inteiro para descobrir.',description:'Visualize a implantação, a circulação e os espaços coletivos antes da construção. Apresente como cada parte se conecta ao conjunto.',scope:['Implantação e lotes','Casas e unidades','Paisagismo e lazer','Percursos aéreos virtuais'],experience:listedExperience('/apresentar/patio-m'),demo:'Explorar o Pátio M'},
 {id:'interiores',name:'Interiores',image:'marketing/torre-sala',tag:'ESCOLHAS QUE TRANSFORMAM ESPAÇOS',headline:'Experimente antes de escolher.',description:'Compare composições, materiais e mobiliário para entender como cada escolha pode transformar o seu ambiente.',scope:['Layout e mobiliário','Cores e acabamentos','Imagens de interiores','Configuração e comparação'],experience:'/visitar/torre-m',demo:'Personalizar apartamento da Torre M'},
];
export const offerings = [
  {
    id: 'visual', image: 'marketing/casa-basico', name: 'Essential',
    subtitle: 'O primeiro passo para explorar.',
    description: 'Para ambientes e residências com uma apresentação objetiva, a partir de um modelo 3D existente.',
    features: ['Preparação do modelo fornecido', 'Materiais e iluminação essenciais', 'Navegação pelos ambientes definidos', 'Experiência para apresentar e compartilhar'],
  },
  {
    id: 'interactive', image: 'marketing/casa-interativo', name: 'Signature',
    subtitle: 'Cada detalhe faz parte da experiência.',
    description: 'Para residências de médio e alto padrão que pedem mais profundidade visual e cuidado na apresentação.',
    features: ['Interiores e exteriores integrados', 'Materiais e texturas refinados', 'Iluminação e perspectivas personalizadas', 'Pontos de interesse e identidade visual'],
  },
  {
    id: 'signature', image: 'marketing/casa-pro', name: 'Exclusive',
    subtitle: 'Uma experiência na escala da sua visão.',
    description: 'Para casas exclusivas, condomínios e empreendimentos com uma experiência desenvolvida sob medida.',
    features: ['Modelagem e otimização sob medida', 'Paisagismo e contexto do projeto', 'Interações personalizadas', 'Apresentação comercial do empreendimento'],
  },
].map(plan=>({...plan,caption:plan.subtitle,note:'Escopo, recursos e revisões definidos na proposta personalizada.'}));

export const deliveries=['Planta de apresentação','Imagens externas','Imagens internas','Modelo 3D','Experiência imersiva','Configuração de interiores','Vídeo drone virtual','Vídeo de ambientes'];
export const starts=[{name:'Tenho uma ideia',desc:'Quero desenvolver um conceito do zero.',icon:'idea'},{name:'Tenho uma planta',desc:'Quero visualizar e explorar meu projeto.',icon:'plan'},{name:'Tenho fotos e medidas',desc:'Quero transformar um espaço existente.',icon:'photo'},{name:'Tenho um modelo 3D',desc:'Quero refinar e apresentar meu projeto.',icon:'box'}];
export const audiences=['Pessoas físicas','Arquitetos e designers','Construtoras e incorporadoras','Urbanizadoras','Condomínios','Empresas, lojas e marcas'];
