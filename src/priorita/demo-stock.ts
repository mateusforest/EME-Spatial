import type {LotStatus} from './model';
const reserved=new Set(['A-03','C-06','E-04','G-05']);
const unavailable=new Set(['B-02','D-09','F-12','H-03']);
/** Demonstration only; never a sales inventory. */
export const demoStatus=(id:string):LotStatus=>reserved.has(id)?'reserved':unavailable.has(id)?'unavailable':'available';
