/** Concept dimensions in metres. Shared by the web model and its Blender transfer.
 * These are coordination dimensions, not an engineered/executive building project. */
export const M_STRUCTURE = {
 revision:17,
 tower:{base:8,step:3.5,levels:22},
 gallery:{ground:.66,upper:4.375,roof:8,slabs:[[.43,.46],[4.05,.65],[7.61,.78]] as const},
 lobby:{clearWidth:8.7,front:12.45,canopyTop:8},
 stair:{minX:8.1,maxX:11.7,minZ:3.8,maxZ:8.5,flightWidth:1.5,gap:.3,tread:.28,risers:22,landing:1.5},
} as const;
