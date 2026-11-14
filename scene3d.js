import * as THREE from 'three';
import { WORLD, SOLIDS, ZONES, RESOURCE_UNLOCK, PRISON, maxHealth } from './engine.js';

export function createWorldView(canvas,game){
  const {state}=game;
  const mobile=matchMedia('(pointer:coarse)').matches;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.4:1.8));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9e4d5');
  const camera=new THREE.OrthographicCamera(-600,600,430,-430,1,5000);
  const center=new THREE.Vector3(540,0,570),target=new THREE.Vector3();
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
  const hemi=new THREE.HemisphereLight('#fff9e8','#8f9f86',2.0);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff0d5',2.4);sun.position.set(200,1400,300);sun.target.position.set(1100,0,550);sun.castShadow=true;
  sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-1600,right:1600,top:1200,bottom:-1200,near:1,far:3500});sun.shadow.bias=-.0005;sun.shadow.normalBias=1;scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#d7efe8',.7);fill.position.set(700,500,1100);scene.add(fill);
  const mats=new Map();
  function material(color,extra={}){const key=color+JSON.stringify(extra);if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.72,...extra}));return mats.get(key);}
  function mesh(geo,color,parent=scene,extra={}){const m=new THREE.Mesh(geo,material(color,extra));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(x,y,z,w,h,d,color,parent=scene){const m=mesh(new THREE.BoxGeometry(w,h,d),color,parent);m.position.set(x,y+h/2,z);return m;}
  function sphere(x,y,z,r,color,parent=scene,scale=[1,1,1]){const m=mesh(new THREE.SphereGeometry(r,18,12),color,parent);m.position.set(x,y,z);m.scale.set(...scale);return m;}
  function cylinder(x,y,z,rt,rb,h,color,parent=scene,segments=16){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,segments),color,parent);m.position.set(x,y+h/2,z);return m;}
  function group(x,y,z,parent=scene){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
  const labelCache=new Map();
  function textSprite(text,color='#506a55',size=11){
    const key=text+color+size;
    let texture=labelCache.get(key);
    if(!texture){const c=document.createElement('canvas');c.width=512;c.height=64;const c2=c.getContext('2d');c2.font=`600 ${size*2}px sans-serif`;c2.textAlign='center';c2.textBaseline='middle';c2.fillStyle=color;c2.fillText(text,256,32);texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;labelCache.set(key,texture);}
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.scale.set(225,28,1);return sprite;
  }
  function label(text,x,y,z,color,size){const s=textSprite(text,color,size);s.position.set(x,y,z);scene.add(s);return s;}
  function plank(x,y,z,w,d,parent=scene){box(x,y,z,w,13,d,'#b58d61',parent);box(x,y+13,z,w+5,5,d+3,'#cfaa7a',parent);}
  function leaf(parent,x,y,z,angle,scale=1){const m=sphere(x,y,z,12,'#689c4e',parent,[.5*scale,.15*scale,1.6*scale]);m.rotation.y=angle;m.rotation.z=.25;return m;}
  // A single instanced mesh keeps the tiled kitchen light on mobile GPUs.
  box(WORLD.w/2,-25,WORLD.h/2,WORLD.w+300,20,WORLD.h+300,'#d2c7ad');
  const tileGeometry=new THREE.BoxGeometry(137,5,137),tileMaterial=material('#e6dac0');
  const cols=Math.ceil(WORLD.w/140),rows=Math.ceil(WORLD.h/140),count=cols*rows,tiles=new THREE.InstancedMesh(tileGeometry,tileMaterial,count),matrix=new THREE.Matrix4();let tileIndex=0;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){matrix.makeTranslation(x*140+70,-3,y*140+70);tiles.setMatrixAt(tileIndex,matrix);const zone=ZONES.find(z=>x*140>=z.min&&x*140<z.max);const c=new THREE.Color(zone?.color||'#ece2cb');if((x+y)%3===0)c.multiplyScalar(.96);tiles.setColorAt(tileIndex,c);tileIndex++;}
  tiles.receiveShadow=true;scene.add(tiles);
  // A dollhouse refrigerator: open roof, recessed lining, shelves and open door.
  box(470,-3,565,690,17,820,'#a9c2b5');box(470,12,565,630,10,745,'#dcebdd');
  box(470,22,187,660,170,32,'#d9e8dc');box(155,20,565,30,92,775,'#c5d9ce');
  box(782,20,340,30,85,340,'#c5d9ce');box(782,20,820,30,70,280,'#c5d9ce');
  // The front rim stays low, keeping the character and machines visible.
  box(470,22,947,650,21,25,'#b0c7b9');
  box(470,80,204,340,49,10,'#b0c6b7');for(let i=0;i<15;i++)box(330+i*20,89,211,8,28,7,'#789b88');
  box(225,90,211,54,33,8,'#e5f0db');label('4 °C',225,115,222,'#5f8974',12);
  const lamp=box(696,110,210,36,19,10,'#fff1b5');lamp.material=material('#fff2ba',{emissive:'#ffe9a1',emissiveIntensity:.5});
  for(const z of [385,700]){box(470,22,z,577,8,9,'#9fbfb0');box(470,30,z,577,3,12,'#e8f2e8');}
  const floorGrooves=new THREE.Group();scene.add(floorGrooves);for(let x=195;x<755;x+=36)box(x,22,565,1,1,700,'#cfdfcd',floorGrooves);
  const door=group(805,15,685);door.rotation.y=-.25;box(56,0,135,110,25,270,'#afc8b1',door);box(56,25,135,92,9,250,'#e4edda',door);
  for(const z of [65,145,225]){box(56,35,z,78,29,12,'#bfd2b1',door);box(56,35,z-19,78,6,38,'#dce6c9',door);}
  box(795,19,592,35,4,155,'#bdd3b9');
  // Eggs and milk establish the fridge's scale.
  box(294,23,324,128,22,65,'#b8b894');for(let i=0;i<4;i++)sphere(250+i*29,61,324,14,i%2?'#f3dfbc':'#fff1d7',scene,[.85,1.3,1]);
  box(628,23,326,62,76,65,'#f3f0d8');box(628,99,326,62,19,65,'#dae7cc');cylinder(640,118,326,8,8,8,'#8aaf83');box(628,54,360,58,25,1,'#afc7a2');label('LATTE',628,75,367,'#66875c',10);
  label('IL FRIGORIFERO',470,220,175,'#597f68',16);label('LA CUCINA',1210,22,210,'#ad956e',17);
  // Exterior obstacles share positions with the collision map.
  for(const s of SOLIDS.filter(s=>s.x>900&&s.x<4200)){
    if(!s.high){box(s.x+s.w/2,1,s.y+s.h/2,s.w,18,s.h,'#c6a16a');continue;}
    const isSponge=s.x===1600;box(s.x+s.w/2,0,s.y+s.h/2,s.w,isSponge?55:18,s.h,isSponge?'#c7b77d':'#c9a578');
    if(isSponge)box(s.x+s.w/2,55,s.y+s.h/2,s.w,8,s.h,'#8eab76');
    else for(let i=0;i<4;i++)box(s.x+25+i*35,18,s.y+s.h/2,1,1,s.h-15,'#af8c5f');
  }
  const gates=ZONES.slice(1).map(z=>{const root=group(z.min,0,0);for(let y=80;y<WORLD.h;y+=150){box(0,0,y,19,85,17,'#9aaf88',root);box(0,26,y+55,13,12,128,'#c4cfaa',root);box(0,57,y+55,13,12,128,'#c4cfaa',root);}const title=label(`${z.name.toUpperCase()} · LV.${z.level}`,z.min,145,650,'#688255',13);return{root,title,level:z.level};});
  for(const zone of ZONES.slice(1))label(zone.name.toUpperCase(),(zone.min+zone.max)/2,35,180,zone.id==='bosco'?'#72845e':'#8f8576',17);
  // The Iron Castle has a walkable courtyard and one southern entrance.
  box(4635,-1,805,800,9,930,'#b7b8aa');
  for(const s of SOLIDS.filter(s=>s.x>=4250)){
    const prison=s.x>=4505&&s.x<=4775&&s.y>=500&&s.y<=680;
    if(s.y===660)continue;
    box(s.x+s.w/2,8,s.y+s.h/2,s.w,prison?75:100,s.h,prison?'#7d8e8c':'#9daba0');
    if(!prison)for(let x=s.x+18;x<s.x+s.w;x+=55)box(x,108,s.y+s.h/2,28,24,s.h,'#b3bdb0');
  }
  for(const [x,z] of [[4270,370],[5000,370],[4270,1230],[5000,1230]]){
    cylinder(x,5,z,65,70,145,'#9eafa3',scene,12);const roof=mesh(new THREE.ConeGeometry(78,75,12),'#708780');roof.position.set(x,188,z);cylinder(x,225,z,3,3,52,'#b9b6a0');box(x+17,256,z,35,22,3,'#ba775c');
  }
  label('CASTELLO DEL FERRO',4635,205,350,'#5b7067',17);
  const bars=group(4640,8,670);for(let i=0;i<9;i++)cylinder(-115+i*29,0,0,3,3,85,'#526e70',bars,8);box(0,18,0,250,7,7,'#667c7a',bars);box(0,64,0,250,7,7,'#667c7a',bars);
  const prisonTarget=group(PRISON.x,10,PRISON.y);prisonTarget.userData.worldTarget={x:PRISON.x,y:PRISON.y};const targetBox=box(0,0,0,230,70,155,'#a3b7a0',prisonTarget);targetBox.visible=false;
  // A friendly carrot stays in the cell until rescued, then works or follows.
  const carrot=group(PRISON.x,20,PRISON.y),carrotBody=group(0,0,0,carrot);
  const carrotShape=mesh(new THREE.ConeGeometry(18,60,16),'#ef9b4f',carrotBody);carrotShape.rotation.z=Math.PI;carrotShape.position.y=35;
  for(let i=0;i<5;i++)leaf(carrotBody,(i-2)*4,70,0,(i-2)*.55,1.4);
  for(const x of [-6,6])sphere(x,47,15,2.2,'#48482d',carrotBody,[1,1,.5]);
  for(const x of [-7,7]){cylinder(x,0,0,2,2,12,'#6d814c',carrotBody);sphere(x,1,4,4,'#758e50',carrotBody,[1,.5,1.2]);}
  const carrotLabel=label('CAROTA · DA SALVARE',PRISON.x,115,PRISON.y,'#a27447',11);let carrotWasRescued=false;
  // Strawberry body is a genuine lathed mesh with dimensional seeds and leaves.
  const character=group(state.player.x,24,state.player.y),body=group(0,0,0,character);
  const profile=[[2,4],[10,8],[18,18],[24,31],[25,40],[21,49],[12,53],[0,51]].map(([r,y])=>new THREE.Vector2(r,y));
  mesh(new THREE.LatheGeometry(profile,32),'#e66154',body);
  for(let ring=0;ring<4;ring++)for(let i=0;i<9;i++){
    const angle=i/9*Math.PI*2+ring*.25,r=[12,20,24,22][ring],y=[12,23,36,46][ring];
    const m=sphere(Math.sin(angle)*(r+.4),y,Math.cos(angle)*(r+.4),2,'#ffe39c',body,[.65,1.2,.4]);m.rotation.y=angle;
  }
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;leaf(body,Math.sin(a)*10,54,Math.cos(a)*10,a,1.15);}
  const stem=cylinder(0,53,0,2,3,17,'#527c3f',body);stem.rotation.z=-.2;
  for(const x of [-8,8]){sphere(x,36,23,3,'#3e3c2a',body,[.85,1.25,.5]);sphere(x-.7,37,24.5,.9,'#fff8e8',body);sphere(x*1.7,29,21,3.5,'#f4947b',body,[1,.4,.3]);}
  const smile=new THREE.Mesh(new THREE.TorusGeometry(4,.65,6,12,Math.PI),material('#864437'));smile.position.set(0,29,24.5);smile.rotation.z=Math.PI;body.add(smile);
  const leftLeg=group(-10,4,0,character),rightLeg=group(10,4,0,character);
  for(const leg of [leftLeg,rightLeg]){cylinder(0,-13,0,2.2,2.2,16,'#6e804d',leg);sphere(0,-12,4,5,'#5a7043',leg,[1,.5,1.5]);}
  const leftArm=group(-25,29,0,body),rightArm=group(25,29,0,body);
  for(const arm of [leftArm,rightArm]){sphere(0,0,0,4,'#e27a61',arm,[.7,1.8,.7]);sphere(0,-7,2,5,'#eeb889',arm);}
  const punchHand=group(0,30,32,body);const forearm=cylinder(0,0,0,3,3,25,'#db795d',punchHand);forearm.rotation.x=Math.PI/2;
  sphere(0,0,18,10,'#efba8d',punchHand,[1,.8,1]);box(0,-2,23,14,9,9,'#f3cda7',punchHand);punchHand.visible=false;
  const characterLabel=label('FRAGOLINA · LV.1',state.player.x,115,state.player.y,'#5e7b54',11);let shownPlayerLevel=1;
  const playerAura=new THREE.Mesh(new THREE.RingGeometry(28,31,32),new THREE.MeshBasicMaterial({color:'#a2b67d',side:THREE.DoubleSide,transparent:true,opacity:.45}));playerAura.rotation.x=-Math.PI/2;playerAura.position.set(state.player.x,23,state.player.y);scene.add(playerAura);
  // Workshops are small physical dioramas, changing as each station grows.
  const pickables=[prisonTarget];
  const stationViews=state.stations.map(s=>{const root=group(s.x,25,s.y);root.userData.worldTarget={x:s.x,y:s.y};pickables.push(root);return{group:root,level:-1,label:null,piston:null,fire:null};});
  function disposeGroup(g){while(g.children.length){const child=g.children[0];g.remove(child);child.traverse(o=>{if(o.geometry)o.geometry.dispose();});}}
  function drawStation(s,v){
    disposeGroup(v.group);if(v.label){scene.remove(v.label);v.label.material.dispose();}
    v.level=s.level;v.piston=null;v.fire=null;
    if(!s.level){
      box(0,0,0,119,5,78,'#bacfb5',v.group);for(const x of [-52,52])for(const z of [-30,30])box(x,5,z,7,11,7,'#91aa88',v.group);
      const ghost=box(0,5,0,73,25,42,'#b7cbb0',v.group);ghost.material=material('#9fba94',{transparent:true,opacity:.4});
      labelPart('+',0,39,0,'#64895a',v.group);
    }else{
      const accent=s.level>=3?'#c2a35c':'#a6ba8c';
      if(s.id==='vivaio'){
        box(0,0,0,128,35,72,'#b18c64',v.group);box(0,35,0,119,5,63,'#6d6244',v.group);
        for(let i=0;i<Math.min(5,s.level+2);i++){const x=-44+i*88/(Math.min(5,s.level+2)-1);cylinder(x,39,0,2,2,35+s.level*2,'#769857',v.group);leaf(v.group,x-5,65,-3,-.7,1.1);leaf(v.group,x+6,72,4,.7,1.2);}
      }else if(s.id==='fontana'){
        cylinder(0,0,0,45,42,30,'#9fbcb0',v.group);cylinder(0,30,0,39,39,3,'#8fc8cd',v.group);cylinder(0,33,0,8,10,35,'#cedbd0',v.group);sphere(0,79,0,10,'#a8d9d8',v.group,[.6,1,.6]);
      }else if(s.id==='taglialegna'){
        for(const x of [-42,42])for(const z of [-23,23])box(x,0,z,8,36,8,'#806d4c',v.group);
        plank(0,35,0,133,72,v.group);const blade=mesh(new THREE.CylinderGeometry(25,25,3,24),'#a7b5ae',v.group);blade.position.set(0,62,0);blade.rotation.z=Math.PI/2;v.piston=blade;
        for(let i=0;i<3;i++)plank(-24+i*22,54,16,15,65,v.group);
      }else if(s.id==='spaccapietre'){
        box(0,0,0,120,20,72,'#a0aea7',v.group);for(const x of [-43,43])box(x,20,0,13,65,45,'#829f92',v.group);box(0,85,0,105,13,47,'#b2c4b6',v.group);
        v.piston=box(0,53,0,45,20,35,'#718b84',v.group);const rock=mesh(new THREE.DodecahedronGeometry(20),'#afb9ad',v.group);rock.position.set(0,37,0);
      }else{
        box(0,0,0,118,18,77,'#a09d8b',v.group);box(0,18,-5,94,66,62,'#a67f62',v.group);box(0,27,28,54,32,2,'#473c31',v.group);
        v.fire=sphere(0,42,31,14,'#ed9d47',v.group,[1,.7,.1]);v.fire.material=material('#f9a044',{emissive:'#ff722f',emissiveIntensity:1.2});cylinder(26,84,-10,13,16,39,'#8f9c91',v.group);
        box(-27,91,0,35,12,24,'#8a9990',v.group);
      }
      for(let i=0;i<s.level;i++)sphere(-24+i*12,8,43,3,accent,v.group);
    }
    v.label=label(`${s.name.toUpperCase()} · ${s.level?'LV.'+s.level:state.player.level<s.required?'BLOCCATA · LV.'+s.required:'DA COSTRUIRE'}`,s.x,s.level?145:90,s.y,'#617c57',10);
  }
  function labelPart(text,x,y,z,color,parent){const s=textSprite(text,color,24);s.scale.set(80,32,1);s.position.set(x,y,z);parent.add(s);}
  const enemyViews=state.enemies.map(e=>{
    const root=group(e.x,14,e.y),body=group(0,0,0,root);
    sphere(0,14,0,e.r,'#94a573',body,[1,.7,1]);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;sphere(Math.cos(a)*e.r*.7,8,Math.sin(a)*e.r*.7,e.r*.45,'#a0b381',body);}
    for(const x of [-8,8]){sphere(x,18,e.r*.85,3,'#455b38',body,[1,1.2,.4]);sphere(x,29,e.r*.7,4,'#bbcb9a',body,[1,.3,.5]);}
    if(e.guard){sphere(0,33,0,e.r*.9,'#899b9c',body,[1,.6,1]);box(0,28,e.r*.91,37,5,3,'#c3c9b3',body);box(23,7,10,7,37,30,'#a2ad9b',body);sphere(23,27,10,5,'#c4ab71',body);cylinder(0,43,0,3,5,20,'#ba795c',body);}
    const bar=box(0,e.r+30,0,49,4,3,'#71895e',root);const title=label(`${e.guard?'GUARDIA':'MUFFA'} · LV.${e.level}`,e.x,100,e.y,'#788458',10);
    return {root,body,bar,title,level:e.level};
  });
  const lootViews=state.loot.map(item=>{
    const root=group(item.x,20,item.y);
    if(item.type==='seeds'){const seed=sphere(0,0,0,8,'#e0bb70',root,[.65,1.2,.6]);seed.rotation.z=.4;sphere(-2,2,5,3,'#f9e5ac',root,[.5,1,.3]);}
    else{sphere(0,-1,0,8,'#8fcad2',root,[.85,1,.85]);const tip=mesh(new THREE.ConeGeometry(7,14,16),'#9cd7de',root);tip.position.set(0,9,0);}
    return root;
  });
  const nodeViews=state.nodes.map(n=>{
    const root=group(n.x,0,n.y);
    root.userData.worldTarget={x:n.x,y:n.y};pickables.push(root);
    if(n.type==='wood'){
      cylinder(0,0,0,9,15,85,'#a37a4c',root);sphere(0,113,0,47,'#829e63',root,[1,1.15,1]);sphere(-27,95,0,31,'#9ab478',root);sphere(26,104,13,33,'#91ad6b',root);sphere(0,122,-25,31,'#a5bc82',root);
    }else{
      const rock=mesh(new THREE.DodecahedronGeometry(30,0),n.type==='ore'?'#858e88':'#adb5a6',root);rock.position.y=23;rock.scale.set(1,.8,.9);
      if(n.type==='ore')for(let i=0;i<4;i++)box(-15+i*9,28+i%2*12,15,7,8,5,'#d0a06c',root);
    }
    const title=textSprite(`${n.type==='wood'?'ALBERO':n.type==='stone'?'PIETRA':'MINERALE'} · LV.${RESOURCE_UNLOCK[n.type]}`,'#978565',9);title.position.set(0,n.type==='wood'?190:68,0);root.add(title);return root;
  });
  const marker=new THREE.Mesh(new THREE.RingGeometry(12,15,24),new THREE.MeshBasicMaterial({color:'#6d9864',transparent:true,opacity:.65,side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;scene.add(marker);
  const particleGeometry=new THREE.BufferGeometry(),positions=new Float32Array(1200*3),colors=new Float32Array(1200*3);
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));particleGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const particles=new THREE.Points(particleGeometry,new THREE.PointsMaterial({size:5,vertexColors:true,transparent:true,opacity:.8}));particles.frustumCulled=false;scene.add(particles);const color=new THREE.Color();
  function resize(){
    const {width,height}=canvas.getBoundingClientRect();renderer.setSize(width,height,false);
    const span=width<600?720:950,aspect=width/Math.max(1,height);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
  }
  function render(dt=0){
    const p=state.player,t=state.clock,z=game.jumpHeight(),walking=p.walking?Math.sin(t*14):0;
    target.set(p.x+60,0,p.y-15);center.lerp(target,Math.min(1,dt*5));camera.position.set(center.x+150,1050,center.z+800);camera.lookAt(center.x,0,center.z);camera.updateMatrixWorld();
    character.position.set(p.x,24+z+walking*1.5,p.y);character.rotation.y=Math.atan2(p.punch?p.punchX:p.aimX,p.punch?p.punchY:p.aimY);
    leftLeg.rotation.x=walking*.5;rightLeg.rotation.x=-walking*.5;leftArm.rotation.x=-walking*.35;rightArm.rotation.x=walking*.35;
    body.scale.setScalar(p.invulnerable>0&&Math.floor(t*12)%2===0?.92:1);
    punchHand.visible=p.punch>0;rightArm.visible=!punchHand.visible;if(punchHand.visible)punchHand.position.z=28+Math.sin((1-p.punch/.28)*Math.PI)*36;
    characterLabel.position.set(p.x,119+z,p.y);if(shownPlayerLevel!==p.level){characterLabel.material.map=textSprite(`FRAGOLINA · LV.${p.level}`,'#5e7b54',11).material.map;shownPlayerLevel=p.level;}
    playerAura.position.set(p.x,24,p.y);playerAura.material.color.set(p.health/maxHealth(p.level)<.3?'#d7835e':'#9fb77b');
    state.stations.forEach((s,i)=>{const v=stationViews[i];if(s.level!==v.level||v.playerLevel!==p.level){drawStation(s,v);v.playerLevel=p.level;}if(s.job&&v.piston){if(s.id==='taglialegna')v.piston.rotation.y=t*10;else v.piston.position.y=63+Math.sin(t*6)*12;}if(v.fire)v.fire.scale.y=.7+Math.sin(t*7)*.08;});
    state.enemies.forEach((e,i)=>{const v=enemyViews[i];v.root.visible=v.title.visible=e.health>0;if(e.health<=0)return;v.root.position.set(e.x,14+Math.sin(t*3+e.phase)*3,e.y);v.root.rotation.y=Math.atan2(p.x-e.x,p.y-e.y);v.body.scale.setScalar(1+(e.level-1)*.035);v.bar.scale.x=Math.max(.01,e.health/e.maxHealth);v.title.position.set(e.x,110,e.y);if(v.level!==e.level){v.title.material.map=textSprite(`${e.guard?'GUARDIA':'MUFFA'} · LV.${e.level}`,'#788458',10).material.map;v.level=e.level;}});
    gates.forEach(g=>{g.root.visible=g.title.visible=p.level<g.level;});bars.visible=!state.rescued;
    if(state.rescued){
      let cx=p.x-65,cz=p.y+50;
      const station=state.stations.find(s=>s.id===state.carrotJob),node=state.nodes.find(n=>n.type===state.carrotJob&&n.hits>0);
      if(station){cx=station.x;cz=station.y+80;}else if(node){cx=node.x+60;cz=node.y;}
      carrot.position.lerp(new THREE.Vector3(cx,24,cz),Math.min(1,dt*3));carrot.rotation.y=Math.atan2(p.x-carrot.position.x,p.y-carrot.position.z);carrotBody.rotation.z=Math.sin(t*4)*.04;
      if(!carrotWasRescued){carrot.position.set(p.x-65,24,p.y+50);carrotLabel.material.map=textSprite('CAROTA · AIUTANTE','#a27447',11).material.map;carrotWasRescued=true;}
    }else{carrot.position.set(PRISON.x,20,PRISON.y);carrotWasRescued=false;}
    carrotLabel.position.set(carrot.position.x,120,carrot.position.z);
    state.loot.forEach((item,i)=>{const root=lootViews[i];root.visible=item.active;root.position.y=24+Math.sin(t*2.5+item.phase)*4;root.rotation.y=t*.6+item.phase;});
    state.nodes.forEach((n,i)=>{nodeViews[i].visible=n.hits>0;});
    marker.visible=!!state.destination;if(marker.visible)marker.position.set(state.destination.x,25,state.destination.y);
    const count=Math.min(1200,state.particles.length);for(let i=0;i<count;i++){const p=state.particles[i];positions[i*3]=p.x;positions[i*3+1]=25+(1-p.life/p.max)*65;positions[i*3+2]=p.y;color.set(p.color);colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;}
    particleGeometry.setDrawRange(0,count);particleGeometry.attributes.position.needsUpdate=true;particleGeometry.attributes.color.needsUpdate=true;
    renderer.render(scene,camera);
  }
  function pick(clientX,clientY){const r=canvas.getBoundingClientRect();pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(pickables,true).find(h=>{let node=h.object;while(node){if(!node.visible)return false;node=node.parent;}return true;});if(hit){let o=hit.object;while(o){if(o.userData.worldTarget)return o.userData.worldTarget;o=o.parent;}}return raycaster.ray.intersectPlane(ground,point)?{x:point.x,y:point.z}:null;}
  // Convert screen-space controls into the horizontal plane seen by the camera.
  function direction(x,y){const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3(-forward.z,0,forward.x);return {x:right.x*x-forward.x*y,y:right.z*x-forward.z*y};}
  resize();render();
  return {render,resize,pick,direction,renderer};
}
