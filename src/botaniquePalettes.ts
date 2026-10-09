export const botaniquePalettes={
 salvia:{label:'Sálvia natural',accent:'#a9b9a0',fabric:'#fff5df',wood:'#fff6e6',metal:'#4a4941'},
 areia:{label:'Areia e linho',accent:'#d2c3ad',fabric:'#eee0ca',wood:'#eee0c9',metal:'#766549'},
 argila:{label:'Argila e carvalho',accent:'#bf8872',fabric:'#f5e9d6',wood:'#eddbbf',metal:'#574333'},
 oliva:{label:'Oliva e nogueira',accent:'#777b57',fabric:'#e7ddc4',wood:'#b0a18c',metal:'#433b32'},
 nevoa:{label:'Névoa contemporânea',accent:'#9babb2',fabric:'#e0e5e4',wood:'#e3d9cd',metal:'#39474b'},
 monocromo:{label:'Grafite e creme',accent:'#565c58',fabric:'#fff1dc',wood:'#d2c0a7',metal:'#2e332e'},
} as const;
export type BotaniquePalette=keyof typeof botaniquePalettes;
export const isBotaniquePalette=(value:unknown):value is BotaniquePalette=>typeof value==='string'&&Object.hasOwn(botaniquePalettes,value);
