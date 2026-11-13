export const asset=(file:string)=>`/assets/amici/${file}`;
export const sourceUrl='https://zm.eng.br/amici/';
export const facts={name:'Amici',developer:'ZM Empreendimentos',city:'Passo Fundo, RS',address:'Rua Lava Pés, 414 · Centro',units:52,delivery:'2029'};
export const apartments=[
 {id:'01',area:88.12},{id:'02',area:107.10},{id:'03',area:58.56},
 {id:'04',area:58.56},{id:'05',area:66.68},{id:'06',area:66.68},
];
export const number=(value:number)=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
export const gallery=[
 {id:'facade',name:'Fachada',file:'fachada.webp',category:'Arquitetura'},
 {id:'lobby',name:'Lobby',file:'lobby.webp',category:'Convivência'},
 {id:'pool',name:'Piscina',file:'piscina.webp',category:'Lazer'},
 {id:'gourmet',name:'Salão gourmet',file:'salao-gourmet.webp',category:'Convivência'},
 {id:'fitness',name:'Espaço fitness',file:'espaco-fitness.webp',category:'Lazer'},
 {id:'kids',name:'Espaço kids',file:'espaco-kids.webp',category:'Lazer'},
 {id:'coworking',name:'Coworking',file:'coworking.webp',category:'Convivência'},
 {id:'play',name:'Play room',file:'play-room.webp',category:'Lazer'},
 {id:'pet',name:'Espaço pet',file:'espaco-pet.webp',category:'Lazer'},
 {id:'bikes',name:'Bicicletário',file:'bicicletario.webp',category:'Conveniência'},
];
export const plans=[
 {id:'typical',name:'Pavimento tipo',file:'planta-tipo.webp',description:'Seis finais e suas áreas publicadas pela ZM.'},
 {id:'ground',name:'Implantação · acesso',file:'implantacao-acesso.webp',description:'Lobby, coworking e espaços de apoio.'},
 {id:'leisure',name:'Implantação · lazer',file:'implantacao-lazer.webp',description:'Ambientes de lazer conforme a planta divulgada.'},
];
export type View='facade'|'aerial'|'entrance';
