import {
  BackSide,
  BoxGeometry,
  CylinderGeometry,
  DistanceGrabbable,
  GrabSystem,
  Grabbed,
  Group,
  Mesh,
  MeshBasicMaterial,
  MovementMode,
  Object3D,
  RayInteractable,
  SphereGeometry,
  TorusGeometry,
  UIKitMLAsset,
  VideoTexture,
  World,
} from '@iwsdk/core';

import projectOptions from 'virtual:iwsdk-project';

type ReactorPart = {
  id: string;
  name: string;
  object: Group;
  entity: ReturnType<World['createTransformEntity']>;
  material: MeshBasicMaterial;
  normalColor: number;
  startPosition: [number, number, number];
  targetPosition: [number, number, number];
  targetSocket: string;
  installed: boolean;
  wasGrabbed: boolean;
};

type ReactorSocket = {
  id: string;
  object: Group;
  ringMaterial: MeshBasicMaterial;
  normalColor: number;
  nearbyColor: number;
  entity: ReturnType<World['createTransformEntity']>;
};

const container = document.getElementById('scene-container');

if (!(container instanceof HTMLDivElement)) {
  throw new Error('Missing #scene-container');
}

const isVideoDemo = new URLSearchParams(window.location.search).get('demo') === 'video';

type VideoExperience = {
  id: string;
  title: string;
  file: string;
  source: string;
  creator: string;
  sourceUrl: string;
  license: string;
};

const experiences: VideoExperience[] = [
  {
    id: 'nature',
    title: 'Nature',
    file: 'videos/nature-360.mp4',
    source: 'Pixabay',
    creator: 'JosephSenior',
    sourceUrl: 'https://pixabay.com/videos/aerial-view-wilderness-land-skyline-110941/',
    license: 'Pixabay Content License',
  },
  {
    id: 'city',
    title: 'Drone / Landscape',
    file: 'videos/city-360.mp4',
    source: 'Pixabay',
    creator: 'Galaxy7894',
    sourceUrl: 'https://pixabay.com/videos/footage-drone-flying-shot-110116/',
    license: 'Pixabay Content License',
  },
  {
    id: 'space',
    title: 'Earth & Space',
    file: 'videos/space-360.mp4',
    source: 'Pixabay',
    creator: 'ChristianBodhi',
    sourceUrl: 'https://pixabay.com/videos/earth-galaxy-stars-globe-universe-64349/',
    license: 'Pixabay Content License',
  },
];

const panel = document.createElement('aside');
panel.innerHTML = `
  <div class="eyebrow">META WEBXR</div>
  <h1>SPATIAL REACTOR LAB</h1>
  <div class="progress-label"><span>ASSEMBLY PROGRESS</span><strong id="progress-count">0 / 3</strong></div>
  <div class="progress-track"><div id="progress-fill"></div></div>
  <ul id="parts-list"></ul>
  <p id="status-message">Look at a component and pinch or click to select it.</p>
  <button id="reset-button" type="button">RESET ASSEMBLY</button>
`;
Object.assign(panel.style, {
  position: 'fixed',
  top: '24px',
  left: '24px',
  width: 'min(320px, calc(100vw - 48px))',
  padding: '22px',
  color: '#e8fbff',
  background: 'linear-gradient(145deg, rgba(7, 19, 31, .94), rgba(10, 36, 48, .86))',
  border: '1px solid rgba(96, 224, 255, .45)',
  borderRadius: '14px',
  boxShadow: '0 18px 60px rgba(0, 0, 0, .4)',
  fontFamily: 'Trebuchet MS, sans-serif',
  zIndex: '10',
});
const panelStyle = document.createElement('style');
panelStyle.textContent = `
  aside .eyebrow { color: #58dcff; letter-spacing: .22em; font-size: 11px; font-weight: bold; }
  aside h1 { margin: 7px 0 22px; font-size: 21px; letter-spacing: .08em; }
  .progress-label { display: flex; justify-content: space-between; color: #91b9c5; font-size: 11px; letter-spacing: .08em; }
  .progress-label strong { color: #f5ffff; font-size: 13px; }
  .progress-track { height: 6px; margin: 9px 0 18px; background: #173542; border-radius: 4px; overflow: hidden; }
  #progress-fill { width: 0%; height: 100%; background: #49f0b3; transition: width .3s ease; }
  #parts-list { list-style: none; padding: 0; margin: 0 0 18px; }
  #parts-list li { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid rgba(120, 190, 205, .18); color: #abc8ce; font-size: 13px; }
  #parts-list li.done { color: #62f2b4; }
  #status-message { min-height: 36px; margin: 0 0 18px; color: #b4d6dc; font-size: 13px; line-height: 1.4; }
  #reset-button { width: 100%; padding: 10px; border: 1px solid #4bdcf4; border-radius: 7px; color: #dfffff; background: rgba(31, 115, 137, .35); font: inherit; font-size: 12px; letter-spacing: .12em; cursor: pointer; }
  #reset-button:hover { background: rgba(56, 180, 199, .55); }
`;
document.head.appendChild(panelStyle);
document.body.appendChild(panel);
if (isVideoDemo) panel.style.display = 'none';

