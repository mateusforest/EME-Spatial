import type {LotStatus} from './model';
import {serraExtraSold} from './serra-plan';
/** True only on /apresentar/priorita-serra; Node tests have no location and keep the original study. */
const serraRoute=typeof location!=='undefined'&&location.pathname.replace(/\/$/,'').split('/').pop()==='priorita-serra';
const reserved=new Set(['A-03','C-06','E-04','G-05']);
const unavailable=new Set(['B-02','D-09','F-12','H-03']);
/** Serra route: lots shown with illustrative houses read as sold. */
export const serraSold=new Set(['A-04','B-08','C-02','C-07','C-12','D-01','D-06','D-11','E-01','E-06','E-11','F-02','F-07','F-12','G-01','G-06','H-01','H-06','B-02','D-09','H-03']);
/** Demonstration only; never a sales inventory. */
export const demoStatus=(id:string):LotStatus=>reserved.has(id)?'reserved':unavailable.has(id)||serraRoute&&(serraSold.has(id)||serraExtraSold.has(id))?'unavailable':'available';
