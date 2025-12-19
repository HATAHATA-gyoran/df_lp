import * as THREE from 'three';
import { VOXLoader } from 'three/addons/loaders/VOXLoader.js';

const SCHOOL_CONFIG = {
  'maaji': { count: 7, radius: 110, speed: 0.5, yRange: 20, yOffsetScale: 1.0, centerX: 35, centerY: -10 },
  // Double Ring for Maiwashi
  'maiwashi': [
    { count: 50, radius: 40, speed: -0.6, yRange: 40, yOffsetScale: 1.2, centerX: -70, centerY: 10 }, // Inner
    { count: 30, radius: 80, speed: -0.5, yRange: 50, yOffsetScale: 1.0, centerX: -70, centerY: 20 }, // Outer
  ],
  'masaba': { count: 10, radius: 35, speed: 1.2, yRange: 15, yOffsetScale: 0.8, centerX: 60, centerY: 30 }, // Top-Right Rotating
  'kamasu': { count: 5, radius: 28, speed: 0.4, yRange: 10, yOffsetScale: 1.0 },
  // Top-Right Background School
  'umeiro': { count: 3, radius: 30, speed: 0.7, yRange: 15, yOffsetScale: 1.0, centerX: 100, centerY: 30, centerZ: -100 },
};

const BOTTOM_CONFIG = {
  // pushed back further (zBase: -180), shifted left (xBase: -40)
  'kabutogani': { count: 3, yBase: -35, zBase: -180, xBase: -40, speed: 2.0, radius: 0 },
  'iseebi': { count: 4, yBase: -35, zBase: -40, xBase: -50, speed: 1.0, radius: 0 },
  // Tank 2: Dangouo (Scattered)
  'dangouo': {
    count: 7,
    yBase: -30,
    xBase: 100, zBase: -100, // Right side
    rangeX: 80, rangeZ: 80,  // Wider spread
    rangeY: 60,              // Wider vertical spread
    speed: 3.0,
    hueShift: true           // Enable random hue shift
  },
  // Tank 2: Hanahigeutsubo (Stationary at bottom)
  'hanahigeutsubo': [
    // 1. Big Yellow
    {
      count: 1,
      scale: 1.0,  // Slightly smaller than 1.2
      tint: 0xffff00, // Pure Yellow
      xBase: -10, yBase: -60, zBase: -80, // Lowered (was -45)
      rangeX: 20, rangeZ: 20, // More spread (was 5)
      speed: 2.0
    },
    // 2. Normal
    {
      count: 1,
      scale: 0.75, // Larger than 0.6
      xBase: 15, yBase: -60, zBase: -80, // Lowered (was -45)
      rangeX: 20, rangeZ: 20,
      speed: 2.0
    }
  ],
};

// Hover/Patrol behavior (Swim left-right at specific spot)
const HOVER_CONFIG = {
  // Near Maaji center (X=35, Y=-10)
  'kawahagi': { count: 1, x: 35, y: -10, z: 0, rangeX: 15, speed: 1.0 },
  // Near Umeiro (X:100, Y:30, Z:-100) - Long-distance Patrol with 30 deg angle
  'ojisan': { count: 2, x: 100, y: 30, z: -100, range: 120, speed: 0.5, angle: Math.PI / 6 },
};

const PATROL_CONFIG = {
  // Triangle Charge: Start -> Maiwashi(Attack) -> Retreat
  'suzuki': {
    count: 1,
    points: [
      { x: 120, y: 30, z: -50 },  // P1: Start (Top Right)
      { x: -70, y: 15, z: 0 },    // P2: Attack (Maiwashi Center)
      { x: 80, y: 40, z: 50 },    // P3: Retreat (Mid Right)
    ],
    speed: 1.5
  },
};

const STATIC_CONFIG = {
  // Right-Bottom Background (X:60, Y:-35, Z:-50)
  // Rotation: 150 degrees (60 + 90) = 5PI/6
  'shakogai': { count: 1, x: 60, y: -35, z: -50, scale: 1.4, rotation: 5 * Math.PI / 6 },
};

