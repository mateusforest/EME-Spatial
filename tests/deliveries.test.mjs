import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {readRegistry,validateRegistry,publicProjects,deliveryHead} from '../tools/delivery-config.ts';

test('only deliberately public projects enter the public catalog',()=>{
  const registry=readRegistry();
  assert.deepEqual(publicProjects(registry).map(p=>p.name),['Casa M','Torre M','Botanique Home Resort','Pátio M','Residencial Vacaria','G400','Moradas da Serra']);
  const copy=structuredClone(registry);copy.projects.forEach(p=>p.status='unlisted');
  assert.deepEqual(publicProjects(copy),[]);
  copy.projects[1].status='public';copy.projects[2].status='draft';
  assert.deepEqual(publicProjects(copy).map(p=>p.name),['Torre M']);
});
test('unlisted links have crawler-readable personalized metadata, not a public index directive',()=>{
  const registry=readRegistry(),p={...registry.projects.find(p=>p.slug==='botanique'),status:'unlisted'},head=deliveryHead(registry,p);
  assert.match(head,/noindex, nofollow/);assert.match(head,/og:image/);assert.match(head,/Botanique Home Resort/);
  assert.match(head,/https:\/\/www.emespatial.com\/visitar\/botanique/);
  assert.ok(!head.includes('moradas-da-serra'));
  for(const project of registry.projects)for(const key of ['cover','shareImage','pdf','manifest'])if(project[key])assert.ok(existsSync('public'+project[key].split('?')[0]),`${project.slug}: ${key}`);
  for(const project of registry.projects)for(const image of project.gallery||[])assert.ok(existsSync('public'+image.image),`${project.slug}: gallery`);
});
test('withdrawn and unknown presentations do not embed scene or PDF URLs',()=>{
  const registry=readRegistry();const head=deliveryHead(registry,{...registry.projects[0],status:'draft'});
  assert.match(head,/indisponível/);assert.match(head,/application\/json">null/);
  assert.ok(!head.includes('/assets/botanique'));assert.ok(!deliveryHead(registry).includes('/apresentar/'));
});
test('project content cannot break out of JSON or HTML metadata',()=>{
  const registry=readRegistry(),project={...registry.projects[0],title:'Teste </script><script>alert(1)</script> "'};
  const head=deliveryHead(registry,project);
  assert.equal((head.match(/<script/g)||[]).length,1);
  assert.match(head,/\\u003c\/script>/);assert.match(head,/&quot;/);
});
test('unsafe routes, duplicated slugs and invalid statuses fail publication',()=>{
  for(const change of [{slug:'../../x'},{experience:'https://example.com'},{cover:'//example.com/a'},{cover:'/assets/../secret'},{status:'private'},{gallery:[{image:'https://example.com/x',caption:'x'}]},{entries:[{label:'x',description:'x',experience:'javascript:alert(1)'}]}]){
    const registry=structuredClone(readRegistry());Object.assign(registry.projects[0],change);assert.throws(()=>validateRegistry(registry));
  }
  const registry=readRegistry();registry.projects.push({...registry.projects[0]});assert.throws(()=>validateRegistry(registry));
});

test('building and residential variants have distinct explicit entry points',()=>{
 const registry=readRegistry();
 const tower=registry.projects.find(p=>p.slug==='torre-m');
 assert.equal(tower.experience,'/apresentar/m');
 assert.deepEqual(tower.entries.map(e=>e.experience),['/apresentar/m','/apresentar/m?apartamento=14']);
 const vacaria=registry.projects.find(p=>p.slug==='residencial-vacaria');
 assert.equal(vacaria.entries.length,2);
 assert.ok(vacaria.entries.every(e=>e.experience.includes('imersivo=1')));
 for(const project of registry.projects.filter(p=>p.status==='public'))assert.match(deliveryHead(registry,project),/index, follow/);
});
test('production HTML includes share metadata before any JavaScript executes',()=>{
  const html=readFileSync('dist/visitar/botanique/index.html','utf8');
  assert.match(html,/<meta property="og:title" content="Botanique/);
  assert.match(html,/<script id="delivery-data" type="application\/json">/);
  assert.ok(!html.includes('<!-- delivery:head -->'));
  assert.ok(!html.includes('three.module'));
});
