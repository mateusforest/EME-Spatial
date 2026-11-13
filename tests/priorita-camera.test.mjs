import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import * as T from 'three';
import {frameBounds} from '../src/priorita/camera-layout.ts';
const {lots}=JSON.parse(readFileSync(new URL('../src/priorita/plan-source.json',import.meta.url),'utf8'));

for(const viewport of [{width:1366,height:715,safe:{left:254,top:110,right:1018,bottom:580}},{width:390,height:795,safe:{left:18,top:140,right:372,bottom:350}}]){
  test(`camera fits every block and irregular lot beside panels at ${viewport.width}px`,()=>{
    const cases=[...Array.from('ABCDEFGH',b=>lots.filter(l=>l.block===b).flatMap(l=>l.polygon)),...lots.map(l=>l.polygon)];
    for(const points of cases){
      const bounds=new T.Box3().setFromPoints(points.map(([x,z])=>new T.Vector3(x,0,z)));
      const {position,target}=frameBounds(bounds,viewport.width/viewport.height,47,viewport,viewport.safe);
      const camera=new T.PerspectiveCamera(47,viewport.width/viewport.height,.1,6200);camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();
      for(const [x,z] of points){
        const p=new T.Vector3(x,0,z).project(camera),sx=(p.x+1)*viewport.width/2,sy=(1-p.y)*viewport.height/2;
        assert.ok(sx>=viewport.safe.left-2&&sx<=viewport.safe.right+2,`x=${sx}`);
        assert.ok(sy>=viewport.safe.top-2&&sy<=viewport.safe.bottom+2,`y=${sy}`);
      }
    }
  });
}
test('on-lot dimensions refer to actual polygon edges and retain approximate flags',()=>{
  for(const lot of lots){
    const edges=[lot.front,lot.back,...lot.sides];
    assert.equal(edges.length,lot.polygon.length);
    for(const edge of edges){
      assert.ok(Number.isFinite(edge.value)&&edge.value>0);
      assert.ok(['printed','scaled'].includes(edge.source));
      assert.ok(lot.polygon.some((p,i)=>{
        const q=lot.polygon[(i+1)%lot.polygon.length];
        return (JSON.stringify(p)===JSON.stringify(edge.a)&&JSON.stringify(q)===JSON.stringify(edge.b))||(JSON.stringify(q)===JSON.stringify(edge.a)&&JSON.stringify(p)===JSON.stringify(edge.b));
      }));
    }
  }
});