const VERTICAL_CONFIG = {
  // Tatsunootoshigo for AQ2
  // Swaying up and down
  'tatsunootoshigo': {
    count: 3,
    xBase: -90, yBase: -5, zBase: -160, // Left-Back (Further back)
    rangeX: 30, rangeZ: 30, // Tighter spread
    yAmp: 6, yFreq: 1.5,
    xAmp: 10, xFreq: 0.8, // Horizontal sway
    scale: 0.35 // Smaller than default (which is usually 0.5)
  },
};

const WANDER_CONFIG = {
  // Floating Iidako
  'iidako': {
    count: 5,
    scale: 0.3, // Smaller
    speed: 0.5, // Slow fuwafuwa
    xBase: 0, yBase: 0, zBase: -50,
    rangeX: 200, rangeY: 80, rangeZ: 100
  },
};

// Define contents for each tank index
const TANK_CONTENT = [
  ['maaji', 'kabutogani', 'maiwashi', 'kawahagi', 'shakogai', 'iseebi', 'umeiro', 'ojisan', 'suzuki'], // Tank 1: All
  ['tatsunootoshigo', 'dangouo', 'hanahigeutsubo', 'masaba', 'iidako'], // Tank 2 (Aq2): Seahorses & Dangouo & Eels & Masaba & Iidako
  [],        // Tank 3 (Index 2) - Empty for now
];

export default class AquariumScene {
  constructor() {
    this.fishMap = new Map(); // id -> voxBuffer
    this.fishes = []; // instances
    this.loader = new VOXLoader();
    this.currentTankIndex = 0;
    this.bgTextures = [];
    // Support multiple backgrounds
    this.bgPaths = ['assets/aq/aq1.png', 'assets/aq/aq2.png', 'assets/aq/aq3.png'];
  }