const progressCount = panel.querySelector('#progress-count');
const progressFill = panel.querySelector('#progress-fill');
const partsList = panel.querySelector('#parts-list');
const statusMessage = panel.querySelector('#status-message');
const resetButton = panel.querySelector('#reset-button');

if (!(progressCount instanceof HTMLElement) || !(progressFill instanceof HTMLElement) ||
    !(partsList instanceof HTMLUListElement) || !(statusMessage instanceof HTMLElement) ||
    !(resetButton instanceof HTMLButtonElement)) {
  throw new Error('Reactor status panel failed to initialize');
}

const setStatus = (message: string): void => {
  statusMessage.textContent = message;
};

const setMaterialColor = (material: MeshBasicMaterial, color: number): void => {
  material.color.setHex(color);
};

const createMaterial = (color: number, opacity = 1): MeshBasicMaterial =>
  new MeshBasicMaterial({ color, transparent: opacity < 1, opacity });

const addMesh = (parent: Object3D, geometry: BoxGeometry | CylinderGeometry | SphereGeometry | TorusGeometry, material: MeshBasicMaterial): Mesh => {
  const mesh = new Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
};

const setupVideoDemo = (world: World): void => {
  const desktopPanel = document.createElement('aside');
  desktopPanel.innerHTML = `
    <div class="video-eyebrow">META WEBXR</div>
    <h1>360 EXPERIENCE GALLERY</h1>
    <div class="video-label">CHOOSE EXPERIENCE</div>
    <div class="video-experiences">
      ${experiences.map((experience) => `<button class="experience-button" data-experience="${experience.id}" type="button">${experience.title}</button>`).join('')}
    </div>
    <div id="desktop-video-selected" class="video-selected"></div>
    <button id="desktop-video-enter" type="button">ENTER XR</button>
    <button id="desktop-video-start" type="button">START VIDEO</button>
    <button id="desktop-video-stop" type="button">STOP VIDEO</button>
    <p id="desktop-video-status">Status: READY</p>
    <div id="desktop-video-attribution" class="video-attribution"></div>
  `;
  Object.assign(desktopPanel.style, {
    position: 'fixed',
    left: '24px',
    bottom: '24px',
    width: 'min(340px, calc(100vw - 48px))',
    padding: '20px',
    color: '#e8fbff',
    background: 'rgba(7, 19, 31, .92)',
    border: '1px solid rgba(85, 223, 242, .55)',
    borderRadius: '12px',
    boxShadow: '0 18px 60px rgba(0, 0, 0, .4)',
    fontFamily: 'Trebuchet MS, sans-serif',
    zIndex: '10',
  });
  const desktopStyle = document.createElement('style');
  desktopStyle.textContent = `
    .video-eyebrow { color: #55dff2; letter-spacing: .18em; font-size: 11px; font-weight: bold; }
    aside h1 { margin: 7px 0 16px; font-size: 19px; letter-spacing: .06em; }
    .video-label { color: #a9d9df; font-size: 11px; letter-spacing: .12em; }
    .video-experiences { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px; }
    .experience-button { min-height: 42px; padding: 6px; border: 1px solid rgba(85, 223, 242, .55); border-radius: 7px; color: #e8fbff; background: rgba(31, 115, 137, .25); font: inherit; font-size: 11px; cursor: pointer; }
    .experience-button.selected { color: #06222b; background: #72e8ef; }
    .video-selected { margin-top: 10px; color: #f2ffff; font-size: 14px; font-weight: bold; }
    #desktop-video-enter, #desktop-video-start, #desktop-video-stop { width: 100%; margin-top: 8px; padding: 10px; border: 1px solid #55dff2; border-radius: 7px; color: #e8fbff; background: rgba(31, 115, 137, .35); font: inherit; font-size: 12px; letter-spacing: .1em; cursor: pointer; }
    #desktop-video-enter:hover, #desktop-video-start:hover, #desktop-video-stop:hover { background: rgba(56, 180, 199, .55); }
    #desktop-video-status { margin: 14px 0 0; color: #a9d9df; font-size: 13px; }
    .video-attribution { margin-top: 12px; color: #82b4bd; font-size: 11px; line-height: 1.4; }
  `;
  document.head.appendChild(desktopStyle);
  document.body.appendChild(desktopPanel);

  const desktopEnter = desktopPanel.querySelector('#desktop-video-enter');
  const desktopStart = desktopPanel.querySelector('#desktop-video-start');
  const desktopStop = desktopPanel.querySelector('#desktop-video-stop');
  const desktopStatus = desktopPanel.querySelector('#desktop-video-status');
  const desktopSelected = desktopPanel.querySelector('#desktop-video-selected');
  const desktopAttribution = desktopPanel.querySelector('#desktop-video-attribution');
  const desktopExperienceButtons = desktopPanel.querySelectorAll<HTMLButtonElement>('[data-experience]');
  if (!(desktopEnter instanceof HTMLButtonElement) || !(desktopStart instanceof HTMLButtonElement) || !(desktopStop instanceof HTMLButtonElement) ||
      !(desktopStatus instanceof HTMLElement) || !(desktopSelected instanceof HTMLElement) || !(desktopAttribution instanceof HTMLElement)) {
    throw new Error('360 video desktop controls failed to initialize');
  }

  const video = document.createElement('video');
  video.loop = true;
  video.preload = 'auto';
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.style.display = 'none';

  const videoTexture = new VideoTexture(video);
  const videoSphere = new Mesh(
    new SphereGeometry(20, 64, 40),
    new MeshBasicMaterial({ map: videoTexture, side: BackSide }),
  );
  videoSphere.position.set(0, 1.6, 0);
  world.createTransformEntity(videoSphere);

  const reactorPanel = world.getSceneObject<UIKitMLAsset>('reactor-status-panel');
  const xrPanel = world.getSceneObject<UIKitMLAsset>('video-control-panel');
  if (reactorPanel) reactorPanel.visible = false;
  if (xrPanel) xrPanel.visible = true;
  const xrSelected = xrPanel?.getElementById('video-selected');
  const xrExperienceButtons = [
    ['nature', xrPanel?.getElementById('video-nature')],
    ['city', xrPanel?.getElementById('video-city')],
    ['space', xrPanel?.getElementById('video-space')],
  ] as const;
  const xrStart = xrPanel?.getElementById('video-start');
  const xrStop = xrPanel?.getElementById('video-stop');
  const xrStatus = xrPanel?.getElementById('video-status');

  let selectedExperience = experiences[0];

  const setVideoStatus = (status: 'LOADING' | 'READY' | 'PLAYING' | 'STOPPED' | 'ERROR'): void => {
    desktopStatus.textContent = `Status: ${status}`;
    xrStatus?.setProperties({ text: `Status: ${status}` });
  };

  const updateExperienceUI = (): void => {
    desktopSelected.textContent = `Selected: ${selectedExperience.title}`;
    desktopAttribution.innerHTML = `Source: ${selectedExperience.source}<br>Creator: ${selectedExperience.creator}<br>License: ${selectedExperience.license}`;
    desktopExperienceButtons.forEach((button) => {
      button.classList.toggle('selected', button.dataset.experience === selectedExperience.id);
    });
    xrSelected?.setProperties({ text: `Selected: ${selectedExperience.title}` });
    xrExperienceButtons.forEach(([id, button]) => {
      button?.setProperties({
        backgroundColor: id === selectedExperience.id ? '#55dff2' : '#163d4b',
        color: id === selectedExperience.id ? '#06222b' : '#ecfeff',
      });
    });
  };

  const selectExperience = (id: string): void => {
    const experience = experiences.find((candidate) => candidate.id === id);
    if (!experience) return;
    video.pause();
    video.currentTime = 0;
    selectedExperience = experience;
    video.src = `${import.meta.env.BASE_URL}${experience.file}`;
    video.load();
    videoTexture.needsUpdate = true;
    updateExperienceUI();
    setVideoStatus('LOADING');
    console.log(`Selected experience: ${experience.title}`);
  };

  const stopVideo = (): void => {
    video.pause();
    video.currentTime = 0;
    setVideoStatus('STOPPED');
    console.log('360 video stopped');
  };

  const startVideo = async (): Promise<void> => {
    video.currentTime = 0;
    try {
      await video.play();
      setVideoStatus('PLAYING');
      console.log('360 video started');
    } catch (error) {
      setVideoStatus('ERROR');
      console.error('360 video error', error);
    }
  };

  video.addEventListener('canplay', () => {
    setVideoStatus('READY');
    console.log('360 video ready');
  });
  video.addEventListener('error', () => {
    setVideoStatus('ERROR');
    console.error('360 video error', video.error);
  });
  desktopStart.addEventListener('click', startVideo);
  desktopStop.addEventListener('click', stopVideo);
  desktopEnter.addEventListener('click', () => world.launchXR());
  desktopExperienceButtons.forEach((button) => {
    const experienceId = button.dataset.experience;
    if (experienceId) button.addEventListener('click', () => selectExperience(experienceId));
  });
  xrStart?.addEventListener('click', startVideo);
  xrStop?.addEventListener('click', stopVideo);
  xrExperienceButtons.forEach(([id, button]) => {
    button?.addEventListener('click', () => selectExperience(id));
  });
  updateExperienceUI();
  selectExperience(selectedExperience.id);
};

