import * as THREE from './vendor/three.module.min.js';

const canvas = document.getElementById('devices');
const container = document.getElementById('hero-visual');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function roundedShape(width, height, radius) {
  const x = -width / 2, y = -height / 2;
  const s = new THREE.Shape();
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + height - radius);
  s.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  s.lineTo(x + radius, y + height);
  s.quadraticCurveTo(x, y + height, x, y + height - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

async function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(0, 0, 14);
  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9c978d, 3.8));
  const key = new THREE.DirectionalLight(0xffffff, 4.5);
  key.position.set(-3, 5, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb7c9ff, 2.5);
  rim.position.set(5, 1, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffdfbd, 1.4);
  fill.position.set(-3, -3, 4); scene.add(fill);
  const textureLoader = new THREE.TextureLoader();
  const [paTexture, lingoTexture] = await Promise.all([
    textureLoader.loadAsync('assets/pa-analysis.png'),
    textureLoader.loadAsync('assets/lingo-home.png')
  ]);
  [paTexture, lingoTexture].forEach(t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  });
  const screenWidth = 2.21, screenHeight = 4.80;
  const bodyGeometry = new THREE.ExtrudeGeometry(roundedShape(2.39, 4.98, .32), { depth: .20, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: .045, bevelThickness: .035, curveSegments: 16 });
  bodyGeometry.translate(0, 0, -.10);
  const bezelGeometry = new THREE.ShapeGeometry(roundedShape(2.30, 4.89, .29), 20);
  const screenGeometry = new THREE.ShapeGeometry(roundedShape(screenWidth, screenHeight, .25), 24);
  const pos = screenGeometry.attributes.position;
  const uv = screenGeometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + screenWidth / 2) / screenWidth, (pos.getY(i) + screenHeight / 2) / screenHeight);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x838589, metalness: .8, roughness: .25 });
  const bezelMat = new THREE.MeshBasicMaterial({ color: 0x090a0c });
  const buttonMat = new THREE.MeshStandardMaterial({ color: 0xb3b5b8, metalness: .7, roughness: .3 });
  function phone(texture) {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(bodyGeometry, bodyMat));
    const bezel = new THREE.Mesh(bezelGeometry, bezelMat); bezel.position.z = .143; group.add(bezel);
    const display = new THREE.Mesh(screenGeometry, new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    display.position.z = .147; group.add(display);
    const side = new THREE.Mesh(new THREE.BoxGeometry(.065, .50, .085), buttonMat);
    side.position.set(1.238, .64, 0); group.add(side);
    const volume = new THREE.Mesh(new THREE.BoxGeometry(.065, .28, .085), buttonMat);
    volume.position.set(-1.238, .76, 0); group.add(volume);
    const volume2 = volume.clone(); volume2.position.y = .30; group.add(volume2);
    const back = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(2.28, 4.88, .28)), new THREE.MeshStandardMaterial({ color: 0x6b7079, metalness: .65, roughness: .3, side: THREE.DoubleSide }));
    back.position.z = -.141; group.add(back);
    for (const [x,y] of [[-.68,1.83],[-.27,1.47],[-.69,1.08]]) {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .08, 24), bezelMat);
      lens.rotation.x = Math.PI / 2; lens.position.set(x,y,-.20); group.add(lens);
    }
    return group;
  }
  const pa = phone(paTexture), lingo = phone(lingoTexture);
  root.add(pa, lingo);
  pa.position.set(-1.12, .42, -.5); pa.rotation.set(.10, -.28, .20);
  lingo.position.set(1.18, -.36, .65); lingo.rotation.set(-.07, -.22, -.16);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64,64,0,64,64,62);
  gradient.addColorStop(0,'rgba(27,29,24,.22)'); gradient.addColorStop(.45,'rgba(27,29,24,.10)'); gradient.addColorStop(1,'rgba(27,29,24,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0,0,128,128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7,1.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.position.set(.25,-3.22,-1.4); scene.add(shadow);
  let inView=true, frame=0, lastRender=0, dragging=false;
  let previousX=0, previousY=0;
  let targetX=0, targetY=0, driftX=0, driftY=0;
  const resize = () => {
    const width=container.clientWidth, height=container.clientHeight;
    if (!width || !height) return;
    camera.aspect=width/height;
    const fitWidth = 6.4 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    camera.position.z = Math.max(13.7, fitWidth);
    camera.updateProjectionMatrix(); renderer.setSize(width,height,false); render(0);
  };
  function render(time) {
    const t = reduced.matches ? 0 : time * .001;
    root.rotation.y += (targetX + driftX - root.rotation.y) * .075;
    root.rotation.x += (targetY + driftY - root.rotation.x) * .075;
    pa.position.y=.42 + Math.sin(t*.75)*.06;
    lingo.position.y=-.36 + Math.sin(t*.7+2)*.07;
    renderer.render(scene,camera);
  }
  function animate(time) {
    frame=0;
    if (!inView || document.hidden) return;
    if(time-lastRender>1000/40){ render(time); lastRender=time; }
    if(!reduced.matches || dragging || Math.abs(root.rotation.y-targetX)>.002 || Math.abs(root.rotation.x-targetY)>.002) frame=requestAnimationFrame(animate);
  }
  function wake(){if(!frame) frame=requestAnimationFrame(animate);}
  function reset(){targetX=targetY=driftX=driftY=0;wake();}
  canvas.addEventListener('pointerdown', e => {
    dragging=true;previousX=e.clientX;previousY=e.clientY;
    canvas.setPointerCapture(e.pointerId);wake();
  });
  canvas.addEventListener('pointermove', e => {
    if(e.pointerType!=='mouse' && !dragging) return;
    if(dragging){targetX=Math.max(-1.1,Math.min(1.1,targetX+(e.clientX-previousX)*.006));targetY=Math.max(-.42,Math.min(.42,targetY+(e.clientY-previousY)*.003));previousX=e.clientX;previousY=e.clientY;}
    else if(!reduced.matches){const b=canvas.getBoundingClientRect();driftX=((e.clientX-b.left)/b.width-.5)*.18;driftY=((e.clientY-b.top)/b.height-.5)*.10;}
    wake();
  });
  canvas.addEventListener('pointerup',()=>{dragging=false;});
  canvas.addEventListener('pointercancel',()=>{dragging=false;});
  canvas.addEventListener('pointerleave',()=>{driftX=driftY=0;wake();});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','r','R'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')targetX-=.12;if(e.key==='ArrowRight')targetX+=.12;if(e.key==='ArrowUp')targetY-=.08;if(e.key==='ArrowDown')targetY+=.08;if(e.key.toLowerCase()==='r')reset();targetX=Math.max(-1.1,Math.min(1.1,targetX));targetY=Math.max(-.42,Math.min(.42,targetY));wake();}});
  document.getElementById('reset-scene').addEventListener('click',reset);
  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)wake();},{rootMargin:'80px'}).observe(container);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});
  reduced.addEventListener('change',reset);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();container.classList.remove('ready');document.getElementById('scene-controls').hidden=true;});
  resize();container.classList.add('ready');document.getElementById('scene-controls').hidden=false;wake();
}

init().catch(error=>{
  console.warn('3D preview unavailable; showing original app screenshots.',error.message);
  canvas.hidden=true;
});