  mount(container, manager, state) {
    this.container = container;
    this.manager = manager;
    this.state = state;

    // --- DOM UI Layer ---
    this.uiLayer = document.createElement('div');
    this.uiLayer.className = 'scene scene--aquarium-ui';
    this.uiLayer.style.position = 'absolute';
    this.uiLayer.style.top = '0';
    this.uiLayer.style.left = '0';
    this.uiLayer.style.width = '100%';
    this.uiLayer.style.height = '100%';
    this.uiLayer.style.pointerEvents = 'none'; // click-through for 3D

    // Inline CSS for blinking animation
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes blink {
        0% { opacity: 1; }
        50% { opacity: 0.3; }
        100% { opacity: 1; }
      }
      .aq-text-btn {
        background: none;
        border: none;
        color: white;
        font-family: 'Sawarabi Mincho', serif;
        font-size: 1.5rem;
        cursor: pointer;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        pointer-events: auto;
        padding: 10px 20px;
        transition: transform 0.2s;
      }
      .aq-text-btn:hover {
        transform: scale(1.1);
        color: #ffeb3b;
      }
      .aq-nav-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 60px;
        height: 60px;
        pointer-events: auto;
        cursor: pointer;
        animation: blink 2s infinite ease-in-out;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .aq-nav-arrow img {
        width: 100%;
        height: auto;
        filter: drop-shadow(0 0 5px rgba(255,255,255,0.7));
      }
      .aq-nav-left {
        left: 20px;
        transform: translateY(-50%) scaleX(-1); /* Flip right arrow to make left */
      }
      .aq-nav-right {
        right: 20px;
      }
    `;
    this.uiLayer.appendChild(style);

    this.uiLayer.innerHTML += `
      <div class="topbar" style="pointer-events: none; display: flex; justify-content: space-between; padding: 20px;">
        <div class="left">
          <button class="aq-text-btn" id="btnBack">To title</button>
        </div>
      </div>
      
      <!-- Navigation Arrows -->
      <div class="aq-nav-arrow aq-nav-left" id="btnPrevTank">
         <img src="assets/triangle.png" alt="Prev" />
      </div>
      
      <div class="aq-nav-arrow aq-nav-right" id="btnNextTank">
         <img src="assets/triangle.png" alt="Next" />
      </div>
    `;

    // Prevent layout thrashing
    document.body.classList.add('title-full'); // Use existing full-screen class

    // --- Three.js Setup ---
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    this.scene = new THREE.Scene();
    // Background Manager
    this.texLoader = new THREE.TextureLoader();
    this.loadBackground(0);

    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 100);

    // Alpha: true allows CSS background to show through
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Prevent layout thrashing by taking canvas out of flow
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '0'; // Behind UI

    // Append Renderer
    // Cleanup container to prevent duplication
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);
    container.appendChild(this.uiLayer);

    // Light
    // High brightness setup (adjusted)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(20, 50, 30);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Backlight for contour/underwater feel
    const backLight = new THREE.DirectionalLight(0x0088ff, 0.7);
    backLight.position.set(-20, 20, -50);
    this.scene.add(backLight);

    // Event Listeners
    this.onBack = () => this.manager.goTo('title');
    this.uiLayer.querySelector('#btnBack').addEventListener('click', this.onBack);

    this.onPrevTank = () => this.switchTank(-1);
    this.onNextTank = () => this.switchTank(1);
    this.uiLayer.querySelector('#btnPrevTank').addEventListener('click', this.onPrevTank);
    this.uiLayer.querySelector('#btnNextTank').addEventListener('click', this.onNextTank);

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);

    // Load Fishes
    this.loadFishes();

    // Start Loop
    this.clock = new THREE.Clock();
    this.active = true;
    this.animate();
  }

  unmount() {
    this.active = false;
    document.body.classList.remove('title-full');
    this.resizeObserver.disconnect();
    this.uiLayer.remove();
    this.renderer.domElement.remove();
    // Clear container background style
    this.container.style.backgroundImage = '';
  }

  async loadFishes() {
    // 1. Determine all unique fish IDs we need to load (caught + tank contents)
    const caught = this.state.caught || [];
    const counts = {};
    for (const f of caught) counts[f.id] = (counts[f.id] || 0) + 1;

    // Add fish from Tank Config even if not caught (for demo/completeness of scene)
    // or just rely on caught? Plan said "load all but filter display".
    // Let's load everything in TANK_CONTENT + everything caught.
    const allIds = new Set(Object.keys(counts));
    TANK_CONTENT.flat().forEach(id => allIds.add(id));

    console.log('[DEBUG] loadFishes: Loading assets for:', Array.from(allIds));

    // 2. Load Assets
    for (const id of allIds) {
      if (this.fishMap.has(id)) continue;
      try {
        const url = `assets/vox/${id}.vox`;
        const chunks = await this.loadVox(url);
        if (chunks) this.fishMap.set(id, chunks);
      } catch (e) {
        console.warn('Failed to load vox:', id, e);
      }
    }

    // 3. Populate current tank
    this.populateTank(this.currentTankIndex);
  }

  populateTank(tankIndex) {
    // Clear existing fish
    this.clearFishes();

    // Determine target fish list
    let targetIds = [];

    if (TANK_CONTENT[tankIndex]) {
      targetIds = TANK_CONTENT[tankIndex];
      console.log(`[DEBUG] populateTank(${tankIndex}): Using Config`, targetIds);
    } else {
      // Fallback: Show everything caught (Legacy behavior)
      const caught = this.state.caught || [];
      targetIds = caught.map(f => f.id);
      console.log(`[DEBUG] populateTank(${tankIndex}): Using All Caught (Fallback)`, targetIds.length);
    }

    // Count occurrences for generic spawning
    const counts = {};
    for (const id of targetIds) {
      if (!id) continue;
      counts[id] = (counts[id] || 0) + 1;
    }

    // Spawn Logic
    for (const id of Object.keys(counts)) {
      // Check School Config
      if (SCHOOL_CONFIG[id]) {
        const config = SCHOOL_CONFIG[id];
        if (Array.isArray(config)) {
          // Multiple sub-schools
          config.forEach(c => {
            const success = this.spawnSchool(id, c);
            if (!success) console.warn(`[DEBUG] Failed to spawn sub-school: ${id}`);
          });
        } else {
          // Single school
          const success = this.spawnSchool(id, config);
          if (!success) console.warn(`[DEBUG] Failed to spawn school: ${id}`);
        }
      } else if (BOTTOM_CONFIG[id]) {
        const config = BOTTOM_CONFIG[id];
        if (Array.isArray(config)) {
          config.forEach(c => this.spawnBottom(id, c));
        } else {
          this.spawnBottom(id, config);
        }
      } else if (HOVER_CONFIG[id]) {
        this.spawnHover(id, HOVER_CONFIG[id]);
      } else if (PATROL_CONFIG[id]) {
        this.spawnPatrol(id, PATROL_CONFIG[id]);
      } else if (STATIC_CONFIG[id]) {
        this.spawnStatic(id, STATIC_CONFIG[id]);
      } else if (VERTICAL_CONFIG[id]) {
        this.spawnVertical(id, VERTICAL_CONFIG[id]);
      } else if (WANDER_CONFIG[id]) {
        const config = WANDER_CONFIG[id];
        if (Array.isArray(config)) {
          config.forEach(c => this.spawnWander(id, c));
        } else {
          this.spawnWander(id, config);
        }
      } else {
        // Generic
        let count = counts[id];
        this.spawnGeneric(id, count);
      }
    }
  }

  spawnVertical(id, config) {
    if (!this.fishMap.has(id)) return;
    const proto = this.buildFishModel(id, this.fishMap.get(id));
    if (!proto) return;

    const count = config.count || 1;
    const xBase = config.xBase || 0;
    const yBase = config.yBase || 0;
    const zBase = config.zBase || 0;
    const rX = config.rangeX || 40;
    const rZ = config.rangeZ || 20;

    for (let i = 0; i < count; i++) {
      const mesh = proto.clone();

      const x = xBase + (Math.random() - 0.5) * rX;
      const z = zBase + (Math.random() - 0.5) * rZ;
      const y = yBase + (Math.random() - 0.5) * 10; // Initial random height offset

      mesh.position.set(x, y, z);
      // Random Y-rotation
      mesh.rotation.y = Math.random() * Math.PI * 2;

      this.scene.add(mesh);
      this.fishes.push({
        mesh: mesh,
        id: id,
        type: 'vertical',
        baseY: yBase,
        baseX: x, // Store initial X as base
        baseZ: z, // Store initial Z as base
        yAmp: config.yAmp || 5, // Sway amplitude
        yFreq: config.yFreq || 1.0, // Sway frequency
        xAmp: config.xAmp || 0, // Horizontal amplitude
        xFreq: config.xFreq || 0, // Horizontal frequency
        yOffset: Math.random() * Math.PI * 2, // Phase offset
        speed: 0.5 // Rotation speed
      });
    }
  }

  spawnBottom(id, config) {
    if (!this.fishMap.has(id)) return;
    const proto = this.buildFishModel(id, this.fishMap.get(id));
    if (!proto) return;

    // Custom Scale
    if (config.scale) {
      proto.scale.set(config.scale, config.scale, config.scale);
    }

    const count = config.count || 1;
    const yBase = config.yBase || -30;

    for (let i = 0; i < count; i++) {
      const mesh = proto.clone();
      const rangeX = config.rangeX || 60;
      const rangeZ = config.rangeZ || 30;
      const rangeY = config.rangeY || 0; // Vertical range

      // Custom Tint (Hex or Hue Shift)
      if (config.tint !== undefined || config.hueShift) {
        mesh.traverse((child) => {
          if (child.isMesh) {
            child.material = child.material.clone();

            if (config.tint !== undefined) {
              child.material.color.setHex(config.tint);
            } else if (config.hueShift) {
              const color = new THREE.Color();
              const hue = Math.random();
              const saturation = 0.6 + Math.random() * 0.4;
              const lightness = 0.5 + Math.random() * 0.4;
              color.setHSL(hue, saturation, lightness);
              child.material.color.copy(color);
            }
          }
        });
      }

      // Random bottom position
      const x = (config.xBase || 0) + (Math.random() - 0.5) * rangeX;
      const z = (config.zBase || 0) + (Math.random() - 0.5) * rangeZ;
      const y = yBase + (Math.random() - 0.5) * rangeY;

      mesh.position.set(x, y, z);

      this.scene.add(mesh);
      this.fishes.push({
        mesh: mesh,
        id: id,
        type: 'bottom',
        yBase: yBase,
        wiggleSpeed: config.speed || 1.0,
        wiggleOffset: Math.random() * 10
      });
    }
  }

  spawnHover(id, config) {
    if (!this.fishMap.has(id)) return;
    const proto = this.buildFishModel(id, this.fishMap.get(id));
    if (!proto) return;

    const count = config.count || 1;
    for (let i = 0; i < count; i++) {
      const mesh = proto.clone();
      mesh.position.set(config.x, config.y, config.z);
      this.scene.add(mesh);
      this.fishes.push({
        mesh: mesh,
        id: id,
        type: 'hover',
        baseX: config.x,
        baseY: config.y,
        baseZ: config.z,
        range: config.range || config.rangeX || 10,
        angle: config.angle || 0, // Movement angle (0 = X axis)
        speed: config.speed || 1.0,
        timeOffset: Math.random() * 10
      });
    }
  }

  spawnPatrol(id, config) {
    if (!this.fishMap.has(id)) return;
    const proto = this.buildFishModel(id, this.fishMap.get(id));
    if (!proto) return;

    const count = config.count || 1;
    const points = config.points || [{ x: 0, y: 0, z: 0 }, { x: 50, y: 0, z: 0 }];

    for (let i = 0; i < count; i++) {
      const mesh = proto.clone();
      // Start at P1
      mesh.position.set(points[0].x, points[0].y, points[0].z);
      this.scene.add(mesh);

      this.fishes.push({
        mesh: mesh,
        id: id,
        type: 'patrol',
        points: points,
        currentPointIndex: 0,
        nextPointIndex: 1,
        speed: config.speed || 1.0,
        t: 0 // Interpolation t (0 to 1)
      });
    }
  }

  spawnStatic(id, config) {
    if (!this.fishMap.has(id)) return;
    // Pass custom scale to builder
    const proto = this.buildFishModel(id, this.fishMap.get(id), config.scale);
    if (!proto) return;

    const count = config.count || 1;
    for (let i = 0; i < count; i++) {
      const mesh = proto.clone();
      mesh.position.set(config.x, config.y, config.z);

      // Fixed rotation if provided, otherwise random
      if (config.rotation !== undefined) {
        mesh.rotation.y = config.rotation;
      } else {
        mesh.rotation.y = Math.random() * Math.PI * 2;
      }

      this.scene.add(mesh);
      this.fishes.push({
        mesh: mesh,
        id: id,
        type: 'static'
      });
    }
  }

  clearFishes() {
    for (const f of this.fishes) {
      if (f.mesh) this.scene.remove(f.mesh);
    }
    this.fishes = [];
  }

  loadVox(url) {
    console.log(`[DEBUG] Loading VOX: ${url}`);
    return new Promise((resolve, reject) => {
      this.loader.load(url,
        (chunks) => {
          console.log(`[DEBUG] Loaded ${url}, chunks:`, chunks ? chunks.length : 0);
          resolve(chunks);
        },
        undefined,
        (err) => {
          console.error(`[DEBUG] Failed to load ${url}:`, err);
          reject(err);
        }
      );
    });
  }

  createMeshFromVox(chunks) {
    if (!chunks || chunks.length === 0) return null;

    // Use a Group to hold the specialized mesh
    const group = new THREE.Group();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const { size, data, palette } = chunk;
      if (!size || !data || !palette) continue;

      // Center offset
      const pScale = 0.5; // Voxel Scale (arbitrary)
      const geometryBox = new THREE.BoxGeometry(1, 1, 1);

      const materialBox = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.1
      });

      const count = data.length / 4; // x, y, z, c
      const instancedMesh = new THREE.InstancedMesh(geometryBox, materialBox, count);

      const dummy = new THREE.Object3D();
      const c = new THREE.Color();

      // Calculate bounds of occupied voxels for better centering
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

      for (let j = 0; j < data.length; j += 4) {
        const vx = data[j + 0];
        const vy = data[j + 2]; // Swap Y/Z
        const vz = data[j + 1];

        if (vx < minX) minX = vx;
        if (vx > maxX) maxX = vx;
        if (vy < minY) minY = vy;
        if (vy > maxY) maxY = vy;
        if (vz < minZ) minZ = vz;
        if (vz > maxZ) maxZ = vz;
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      for (let j = 0; j < count; j++) {
        const x = data[j * 4 + 0] - centerX;
        const y = data[j * 4 + 2] - centerY; // Swap Y/Z
        const z = - (data[j * 4 + 1] - centerZ); // Negative Z 
        const colorIndex = data[j * 4 + 3];

        if (palette && palette.length > colorIndex) {
          const hex = palette[colorIndex];
          const r = (hex >> 0 & 0xff) / 255;
          const g = (hex >> 8 & 0xff) / 255;
          const b = (hex >> 16 & 0xff) / 255;
          c.setRGB(r, g, b);
        } else {
          c.set(0xffffff);
        }

        dummy.position.set(x * pScale, y * pScale, z * pScale);
        dummy.scale.set(pScale, pScale, pScale);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(j, dummy.matrix);
        instancedMesh.setColorAt(j, c);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
      group.add(instancedMesh);
    }
    return group;
  }

  // Optimized Voxel Mesh Builder
  buildFishModel(id, chunks, customScale = 0.5) {
    const mesh = this.createMeshFromVox(chunks);
    if (mesh) {
      mesh.scale.set(customScale, customScale, customScale);
    }
    return mesh;
  }

  spawnSchool(id, config) {
    if (!this.fishMap.has(id)) {
      console.warn(`[DEBUG] spawnSchool: fishMap missing ${id}`);
      return false;
    }
    const proto = this.buildFishModel(id, this.fishMap.get(id));
    if (!proto) {
      console.warn(`[DEBUG] spawnSchool: buildFishModel failed for ${id}`);
      return false;
    }

    const count = config.count || 5;
    const baseRadius = config.radius || 20;
    const baseSpeed = config.speed || 0.5;
    const yRg = config.yRange || 20;

    // Configurable Center
    const cX = config.centerX || 0;
    const cY = config.centerY || 0;
    const cZ = config.centerZ || 0;

    console.log(`[DEBUG] Spawning School: ${id} count=${count}`);

    for (let i = 0; i < count; i++) {
      const mesh = proto.clone();

      // Random start pos
      const radius = baseRadius + (Math.random() - 0.5) * 5;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * yRg;

      mesh.position.set(
        cX + Math.cos(theta) * radius,
        cY + y,
        cZ + Math.sin(theta) * radius
      );
      // Face tangent (-90 deg offset as established)
      mesh.rotation.y = -theta + Math.PI - Math.PI / 2;

      this.scene.add(mesh);
      this.fishes.push({
        mesh: mesh,
        id: id,
        type: 'school',
        angle: theta,
        radius: radius,
        speed: baseSpeed + (Math.random() - 0.5) * 0.1,
        yBase: y,
        yOffset: Math.random() * Math.PI,
        centerX: cX,
        centerY: cY,
        centerZ: cZ
      });
    }
    return true;
  }

  spawnWander(id, config) {
    if (!this.fishMap.has(id)) return;
    const proto = this.buildFishModel(id, this.fishMap.get(id));
    if (!proto) return;

    // Custom Scale
    if (config.scale) {
      proto.scale.set(config.scale, config.scale, config.scale);
    }

    const count = config.count || 1;
    // Configurable bounds
    const rX = config.rangeX || 80;
    const rY = config.rangeY || 50;
    const rZ = config.rangeZ || 40;

    for (let i = 0; i < count; i++) {
      const mesh = proto.clone();

      // Custom Tint
      if (config.tint !== undefined) {
        mesh.traverse((child) => {
          if (child.isMesh) {
            child.material = child.material.clone();
            child.material.color.setHex(config.tint);
          }
        });
      }

      // Configurable Center
      const cX = config.xBase || 0;
      const cY = config.yBase || 0;
      const cZ = config.zBase || 0;

      // Random pos within range + Base
      mesh.position.set(
        cX + (Math.random() - 0.5) * rX,
        cY + (Math.random() - 0.5) * rY,
        cZ + (Math.random() - 0.5) * rZ
      );

      this.scene.add(mesh);
      this.fishes.push({
        mesh: mesh,
        id: id,
        type: 'wander',
        vx: (Math.random() - 0.5) * (config.speed || 0.2),
        vy: (Math.random() - 0.5) * (config.speed || 0.1) * 0.5,
        vz: (Math.random() - 0.5) * (config.speed || 0.2),
        speedScale: config.speed || 1.0,
        bounds: { x: rX / 2, y: rY / 2, z: rZ / 2 },
        baseX: cX,
        baseY: cY,
        baseZ: cZ
      });
    }
  }

  spawnGeneric(id, count) {
    // Legacy wrapper for simple wander
    this.spawnWander(id, { count: count });
  }

  onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  loadBackground(index) {
    // Cycle backgrounds if not enough
    const bgIndex = index % this.bgPaths.length;

    if (bgIndex < 0 || bgIndex >= this.bgPaths.length) return;
    const path = this.bgPaths[bgIndex];
    console.log(`Loading background (CSS): ${path} (Tank Index: ${index})`);

    // Use CSS background for "cover" sizing
    this.container.style.backgroundImage = `url('${path}')`;
    this.container.style.backgroundSize = 'cover';
    this.container.style.backgroundPosition = 'center';
    this.container.style.backgroundRepeat = 'no-repeat';

    // Clear Three.js background to be transparent
    this.scene.background = null;
  }

  switchTank(direction) {
    // Determine max tanks based on Config or Backgrounds
    const maxTanks = Math.max(this.bgPaths.length, TANK_CONTENT.length);

    let next = this.currentTankIndex + direction;
    if (next < 0) next = maxTanks - 1;
    if (next >= maxTanks) next = 0;

    this.currentTankIndex = next;
    this.loadBackground(this.currentTankIndex);
    this.populateTank(this.currentTankIndex);
  }

  animate() {
    if (!this.active) return;
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Update Fishes
    for (const f of this.fishes) {
      if (f.type === 'school') {
        // Circle swim
        f.angle += f.speed * delta;

        // Current Pos with Center Offset
        // Default to 0 if undefined
        const cx = f.centerX || 0;
        const cy = f.centerY || 0;
        const cz = f.centerZ || 0;

        f.mesh.position.x = cx + Math.cos(f.angle) * f.radius;
        f.mesh.position.z = cz + Math.sin(f.angle) * f.radius;

        // Bobbing
        f.mesh.position.y = cy + f.yBase + Math.sin(time * 2 + f.yOffset) * 2;

        // Rotation: Face forward (Tangent)
        // Manual rotation: -f.angle + Math.PI was 180 (opposite). 
        // User requested -90 degrees shift.
        f.mesh.rotation.y = -f.angle + Math.PI - Math.PI / 2;

      } else if (f.type === 'wander') {
        f.mesh.position.x += f.vx;
        f.mesh.position.y += f.vy;
        f.mesh.position.z += f.vz;

        // Look forward
        // f.mesh.lookAt(...)

        // Turn around (Dynamic Bounds relative to Base)
        const bounds = f.bounds || { x: 50, y: 30, z: 40 };
        const bx = f.baseX || 0;
        const by = f.baseY || 0;
        const bz = f.baseZ || 0;

        if (Math.abs(f.mesh.position.x - bx) > bounds.x) f.vx *= -1;
        if (Math.abs(f.mesh.position.y - by) > bounds.y) f.vy *= -1;
        if (Math.abs(f.mesh.position.z - bz) > bounds.z) f.vz *= -1;

        // Simple rotation
        if (f.vx > 0) f.mesh.rotation.y = Math.PI;
        else f.mesh.rotation.y = 0;

      } else if (f.type === 'bottom') {
        // MojiMoji (Wriggling)
        // Slight rotation oscillation
        f.mesh.rotation.y = Math.sin(time * f.wiggleSpeed + f.wiggleOffset) * 0.3;
        // Tiny creeping (optional, just staying still for now but vibrating)
        f.mesh.position.y = f.yBase + Math.sin(time * 5) * 0.2; // breathing

      } else if (f.type === 'hover') {
        // Swim left-right (Sign Wave on X)
        const t = time * f.speed + f.timeOffset;
        const pos = Math.sin(t) * f.range;
        const offsetX = pos * Math.cos(f.angle);
        const offsetZ = pos * Math.sin(f.angle);

        f.mesh.position.x = f.baseX + offsetX;
        f.mesh.position.y = f.baseY + Math.sin(t * 2) * 1.0;
        f.mesh.position.z = f.baseZ + offsetZ;

        // Face Direction
        // derivative of sin is cos. Velocity sign determines direction.
        const vel = Math.cos(t);
        if (vel > 0) f.mesh.rotation.y = -f.angle + Math.PI;
        else f.mesh.rotation.y = -f.angle;
      } else if (f.type === 'patrol') {
        const p1 = f.points[f.currentPointIndex];
        const p2 = f.points[f.nextPointIndex];

        // Distance betw p1 and p2
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Advance t based on speed and distance
        // t increase per second = speed / dist
        const tStep = (f.speed * delta) / (dist || 1);
        f.t += tStep;

        if (f.t >= 1) {
          f.t = 0;
          f.currentPointIndex = f.nextPointIndex;
          f.nextPointIndex = (f.nextPointIndex + 1) % f.points.length;
        }

        // Lerp
        const curX = p1.x + (p2.x - p1.x) * f.t;
        const curY = p1.y + (p2.y - p1.y) * f.t;
        const curZ = p1.z + (p2.z - p1.z) * f.t;

        f.mesh.position.set(curX, curY, curZ);

        // Look At Target
        // Use Math.atan2(dx, dz) for Y rotation
        f.mesh.lookAt(p2.x, p2.y, p2.z);
        // Correct default orientation if needed
        // Assuming standard model faces +Z or -Z.
        // If lookAt isn't working well with default rotation, manual:
        // f.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI; 
      } else if (f.type === 'vertical') {
        // Swaying Up and Down (Vertical)
        // y = baseY + sin(time * freq + offset) * amp
        // Swaying Up and Down (Vertical)
        // y = baseY + sin(time * freq + offset) * amp
        f.mesh.position.y = f.baseY + Math.sin(time * f.yFreq + f.yOffset) * f.yAmp;

        // Horizontal Sway (Left-Right)
        if (f.xAmp) {
          f.mesh.position.x = f.baseX + Math.sin(time * f.xFreq + f.yOffset) * f.xAmp;
        }

        // Gentle rotation around Y axis
        f.mesh.rotation.y += f.speed * delta * 0.2; // Slow rotation
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  unmount() {
    this.active = false;
    this.resizeObserver.disconnect();
    this.uiLayer.remove();
    this.renderer.domElement.remove();
    // Dispose resources...
  }
}
