import test from 'node:test';
import assert from 'node:assert/strict';
import {dampMotion,walkInput,routeSpeed} from '../src/casa/CasaMMotion.ts';

test('keyboard and touch accelerate equally at 30 and 60 frames per second',()=>{
 const run=fps=>{let speed=0;for(let i=0;i<fps;i++)speed=dampMotion(speed,1,1/fps,7);return speed;};
 assert.ok(Math.abs(run(30)-run(60))<1e-10);
 assert.ok(run(60)>.99&&run(60)<1);
 assert.ok(dampMotion(0,1,1/60,7)<.15,'the first step must not jump to full speed');
});

test('releasing the controls stops promptly without reversing or drifting',()=>{
 let speed=1;
 for(let i=0;i<18;i++){const before=speed;speed=dampMotion(speed,0,1/60,14);assert.ok(speed>=0&&speed<before);}
 assert.ok(speed<.02,'stops within 300 ms');
 assert.equal(dampMotion(.5,0,-1),.5,'invalid elapsed time cannot reverse motion');
 assert.equal(dampMotion(.5,1,4),dampMotion(.5,1,.05),'resuming a hidden tab cannot cause a giant step');
});

test('diagonal walking is not faster and small joystick noise does not move the camera',()=>{
 assert.deepEqual(walkInput(.01,-.01),{x:0,y:0});
 const diagonal=walkInput(1,-1);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-12);
 assert.deepEqual(walkInput(.3,.4),{x:.3,y:.4},'analogue input retains a slow speed');
});

test('floor-click paths brake before arrival and never exceed the walking speed',()=>{
 assert.equal(routeSpeed(0),0);assert.equal(routeSpeed(-1),0);
 assert.ok(routeSpeed(.05)<routeSpeed(.5));assert.equal(routeSpeed(100),1.55);
});
