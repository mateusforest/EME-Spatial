import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PerspectiveCamera,Vector3} from 'three';
import {projectLotAnchor,walkFieldOfView} from '../src/priorita/walk-view.ts';
test('lot anchor follows projected world point and canvas offset, without clamping',()=>{
 const camera=new PerspectiveCamera(60,2,.1,100); camera.updateMatrixWorld();
 const center=projectLotAnchor(new Vector3(0,0,-10),camera,800,400,10,48);
 assert.deepEqual(center,{x:410,y:248,visible:true});
 const right=projectLotAnchor(new Vector3(10,0,-10),camera,800,400,10,48);
 assert.ok(right.x>700); assert.equal(right.visible,true);
 assert.equal(projectLotAnchor(new Vector3(20,0,-10),camera,800,400).visible,false);
 assert.equal(projectLotAnchor(new Vector3(0,0,10),camera,800,400).visible,false);
});
test('portrait walking has a wider field of view and zoom stays bounded',()=>{
 assert.equal(walkFieldOfView(.5),78); assert.equal(walkFieldOfView(1.6),62);
 assert.equal(walkFieldOfView(.5,7),85);
 assert.equal(walkFieldOfView(.5,100),96); assert.equal(walkFieldOfView(1.6,-100),45);
});
