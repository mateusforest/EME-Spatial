import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveId,validLiveId,readLiveVisitId,livePeerId,liveToken,liveVisitUrl,liveMetadata,validLiveMetadata,validIceServers,LIVE_MAX_VIEWERS} from '../src/botaniqueLiveProtocol.ts';

test('visit links have independent 128-bit address and authorization token',()=>{
 const ids=Array.from({length:500},()=>createLiveId());assert.equal(new Set(ids).size,500);
 for(const id of ids){assert.ok(validLiveId(id));assert.equal(livePeerId(id).length,'eme-botanique-'.length+32);assert.equal(liveToken(id).length,32);assert.ok(!livePeerId(id).includes(liveToken(id)));}
});
test('query links reject incomplete, encoded scripts and oversized ids',()=>{
 const id=createLiveId();assert.equal(readLiveVisitId('?visita='+id),id);
 for(const id of ['','a'.repeat(32),'g'.repeat(64),'a'.repeat(65),'<script>',null,42])assert.equal(validLiveId(id),false);
 assert.equal(readLiveVisitId('?visita=%3Cscript%3E'),null);assert.throws(()=>livePeerId('bad'));assert.throws(()=>liveToken('bad'));
});
test('shared URL preserves deployment path but removes unrelated queries and fragments',()=>{
 const id=createLiveId(),url=new URL(liveVisitUrl(id,'https://www.emespatial.com/apresentar/botanique?cena=apartamento&private=old#section'));
 assert.equal(url.pathname,'/apresentar/botanique');assert.equal(url.searchParams.size,1);assert.equal(url.searchParams.get('visita'),id);assert.equal(url.hash,'');
});
test('knowing host signaling address is insufficient to authenticate a viewer',()=>{
 const id=createLiveId(),metadata=liveMetadata(id);assert.ok(validLiveMetadata(metadata,id));
 assert.equal(validLiveMetadata({...metadata,token:createLiveId().slice(32)},id),false);
 assert.equal(validLiveMetadata({...metadata,role:'controller'},id),false);
 assert.equal(validLiveMetadata({...metadata,protocol:'other'},id),false);
 assert.equal(validLiveMetadata(null,id),false);assert.equal(LIVE_MAX_VIEWERS,3);
});
test('TURN configuration accepts ephemeral credentials and rejects malformed transport URLs',()=>{
 assert.ok(validIceServers([{urls:'stun:stun.example.org:3478'},{urls:['turn:relay.example.org:3478?transport=udp','turns:relay.example.org:443'],username:'temporary-user',credential:'temporary-password'}]));
 for(const servers of [null,{},[{urls:'https://invalid'}],[{urls:[]}],[{urls:'turn:relay.example',credential:{secret:'invalid'}}],Array.from({length:13},()=>({urls:'stun:example.org'}))])assert.equal(validIceServers(servers),false);
});