World.create(container, projectOptions)
  .then((world) => {
    if (isVideoDemo) {
      setupVideoDemo(world);
      return;
    }
    const videoPanel = world.getSceneObject<UIKitMLAsset>('video-control-panel');
    if (videoPanel) videoPanel.visible = false;
    console.log('IWSDK world ready');
    world.camera.position.set(0, 1.6, 0);
    world.camera.lookAt(0, 1.45, -3);
    const configuredGrabSystem = world.getSystem(GrabSystem);
    if (configuredGrabSystem) {
      configuredGrabSystem.config.useHandPinchForGrab.value = true;
    } else {
      world.registerSystem(GrabSystem, { configData: { useHandPinchForGrab: true } });
    }

    const sceneRoot = new Group();
    sceneRoot.position.set(0, 0, 0);
    world.createTransformEntity(sceneRoot);

    const floor = addMesh(new Group(), new CylinderGeometry(1.75, 1.75, 0.08, 64), createMaterial(0x091a28));
    floor.position.set(0, 0.04, -3);
    sceneRoot.add(floor.parent!);
    const floorRing = addMesh(new Group(), new TorusGeometry(1.62, 0.018, 8, 64), createMaterial(0x1b7182));
    floorRing.rotation.x = Math.PI / 2;
    floorRing.position.set(0, 0.09, -3);
    sceneRoot.add(floorRing.parent!);

    const base = new Group();
    base.position.set(0, 1, -3);
    addMesh(base, new CylinderGeometry(0.88, 1.02, 0.34, 48), createMaterial(0x102b3d));
    addMesh(base, new TorusGeometry(0.78, 0.035, 10, 48), createMaterial(0x3bb3c8)).rotation.x = Math.PI / 2;
    addMesh(base, new CylinderGeometry(0.52, 0.62, 0.16, 48), createMaterial(0x1d4555)).position.y = 0.2;
    sceneRoot.add(base);

    const sockets = new Map<string, ReactorSocket>();
    const createSocket = (id: string, position: [number, number, number]): ReactorSocket => {
      const socket = new Group();
      socket.position.set(...position);
      const socketColors = id === 'core-socket'
        ? { normalColor: 0x176d88, nearbyColor: 0x7fffe0 }
        : id === 'power-socket'
          ? { normalColor: 0x9a5d26, nearbyColor: 0xffdf83 }
          : { normalColor: 0x963d75, nearbyColor: 0xffa7d5 };
      const ringMaterial = createMaterial(socketColors.normalColor, 0.88);
      const cavityMaterial = createMaterial(0x102631, 0.95);

      if (id === 'core-socket') {
        addMesh(socket, new TorusGeometry(0.28, 0.035, 10, 32), ringMaterial).rotation.x = Math.PI / 2;
        addMesh(socket, new CylinderGeometry(0.2, 0.2, 0.04, 32), cavityMaterial);
      } else if (id === 'power-socket') {
        addMesh(socket, new BoxGeometry(0.52, 0.06, 0.06), ringMaterial).position.z = -0.18;
        addMesh(socket, new BoxGeometry(0.52, 0.06, 0.06), ringMaterial).position.z = 0.18;
        addMesh(socket, new BoxGeometry(0.06, 0.06, 0.30), ringMaterial).position.x = -0.23;
        addMesh(socket, new BoxGeometry(0.06, 0.06, 0.30), ringMaterial).position.x = 0.23;
        addMesh(socket, new BoxGeometry(0.40, 0.04, 0.26), cavityMaterial);
      } else {
        addMesh(socket, new CylinderGeometry(0.28, 0.21, 0.06, 6), ringMaterial);
        addMesh(socket, new CylinderGeometry(0.20, 0.14, 0.065, 6), cavityMaterial);
        addMesh(socket, new BoxGeometry(0.05, 0.07, 0.30), ringMaterial).position.x = -0.18;
        addMesh(socket, new BoxGeometry(0.05, 0.07, 0.30), ringMaterial).position.x = 0.18;
      }
      sceneRoot.add(socket);
      const entity = world.createTransformEntity(socket).addComponent(RayInteractable);
      const result = { id, object: socket, ringMaterial, ...socketColors, entity };
      sockets.set(id, result);
      return result;
    };

    createSocket('core-socket', [0, 1.4, -3.34]);
    createSocket('power-socket', [-0.58, 1.24, -3.08]);
    createSocket('control-socket', [0.58, 1.24, -3.08]);

    const parts: ReactorPart[] = [];
    let selectedPart: ReactorPart | undefined;
    let installedParts = 0;
    let reactorOnline = false;
    const xrPanel = world.getSceneObject<UIKitMLAsset>('reactor-status-panel');
    const xrMode = xrPanel?.getElementById('xr-mode');
    const xrCount = xrPanel?.getElementById('xr-count');
    const xrCore = xrPanel?.getElementById('xr-core');
    const xrPower = xrPanel?.getElementById('xr-power');
    const xrControl = xrPanel?.getElementById('xr-control');
    const xrStatus = xrPanel?.getElementById('xr-status');

    const updateProgress = (): void => {
      progressCount.textContent = `${installedParts} / 3`;
      progressFill.style.width = `${(installedParts / 3) * 100}%`;
      partsList.innerHTML = parts.map((part) =>
        `<li class="${part.installed ? 'done' : ''}"><span>${part.name}</span><strong>${part.installed ? '✓' : '○'}</strong></li>`,
      ).join('');
      xrMode?.setProperties({ text: reactorOnline ? 'REACTOR ONLINE' : 'SPATIAL REACTOR LAB' });
      xrCount?.setProperties({ text: `ASSEMBLY ${installedParts} / 3` });
      xrCore?.setProperties({ text: `${parts[0]?.installed ? '[x]' : '[ ]'} Energy Core` });
      xrPower?.setProperties({ text: `${parts[1]?.installed ? '[x]' : '[ ]'} Power Module` });
      xrControl?.setProperties({ text: `${parts[2]?.installed ? '[x]' : '[ ]'} Control Module` });
      xrStatus?.setProperties({
        text: reactorOnline
          ? 'POWER OUTPUT 100% | STATUS STABLE'
          : 'Look at a component. Pinch and move it to its socket.',
      });
    };

    const installPart = (part: ReactorPart): void => {
      if (part.installed) return;
      part.object.position.set(...part.targetPosition);
      part.object.rotation.set(0, 0, 0);
      part.installed = true;
      installedParts += 1;
      setMaterialColor(part.material, 0x49f0b3);
      const socket = sockets.get(part.targetSocket);
      if (socket) setMaterialColor(socket.ringMaterial, 0x49f0b3);
      console.log(`${part.name} installed`);
      setStatus(`${part.name} installed`);
      selectedPart = undefined;
      updateProgress();
      if (installedParts === parts.length) {
        reactorOnline = true;
        setStatus('REACTOR ONLINE - Assembly complete');
        console.log('Reactor complete');
      }
    };

    const createPart = (part: Omit<ReactorPart, 'entity' | 'installed' | 'wasGrabbed'>): ReactorPart => {
      const entity = world.createTransformEntity(part.object)
        .addComponent(RayInteractable)
        .addComponent(DistanceGrabbable, {
          movementMode: MovementMode.MoveAtSource,
          rotate: true,
          translate: true,
          scale: false,
          detachOnGrab: true,
        });
      const result = { ...part, entity, installed: false, wasGrabbed: false };
      parts.push(result);
      const interactionObject = result.object;
      interactionObject.addEventListener('pointerenter', () => {
        if (result.installed) return;
        interactionObject.scale.setScalar(1.12);
        setMaterialColor(result.material, 0x7fffe0);
        setStatus(`${result.name} targeted`);
        console.log(`${result.name} targeted`);
      });
      interactionObject.addEventListener('pointerdown', () => {
        console.log(`${result.name} pointerdown / selection`);
      });
      interactionObject.addEventListener('pointerleave', () => {
        if (result.installed) return;
        interactionObject.scale.setScalar(1);
        setMaterialColor(result.material, result.normalColor);
      });
      interactionObject.addEventListener('click', () => {
        if (result.installed) return;
        selectedPart = result;
        setStatus(`Move ${result.name} to the matching socket, then select it.`);
        console.log(`${result.name} selected`);
      });
      return result;
    };

    const core = new Group();
    const coreMaterial = createMaterial(0x27dfff);
    addMesh(core, new SphereGeometry(0.22, 32, 20), coreMaterial);
    addMesh(core, new TorusGeometry(0.3, 0.018, 8, 32), createMaterial(0x75edff)).rotation.x = Math.PI / 2;
    core.position.set(-1, 1.5, -2.2);
    createPart({ id: 'energy-core', name: 'Energy Core', object: core, material: coreMaterial, normalColor: 0x27dfff, startPosition: [-1, 1.5, -2.2], targetPosition: [0, 1.4, -3.34], targetSocket: 'core-socket' });

    const power = new Group();
    const powerMaterial = createMaterial(0xffa94d);
    addMesh(power, new BoxGeometry(0.42, 0.42, 0.42), powerMaterial);
    addMesh(power, new BoxGeometry(0.48, 0.08, 0.08), createMaterial(0xffdf83)).position.z = 0.22;
    power.position.set(0, 1.5, -2.2);
    createPart({ id: 'power-module', name: 'Power Module', object: power, material: powerMaterial, normalColor: 0xffa94d, startPosition: [0, 1.5, -2.2], targetPosition: [-0.58, 1.24, -3.08], targetSocket: 'power-socket' });

    const control = new Group();
    const controlMaterial = createMaterial(0xff68ba);
    addMesh(control, new CylinderGeometry(0.25, 0.3, 0.48, 6), controlMaterial);
    addMesh(control, new TorusGeometry(0.2, 0.025, 8, 6), createMaterial(0xffa7d5)).rotation.x = Math.PI / 2;
    control.position.set(1, 1.5, -2.2);
    createPart({ id: 'control-module', name: 'Control Module', object: control, material: controlMaterial, normalColor: 0xff68ba, startPosition: [1, 1.5, -2.2], targetPosition: [0.58, 1.24, -3.08], targetSocket: 'control-socket' });

    for (const socket of sockets.values()) {
      socket.object.addEventListener('pointerenter', () => {
        if (selectedPart && !selectedPart.installed) {
          const isCorrect = selectedPart.targetSocket === socket.id;
          setMaterialColor(socket.ringMaterial, isCorrect ? 0x7fffe0 : 0xff5d68);
          setStatus(isCorrect ? `Release ${selectedPart.name} here` : 'Wrong socket');
        }
      });
      socket.object.addEventListener('click', () => {
        if (selectedPart && selectedPart.targetSocket === socket.id) {
          installPart(selectedPart);
        } else if (selectedPart) {
          setStatus('Wrong socket');
          setMaterialColor(socket.ringMaterial, 0xff5d68);
        }
      });
    }

    const resetExperience = (): void => {
      installedParts = 0;
      reactorOnline = false;
      selectedPart = undefined;
      const grabSystem = world.getSystem(GrabSystem);
      for (const part of parts) {
        grabSystem?.forceRelease(part.entity);
        part.object.position.set(...part.startPosition);
        part.object.rotation.set(0, 0, 0);
        part.object.scale.setScalar(1);
        part.installed = false;
        part.wasGrabbed = false;
        setMaterialColor(part.material, part.normalColor);
      }
      for (const socket of sockets.values()) setMaterialColor(socket.ringMaterial, socket.normalColor);
      updateProgress();
      setStatus('Look at a component and pinch or click to select it.');
      console.log('Experience reset');
    };

    resetButton.addEventListener('click', resetExperience);
    updateProgress();

    let elapsed = 0;
    const animate = (): void => {
      elapsed += 0.016;
      for (const part of parts) {
        const isGrabbed = part.entity.hasComponent(Grabbed);
        if (isGrabbed && !part.wasGrabbed) {
          console.log(`${part.name} grab started`);
          setStatus(`${part.name} grabbed. Move it to its socket.`);
        } else if (!isGrabbed && part.wasGrabbed) {
          console.log(`${part.name} grab ended`);
          const target = sockets.get(part.targetSocket);
          if (!part.installed && target && part.object.position.distanceTo(target.object.position) < 0.25) {
            installPart(part);
          }
        }
        if (!part.installed) {
          const target = sockets.get(part.targetSocket);
          if (target) {
            setMaterialColor(
              target.ringMaterial,
              part.object.position.distanceTo(target.object.position) < 0.42
                ? target.nearbyColor
                : target.normalColor,
            );
          }
        }
        part.wasGrabbed = isGrabbed;
      }
      if (reactorOnline) {
        core.rotation.y += 0.012;
        const pulse = 1 + Math.sin(elapsed * 4) * 0.08;
        core.scale.setScalar(pulse);
      }
      requestAnimationFrame(animate);
    };
    animate();
    console.log('Spatial reactor assembly created');
  })
  .catch((error: unknown) => {
    console.error('IWSDK world error:', error);
    setStatus(`IWSDK failed to start: ${error instanceof Error ? error.message : 'unknown error'}`);
  });