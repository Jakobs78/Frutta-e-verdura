'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const mini = $('minimap'), mc = mini.getContext('2d');
  const WORLD = { w: 2500, h: 1250 }, GRID = 25, SPEED = 195;
  const STORAGE = 'frutta-e-verdura-v1';
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const player = { x: 490, y: 590, health: 100, jump: 0, invulnerable: 0, walking: false, facing: 1 };
  const stations = [
    { x: 345, y: 796, name: 'vivaio', cost: 5, currency: 'seeds', built: false },
    { x: 615, y: 796, name: 'fontana', cost: 8, currency: 'drops', built: false }
  ];
  const solids = [
    { x: 140, y: 170, w: 660, h: 38, high: true },
    { x: 140, y: 170, w: 34, h: 790, high: true },
    { x: 140, y: 930, w: 660, h: 35, high: true },
    { x: 766, y: 170, w: 34, h: 340, high: true },
    { x: 766, y: 680, w: 34, h: 280, high: true },
    { x: 232, y: 297, w: 124, h: 79, high: true },
    { x: 591, y: 289, w: 75, h: 93, high: true },
    { x: 240, y: 448, w: 106, h: 45, high: true },
    { x: 275, y: 770, w: 140, h: 74, high: true },
    { x: 559, y: 770, w: 112, h: 74, high: true },
    { x: 1150, y: 320, w: 190, h: 90, high: true },
    { x: 1600, y: 730, w: 180, h: 120, high: true },
    { x: 1940, y: 260, w: 190, h: 110, high: true },
    { x: 1085, y: 775, w: 78, h: 24, high: false },
    { x: 1430, y: 515, w: 85, h: 27, high: false },
    { x: 1880, y: 960, w: 85, h: 25, high: false }
  ];
  let seeds = 0, drops = 0, totalSeeds = 0, storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    if (saved && saved.version === 1) {
      const valid = n => Number.isSafeInteger(n) && n >= 0 && n < 1000000;
      seeds = valid(saved.seeds) ? saved.seeds : 0;
      drops = valid(saved.drops) ? saved.drops : 0;
      totalSeeds = valid(saved.totalSeeds) ? saved.totalSeeds : seeds;
      stations.forEach((s, i) => { s.built = saved.built?.[i] === true; });
    }
  } catch { storageAvailable = false; }
  let view = { w: 900, h: 600, zoom: .76, x: 570, y: 580 };
  let clock = 0, previous = 0, paused = false, wasSafe = true, path = [], destination = null, pendingStation = null;
  let toastTimer, hudTimer = 0, nurseryTimer = 0, autoSaveTimer = 0;
  const keys = new Set(), ripples = [], particles = [];
  const loot = [
    [930,590,'seed'],[1035,680,'seed'],[1120,530,'seed'],[1230,630,'seed'],[1270,770,'seed'],
    [1030,455,'water'],[1200,865,'water'],[1410,700,'seed'],[1520,390,'water'],[1470,920,'seed'],
    [1660,560,'seed'],[1790,430,'water'],[1780,990,'seed'],[1970,690,'seed'],[2180,470,'seed'],
    [2200,860,'water'],[1990,1050,'water'],[2330,640,'seed'],[2240,1050,'seed'],[1480,250,'water']
  ].map(([x,y,type],i) => ({ x,y,type,active:true,respawn:0,phase:i*1.7 }));
  const enemies = [
    { x: 1320, y: 550, ox: 1320, oy: 550, phase: 0, r: 27, speed: 62 },
    { x: 1560, y: 940, ox: 1560, oy: 940, phase: 2, r: 32, speed: 74 },
    { x: 1860, y: 500, ox: 1860, oy: 500, phase: 4, r: 30, speed: 86 },
    { x: 2160, y: 790, ox: 2160, oy: 790, phase: 1, r: 36, speed: 95 }
  ];
  const safe = () => player.x < 785 && player.x > 155 && player.y > 180 && player.y < 955;
  function notify(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3600);
  }
  function save() {
    if (!storageAvailable) return;
    try { localStorage.setItem(STORAGE, JSON.stringify({ version: 1, seeds, drops, totalSeeds, built: stations.map(s => s.built) })); }
    catch { storageAvailable = false; $('save-note').textContent = 'Salvataggio non disponibile'; }
  }
  function canStand(x, y, jumping = false, radius = 18) {
    if (x < 40 || y < 70 || x > WORLD.w - 40 || y > WORLD.h - 50) return false;
    return !solids.some(s => (!jumping || s.high) && x + radius > s.x && x - radius < s.x + s.w && y + radius > s.y && y - radius < s.y + s.h);
  }
  // A* on a compact grid: pointer movement finds a route through the fridge door.
  function findPath(tx, ty) {
    const cols = WORLD.w / GRID, rows = WORLD.h / GRID;
    const cell = (x, y) => ({ x: Math.floor(x / GRID), y: Math.floor(y / GRID) });
    const start = cell(player.x, player.y), end = cell(tx, ty);
    const pass = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && canStand(x * GRID + GRID / 2, y * GRID + GRID / 2);
    if (!pass(end.x, end.y)) {
      let nearest = null, best = Infinity;
      for (let y = end.y - 4; y <= end.y + 4; y++) for (let x = end.x - 4; x <= end.x + 4; x++) {
        const d = Math.hypot(x - end.x, y - end.y);
        if (pass(x,y) && d < best) { best = d; nearest = { x,y }; }
      }
      if (!nearest) return [];
      Object.assign(end, nearest);
    }
    const id = (x,y) => y*cols+x, targetId = id(end.x,end.y);
    const startNode = { ...start, g:0, f:0, parent:null };
    const open = [startNode], known = new Map([[id(start.x,start.y),startNode]]), closed = new Set();
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    let iterations = 0;
    while (open.length && iterations++ < 6000) {
      let index = 0;
      for (let i=1; i<open.length; i++) if (open[i].f < open[index].f) index = i;
      const current = open.splice(index,1)[0], currentId = id(current.x,current.y);
      if (currentId === targetId) {
        const result = []; let n = current;
        while (n.parent) { result.unshift({ x:n.x*GRID+GRID/2, y:n.y*GRID+GRID/2 }); n=n.parent; }
        return result;
      }
      closed.add(currentId);
      for (const [dx,dy] of dirs) {
        const x = current.x+dx, y=current.y+dy, key=id(x,y);
        if (closed.has(key) || !pass(x,y) || (dx && dy && (!pass(current.x+dx,current.y) || !pass(current.x,current.y+dy)))) continue;
        const g = current.g + (dx && dy ? Math.SQRT2 : 1), existing = known.get(key);
        if (!existing || g < existing.g) {
          const node = existing || { x,y };
          Object.assign(node, { g, f:g+Math.hypot(end.x-x,end.y-y), parent:current });
          if (!existing) { known.set(key,node); open.push(node); }
        }
      }
    }
    return [];
  }
  function move(dx,dy,dt) {
    const length = Math.hypot(dx,dy);
    if (!length) { player.walking=false; return; }
    const sx = dx/length*SPEED*dt, sy=dy/length*SPEED*dt, jumping = jumpHeight()>13;
    if (canStand(player.x+sx,player.y,jumping)) player.x+=sx;
    if (canStand(player.x,player.y+sy,jumping)) player.y+=sy;
    player.walking=true;
    if (dx) player.facing = dx>0 ? 1 : -1;
  }
  function jumpHeight() { return player.jump>0 ? Math.sin((1-player.jump/.66)*Math.PI)*68 : 0; }
  function jump() { if (!paused && !player.jump) { player.jump=.66; burst(player.x,player.y,'#dce4cc',5); } }
  function burst(x,y,color,n=12) {
    for (let i=0;i<n;i++) { const a=i/n*Math.PI*2; particles.push({x,y,vx:Math.cos(a)*(25+i*4),vy:Math.sin(a)*(25+i*3)-20,life:.7,max:.7,color}); }
  }
  function nearestStation() { return stations.find(s=>dist(player,s)<145); }
  function interact(station = nearestStation()) {
    if (!station || paused || !safe()) return;
    if (station.built) { notify(station.name==='vivaio' ? 'Il vivaio produce un seme ogni 30 secondi di gioco.' : 'La fontana mantiene freschissima Fragolina.'); return; }
    const amount = station.currency==='seeds' ? seeds : drops;
    if (amount < station.cost) { notify(`Servono ${station.cost} ${station.currency==='seeds'?'semi':'gocce'}. Li trovi fuori dal frigorifero!`); return; }
    if (station.currency==='seeds') seeds-=station.cost; else drops-=station.cost;
    station.built=true;
    burst(station.x,station.y,'#9bae69',24);
    notify(station.name==='vivaio' ? 'Il tuo primo vivaio! Qui nasce qualcosa di bello. +1 seme ogni 30 s.' : 'Fontana costruita! Al rifugio recuperi freschezza più in fretta.');
    save(); updateHUD();
  }
  function returnHome(exhausted = false) {
    player.x=490; player.y=590; player.jump=0; player.invulnerable=2;
    path=[];destination=null;pendingStation=null;
    if (exhausted) { seeds=Math.floor(seeds*.7);player.health=35;save();notify('Il frigo ti ha salvata! Hai perso una parte dei semi. Riposati un momento.'); }
    else notify('Bentornata a casa. Qui puoi riprendere fiato.');
    enemies.forEach(e=>{e.x=e.ox;e.y=e.oy;});
    updateHUD();
  }
  function update(dt) {
    clock+=dt;
    const wasJumping=player.jump>0;
    player.jump=Math.max(0,player.jump-dt);player.invulnerable=Math.max(0,player.invulnerable-dt);
    // Landing on a crumb slides to the nearest free spot instead of trapping the player.
    if(wasJumping&&!player.jump&&!canStand(player.x,player.y)){
      landing: for(let r=5;r<=125;r+=5)for(let i=0;i<24;i++){
        const a=i/24*Math.PI*2,x=player.x+Math.cos(a)*r,y=player.y+Math.sin(a)*r;
        if(canStand(x,y)){player.x=x;player.y=y;break landing;}
      }
    }
    let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    let dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
    if (dx || dy) {path=[];destination=null;pendingStation=null;move(dx,dy,dt);}
    else if (path.length) {
      const next=path[0], d=dist(player,next);
      if (d < SPEED*dt+2) { player.x=next.x;player.y=next.y;path.shift(); }
      else move(next.x-player.x,next.y-player.y,dt);
    } else {player.walking=false;destination=null;}
    if (pendingStation && dist(player,pendingStation)<140) {interact(pendingStation);pendingStation=null;path=[];}
    const isSafe=safe(), depth=clamp((player.x-800)/1650,0,1);
    if (isSafe) player.health=Math.min(100,player.health+dt*(stations[1].built?17:8));
    else player.health-=dt*(.65+depth*2.4);
    if (wasSafe!==isSafe) {notify(isSafe?'Sei al sicuro. La tua freschezza si rigenera.':'Fuori fa caldo… raccogli i semi e fai attenzione alla muffa.');wasSafe=isSafe;}
    for (const e of enemies) {
      let tx=e.ox+Math.sin(clock*.32+e.phase)*95, ty=e.oy+Math.cos(clock*.4+e.phase)*100;
      if (!isSafe && dist(player,e)<280) {tx=player.x;ty=player.y;}
      const d=Math.hypot(tx-e.x,ty-e.y);
      if (d>2) {
        const nx=clamp(e.x+(tx-e.x)/d*e.speed*dt,900,WORLD.w-50), ny=e.y+(ty-e.y)/d*e.speed*dt;
        if (canStand(nx,e.y,false,e.r*.65)) e.x=nx;
        if (canStand(e.x,ny,false,e.r*.65)) e.y=ny;
      }
      if (!isSafe && jumpHeight()<28 && !player.invulnerable && dist(player,e)<e.r+17) {
        player.health-=15;player.invulnerable=1.5;burst(player.x,player.y,'#dc7860');notify('Ahi, la muffa! Saltala con SPAZIO o torna al fresco.');
      }
    }
    for (const item of loot) {
      if (!item.active) {item.respawn-=dt;if(item.respawn<=0)item.active=true;continue;}
      if (dist(player,item)<34) {
        item.active=false;item.respawn=40;
        if(item.type==='seed'){seeds++;totalSeeds++;}else{drops++;player.health=Math.min(100,player.health+7);}
        burst(item.x,item.y,item.type==='seed'?'#c4ab6f':'#9fc6c9',8);save();
        if(seeds===5&&!stations[0].built&&item.type==='seed')notify('5 semi! Torna al frigo e costruisci il vivaio.');
      }
    }
    if(stations[0].built){nurseryTimer+=dt;if(nurseryTimer>=30){nurseryTimer-=30;seeds++;totalSeeds++;save();notify('Il tuo vivaio ha prodotto un nuovo seme.');}}
    if(player.health<=0)returnHome(true);
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;if(p.life<=0)particles.splice(i,1);}
    for(let i=ripples.length-1;i>=0;i--){ripples[i].life-=dt;if(ripples[i].life<=0)ripples.splice(i,1);}
    const desiredX=player.x+110;
    const minX=view.w/view.zoom/2-30,maxX=WORLD.w-view.w/view.zoom/2+30;
    view.x+=(clamp(desiredX,Math.min(minX,maxX),Math.max(minX,maxX))-view.x)*Math.min(1,dt*5);
    const minY=view.h/view.zoom/2-15,maxY=WORLD.h-view.h/view.zoom/2+15;
    view.y+=(clamp(player.y-15,Math.min(minY,maxY),Math.max(minY,maxY))-view.y)*Math.min(1,dt*5);
    hudTimer+=dt;autoSaveTimer+=dt;
    if(hudTimer>.1){updateHUD();hudTimer=0;}
    if(autoSaveTimer>10){save();autoSaveTimer=0;}
  }
  function updateHUD() {
    $('seeds').textContent=seeds;$('drops').textContent=drops;
    const health=Math.ceil(player.health),isSafe=safe();
    $('health-text').textContent=`${health}%`;$('health-bar').style.width=`${health}%`;
    $('health-bar').style.background=health>50?'#91ab79':health>25?'#c5a363':'#cb7760';
    $('zone-title').textContent=isSafe?'Il frigorifero':'La cucina';
    $('zone-caption').textContent=isSafe?'Casa, dolce casa.':'Un mondo un po’ più grande.';
    $('zone-badge').classList.toggle('danger',!isSafe);
    $('zone-badge').firstElementChild.textContent=isSafe?'❄':'☀';
    $('status-title').textContent=isSafe?'Al sicuro':player.x<1400?'Zona inesplorata':player.x<1850?'Zona pericolosa':'Pericolo elevato';
    $('status-detail').textContent=isSafe?'Il tuo piccolo rifugio':'La freschezza diminuisce';
    if(!storageAvailable)$('save-note').textContent='Progressi solo in questa sessione';
    const stage=!stations[0].built?0:!stations[1].built?1:2;
    $('mission-title').textContent=['Mettiamo radici','Una goccia di vita','Un rifugio che cresce'][stage];
    $('mission-desc').textContent=['Raccogli 5 semi all’esterno e costruisci il primo vivaio nel frigorifero.','Raccogli 8 gocce e costruisci una fontana. Il fresco sarà ancora più rigenerante.','Vivaio e fontana sono pronti. Esplora la cucina e raccogli scorte per le prossime avventure.'][stage];
    const amount=stage===0?seeds:stage===1?drops:2,goal=stage===0?5:stage===1?8:2;
    $('mission-label').textContent=stage===0?'Semi raccolti':stage===1?'Gocce raccolte':'Stazioni costruite';
    $('mission-count').textContent=`${Math.min(amount,goal)} / ${goal}`;
    $('mission-progress').style.width=`${Math.min(100,amount/goal*100)}%`;
    $('mission-hint').textContent=stage===2?'Il tuo piccolo mondo prende vita.':amount>=goal?'Torna al frigo e premi E vicino alla stazione.':'I piccoli inizi fanno grandi cose.';
    const station=isSafe&&nearestStation();
    $('interact').hidden=!station;
    if(station)$('interact').lastElementChild.textContent=station.built?`${station.name==='vivaio'?'Vivaio':'Fontana'} · scopri di più`:`Costruisci ${station.name==='vivaio'?'il vivaio':'la fontana'} · ${station.cost} ${station.currency==='seeds'?'semi':'gocce'}`;
  }
  // All illustration is drawn locally: no asset downloads are needed to play.
  function round(x,y,w,h,r,fill,stroke,width=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
  function line(x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function label(text,x,y,size=12,color='#7f9184',font='sans-serif'){ctx.font=`500 ${size}px ${font}`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,x,y);}
  function leaf(x,y,size,angle,color='#729766') {ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-size,-size,size*.1,-size*1.8);ctx.quadraticCurveTo(size,-size,0,0);ctx.fillStyle=color;ctx.fill();ctx.restore();}
  function seed(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.rotate(.45);ellipse(0,0,6*scale,10*scale,'#c9a266');ellipse(-1.5*scale,-2*scale,2*scale,5*scale,'#efdbac');ctx.restore();}
  function water(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.beginPath();ctx.moveTo(0,-13);ctx.bezierCurveTo(-3,-6,-11,1,-8,7);ctx.bezierCurveTo(-4,15,8,12,9,5);ctx.bezierCurveTo(10,0,3,-8,0,-13);ctx.fillStyle='#8cbfc4';ctx.fill();ellipse(-3,3,2,4,'#d6f0e9');ctx.restore();}
  function fridge() {
    round(150,188,665,790,36,'#777f6a20');
    round(128,155,680,813,36,'#bdcec2','#aabbab',2);
    round(141,168,650,785,28,'#f0f3e5','#d5ded0',2);
    const g=ctx.createLinearGradient(170,210,750,900);g.addColorStop(0,'#e7eee3');g.addColorStop(.6,'#dfebdf');g.addColorStop(1,'#d6e5d7');
    round(171,207,595,722,13,g);
    // Recessed back panel and cold-air vent.
    round(187,221,560,49,9,'#d4dfd0');
    for(let i=0;i<16;i++)round(300+i*19,237,9,17,4,'#b3c6b7');
    round(209,216,42,28,7,'#edf2e5');label('4°',230,236,14,'#779582');
    round(682,222,29,21,6,'#f7eec2');ellipse(697,233,8,4,'#fff5c9');
    // Fine grooves in the fridge floor.
    for(let x=203;x<750;x+=31)line(x,280,x,920,'#cadbc877',1);
    for(const y of [398,699]){
      round(178,y+7,580,14,3,'#a5bfb435');
      round(177,y,584,8,3,'#f7faf0','#bacfc0');
      line(187,y+2,751,y+2,'#fffefa',2);
      for(const x of [190,740])round(x,y-4,12,17,3,'#a6bcae');
    }
    // Sparse starter items: milk, eggs, and a tiny jar.
    ellipse(295,370,72,16,'#66857213');
    round(233,323,122,49,10,'#c4cbb0','#aeb99d',1.5);
    round(238,317,112,42,9,'#d9dbc4','#bec6a9');
    for(let i=0;i<4;i++){ellipse(254+i*27,331,11,16,'#b9bda0');ellipse(254+i*27,327,10,14,i%2?'#f3ead0':'#faf3da');ellipse(251+i*27,323,3,6,'#fffae8');}
    round(596,315,62,62,7,'#e9f0df','#b5c6b2',2);
    ctx.beginPath();ctx.moveTo(596,315);ctx.lineTo(610,291);ctx.lineTo(648,291);ctx.lineTo(658,315);ctx.closePath();ctx.fillStyle='#f7f7e9';ctx.fill();
    line(610,291,648,291,'#b9c9b3',4);round(598,333,58,26,1,'#c5d7c2');label('LATTE',628,350,10,'#81977b');
    round(242,460,44,32,7,'#d1d8a6','#adba8e');round(238,453,52,12,4,'#a2b385');
    round(299,463,43,27,6,'#dfc49a','#bea67f');round(295,455,51,11,4,'#c0a07f');
    // Vegetable drawer at the bottom, with an empty clear front.
    round(190,861,558,56,10,'#c9ddcc88','#b0c7b5',2);round(201,865,537,10,3,'#e7f1df');round(418,878,102,8,4,'#a9c1ae');
    label('LE PICCOLE COSE CRESCONO QUI',473,905,9,'#8ca68e');
    label('IL FRIGORIFERO',470,469,12,'#9bb29b');
    label('il tuo piccolo rifugio',470,491,13,'#90a88e','Georgia');
    // Right wall and open doorway.
    round(767,178,28,333,12,'#dce7d5','#bdcdb9');round(767,681,28,264,12,'#dce7d5','#bdcdb9');
    round(767,506,40,12,4,'#9fb7a1');round(767,673,40,12,4,'#9fb7a1');
    round(776,519,48,153,3,'#d0ddbd');
    for(let i=0;i<6;i++)line(782,531+i*25,819,531+i*25,'#e8eed8',2);
    // Door swung outward, with characteristic inner pockets.
    ctx.save();ctx.translate(819,683);ctx.rotate(.22);
    round(0,0,110,271,13,'#b8cbb2','#a7bea1',2);round(8,7,94,250,9,'#e6edda');
    for(const y of [50,141,220]){round(17,y,76,28,6,'#c9d7bc','#afc4a4');line(20,y+3,90,y+3,'#f4f7e5',3);}
    round(69,15,14,32,4,'#d6bda0');round(72,10,8,12,2,'#be9c75');
    ctx.restore();
    label('FUORI →',873,490,10,'#a49b79');
  }
  function stationArt(s) {
    ctx.save();ctx.translate(s.x,s.y);
    if(!s.built){
      ctx.setLineDash([7,6]);round(-73,-42,146,84,14,'#d3e2c755','#9ab394',1.5);ctx.setLineDash([]);
      ctx.globalAlpha=.7;
      if(s.name==='vivaio'){line(0,4,0,-20,'#95aa8a',2);leaf(0,-6,15,-.7,'#a4b997');leaf(0,-12,13,.8,'#b2c3a5');round(-19,9,38,10,3,'#b9c8a9');}
      else {water(0,-10,1.1);ellipse(0,18,23,5,'#b5cfb9');}
      ctx.globalAlpha=1;label(s.name==='vivaio'?'FUTURO VIVAIO':'FUTURA FONTANA',0,65,10,'#8ca382');
      label(`${s.cost} ${s.currency==='seeds'?'semi':'gocce'}`,0,81,9,'#9bb08f');
    }else if(s.name==='vivaio'){
      ellipse(0,36,86,16,'#8ca67e20');round(-77,-21,154,59,9,'#b89b76','#a58a65',2);round(-76,-29,152,22,5,'#cfb38b');round(-66,-24,132,14,4,'#7d7754');
      for(let i=0;i<3;i++){const x=-43+i*43;line(x,-19,x,-55,'#73925b',3);leaf(x,-32,24,-.8,'#93b575');leaf(x,-44,22,.9,'#7ca366');}
      label('VIVAIO · +1 SEME / 30 s',0,65,9,'#819875');
    }else{
      ellipse(0,31,68,15,'#8ca67e20');round(-48,-11,96,43,15,'#b5cbc2','#92b4a5',2);ellipse(0,-8,46,19,'#d4e7dc');ellipse(0,-9,35,13,'#a3cfd0');
      line(0,-49,0,-20,'#b1c4b3',9);line(0,-48,22,-48,'#c6d5c0',9);
      const fall=(clock*30)%25;for(let i=0;i<3;i++)ellipse(22,-39+(fall+i*8)%29,2,4,'#9dc7c7');
      label('FONTANA · FRESCHEZZA +',0,65,9,'#819875');
    }
    ctx.restore();
  }
  function exterior() {
    ctx.fillStyle='#e9dfc8';ctx.fillRect(0,0,WORLD.w,WORLD.h);
    for(let y=0;y<WORLD.h;y+=140)for(let x=0;x<WORLD.w;x+=140){
      const n=((x/140*17+y/140*23)%7)/7;
      round(x+3,y+3,134,134,4,n>.5?'#e9e0cc':'#e6ddc8');
      line(x+7,y+5,x+130,y+5,'#f4eddb99',1);
      if(n>.7){ellipse(x+75,y+95,2,1,'#d1c3a66a');ellipse(x+35,y+30,1,1,'#cbbfa355');}
    }
    const warm=ctx.createLinearGradient(850,0,2500,0);warm.addColorStop(0,'#d3be8b00');warm.addColorStop(1,'#c5966033');ctx.fillStyle=warm;ctx.fillRect(820,0,1680,1250);
    // Scattered crumbs, paper, and environmental details.
    for(let i=0;i<60;i++){const x=900+(i*197%1510),y=110+(i*139%1030);ellipse(x,y,2+i%3,1+i%2,'#bfa77d40');}
    ctx.save();ctx.translate(1135,980);ctx.rotate(-.14);round(-55,-35,110,70,3,'#f4ecd7','#ded1b5');line(-40,-14,40,-14,'#c5ba9b',1);line(-40,-4,28,-4,'#d5caad',1);line(-40,6,34,6,'#d5caad',1);label('lista della spesa',0,24,8,'#b9aa8b','Georgia');ctx.restore();
    // Cutting boards.
    for(const b of [{x:1150,y:320,w:190,h:90},{x:1940,y:260,w:190,h:110}]){
      round(b.x+5,b.y+8,b.w,b.h,17,'#a88d5b20');round(b.x,b.y,b.w,b.h,17,'#cbb18b','#bca37b',2);round(b.x+8,b.y+7,b.w-16,b.h-14,12,null,'#d9c3a0',2);
      for(let i=0;i<5;i++)line(b.x+25+i*28,b.y+15,b.x+19+i*28,b.y+b.h-15,'#bba07844',1);
      ellipse(b.x+b.w-20,b.y+b.h/2,5,11,'#ac936e');
    }
    // A kitchen sponge and a far-off tomato tin.
    round(1605,743,178,117,20,'#937b5420');round(1600,730,180,115,18,'#c5c08c','#b2ad74',2);round(1600,730,180,29,12,'#a0ad7b');
    for(let i=0;i<21;i++)ellipse(1615+(i*43%145),771+(i*29%58),2,2,'#ada26e66');
    for(const s of solids.filter(s=>!s.high)){
      ellipse(s.x+s.w/2,s.y+20,s.w*.6,11,'#b89b6b22');round(s.x,s.y,s.w,s.h,8,'#cba96e','#b9975f',1.5);
      for(let j=0;j<4;j++)ellipse(s.x+12+j*17,s.y+8,2,2,'#e8ca90');
    }
    label('LA CUCINA',1125,229,19,'#b1a180','Georgia');label('un mondo oltre la porta',1125,253,12,'#b6a98b','Georgia');
    label('PIÙ LONTANO, PIÙ PERICOLOSO',2000,1150,13,'#b69770');
    // Subtle direction marks by the entrance.
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(876+i*26,575);ctx.lineTo(885+i*26,584);ctx.lineTo(876+i*26,593);ctx.strokeStyle='#c2b49099';ctx.lineWidth=2;ctx.stroke();}
  }
  function strawberry() {
    const x=player.x,y=player.y,z=jumpHeight(),bob=player.walking?Math.sin(clock*15)*2:Math.sin(clock*2)*1.2;
    ellipse(x,y+14,22-z*.1,8-z*.02,'#59765325');
    ctx.save();ctx.translate(x,y-z+bob);
    if(player.invulnerable>0&&Math.floor(clock*12)%2===0)ctx.globalAlpha=.55;
    const step=player.walking?Math.sin(clock*16)*4:0;
    line(-8,17,-10,26+step,'#6f7857',3);line(8,17,11,26-step,'#6f7857',3);
    ellipse(-12,27+step,6,3,'#6f7857');ellipse(13,27-step,6,3,'#6f7857');
    line(-20,-2,-27,7-step,'#ce6552',3);line(20,-2,27,5+step,'#ce6552',3);
    ctx.beginPath();ctx.moveTo(0,23);ctx.bezierCurveTo(-9,20,-31,-10,-23,-24);ctx.bezierCurveTo(-17,-35,-4,-29,0,-26);ctx.bezierCurveTo(8,-34,24,-30,25,-19);ctx.bezierCurveTo(29,-3,9,22,0,23);ctx.fillStyle='#e57562';ctx.fill();ctx.strokeStyle='#cc6651';ctx.lineWidth=1.5;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-20,-21);ctx.bezierCurveTo(-14,-30,-5,-28,-2,-24);ctx.strokeStyle='#f8a184';ctx.lineWidth=3;ctx.stroke();
    for(const [sx,sy] of [[-16,-15],[15,-15],[-19,-4],[18,-3],[-12,7],[11,8],[0,16],[-6,-22],[8,-24]]){ctx.save();ctx.translate(sx,sy);ctx.rotate(sx*.03);ellipse(0,0,1.6,2.8,'#ffe4a1');ctx.restore();}
    ellipse(-7+player.facing,-7,2.4,3.6,'#433e31');ellipse(7+player.facing,-7,2.4,3.6,'#433e31');
    ellipse(-6.4+player.facing,-8.2,.8,1,'#fff6d9');ellipse(7.6+player.facing,-8.2,.8,1,'#fff6d9');
    ellipse(-12,-1,4,2,'#f39d87');ellipse(13,-1,4,2,'#f39d87');
    ctx.beginPath();ctx.arc(player.facing,0,4,.15,Math.PI-.15);ctx.strokeStyle='#8a4b3c';ctx.lineWidth=1.5;ctx.stroke();
    for(let i=0;i<5;i++)leaf(0,-25,13,(i-2)*.72,'#698c55');leaf(1,-26,12,.2,'#82a563');
    line(0,-27,2,-42,'#597b49',3);
    ctx.restore();
    if(safe()) {label('Fragolina',x,y-z-57,10,'#6b8963');ellipse(x,y-z-48,2,2,'#91ae7b');}
  }
  function mold(e) {
    const bob=Math.sin(clock*3+e.phase)*3;
    ellipse(e.x,e.y+13,e.r*.95,9,'#81765822');ctx.save();ctx.translate(e.x,e.y+bob);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;ellipse(Math.cos(a)*e.r*.65,Math.sin(a)*e.r*.5,e.r*.47,e.r*.43,'#9aa77b');}
    ellipse(0,0,e.r*.85,e.r*.65,'#a6b18a');
    for(let i=0;i<5;i++)ellipse(Math.cos(i*2)*e.r*.5,Math.sin(i*2)*e.r*.35,3,2,'#c3cca6');
    ellipse(-7,1,2.5,3.5,'#667554');ellipse(7,1,2.5,3.5,'#667554');line(-10,-6,-4,-4,'#788760',2);line(4,-4,10,-6,'#788760',2);
    ctx.beginPath();ctx.arc(0,12,4,Math.PI,Math.PI*2);ctx.strokeStyle='#77855e';ctx.lineWidth=1.5;ctx.stroke();
    ctx.restore();
  }
  function render() {
    const dpr=Math.min(devicePixelRatio||1,2);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,view.w,view.h);
    ctx.fillStyle='#e7deca';ctx.fillRect(0,0,view.w,view.h);
    ctx.translate(view.w/2,view.h/2);ctx.scale(view.zoom,view.zoom);ctx.translate(-view.x,-view.y);
    exterior();fridge();stations.forEach(stationArt);
    if(destination){ctx.save();ctx.setLineDash([3,9]);ctx.beginPath();ctx.moveTo(player.x,player.y);for(const p of path)ctx.lineTo(p.x,p.y);ctx.strokeStyle='#8ba57866';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
    for(const r of ripples){ctx.globalAlpha=r.life/.6;ctx.beginPath();ctx.ellipse(r.x,r.y,(1-r.life/.6)*22+5,(1-r.life/.6)*13+3,0,0,Math.PI*2);ctx.strokeStyle='#8aa071';ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;}
    for(const item of loot)if(item.active){const b=Math.sin(clock*2.5+item.phase)*3;ellipse(item.x,item.y+9,13,5,'#a48c5720');ellipse(item.x,item.y,18,18,item.type==='seed'?'#fff0bc44':'#d3f2e63a');if(item.type==='seed')seed(item.x,item.y-3+b);else water(item.x,item.y-3+b,.8);}
    const actors=[...enemies.map(e=>({y:e.y,draw:()=>mold(e)})),{y:player.y,draw:strawberry}];actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
    for(const p of particles){ctx.globalAlpha=p.life/p.max;ellipse(p.x,p.y,3,3,p.color);}ctx.globalAlpha=1;
    if(!safe()&&player.health<30){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=`rgba(189,94,65,${.05+.025*Math.sin(clock*4)})`;ctx.fillRect(0,0,view.w,view.h);}
    renderMap();
  }
  function renderMap(){
    const sx=mini.width/WORLD.w,sy=mini.height/WORLD.h;
    mc.clearRect(0,0,mini.width,mini.height);mc.fillStyle='#e8e1cd';mc.fillRect(0,0,mini.width,mini.height);
    mc.fillStyle='#bfd2b9';mc.fillRect(140*sx,170*sy,660*sx,790*sy);
    mc.fillStyle='#d5e1cd';mc.fillRect(175*sx,210*sy,590*sx,710*sy);
    mc.fillStyle='#c2ae88';solids.filter(s=>s.x>900&&s.high).forEach(s=>mc.fillRect(s.x*sx,s.y*sy,s.w*sx,s.h*sy));
    mc.fillStyle='#c7aa68';loot.filter(i=>i.active).forEach(i=>{mc.beginPath();mc.arc(i.x*sx,i.y*sy,1.2,0,Math.PI*2);mc.fill();});
    mc.fillStyle='#9ba77d';enemies.forEach(e=>{mc.beginPath();mc.arc(e.x*sx,e.y*sy,2,0,Math.PI*2);mc.fill();});
    mc.beginPath();mc.arc(player.x*sx,player.y*sy,3,0,Math.PI*2);mc.fillStyle='#df7966';mc.fill();mc.strokeStyle='#fff9e7';mc.lineWidth=1;mc.stroke();
    mc.strokeStyle='#91a18366';mc.lineWidth=.7;mc.strokeRect((view.x-view.w/view.zoom/2)*sx,(view.y-view.h/view.zoom/2)*sy,view.w/view.zoom*sx,view.h/view.zoom*sy);
  }
  function resize(){
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    view.w=rect.width;view.h=rect.height;
    view.zoom=clamp(view.h/825,.54,.91);
    if(view.w<500)view.zoom=.57;
    canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
    render();
  }
  function setPause(value){
    paused=value;keys.clear();$('pause').textContent=value?'▷':'Ⅱ';$('pause').setAttribute('aria-label',value?'Riprendi il gioco':'Metti in pausa');
    if(value&&!$('menu').open){$('menu').showModal();$('resume').focus();}
    else if(!value&&$('menu').open){$('menu').close();canvas.focus({preventScroll:true});}
  }
  canvas.addEventListener('pointerdown',event=>{
    if(paused||event.button>0)return;
    canvas.focus({preventScroll:true});
    const r=canvas.getBoundingClientRect();let x=(event.clientX-r.left-view.w/2)/view.zoom+view.x,y=(event.clientY-r.top-view.h/2)/view.zoom+view.y;
    x=clamp(x,40,WORLD.w-40);y=clamp(y,70,WORLD.h-50);
    const station=stations.find(s=>Math.hypot(s.x-x,s.y-y)<90);
    pendingStation=station||null;
    if(station){if(dist(player,station)<140){interact(station);pendingStation=null;return;}x=station.x;y=station.y-105;}
    destination={x,y};path=findPath(x,y);ripples.push({x,y,life:.6});
    if(!path.length&&Math.hypot(player.x-x,player.y-y)>30){destination=null;pendingStation=null;notify('Il passaggio è bloccato. Prova un punto libero vicino.');}
  });
  window.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase();
    const input=event.target.closest?.('input,textarea,select');if(input)return;
    if(key==='escape'){event.preventDefault();setPause(!paused);return;}
    if(paused)return;
    if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' '].includes(key)){
      if(event.target.tagName==='BUTTON'&&key===' ')return;
      event.preventDefault();keys.add(key);if(key===' '&&!event.repeat)jump();
    }
    if(key==='e'&&!event.repeat)interact();
  });
  window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur',()=>{if(!paused)setPause(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){save();if(!paused)setPause(true);}});
  window.addEventListener('pagehide',save);
  $('help').onclick=() => setPause(true);$('pause').onclick=()=>setPause(!paused);
  $('resume').onclick=$('close-menu').onclick=()=>setPause(false);
  $('menu').addEventListener('cancel',e=>{e.preventDefault();setPause(false);});
  $('menu').addEventListener('close',()=>{paused=false;keys.clear();$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Metti in pausa');});
  $('interact').onclick=()=>interact();$('home').onclick=()=>{if(!paused)returnHome();};
  $('reset').onclick=()=>{$('reset-confirm').hidden=false;$('confirm-reset').focus();};
  $('cancel-reset').onclick=()=>{$('reset-confirm').hidden=true;};
  $('confirm-reset').onclick=()=>{
    seeds=0;drops=0;totalSeeds=0;nurseryTimer=0;stations.forEach(s=>s.built=false);loot.forEach(i=>{i.active=true;i.respawn=0;});
    save();player.health=100;returnHome();$('reset-confirm').hidden=true;setPause(false);notify('Una nuova avventura. Ogni piccolo seme conta.');
  };
  document.querySelectorAll('[data-key]').forEach(button=>{
    const release=()=>keys.delete(button.dataset.key);
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(!paused)keys.add(button.dataset.key);});
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  $('touch-jump').addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  new ResizeObserver(resize).observe(canvas);
  function frame(time){const dt=Math.min((time-previous)/1000,.033);previous=time;if(!paused)update(dt);render();requestAnimationFrame(frame);}
  resize();updateHUD();requestAnimationFrame(frame);
  setTimeout(()=>notify('Ciao, Fragolina! Usa WASD o clicca per esplorare. La porta è a destra →'),700);
})();
