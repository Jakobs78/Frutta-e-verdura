export const WORLD = { w: 5200, h: 2400 };
export const ZONES=[{id:'cucina',name:'La cucina',min:0,max:1650,level:0,color:'#e4d9bf'},{id:'bosco',name:'Bosco delle briciole',min:1650,max:2800,level:1,color:'#b7c49a'},{id:'cava',name:'Cava di zucchero',min:2800,max:3900,level:3,color:'#bac2b7'},{id:'ferro',name:'Valle del ferro',min:3900,max:5200,level:5,color:'#b7aaa1'}];
export const PRISON={x:4640,y:590};
export const SAVE_KEY = 'frutta-e-verdura-v2';
export const RESOURCE_NAMES = { seeds:'semi', drops:'gocce', wood:'legno', stone:'pietra', ore:'minerale', planks:'assi', blocks:'blocchi', ingots:'lingotti' };
export const amountText=(key,n)=>`${n} ${n===1?({seeds:'seme',drops:'goccia',planks:'asse',blocks:'blocco',ingots:'lingotto'}[key]||RESOURCE_NAMES[key]):RESOURCE_NAMES[key]}`;
export const STATION_DEFS = [
  { id:'vivaio', name:'Vivaio', x:310, y:790, icon:'🌱', description:'Coltiva semi per far crescere il rifugio.', required:1, cost:{seeds:5} },
  { id:'fontana', name:'Fontana', x:620, y:790, icon:'💧', description:'Rigenera più rapidamente la freschezza.', required:1, cost:{drops:8} },
  { id:'taglialegna', name:'Falegnameria', x:280, y:460, icon:'🪵', description:'Trasforma il legno raccolto in assi.', required:1, cost:{wood:6,seeds:3}, input:'wood', output:'planks' },
  { id:'spaccapietre', name:'Spaccapietre', x:475, y:460, icon:'🪨', description:'Lavora la pietra per ottenere blocchi.', required:3, cost:{stone:6,wood:3}, input:'stone', output:'blocks' },
  { id:'fucina', name:'Fucina', x:670, y:460, icon:'🔥', description:'Fonde i minerali per produrre lingotti.', required:5, cost:{stone:6,ore:4,planks:2}, input:'ore', output:'ingots' }
];
const walls = [
  [140,170,660,38,true],[140,170,34,790,true],[140,930,660,35,true],
  [766,170,34,340,true],[766,680,34,280,true],
  [232,290,124,70,true],[591,289,75,85,true],
  ...STATION_DEFS.map(s=>[s.x-57,s.y-32,114,64,true]),
  [1150,320,190,90,true],[1600,730,180,120,true],[1940,260,190,110,true],
  [1085,775,78,24,false],[1430,515,85,27,false],[1880,960,85,25,false],
  [4250,350,770,40,true],[4250,350,40,900,true],[4980,350,40,900,true],
  [4250,1210,260,40,true],[4700,1210,320,40,true],
  [4505,500,35,180,true],[4740,500,35,180,true],[4505,500,270,25,true],
  [4505,660,270,20,true]
];
export const SOLIDS=walls.map(([x,y,w,h,high])=>({x,y,w,h,high,prisonBars:y===660}));
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const xpNeeded=level=>Math.round(30*Math.pow(level+1,1.25));
export const RESOURCE_UNLOCK={wood:1,stone:3,ore:5};
export const maxHealth=level=>100+level*10;
export const punchDamage=level=>1+level*.35;
export function canStand(x,y,jumping=false,radius=18,level=20,openPrison=false){
  const zone=ZONES.find(z=>x+radius>=z.min&&x<z.max);
  return (!zone||level>=zone.level)&&x>=40&&y>=70&&x<=WORLD.w-40&&y<=WORLD.h-50&&!SOLIDS.some(s=>!(openPrison&&s.prisonBars)&&(!jumping||s.high)&&x+radius>s.x&&x-radius<s.x+s.w&&y+radius>s.y&&y-radius<s.y+s.h);
}
export function findPath(start,tx,ty,level=20,openPrison=false){
  const size=25,cols=Math.ceil(WORLD.w/25),rows=Math.ceil(WORLD.h/25),id=(x,y)=>y*cols+x;
  const pass=(x,y)=>x>=0&&y>=0&&x<cols&&y<rows&&canStand(x*size+12.5,y*size+12.5,false,18,level,openPrison);
  const end={x:Math.floor(tx/size),y:Math.floor(ty/size)};
  if(!pass(end.x,end.y)){
    let nearest,best=Infinity;
    for(let y=end.y-4;y<=end.y+4;y++)for(let x=end.x-4;x<=end.x+4;x++){
      const d=Math.hypot(x-end.x,y-end.y);if(pass(x,y)&&d<best){best=d;nearest={x,y};}
    }
    if(!nearest)return [];Object.assign(end,nearest);
  }
  const first={x:Math.floor(start.x/size),y:Math.floor(start.y/size),g:0,f:0,parent:null};
  const open=[first],known=new Map([[id(first.x,first.y),first]]),closed=new Set();let iterations=0;
  while(open.length&&iterations++<22000){
    let index=0;for(let i=1;i<open.length;i++)if(open[i].f<open[index].f)index=i;
    const current=open.splice(index,1)[0],key=id(current.x,current.y);
    if(key===id(end.x,end.y)){
      const result=[];let n=current;while(n.parent){result.unshift({x:n.x*size+12.5,y:n.y*size+12.5});n=n.parent;}return result;
    }
    closed.add(key);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const x=current.x+dx,y=current.y+dy,k=id(x,y);
      if(closed.has(k)||!pass(x,y)||(dx&&dy&&(!pass(current.x+dx,current.y)||!pass(current.x,current.y+dy))))continue;
      const g=current.g+(dx&&dy?Math.SQRT2:1),old=known.get(k);
      if(!old||g<old.g){const node=old||{x,y};Object.assign(node,{g,f:g+Math.hypot(end.x-x,end.y-y),parent:current});if(!old){known.set(k,node);open.push(node);}}
    }
  }
  return [];
}
const integer=(value,max=999999)=>Number.isSafeInteger(value)&&value>=0?Math.min(value,max):0;
export function createGame({storage,notify=()=>{},onStation=()=>{}}={}){
  const player={x:490,y:610,level:0,xp:0,health:100,aimX:1,aimY:0,jump:0,punch:0,punchCooldown:0,punchHit:false,punchX:1,punchY:0,invulnerable:0,walking:false,gatherCooldown:0};
  const bag=Object.fromEntries(Object.keys(RESOURCE_NAMES).map(k=>[k,0]));
  const stations=STATION_DEFS.map(d=>({...d,level:0,job:null,production:0}));
  const enemies=[
    {x:1320,y:550,phase:0,r:27,baseLevel:1}, {x:1470,y:1100,phase:2,r:28,baseLevel:1},
    {x:1900,y:650,phase:4,r:30,baseLevel:2}, {x:2420,y:1500,phase:1,r:32,baseLevel:3},
    {x:3050,y:650,phase:3,r:32,baseLevel:4}, {x:3500,y:1650,phase:2,r:34,baseLevel:5},
    {x:4070,y:1700,phase:1,r:35,baseLevel:6},
    {x:4450,y:1050,phase:0,r:30,baseLevel:5,guard:true}, {x:4810,y:970,phase:2,r:32,baseLevel:6,guard:true}
  ].map(e=>({...e,ox:e.x,oy:e.y,level:e.baseLevel,maxHealth:3+2*(e.baseLevel-1),health:3+2*(e.baseLevel-1),defeats:0,stun:0,respawn:0,vx:0,vy:0}));
  const loot=[
    [930,590,'seeds'],[1035,680,'seeds'],[1120,530,'seeds'],[1230,630,'seeds'],[1270,770,'seeds'],
    [1030,455,'drops'],[1200,865,'drops'],[1410,700,'seeds'],[1520,390,'drops'],[1470,920,'seeds'],
    [1370,1080,'seeds'],[1450,430,'drops'],[1580,990,'seeds'],[1470,690,'seeds'],[1380,1250,'seeds'],
    [1570,860,'drops'],[1480,1050,'drops'],[1330,940,'seeds'],[1240,1150,'seeds'],[1480,250,'drops'],
    [1840,430,'seeds'],[2100,800,'drops'],[2460,1300,'seeds'],[2500,1800,'drops'],[3000,1300,'drops'],[3430,1100,'seeds'],[4100,1350,'drops'],[4650,1600,'drops']
  ].map(([x,y,type],i)=>({x,y,type,active:true,respawn:0,phase:i*1.7}));
  const nodes=[
    [1830,780,'wood'],[2030,1100,'wood'],[2320,500,'wood'],[2500,1700,'wood'],
    [2960,900,'stone'],[3180,1450,'stone'],[3560,550,'stone'],[3720,1900,'stone'],
    [4040,800,'ore'],[4110,1450,'ore'],[4700,1800,'ore'],[4940,2110,'ore']
  ].map(([x,y,type])=>({x,y,type,hits:3,respawn:0}));
  const state={player,bag,stations,enemies,loot,nodes,particles:[],path:[],destination:null,pending:null,clock:0,paused:false,storageAvailable:true,totalSeeds:0,
    tools:{hacksaw:false},rescued:false,rescuing:false,rescueProgress:0,carrotJob:'follow',carrotTimer:0,carrotStatus:'Al tuo fianco'};
  let autoSave=0,wasSafe=true;
  const safe=()=>player.x<785&&player.x>155&&player.y>180&&player.y<955;
  const stationById=id=>stations.find(s=>s.id===id);
  function save(){
    if(!storage||!state.storageAvailable)return;
    try{storage.setItem(SAVE_KEY,JSON.stringify({version:2,level:player.level,xp:player.xp,bag,totalSeeds:state.totalSeeds,
      stations:stations.map(s=>({id:s.id,level:s.level,job:s.job,production:s.production})),enemies:enemies.map(e=>({defeats:e.defeats,level:e.level})),
      tools:state.tools,rescued:state.rescued,carrotJob:state.carrotJob,carrotTimer:state.carrotTimer}));}
    catch{state.storageAvailable=false;}
  }
  function load(){
    if(!storage){state.storageAvailable=false;return;}
    try{
      const raw=storage.getItem(SAVE_KEY);
      const saved=JSON.parse(raw||storage.getItem('frutta-e-verdura-v1')||'null');
      if(!saved)return;
      if(saved.version===1){bag.seeds=integer(saved.seeds);bag.drops=integer(saved.drops);state.totalSeeds=integer(saved.totalSeeds);stations[0].level=saved.built?.[0]===true?1:0;stations[1].level=saved.built?.[1]===true?1:0;return;}
      if(saved.version!==2)return;
      player.level=clamp(integer(saved.level,20),0,20);player.xp=Math.min(integer(saved.xp),xpNeeded(player.level)-1);player.health=maxHealth(player.level);
      Object.keys(bag).forEach(k=>bag[k]=integer(saved.bag?.[k]));state.totalSeeds=integer(saved.totalSeeds);
      stations.forEach(s=>{
        const data=Array.isArray(saved.stations)?saved.stations.find(d=>d?.id===s.id):null;
        s.level=integer(data?.level,5);s.production=clamp(Number(data?.production)||0,0,30);
        if(s.level&&s.input&&data?.job&&Number.isFinite(data.job.remaining)){
          s.job={remaining:clamp(data.job.remaining,.01,30),duration:clamp(Number(data.job.duration)||12,1,30),amount:clamp(integer(data.job.amount,3),1,3),output:data.job.output==='hacksaw'?'hacksaw':s.output};
        }
      });
      enemies.forEach((e,i)=>{e.defeats=integer(saved.enemies?.[i]?.defeats);e.level=clamp(integer(saved.enemies?.[i]?.level,20),e.baseLevel,20);e.maxHealth=3+2*(e.level-1);e.health=e.guard&&e.defeats>0?0:e.maxHealth;});
      state.tools.hacksaw=saved.tools?.hacksaw===true;state.rescued=saved.rescued===true;
      const jobs=['follow','wood','stone','ore','taglialegna','spaccapietre','fucina'];state.carrotJob=jobs.includes(saved.carrotJob)?saved.carrotJob:'follow';state.carrotTimer=clamp(Number(saved.carrotTimer)||0,0,25);
    }catch{state.storageAvailable=false;notify('Salvataggio non leggibile: puoi giocare senza sovrascriverlo.');}
  }
  function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=i/n*Math.PI*2;state.particles.push({x,y,vx:Math.cos(a)*(25+i*4),vy:Math.sin(a)*(25+i*3)-20,life:.7,max:.7,color});}}
  function gainXP(amount){
    if(player.level===20)return;
    player.xp+=amount;
    while(player.level<20&&player.xp>=xpNeeded(player.level)){
      player.xp-=xpNeeded(player.level);player.level++;player.health=Math.min(maxHealth(player.level),player.health+25);
      burst(player.x,player.y,'#f4d385',24);notify(player.level===5?'Livello 5! Missione principale: salva Carota nel castello del ferro.':player.level===1?'Livello 1! Bosco, alberi e Falegnameria sbloccati.':player.level===3?'Livello 3! Cava, pietra e Spaccapietre sbloccati.':`Livello ${player.level}! Più freschezza e pugni più forti.`);
    }
    if(player.level===20)player.xp=0;save();
  }
  const jumpHeight=()=>player.jump>0?Math.sin((1-player.jump/.66)*Math.PI)*68:0;
  function jump(){if(!state.paused&&!player.jump){player.jump=.66;burst(player.x,player.y,'#dce4cc',5);}}
  function punch(){if(state.paused||player.punchCooldown>0)return;player.punch=.28;player.punchCooldown=.45;player.punchHit=false;player.punchX=player.aimX;player.punchY=player.aimY;}
  function punchImpact(){
    if(jumpHeight()>30)return;
    for(const e of enemies){
      if(e.health<=0)continue;
      const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);
      if(d>65+e.r||(d>1&&(dx*player.punchX+dy*player.punchY)/d<.4))continue;
      let blocked=false;for(let step=8;step<d;step+=8)if(!canStand(player.x+dx/d*step,player.y+dy/d*step,false,3)){blocked=true;break;}
      if(blocked)continue;
      e.health=Math.max(0,e.health-punchDamage(player.level));e.stun=.65;
      e.vx=(d>1?dx/d:player.punchX)*420;e.vy=(d>1?dy/d:player.punchY)*420;burst(e.x,e.y,'#e9d494');
      if(e.health===0){e.defeats++;e.respawn=25;e.vx=0;e.vy=0;gainXP(18+8*e.level);if(player.level>=5&&e.level>=5)bag.ore++;notify(`${e.guard?'Guardia':'Muffa'} livello ${e.level} sconfitta! +${18+8*e.level} XP`);save();}
    }
    const node=nearestNode();if(node)gather(node);
  }
  const nearestNode=()=>nodes.find(n=>n.hits>0&&distance(n,player)<100);
  const nearestStation=()=>stations.find(s=>distance(s,player)<150);
  function gather(node=nearestNode()){
    if(state.paused||!node||distance(node,player)>110||!node.hits||player.gatherCooldown>0)return false;
    if(player.level<RESOURCE_UNLOCK[node.type]){notify(`Raccolta bloccata: serve il livello ${RESOURCE_UNLOCK[node.type]}.`);return false;}
    player.gatherCooldown=.6;node.hits--;bag[node.type]+=2;gainXP(5);burst(node.x,node.y,node.type==='wood'?'#b99770':'#b4b6a7');
    if(!node.hits)node.respawn=35;
    notify(`+2 ${RESOURCE_NAMES[node.type]} · +5 XP`);save();return true;
  }
  function interact(){if(state.paused)return;if(!state.rescued&&distance(player,{x:PRISON.x,y:735})<150){rescue();return;}const station=nearestStation();if(safe()&&station){onStation(station.id);return;}if(nearestNode())gather();}
  function costText(cost){return Object.entries(cost).map(([k,v])=>amountText(k,v)).join(' · ');}
  function upgradeCost(s){
    if(!s.level)return s.cost;
    const l=s.level;
    if(s.id==='vivaio')return {seeds:5*l,planks:2*l};
    if(s.id==='fontana')return {drops:6*l,blocks:2*l};
    if(s.id==='taglialegna')return {seeds:4*l,stone:3*l,planks:2*l};
    if(s.id==='spaccapietre')return {seeds:4*l,planks:3*l,blocks:2*l};
    return {seeds:4*l,blocks:3*l,ingots:2*l};
  }
  function stationRequirement(s){return s.level?Math.max(s.required,s.level+1):s.required;}
  const canAfford=cost=>Object.entries(cost).every(([k,v])=>bag[k]>=v);
  function upgrade(id){
    const s=stationById(id);if(!s||state.paused)return false;
    if(!safe()){notify('Torna nel frigorifero per costruire o potenziare.');return false;}
    if(s.level>=5)return false;
    if(player.level<stationRequirement(s)){notify(`Serve Fragolina al livello ${stationRequirement(s)}.`);return false;}
    if(s.job){notify('Aspetta che la lavorazione sia terminata.');return false;}
    const cost=upgradeCost(s);if(!canAfford(cost)){notify(`Materiali necessari: ${costText(cost)}.`);return false;}
    Object.entries(cost).forEach(([k,v])=>bag[k]-=v);s.level++;gainXP(s.level===1?15:25);burst(s.x,s.y,'#b4cf94',22);notify(`${s.name} al livello ${s.level}!`);save();return true;
  }
  const jobDuration=s=>Math.max(4,12-(s.level-1)*2);
  const jobYield=s=>1+Math.floor((s.level-1)/2);
  function process(id,helper=false){
    const s=stationById(id);if(!s?.input||!s.level||s.job||state.paused)return false;
    if(!safe()&&!helper){notify('Torna nel frigorifero per avviare la lavorazione.');return false;}
    if(bag[s.input]<3){if(!helper)notify(`Servono 3 ${RESOURCE_NAMES[s.input]}.`);return false;}
    bag[s.input]-=3;s.job={duration:jobDuration(s),remaining:jobDuration(s),amount:jobYield(s),output:s.output};save();if(!helper)notify(`${s.name}: lavorazione avviata.`);return true;
  }
  const sawCost={ingots:3,planks:2,blocks:1};
  function craftSaw(){
    const s=stationById('fucina');if(state.paused||!safe()||player.level<5||!s.level||s.job||state.tools.hacksaw)return false;
    if(!canAfford(sawCost)){notify(`Seghetto: servono ${costText(sawCost)}.`);return false;}
    Object.entries(sawCost).forEach(([k,v])=>bag[k]-=v);s.job={duration:15,remaining:15,amount:1,output:'hacksaw'};save();notify('La Fucina sta preparando il Seghetto per metallo.');return true;
  }
  const guardsDefeated=()=>enemies.filter(e=>e.guard).every(e=>e.defeats>0);
  function rescue(){
    if(state.paused||player.level<5||state.rescued||distance(player,{x:PRISON.x,y:735})>150)return false;
    if(!guardsDefeated()){notify('Prima di aprire la prigione, sconfiggi entrambe le guardie.');return false;}
    if(!state.tools.hacksaw){notify('Le sbarre sono di ferro: costruisci il Seghetto per metallo nella Fucina.');return false;}
    if(!state.rescuing){state.rescuing=true;state.rescueProgress=0;notify('Taglio delle sbarre… resta vicino alla prigione per 5 secondi.');}return true;
  }
  function assignCarrot(job){
    if(!state.rescued)return false;
    if(job==='follow'||(RESOURCE_UNLOCK[job]!==undefined&&player.level>=RESOURCE_UNLOCK[job])||(stations.some(s=>s.id===job&&s.input&&s.level>0))){state.carrotJob=job;state.carrotTimer=0;save();notify('Nuovo incarico assegnato a Carota!');return true;}return false;
  }
  function navigate(x,y){
    if(state.paused)return;
    if(x>=1650){const zone=ZONES.find(z=>x>=z.min&&x<z.max);if(zone&&player.level<zone.level){notify(`${zone.name}: si sblocca al livello ${zone.level}.`);return;}}
    state.pending=null;
    const s=stations.find(s=>Math.hypot(s.x-x,s.y-y)<75),n=nodes.find(n=>n.hits>0&&Math.hypot(n.x-x,n.y-y)<45);
    if(s){if(distance(s,player)<150){onStation(s.id);return;}state.pending={type:'station',id:s.id};x=s.x;y=s.y+110;}
    if(n){state.pending={type:'node',node:n};x=n.x;y=n.y+60;}
    if(!state.rescued&&Math.hypot(x-PRISON.x,y-PRISON.y)<140){state.pending={type:'prison'};x=PRISON.x;y=735;}
    state.path=findPath(player,clamp(x,40,WORLD.w-40),clamp(y,70,WORLD.h-50),player.level,state.rescued);
    state.destination=state.path.at(-1)||null;
    if(!state.path.length&&Math.hypot(player.x-x,player.y-y)>40){state.pending=null;notify('Il passaggio è bloccato: scegli un punto libero vicino.');}
  }
  function home(exhausted=false){
    Object.assign(player,{x:490,y:610,jump:0,invulnerable:2,punch:0,punchCooldown:0});state.path=[];state.pending=null;state.destination=null;
    if(exhausted){bag.seeds=Math.floor(bag.seeds*.7);player.health=maxHealth(player.level)*.35;notify('Il frigo ti ha salvata! Hai perso il 30% dei semi.');save();}
    else notify('Bentornata al fresco!');
    enemies.forEach(e=>{e.x=e.ox;e.y=e.oy;e.vx=0;e.vy=0;});
  }
  function move(dx,dy,dt){
    const length=Math.hypot(dx,dy);if(!length){player.walking=false;return;}
    const power=Math.min(1,length),speed=(195+player.level*3)*power;
    const sx=dx/length*speed*dt,sy=dy/length*speed*dt,jumping=jumpHeight()>13;
    if(canStand(player.x+sx,player.y,jumping,18,player.level,state.rescued))player.x+=sx;
    if(canStand(player.x,player.y+sy,jumping,18,player.level,state.rescued))player.y+=sy;
    player.walking=true;player.aimX=dx/length;player.aimY=dy/length;
  }
  function update(dt,input={x:0,y:0}){
    if(state.paused)return;
    dt=clamp(dt,0,.05);state.clock+=dt;const wasJumping=player.jump>0;
    player.jump=Math.max(0,player.jump-dt);player.invulnerable=Math.max(0,player.invulnerable-dt);player.gatherCooldown=Math.max(0,player.gatherCooldown-dt);
    if(wasJumping&&!player.jump&&!canStand(player.x,player.y,false,18,player.level,state.rescued)){
      landing:for(let r=5;r<=125;r+=5)for(let i=0;i<24;i++){const a=i/24*Math.PI*2,x=player.x+Math.cos(a)*r,y=player.y+Math.sin(a)*r;if(canStand(x,y,false,18,player.level,state.rescued)){player.x=x;player.y=y;break landing;}}
    }
    if(input.x||input.y){state.path=[];state.pending=null;state.destination=null;move(input.x,input.y,dt);}
    else if(state.path.length){const n=state.path[0],d=distance(player,n);if(d<4){state.path.shift();}else move((n.x-player.x)/d,(n.y-player.y)/d,Math.min(dt,d/(195+player.level*3)));}
    else{player.walking=false;state.destination=null;}
    if(state.pending?.type==='station'){const s=stationById(state.pending.id);if(distance(player,s)<150){state.pending=null;state.path=[];onStation(s.id);}}
    if(state.pending?.type==='node'&&distance(player,state.pending.node)<105){gather(state.pending.node);state.pending=null;state.path=[];}
    if(state.pending?.type==='prison'&&distance(player,{x:PRISON.x,y:735})<130){state.pending=null;state.path=[];rescue();}
    player.punchCooldown=Math.max(0,player.punchCooldown-dt);player.punch=Math.max(0,player.punch-dt);
    if(player.punch>0&&player.punch<=.20&&!player.punchHit){player.punchHit=true;punchImpact();}
    const isSafe=safe(),max=maxHealth(player.level),fountain=stationById('fontana');
    if(isSafe)player.health=Math.min(max,player.health+dt*(8+fountain.level*7));else player.health-=dt*(.65+clamp((player.x-800)/1650,0,1)*2.4);
    if(wasSafe!==isSafe){notify(isSafe?'Al sicuro. La freschezza si rigenera.':'Esplora, raccogli e difenditi con il pugno!');wasSafe=isSafe;}
    for(const e of enemies){
      if(e.health<=0){if(e.guard)continue;e.respawn=Math.max(0,e.respawn-dt);if(!e.respawn){e.level=clamp(Math.max(e.baseLevel+Math.floor(e.defeats/2),e.baseLevel+Math.floor((player.level-1)/3)),1,20);e.maxHealth=3+2*(e.level-1);e.health=e.maxHealth;e.x=e.ox;e.y=e.oy;e.stun=0;save();}continue;}
      if(e.stun>0){e.stun=Math.max(0,e.stun-dt);const nx=clamp(e.x+e.vx*dt,900,WORLD.w-50),ny=e.y+e.vy*dt;if(canStand(nx,e.y,false,e.r*.65))e.x=nx;if(canStand(e.x,ny,false,e.r*.65))e.y=ny;e.vx*=Math.exp(-9*dt);e.vy*=Math.exp(-9*dt);continue;}
      let tx=e.ox+Math.sin(state.clock*.32+e.phase)*95,ty=e.oy+Math.cos(state.clock*.4+e.phase)*100;
      const territory=ZONES.find(z=>e.ox>=z.min&&e.ox<z.max);
      if(!isSafe&&distance(player,e)<280&&player.x>=territory.min&&player.x<territory.max){tx=player.x;ty=player.y;}
      const d=Math.hypot(tx-e.x,ty-e.y),speed=56+e.level*8;
      if(d>2){const nx=clamp(e.x+(tx-e.x)/d*speed*dt,900,WORLD.w-50),ny=e.y+(ty-e.y)/d*speed*dt;if(canStand(nx,e.y,false,e.r*.65))e.x=nx;if(canStand(e.x,ny,false,e.r*.65))e.y=ny;}
      if(!isSafe&&jumpHeight()<28&&!player.invulnerable&&distance(player,e)<e.r+17){player.health-=12+e.level*3;player.invulnerable=1.5;burst(player.x,player.y,'#dc7860');notify(`Muffa livello ${e.level}! Colpisci o salta per difenderti.`);}
    }
    for(const item of loot){if(!item.active){item.respawn-=dt;if(item.respawn<=0)item.active=true;continue;}if(distance(player,item)<34){item.active=false;item.respawn=40;bag[item.type]++;if(item.type==='seeds')state.totalSeeds++;else player.health=Math.min(max,player.health+7);gainXP(3);burst(item.x,item.y,item.type==='seeds'?'#c4ab6f':'#9fc6c9',8);save();}}
    for(const n of nodes)if(!n.hits){n.respawn-=dt;if(n.respawn<=0){n.hits=3;n.respawn=0;}}
    for(const s of stations){
      if(!s.level)continue;
      if(s.id==='vivaio'){s.production+=dt;if(s.production>=30){s.production-=30;bag.seeds+=s.level;state.totalSeeds+=s.level;save();notify(`Il vivaio ha prodotto ${amountText('seeds',s.level)}.`);}}
      if(s.job){s.job.remaining=Math.max(0,s.job.remaining-dt);if(!s.job.remaining){const {amount,output}=s.job;if(output==='hacksaw')state.tools.hacksaw=true;else bag[s.output]+=amount;s.job=null;gainXP(10);notify(output==='hacksaw'?'Seghetto per metallo pronto! Ora puoi aprire le sbarre dopo aver sconfitto le guardie.':`${s.name}: produzione pronta, ${amountText(s.output,amount)}! +10 XP`);save();}}
    }
    if(state.rescuing){if(distance(player,{x:PRISON.x,y:735})>150){state.rescuing=false;state.rescueProgress=0;}else{state.rescueProgress+=dt;if(state.rescueProgress>=5){state.rescuing=false;state.rescued=true;gainXP(150);notify('Carota è libero! Ora è il tuo aiutante: assegnagli un incarico dalla sua scheda.');save();}}}
    if(state.rescued){
      state.carrotTimer+=dt;
      if(state.carrotJob==='follow')state.carrotStatus='Al tuo fianco';
      else if(RESOURCE_UNLOCK[state.carrotJob]!==undefined){state.carrotStatus=`Raccoglie ${RESOURCE_NAMES[state.carrotJob]}`;if(state.carrotTimer>=25){state.carrotTimer-=25;bag[state.carrotJob]+=2;save();notify(`Carota ha raccolto 2 ${RESOURCE_NAMES[state.carrotJob]}.`);}}
      else{const s=stationById(state.carrotJob);if(s?.level){state.carrotStatus=s.job?'Produzione in corso':bag[s.input]<3?`Aspetta 3 ${RESOURCE_NAMES[s.input]}`:'Pronto a produrre';if(state.carrotTimer>=2){state.carrotTimer=0;process(s.id,true);}}else{state.carrotJob='follow';}}
    }
    if(player.health<=0)home(true);
    for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0)state.particles.splice(i,1);}
    autoSave+=dt;if(autoSave>5){save();autoSave=0;}
  }
  function reset(){
    Object.assign(player,{level:0,xp:0,health:100,aimX:1,aimY:0});Object.assign(state,{tools:{hacksaw:false},rescued:false,rescuing:false,rescueProgress:0,carrotJob:'follow',carrotTimer:0});Object.keys(bag).forEach(k=>bag[k]=0);state.totalSeeds=0;
    stations.forEach(s=>{s.level=0;s.job=null;s.production=0;});enemies.forEach(e=>{e.defeats=0;e.level=e.baseLevel;e.maxHealth=3+2*(e.level-1);e.health=e.maxHealth;e.stun=0;e.respawn=0;});
    loot.forEach(l=>{l.active=true;l.respawn=0;});nodes.forEach(n=>{n.hits=3;n.respawn=0;});state.storageAvailable=true;home();save();
  }
  load();
  return {state,safe,save,update,navigate,move,jump,jumpHeight,punch,interact,gather,nearestNode,nearestStation,home,gainXP,upgrade,process,upgradeCost,stationRequirement,canAfford,costText,jobDuration,jobYield,reset,craftSaw,sawCost,rescue,guardsDefeated,assignCarrot};
}
