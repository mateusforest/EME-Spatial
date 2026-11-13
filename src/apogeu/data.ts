export const sourceUrl='https://aporteconstrutora.com.br/ed-apogeu/';
export const asset=(file:string)=>`/assets/apogeu/${file}`;
export const gallery=[
 {id:'fachada',name:'Fachada principal',file:'fachada.jpg',category:'Arquitetura'},
 {id:'lateral',name:'Varandas e jardins',file:'fachada-lateral.jpg',category:'Arquitetura'},
 {id:'acesso',name:'Acesso ao edifício',file:'acesso.jpg',category:'Arquitetura'},
 {id:'hall',name:'Hall de entrada',file:'hall.jpg',category:'Lazer'},
 {id:'bosque',name:'Espaço bosque',file:'bosque.jpg',category:'Lazer'},
 {id:'garden',name:'Espaço garden',file:'garden.jpg',category:'Lazer'},
 {id:'academia',name:'Academia',file:'academia.jpg',category:'Lazer'},
 {id:'festas',name:'Salão de festas',file:'festas.jpg',category:'Lazer'},
 {id:'living',name:'Living integrado',file:'living.jpg',category:'Interiores'},
 {id:'cozinha',name:'Cozinha e jantar',file:'cozinha.jpg',category:'Interiores'},
];
export const plans=[
 {id:'tipo',name:'Apartamento tipo',subtitle:'3 suítes · planta humanizada',file:'planta-003.jpg'},
 {id:'duplex-inferior',name:'Duplex · pavimento inferior',subtitle:'Planta com acesso ao pavimento superior',file:'planta-004.jpg'},
 {id:'duplex-superior',name:'Duplex · pavimento superior',subtitle:'Lazer privativo e terraço',file:'planta-005.jpg'},
 {id:'lazer',name:'Áreas de lazer',subtitle:'Jardins, academia e salão de festas',file:'planta-002.jpg'},
 {id:'terreo',name:'Térreo e acessos',subtitle:'Implantação e garagens',file:'planta-001.jpg'},
];
// Visual levels reconstructed from the published facade, not a commercial inventory.
export const studyLevels=Array.from({length:6},(_,i)=>({id:i+1,label:`Nível ${i+1}`,height:3.65+i*3.2}));
export function parseLevel(value:string|null){const n=Number(value);return studyLevels.some(l=>l.id===n)?n:null;}
export const facts=[['1','apartamento por andar'],['3 a 4','suítes'],['3','vagas por apartamento'],['2','elevadores']];
