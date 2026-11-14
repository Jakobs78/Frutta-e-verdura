import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,canStand,findPath,xpNeeded,maxHealth,SAVE_KEY,RESOURCE_UNLOCK,PRISON} from '../engine.js';
const storage=()=>{const data=new Map();return{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),data};};
const make=()=>createGame({storage:storage()});
function advance(game,seconds){for(let t=0;t<seconds;t+=1/60)game.update(1/60);}
function playerLevel(game,level){while(game.state.player.level<level)game.gainXP(xpNeeded(game.state.player.level)-game.state.player.xp);}
function rich(game){for(const k of Object.keys(game.state.bag))game.state.bag[k]=500;}

test('Fragolina starts at level 0 and unlocks content without auto building',()=>{
 const g=make();assert.equal(g.state.player.level,0);assert.equal(g.state.player.health,100);assert.equal(xpNeeded(0),30);rich(g);
 assert.equal(g.upgrade('taglialegna'),false);assert(g.state.stations.every(s=>s.level===0));
 g.gainXP(29);assert.equal(g.state.player.level,0);g.gainXP(1);assert.equal(g.state.player.level,1);assert.equal(maxHealth(1),110);
 assert.equal(g.state.stations[2].level,0);assert(g.upgrade('taglialegna'));assert(!g.upgrade('spaccapietre'));
 playerLevel(g,3);assert(g.upgrade('spaccapietre'));assert(!g.upgrade('fucina'));playerLevel(g,5);assert(g.upgrade('fucina'));
});
test('zones cannot be bypassed by jumping or click navigation',()=>{
 const g=make();assert(canStand(1500,600,false,18,0));assert(!canStand(1800,600,true,18,0));assert(canStand(1800,600,false,18,1));assert(!canStand(3000,600,true,18,1));assert(canStand(3000,600,false,18,3));assert(!canStand(4100,600,true,18,3));
 g.state.player.x=1640;g.state.player.y=600;g.jump();advance(g,.1);for(let i=0;i<120;i++)g.update(1/60,{x:1,y:0});assert(g.state.player.x<1650);
 assert.equal(findPath({x:490,y:610},1830,840,0).length,0);
 assert(findPath({x:490,y:610},1830,840,1).length>0);
 assert(findPath({x:490,y:610},4640,735,5).length>0,'castle entrance and prison approach reachable');
});
test('each raw material requires its own level and gathering cooldown works',()=>{
 const g=make();for(const n of g.state.nodes){g.state.player.x=n.x+55;g.state.player.y=n.y;const before=g.state.bag[n.type];assert.equal(g.gather(n),false);assert.equal(g.state.bag[n.type],before);}
 for(const [type,level] of Object.entries(RESOURCE_UNLOCK)){playerLevel(g,level);const n=g.state.nodes.find(n=>n.type===type);g.state.player.x=n.x+55;g.state.player.y=n.y;g.state.player.gatherCooldown=0;assert(g.gather(n));assert.equal(g.state.bag[type],2);assert(!g.gather(n));}
});
test('processing spends raw materials, finishes once and pauses correctly',()=>{
 const g=make();playerLevel(g,1);rich(g);assert(g.upgrade('taglialegna'));const s=g.state.stations[2],before=g.state.bag.wood,result=g.state.bag.planks;
 assert(g.process(s.id));assert.equal(g.state.bag.wood,before-3);assert(!g.process(s.id));g.state.paused=true;advance(g,20);assert.equal(s.job.remaining,12);g.state.paused=false;advance(g,12.1);assert.equal(s.job,null);assert.equal(g.state.bag.planks,result+1);
 assert(!g.upgrade(s.id),'upgrade requires Fragolina level 2');playerLevel(g,2);assert(g.upgrade(s.id));assert.equal(s.level,2);assert(g.jobDuration(s)<12);
});
test('production upgrades have a level cap and increase output',()=>{
 const g=make();playerLevel(g,5);rich(g);for(let i=0;i<5;i++)assert(g.upgrade('taglialegna'));const s=g.state.stations[2];assert.equal(s.level,5);assert.equal(g.jobDuration(s),4);assert.equal(g.jobYield(s),3);assert(!g.upgrade(s.id));
});
test('punch respects direction, cooldown, obstacles and defeats enemies',()=>{
 const g=make(),p=g.state.player,e=g.state.enemies[0];p.x=1100;p.y=600;e.x=1160;e.y=600;g.punch();advance(g,.1);assert.equal(e.health,2);assert(e.stun>0);assert(e.x>1160);g.punch();advance(g,.1);assert.equal(e.health,2);
 advance(g,.5);e.x=1040;e.y=600;g.punch();advance(g,.1);assert.equal(e.health,2,'behind misses');
 for(let i=0;i<2;i++){advance(g,.5);e.x=1160;e.y=600;g.punch();advance(g,.1);}assert.equal(e.health,0);assert(e.defeats>0);assert(g.state.player.xp>=26);advance(g,26);assert(e.health>0);
});
test('rescue requires both guards, crafted saw, proximity, and five active seconds',()=>{
 const g=make();playerLevel(g,5);rich(g);assert(g.upgrade('fucina'));const p=g.state.player;p.x=PRISON.x;p.y=735;
 assert(!g.rescue());const guards=g.state.enemies.filter(e=>e.guard);guards.forEach(e=>{e.defeats=1;e.health=0;});assert(!g.rescue());g.home();
 const before=g.state.bag.ingots;assert(g.craftSaw());assert.equal(g.state.bag.ingots,before-3);advance(g,15.1);assert(g.state.tools.hacksaw);
 assert(!g.rescue(),'cannot rescue remotely');p.x=PRISON.x;p.y=735;assert(g.rescue());advance(g,2);assert(!g.state.rescued);p.x-=200;advance(g,.1);assert(!g.state.rescuing,'moving away cancels');
 p.x=PRISON.x;p.y=735;assert(g.rescue());g.state.paused=true;advance(g,6);assert(!g.state.rescued);g.state.paused=false;advance(g,5.1);assert(g.state.rescued);assert(canStand(PRISON.x,670,false,18,5,true));
 advance(g,40);assert(guards.every(e=>e.health===0),'castle guards stay defeated');
});
test('Carota has assignable persistent gathering and production jobs',()=>{
 const mem=storage(),g=createGame({storage:mem});assert(!g.assignCarrot('wood'));playerLevel(g,5);rich(g);g.state.rescued=true;
 assert(g.assignCarrot('wood'));let before=g.state.bag.wood;advance(g,25.1);assert.equal(g.state.bag.wood,before+2);
 assert(!g.assignCarrot('fucina'),'unbuilt station cannot be assigned');assert(g.upgrade('taglialegna'));assert(g.assignCarrot('taglialegna'));before=g.state.bag.planks;advance(g,15);assert(g.state.bag.planks>before);
 assert(g.assignCarrot('follow'));g.save();const restored=createGame({storage:mem});assert(restored.state.rescued);assert.equal(restored.state.carrotJob,'follow');
});
test('new saves preserve tools, guard defeats and pending work; old progress migrates',()=>{
 const mem=storage(),g=createGame({storage:mem});playerLevel(g,5);rich(g);g.upgrade('fucina');g.craftSaw();advance(g,4);g.state.enemies.find(e=>e.guard).defeats=1;g.save();const loaded=createGame({storage:mem});assert.equal(loaded.state.player.level,5);assert(loaded.state.stations[4].job.remaining<12);assert.equal(loaded.state.enemies.find(e=>e.guard).health,0);advance(loaded,12);assert(loaded.state.tools.hacksaw);
 const old=storage();old.setItem('frutta-e-verdura-v1',JSON.stringify({version:1,seeds:11,drops:4,built:[true,true]}));const migrated=createGame({storage:old});assert.equal(migrated.state.bag.seeds,11);assert.equal(migrated.state.stations[0].level,1);assert.equal(migrated.state.player.level,0);
});
test('reset clears quest, companion, levels and tools; exhausted return keeps growth',()=>{
 const g=make();playerLevel(g,5);rich(g);g.upgrade('fucina');g.state.tools.hacksaw=true;g.state.rescued=true;g.assignCarrot('ore');g.home(true);assert.equal(g.state.player.level,5);assert(g.state.tools.hacksaw);assert(g.state.rescued);g.reset();assert.equal(g.state.player.level,0);assert(!g.state.tools.hacksaw);assert(!g.state.rescued);assert(g.state.stations.every(s=>s.level===0));assert.equal(g.state.carrotJob,'follow');
});
test('all material nodes and workstation approaches have navigable routes',()=>{
 const g=make();for(const n of g.state.nodes)assert(findPath(g.state.player,n.x,n.y+60,RESOURCE_UNLOCK[n.type]).length>0,`reachable ${n.type} at ${n.x},${n.y}`);
 for(const s of g.state.stations)assert(findPath(g.state.player,s.x,s.y+110,s.required).length>0,`reachable ${s.id}`);
});
test('Carota waits for missing production inputs and resumes without free output',()=>{
 const g=make();playerLevel(g,5);rich(g);g.upgrade('fucina');g.state.rescued=true;g.state.bag.ore=0;g.assignCarrot('fucina');const before=g.state.bag.ingots;advance(g,20);assert.equal(g.state.bag.ingots,before);assert.equal(g.state.stations[4].job,null);assert(g.state.carrotStatus.includes('Aspetta'));g.state.bag.ore=3;advance(g,15);assert.equal(g.state.bag.ingots,before+1);assert.equal(g.state.bag.ore,0);
});
