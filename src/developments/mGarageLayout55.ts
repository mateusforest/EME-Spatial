/** Shared geometry and walkable layout; dimensions remain a conceptual study. */
export const GARAGE55={floor:-3.2,ceiling:-.24,minX:-35.8,maxX:27.8,minZ:-51.8,maxZ:-8.2};
export const garageColumns55=[-25,-15,-5,5,15,25].flatMap(x=>[-15.7,-28.3,-40.3,-50.5].filter(z=>z!==-15.7||x<0||x>20).map(z=>({x,z}))).concat([{x:1.25,z:-15.7},{x:17.25,z:-15.7}]);
export const garageBays55=[-12.5,-25.5,-37.5,-47.5].flatMap((z,row)=>Array.from({length:17},(_,i)=>({x:-24+i*3,z,row,id:row*17+i+1}))).filter(b=>!(b.row===0&&b.x>=3&&b.x<=15));
export const garageCars55=garageBays55.filter(b=>b.id%3===0||[2,4,8,13,15,19,25,30,41,55,64].includes(b.id));
export const garageObstacles55=[
 ...garageCars55.map(b=>({minX:b.x-1.06,maxX:b.x+1.06,minZ:b.z-2.5,maxZ:b.z+2.5})),
 ...garageColumns55.map(p=>({minX:p.x-.43,maxX:p.x+.43,minZ:p.z-.43,maxZ:p.z+.43})),
 {minX:1.8,maxX:16.8,minZ:-15.3,maxZ:-8},
 ...garageBays55.map(b=>({minX:b.x-.85,maxX:b.x+.85,minZ:b.z+(b.row%2===0?1:-1)*2.12-.13,maxZ:b.z+(b.row%2===0?1:-1)*2.12+.13})),
];
