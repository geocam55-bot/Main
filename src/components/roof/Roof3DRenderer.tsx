import React, { useRef, useEffect } from 'react';
import { RoofConfig } from '../../types/roof';
import { 
  Scene, 
  Color, 
  Fog, 
  PerspectiveCamera, 
  WebGLRenderer, 
  PCFSoftShadowMap,
  AmbientLight,
  DirectionalLight,
  PlaneGeometry,
  MeshStandardMaterial,
  Mesh,
  GridHelper,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  BufferGeometry,
  BufferAttribute,
  CanvasTexture,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
} from '../../utils/three';

interface Roof3DRendererProps {
  config: RoofConfig;
}

// ─── Procedural Texture Generators ──────────────────────────────────────────

function createShingleTexture(baseColor: number, type: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const r = (baseColor >> 16) & 0xff;
  const g = (baseColor >> 8) & 0xff;
  const b = baseColor & 0xff;

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 512, 512);

  if (type === 'metal') {
    for (let x = 0; x < 512; x += 40) {
      ctx.fillStyle = `rgba(0,0,0,0.25)`;
      ctx.fillRect(x - 1, 0, 3, 512);
      ctx.fillStyle = `rgba(255,255,255,0.15)`;
      ctx.fillRect(x + 2, 0, 1, 512);
    }
    for (let y = 0; y < 512; y += 64) {
      ctx.fillStyle = `rgba(255,255,255,0.03)`;
      ctx.fillRect(0, y, 512, 32);
    }
  } else if (type === 'cedar-shake') {
    const shakeH = 32;
    for (let row = 0; row < 512; row += shakeH) {
      let x = (row / shakeH) % 2 === 0 ? 0 : -20;
      while (x < 520) {
        const w = 20 + Math.random() * 30;
        const shade = -15 + Math.random() * 30;
        ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r + shade))},${Math.max(0, Math.min(255, g + shade))},${Math.max(0, Math.min(255, b + shade))})`;
        ctx.fillRect(x, row, w - 1, shakeH - 1);
        ctx.strokeStyle = `rgba(0,0,0,0.12)`;
        ctx.lineWidth = 0.5;
        for (let gy = row + 4; gy < row + shakeH; gy += 3 + Math.random() * 4) {
          ctx.beginPath();
          ctx.moveTo(x + 1, gy);
          ctx.lineTo(x + w - 2, gy + (Math.random() - 0.5) * 2);
          ctx.stroke();
        }
        x += w;
      }
      ctx.fillStyle = `rgba(0,0,0,0.2)`;
      ctx.fillRect(0, row + shakeH - 2, 512, 2);
    }
  } else {
    const shingleH = type === '3-tab' ? 28 : 24;
    const baseShingleW = type === '3-tab' ? 64 : 45;
    for (let row = 0; row < 512; row += shingleH) {
      let x = ((row / shingleH) % 2) * (baseShingleW / 2);
      while (x < 520) {
        const w = type === '3-tab' ? baseShingleW : 30 + Math.random() * 30;
        const shade = -12 + Math.random() * 24;
        ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r + shade))},${Math.max(0, Math.min(255, g + shade))},${Math.max(0, Math.min(255, b + shade))})`;
        ctx.fillRect(x, row, w - 1, shingleH - 1);
        if (type === 'designer') {
          for (let p = 0; p < 15; p++) {
            const px = x + Math.random() * w;
            const py = row + Math.random() * shingleH;
            const ps = Math.random() * 8 - 4;
            ctx.fillStyle = `rgba(${ps > 0 ? 255 : 0},${ps > 0 ? 255 : 0},${ps > 0 ? 255 : 0},0.08)`;
            ctx.fillRect(px, py, 2, 2);
          }
        }
        x += w;
      }
      ctx.fillStyle = `rgba(0,0,0,0.18)`;
      ctx.fillRect(0, row + shingleH - 2, 512, 2);
    }
  }
  return new CanvasTexture(canvas);
}

function createSidingTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f0ead6';
  ctx.fillRect(0, 0, 512, 512);
  const boardH = 24;
  for (let y = 0; y < 512; y += boardH) {
    const shade = Math.random() * 6 - 3;
    ctx.fillStyle = `rgb(${240 + shade},${234 + shade},${214 + shade})`;
    ctx.fillRect(0, y, 512, boardH - 1);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, y + boardH - 2, 512, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, y, 512, 1);
  }
  return new CanvasTexture(canvas);
}

function createBrickTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c8b8a0';
  ctx.fillRect(0, 0, 256, 256);
  const brickW = 40, brickH = 16, mortarW = 3;
  for (let row = 0; row < 256 / (brickH + mortarW); row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2 + mortarW / 2;
    for (let col = -1; col < 256 / (brickW + mortarW) + 1; col++) {
      const x = col * (brickW + mortarW) + offset;
      const y = row * (brickH + mortarW);
      const shade = Math.random() * 30 - 15;
      ctx.fillStyle = `rgb(${139 + shade},${69 + shade * 0.5},${19 + shade * 0.3})`;
      ctx.fillRect(x, y, brickW, brickH);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, y + brickH - 2, brickW, 2);
    }
  }
  return new CanvasTexture(canvas);
}

function createGrassTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6a8a5a';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = Math.random() * 30 - 15;
    ctx.fillStyle = `rgb(${106 + shade},${138 + shade},${90 + shade})`;
    ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  ctx.strokeStyle = 'rgba(80,120,60,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 6, y - 3 - Math.random() * 6);
    ctx.stroke();
  }
  return new CanvasTexture(canvas);
}

function createConcreteTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b0a898';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = Math.random() * 20 - 10;
    ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 100})`;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  return new CanvasTexture(canvas);
}

/** Add wireframe edge outlines to a mesh for crisp definition */
function addEdgeOutline(scene: Scene, geometry: BufferGeometry, mesh: Mesh, color = 0x333333) {
  const edges = new EdgesGeometry(geometry);
  const lineMat = new LineBasicMaterial({ color });
  const wireframe = new LineSegments(edges, lineMat);
  wireframe.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
  wireframe.rotation.x = mesh.rotation.x;
  wireframe.rotation.y = mesh.rotation.y;
  wireframe.rotation.z = mesh.rotation.z;
  scene.add(wireframe);
}

// Helper: convert dormer horizontalPosition to a percentage along building length
function dormerPositionToPercent(pos: string): number {
  switch (pos) {
    case 'left': return 25;
    case 'right': return 75;
    case 'center':
    default: return 50;
  }
}

type RoofPoint = [number, number, number];

function createRoofTriangleGeometry(a: RoofPoint, b: RoofPoint, c: RoofPoint): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([
    ...a,
    ...b,
    ...c,
  ]), 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createRoofQuadGeometry(a: RoofPoint, b: RoofPoint, c: RoofPoint, d: RoofPoint): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([
    ...a,
    ...b,
    ...c,
    ...a,
    ...c,
    ...d,
  ]), 3));
  geometry.computeVertexNormals();
  return geometry;
}

function addRoofSurface(scene: Scene, geometry: BufferGeometry, material: MeshStandardMaterial, edgeColor = 0x555555) {
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  addEdgeOutline(scene, geometry, mesh, edgeColor);
  return mesh;
}

export function Roof3DRenderer({ config }: Roof3DRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Create scene — pale sky gradient
    const scene = new Scene();
    scene.background = new Color(0xd4e6f1);
    scene.fog = new Fog(0xd4e6f1, 15, 65);

    // Create camera
    const camera = new PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(12, 10, 12);
    camera.lookAt(0, 0, 0);

    // Create renderer
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Enhanced 3-point lighting + sky ambient
    const ambientLight = new AmbientLight(0xc8d8f0, 0.55);
    scene.add(ambientLight);

    const sunLight = new DirectionalLight(0xfff5e6, 1.0);
    sunLight.position.set(18, 28, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    scene.add(sunLight);

    const fillLight = new DirectionalLight(0x8ecbf0, 0.35);
    fillLight.position.set(-15, 12, -10);
    scene.add(fillLight);

    const rimLight = new DirectionalLight(0xffeedd, 0.2);
    rimLight.position.set(-5, 8, 20);
    scene.add(rimLight);

    // Convert feet to meters
    const scale = 0.3048;
    const buildingWidth = config.width * scale;
    const buildingLength = config.length * scale;
    const wallHeight = 2.5; // Typical wall height for visualization
    
    // Parse pitch (e.g., "6/12")
    const pitchParts = config.pitch.split('/');
    const pitchRise = parseInt(pitchParts[0]);
    const pitchRun = parseInt(pitchParts[1]);
    const roofPitch = pitchRise / pitchRun;
    const roofRise = (buildingWidth / 2) * roofPitch;

    const eaveOverhang = config.eaveOverhang * scale;
    const rakeOverhang = config.rakeOverhang * scale;

    // Procedural textures
    const grassTex = createGrassTexture();
    const sidingTex = createSidingTexture();
    const concreteTex = createConcreteTexture();

    // Create ground with grass texture
    const groundGeometry = new PlaneGeometry(60, 60);
    const groundMaterial = new MeshStandardMaterial({ 
      color: 0x6a8a5a,
      roughness: 0.9,
      metalness: 0.0,
      map: grassTex
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Subtle grid
    const gridHelper = new GridHelper(40, 40, 0x7b9a6b, 0x9aad8a);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Concrete walkway / driveway
    const drivewayGeom = new BoxGeometry(buildingWidth * 0.35, 0.04, buildingLength * 0.3 + 4);
    const drivewayMat = new MeshStandardMaterial({ color: 0xb5ad9e, roughness: 0.95, map: concreteTex });
    const driveway = new Mesh(drivewayGeom, drivewayMat);
    driveway.position.set(0, 0.02, buildingLength / 2 + buildingLength * 0.15 + 1);
    driveway.receiveShadow = true;
    scene.add(driveway);

    // Foundation strip
    const foundationH = 0.25;
    const foundationMat = new MeshStandardMaterial({ color: 0x8a8278, roughness: 0.95, map: concreteTex });
    const foundFront = new Mesh(new BoxGeometry(buildingWidth + 0.3, foundationH, 0.35), foundationMat);
    foundFront.position.set(0, foundationH / 2, buildingLength / 2);
    foundFront.receiveShadow = true;
    scene.add(foundFront);
    const foundBack = new Mesh(new BoxGeometry(buildingWidth + 0.3, foundationH, 0.35), foundationMat);
    foundBack.position.set(0, foundationH / 2, -buildingLength / 2);
    foundBack.receiveShadow = true;
    scene.add(foundBack);
    const foundLeft = new Mesh(new BoxGeometry(0.35, foundationH, buildingLength + 0.3), foundationMat);
    foundLeft.position.set(-buildingWidth / 2, foundationH / 2, 0);
    foundLeft.receiveShadow = true;
    scene.add(foundLeft);
    const foundRight = new Mesh(new BoxGeometry(0.35, foundationH, buildingLength + 0.3), foundationMat);
    foundRight.position.set(buildingWidth / 2, foundationH / 2, 0);
    foundRight.receiveShadow = true;
    scene.add(foundRight);

    // Building walls with siding texture
    const wallMaterial = new MeshStandardMaterial({ 
      color: 0xf0ead6,
      roughness: 0.8,
      side: DoubleSide,
      map: sidingTex
    });

    // Front wall
    const frontWallGeometry = new BoxGeometry(buildingWidth, wallHeight, 0.2);
    const frontWall = new Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, wallHeight / 2 + foundationH, buildingLength / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    // Back wall
    const backWall = new Mesh(frontWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2 + foundationH, -buildingLength / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Side walls
    const sideWallGeometry = new BoxGeometry(0.2, wallHeight, buildingLength);
    const leftWall = new Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-buildingWidth / 2, wallHeight / 2 + foundationH, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(buildingWidth / 2, wallHeight / 2 + foundationH, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Corner trim boards
    const trimMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const trimH = wallHeight + foundationH;
    for (const [cx, cz] of [
      [-buildingWidth / 2, buildingLength / 2],
      [buildingWidth / 2, buildingLength / 2],
      [-buildingWidth / 2, -buildingLength / 2],
      [buildingWidth / 2, -buildingLength / 2],
    ]) {
      const trim = new Mesh(new BoxGeometry(0.08, trimH, 0.08), trimMat);
      trim.position.set(cx, trimH / 2, cz);
      scene.add(trim);
    }

    // Front door (on front wall)
    const doorMat = new MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.7 });
    const doorW = 0.7, doorH = 1.6;
    const door = new Mesh(new BoxGeometry(doorW, doorH, 0.06), doorMat);
    door.position.set(0, doorH / 2 + foundationH, buildingLength / 2 + 0.12);
    scene.add(door);
    // Door frame
    const dFrameMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const dFrameTop = new Mesh(new BoxGeometry(doorW + 0.12, 0.06, 0.08), dFrameMat);
    dFrameTop.position.set(0, doorH + foundationH + 0.03, buildingLength / 2 + 0.12);
    scene.add(dFrameTop);

    // Windows on front wall (2 windows flanking the door)
    const windowGlassMat = new MeshStandardMaterial({ color: 0x87ceeb, roughness: 0.1, metalness: 0.8, transparent: true });
    const winFrameMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const winW = 0.7, winH = 0.6;
    for (const wx of [-buildingWidth * 0.25, buildingWidth * 0.25]) {
      const winGlass = new Mesh(new BoxGeometry(winW, winH, 0.04), windowGlassMat);
      winGlass.position.set(wx, wallHeight * 0.55 + foundationH, buildingLength / 2 + 0.12);
      scene.add(winGlass);
      // Window frame
      const fTop = new Mesh(new BoxGeometry(winW + 0.08, 0.04, 0.06), winFrameMat);
      fTop.position.set(wx, wallHeight * 0.55 + foundationH + winH / 2 + 0.02, buildingLength / 2 + 0.12);
      scene.add(fTop);
      const fBot = new Mesh(new BoxGeometry(winW + 0.1, 0.05, 0.07), winFrameMat);
      fBot.position.set(wx, wallHeight * 0.55 + foundationH - winH / 2 - 0.02, buildingLength / 2 + 0.12);
      scene.add(fBot);
      // Mullion cross
      const mullV = new Mesh(new BoxGeometry(0.025, winH, 0.05), winFrameMat);
      mullV.position.set(wx, wallHeight * 0.55 + foundationH, buildingLength / 2 + 0.13);
      scene.add(mullV);
      const mullH = new Mesh(new BoxGeometry(winW, 0.025, 0.05), winFrameMat);
      mullH.position.set(wx, wallHeight * 0.55 + foundationH, buildingLength / 2 + 0.13);
      scene.add(mullH);
    }

    // Fascia / eave trim material
    const fasciaMat = new MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.3 });

    // Gutter material
    const gutterMat = new MeshStandardMaterial({ color: 0xddd8d0, roughness: 0.4, metalness: 0.3 });

    // Roof material with shingle texture
    const roofColor = 
      config.shingleType === 'metal' ? 0x7f8c8d :
      config.shingleType === 'cedar-shake' ? 0x8b6f47 :
      config.shingleType === 'designer' ? 0x3a3a3a : 0x4a3f35;

    const shingleTex = createShingleTexture(roofColor, config.shingleType);
    const roofMaterial = new MeshStandardMaterial({ 
      color: roofColor,
      roughness: config.shingleType === 'metal' ? 0.2 : 0.85,
      metalness: config.shingleType === 'metal' ? 0.7 : 0.0,
      map: shingleTex,
      side: DoubleSide,
    });

    // Offset walls up by foundation
    const wallBase = foundationH;

    // Adjusted wall height (includes foundation)
    const wH = wallHeight + wallBase;

    // Create roof based on style
    const roofBaseY = wH + 0.02;
    const zFront = buildingLength / 2 + eaveOverhang;
    const zBack = -buildingLength / 2 - eaveOverhang;
    const leftEaveX = -buildingWidth / 2 - rakeOverhang;
    const rightEaveX = buildingWidth / 2 + rakeOverhang;

    if (config.style === 'gable') {
      const roofLength = Math.sqrt(Math.pow(buildingWidth / 2 + rakeOverhang, 2) + Math.pow(roofRise, 2));
      const roofAngle = Math.atan2(roofRise, buildingWidth / 2 + rakeOverhang);
      const ridgeY = roofBaseY + roofRise;

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [leftEaveX, roofBaseY, zFront],
          [0, ridgeY, zFront],
          [0, ridgeY, zBack],
          [leftEaveX, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [0, ridgeY, zFront],
          [rightEaveX, roofBaseY, zFront],
          [rightEaveX, roofBaseY, zBack],
          [0, ridgeY, zBack],
        ),
        roofMaterial,
      );

      // Ridge cap
      const ridgeGeometry = new BoxGeometry(
        0.18,
        0.14,
        buildingLength + eaveOverhang * 2 + 0.04
      );
      const ridgeMaterial = new MeshStandardMaterial({ 
        color: roofColor,
        roughness: config.shingleType === 'metal' ? 0.2 : 0.7
      });
      const ridge = new Mesh(ridgeGeometry, ridgeMaterial);
      ridge.position.set(0, ridgeY + 0.07, 0);
      ridge.castShadow = true;
      scene.add(ridge);

      // Fascia boards along eaves
      for (const side of [-1, 1]) {
        const fasciaGeom = new BoxGeometry(0.06, 0.18, buildingLength + eaveOverhang * 2);
        const fascia = new Mesh(fasciaGeom, fasciaMat);
        fascia.position.set(side * buildingWidth / 2, wH - 0.09, 0);
        scene.add(fascia);
      }
      // Rake fascia on gable ends
      for (const zSide of [-1, 1]) {
        for (const xSide of [-1, 1]) {
          const rakeFascia = new Mesh(new BoxGeometry(roofLength, 0.1, 0.05), fasciaMat);
          const halfSlope = roofLength / 2;
          const cx = xSide * (halfSlope * Math.cos(roofAngle));
          const cy = roofBaseY + halfSlope * Math.sin(roofAngle);
          rakeFascia.position.set(cx, cy, zSide * (buildingLength / 2 + eaveOverhang));
          rakeFascia.rotation.z = -xSide * roofAngle;
          scene.add(rakeFascia);
        }
      }
      // Gutters
      for (const side of [-1, 1]) {
        const gutterGeom = new CylinderGeometry(0.05, 0.05, buildingLength + eaveOverhang * 2, 8);
        const gutter = new Mesh(gutterGeom, gutterMat);
        gutter.rotation.x = Math.PI / 2;
        gutter.position.set(side * (buildingWidth / 2 + 0.04), wH - 0.12, 0);
        scene.add(gutter);
      }

    } else if (config.style === 'hip') {
      const ridgeHalf = (buildingLength * 0.3) / 2;
      const ridgeY = roofBaseY + roofRise;

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [leftEaveX, roofBaseY, zFront],
          [0, ridgeY, ridgeHalf],
          [0, ridgeY, -ridgeHalf],
          [leftEaveX, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [0, ridgeY, ridgeHalf],
          [rightEaveX, roofBaseY, zFront],
          [rightEaveX, roofBaseY, zBack],
          [0, ridgeY, -ridgeHalf],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofTriangleGeometry(
          [leftEaveX, roofBaseY, zFront],
          [0, ridgeY, ridgeHalf],
          [rightEaveX, roofBaseY, zFront],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofTriangleGeometry(
          [0, ridgeY, -ridgeHalf],
          [leftEaveX, roofBaseY, zBack],
          [rightEaveX, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      const ridgeGeometry = new BoxGeometry(0.18, 0.14, ridgeHalf * 2 + 0.04);
      const ridge = new Mesh(ridgeGeometry, new MeshStandardMaterial({ color: roofColor, roughness: 0.7 }));
      ridge.position.set(0, ridgeY + 0.07, 0);
      ridge.castShadow = true;
      scene.add(ridge);

      // Hip gutters — all four sides
      for (const side of [-1, 1]) {
        const g = new Mesh(new CylinderGeometry(0.05, 0.05, buildingLength + eaveOverhang * 2, 8), gutterMat);
        g.rotation.x = Math.PI / 2;
        g.position.set(side * (buildingWidth / 2 + 0.04), wH - 0.12, 0);
        scene.add(g);
      }
      for (const side of [-1, 1]) {
        const g = new Mesh(new CylinderGeometry(0.05, 0.05, buildingWidth + rakeOverhang * 2, 8), gutterMat);
        g.rotation.z = Math.PI / 2;
        g.position.set(0, wH - 0.12, side * (buildingLength / 2 + eaveOverhang));
        scene.add(g);
      }

    } else if (config.style === 'flat') {
      const flatRoofGeometry = new BoxGeometry(
        buildingWidth + rakeOverhang * 2,
        0.15,
        buildingLength + eaveOverhang * 2
      );
      const flatRoof = new Mesh(flatRoofGeometry, roofMaterial);
      flatRoof.position.set(0, wH + 0.075, 0);
      flatRoof.castShadow = true;
      flatRoof.receiveShadow = true;
      scene.add(flatRoof);
      addEdgeOutline(scene, flatRoofGeometry, flatRoof, 0x555555);

    } else if (config.style === 'shed') {
      const shedRise = buildingWidth * roofPitch;
      const shedPeakY = roofBaseY + shedRise;

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [leftEaveX, roofBaseY, zFront],
          [rightEaveX, shedPeakY, zFront],
          [rightEaveX, shedPeakY, zBack],
          [leftEaveX, roofBaseY, zBack],
        ),
        roofMaterial,
      );

    } else if (config.style === 'gambrel') {
      // Gambrel (barn) roof — steeper lower slopes, gentler upper slopes
      const lowerRise = roofRise * 0.55;
      const upperRise = roofRise * 0.45;
      const breakX = buildingWidth / 4;
      const lowerY = roofBaseY + lowerRise;
      const peakY = lowerY + upperRise;

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [leftEaveX, roofBaseY, zFront],
          [-breakX, lowerY, zFront],
          [-breakX, lowerY, zBack],
          [leftEaveX, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [breakX, lowerY, zFront],
          [rightEaveX, roofBaseY, zFront],
          [rightEaveX, roofBaseY, zBack],
          [breakX, lowerY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [-breakX, lowerY, zFront],
          [0, peakY, zFront],
          [0, peakY, zBack],
          [-breakX, lowerY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [0, peakY, zFront],
          [breakX, lowerY, zFront],
          [breakX, lowerY, zBack],
          [0, peakY, zBack],
        ),
        roofMaterial,
      );

      // Ridge cap
      const ridgeGeom = new BoxGeometry(0.15, 0.12, buildingLength + eaveOverhang * 2);
      const ridgeMat = new MeshStandardMaterial({ color: roofColor, roughness: 0.5 });
      const ridge = new Mesh(ridgeGeom, ridgeMat);
      ridge.position.set(0, peakY + 0.06, 0);
      ridge.castShadow = true;
      scene.add(ridge);

      // Gambrel gable end fills
      const gTop = wH;
      const gMid = wH + lowerRise;
      const gPeak = wH + lowerRise + upperRise;
      const gInner = buildingWidth / 4;

      for (const zPos of [buildingLength / 2, -buildingLength / 2]) {
        const llGeom = new BufferGeometry();
        llGeom.setAttribute('position', new BufferAttribute(new Float32Array([
          -buildingWidth / 2, gTop, zPos,
          -gInner, gMid, zPos,
          -gInner, gTop, zPos,
        ]), 3));
        llGeom.computeVertexNormals();
        scene.add(new Mesh(llGeom, wallMaterial));

        const lrGeom = new BufferGeometry();
        lrGeom.setAttribute('position', new BufferAttribute(new Float32Array([
          buildingWidth / 2, gTop, zPos,
          gInner, gTop, zPos,
          gInner, gMid, zPos,
        ]), 3));
        lrGeom.computeVertexNormals();
        scene.add(new Mesh(lrGeom, wallMaterial));

        const rectGeom = new BufferGeometry();
        rectGeom.setAttribute('position', new BufferAttribute(new Float32Array([
          -gInner, gTop, zPos,
          gInner, gTop, zPos,
          gInner, gMid, zPos,
          -gInner, gTop, zPos,
          gInner, gMid, zPos,
          -gInner, gMid, zPos,
        ]), 3));
        rectGeom.computeVertexNormals();
        scene.add(new Mesh(rectGeom, wallMaterial));

        const upGeom = new BufferGeometry();
        upGeom.setAttribute('position', new BufferAttribute(new Float32Array([
          -gInner, gMid, zPos,
          gInner, gMid, zPos,
          0, gPeak, zPos,
        ]), 3));
        upGeom.computeVertexNormals();
        scene.add(new Mesh(upGeom, wallMaterial));
      }

    } else if (config.style === 'mansard') {
      const mansardHeight = roofRise * 0.75;
      const topInset = buildingWidth * 0.2;
      const topInsetZ = buildingLength * 0.15;
      const topY = roofBaseY + mansardHeight;
      const innerLeftX = -buildingWidth / 2 + topInset;
      const innerRightX = buildingWidth / 2 - topInset;
      const innerFrontZ = buildingLength / 2 - topInsetZ;
      const innerBackZ = -buildingLength / 2 + topInsetZ;

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [leftEaveX, roofBaseY, zFront],
          [innerLeftX, topY, innerFrontZ],
          [innerLeftX, topY, innerBackZ],
          [leftEaveX, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [innerRightX, topY, innerFrontZ],
          [rightEaveX, roofBaseY, zFront],
          [rightEaveX, roofBaseY, zBack],
          [innerRightX, topY, innerBackZ],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [leftEaveX, roofBaseY, zFront],
          [rightEaveX, roofBaseY, zFront],
          [innerRightX, topY, innerFrontZ],
          [innerLeftX, topY, innerFrontZ],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [innerLeftX, topY, innerBackZ],
          [innerRightX, topY, innerBackZ],
          [rightEaveX, roofBaseY, zBack],
          [leftEaveX, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      // Flat top
      const flatTopGeom = new BoxGeometry(
        buildingWidth - topInset * 2 + 0.12,
        0.12,
        buildingLength - topInsetZ * 2 + 0.12
      );
      const flatTop = new Mesh(flatTopGeom, roofMaterial);
      flatTop.position.set(0, topY + 0.06, 0);
      flatTop.castShadow = true;
      flatTop.receiveShadow = true;
      scene.add(flatTop);
    } else if (config.style === 'l-shaped') {
      // L-Shaped roof: main gable section + wing gable section
      // Main section gable roof (same as standard gable)
      const mainRoofLength = Math.sqrt(Math.pow(buildingWidth / 2, 2) + Math.pow(roofRise, 2));
      const mainRoofAngle = Math.atan2(roofRise, buildingWidth / 2);

      const mainLeftRoofGeometry = new BoxGeometry(
        mainRoofLength + rakeOverhang,
        0.1,
        buildingLength + eaveOverhang * 2
      );
      const mainLeftRoof = new Mesh(mainLeftRoofGeometry, roofMaterial);
      mainLeftRoof.position.set(-buildingWidth / 4, wH + roofRise / 2, 0);
      mainLeftRoof.rotation.z = mainRoofAngle;
      mainLeftRoof.castShadow = true;
      mainLeftRoof.receiveShadow = true;
      scene.add(mainLeftRoof);

      const mainRightRoof = new Mesh(mainLeftRoofGeometry, roofMaterial);
      mainRightRoof.position.set(buildingWidth / 4, wH + roofRise / 2, 0);
      mainRightRoof.rotation.z = -mainRoofAngle;
      mainRightRoof.castShadow = true;
      mainRightRoof.receiveShadow = true;
      scene.add(mainRightRoof);

      // Ridge cap for main section
      const mainRidgeGeometry = new BoxGeometry(0.15, 0.12, buildingLength + eaveOverhang * 2);
      const ridgeMaterial2 = new MeshStandardMaterial({ color: roofColor, roughness: 0.5 });
      const mainRidge = new Mesh(mainRidgeGeometry, ridgeMaterial2);
      mainRidge.position.set(0, wH + roofRise + 0.06, 0);
      mainRidge.castShadow = true;
      scene.add(mainRidge);

      // Gable end fills for main section
      for (const zPos of [buildingLength / 2, -buildingLength / 2]) {
        const gableGeom = new BufferGeometry();
        gableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
          -buildingWidth / 2, wH, zPos,
          buildingWidth / 2, wH, zPos,
          0, wH + roofRise, zPos,
        ]), 3));
        gableGeom.computeVertexNormals();
        const gableMesh = new Mesh(gableGeom, wallMaterial);
        gableMesh.castShadow = true;
        scene.add(gableMesh);
      }

      // Wing section
      if (config.lShapeConfig) {
        const wing = config.lShapeConfig;
        const wingWidth = wing.wingWidth * scale;
        const wingLength = wing.wingLength * scale;
        const wingRoofRise = (wingWidth / 2) * roofPitch;

        // Calculate wing position
        const pos = wing.wingPosition;
        const isRight = pos === 'front-right' || pos === 'back-right';
        const isFront = pos === 'front-right' || pos === 'front-left';

        // Calculate how far inward the wing roof must extend to meet the main roof slope.
        // The main roof slope height at distance X from center is:
        //   wallHeight + roofRise * (1 - X / (buildingWidth / 2))
        // The wing ridge is at height wallHeight + wingRoofRise.
        // They intersect where: wingRoofRise = roofRise * (1 - X / (buildingWidth/2))
        //   => X = (buildingWidth/2) * (1 - wingRoofRise / roofRise)
        // The extension past the main wall (at buildingWidth/2) is:
        //   buildingWidth/2 - X = (buildingWidth/2) * (wingRoofRise / roofRise) = wingWidth / 2
        // (since wingRoofRise/roofRise = wingWidth/buildingWidth when same pitch)
        const roofExtension = Math.min(wingWidth / 2, buildingWidth / 2); // how far past the main wall the wing roof extends inward

        // Wing center offset from main building (adjusted to include inward extension)
        const totalWingRoofLength = wingLength + roofExtension;
        const wingCenterX = isRight
          ? buildingWidth / 2 + wingLength / 2 - roofExtension / 2
          : -buildingWidth / 2 - wingLength / 2 + roofExtension / 2;
        const wingCenterZ = isFront
          ? buildingLength / 2 - wingWidth / 2
          : -buildingLength / 2 + wingWidth / 2;

        // Wing wall center (walls only cover the protruding part, not the inward extension)
        const wingWallCenterX = isRight
          ? buildingWidth / 2 + wingLength / 2
          : -buildingWidth / 2 - wingLength / 2;

        // Wing walls
        const wingFrontWallGeom = new BoxGeometry(wingLength, wallHeight, 0.2);
        const wingFrontWall = new Mesh(wingFrontWallGeom, wallMaterial);
        wingFrontWall.position.set(wingWallCenterX, wH / 2, wingCenterZ + wingWidth / 2);
        wingFrontWall.castShadow = true;
        scene.add(wingFrontWall);

        const wingBackWall = new Mesh(wingFrontWallGeom, wallMaterial);
        wingBackWall.position.set(wingWallCenterX, wH / 2, wingCenterZ - wingWidth / 2);
        wingBackWall.castShadow = true;
        scene.add(wingBackWall);

        const wingSideWallGeom = new BoxGeometry(0.2, wallHeight, wingWidth);
        const wingOuterWall = new Mesh(wingSideWallGeom, wallMaterial);
        wingOuterWall.position.set(isRight ? wingWallCenterX + wingLength / 2 : wingWallCenterX - wingLength / 2, wH / 2, wingCenterZ);
        wingOuterWall.castShadow = true;
        scene.add(wingOuterWall);

        // Wing gable roof (extended to meet main roof)
        const wingRoofLen = Math.sqrt(Math.pow(wingWidth / 2, 2) + Math.pow(wingRoofRise, 2));
        const wingRoofAngle = Math.atan2(wingRoofRise, wingWidth / 2);
        const wingEO = config.eaveOverhang * scale;
        const wingRO = config.rakeOverhang * scale;

        // The wing ridge runs along its length (X direction), slopes face front/back (Z direction)
        const wingLeftRoofGeom = new BoxGeometry(totalWingRoofLength + wingRO, 0.1, wingRoofLen + wingEO);
        const wingLeftRoof = new Mesh(wingLeftRoofGeom, roofMaterial);
        wingLeftRoof.position.set(wingCenterX, wH + wingRoofRise / 2, wingCenterZ - wingWidth / 4);
        wingLeftRoof.rotation.x = -wingRoofAngle;
        wingLeftRoof.castShadow = true;
        scene.add(wingLeftRoof);

        const wingRightRoof = new Mesh(wingLeftRoofGeom, roofMaterial);
        wingRightRoof.position.set(wingCenterX, wH + wingRoofRise / 2, wingCenterZ + wingWidth / 4);
        wingRightRoof.rotation.x = wingRoofAngle;
        wingRightRoof.castShadow = true;
        scene.add(wingRightRoof);

        // Wing ridge cap (also extended)
        const wingRidgeGeom = new BoxGeometry(totalWingRoofLength + wingRO, 0.12, 0.15);
        const wingRidge = new Mesh(wingRidgeGeom, ridgeMaterial2);
        wingRidge.position.set(wingCenterX, wH + wingRoofRise + 0.06, wingCenterZ);
        wingRidge.castShadow = true;
        scene.add(wingRidge);

        // Wing gable end fill (only on the outer tip)
        const wingEndX = isRight ? wingWallCenterX + wingLength / 2 : wingWallCenterX - wingLength / 2;
        const wingGableGeom = new BufferGeometry();
        wingGableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
          wingEndX, wH, wingCenterZ - wingWidth / 2,
          wingEndX, wH, wingCenterZ + wingWidth / 2,
          wingEndX, wH + wingRoofRise, wingCenterZ,
        ]), 3));
        wingGableGeom.computeVertexNormals();
        const wingGableMesh = new Mesh(wingGableGeom, wallMaterial);
        wingGableMesh.castShadow = true;
        scene.add(wingGableMesh);

        // Valley flashing at the L-shape intersection
        const valleyFlashingMat = new MeshStandardMaterial({
          color: 0x8b8b8b,
          roughness: 0.3,
          metalness: 0.7,
        });
        // Two valley lines run from the main wall/wing junction corner up to where wing ridge meets main slope
        const valleyStartY = wH;
        const valleyEndY = wH + wingRoofRise;
        const valleyInnerX = isRight ? buildingWidth / 2 : -buildingWidth / 2;
        // Valley line along front edge of wing
        for (const zSide of [wingCenterZ - wingWidth / 2, wingCenterZ + wingWidth / 2]) {
          const valleyGeom = new BoxGeometry(0.08, 0.08,
            Math.sqrt(Math.pow(roofExtension, 2) + Math.pow(wingRoofRise, 2)));
          const valleyAngle = Math.atan2(wingRoofRise, roofExtension);
          const valley = new Mesh(valleyGeom, valleyFlashingMat);
          const vCenterX = isRight
            ? valleyInnerX - roofExtension / 2
            : valleyInnerX + roofExtension / 2;
          valley.position.set(vCenterX, (valleyStartY + valleyEndY) / 2, zSide);
          valley.rotation.z = isRight ? valleyAngle : -valleyAngle;
          valley.castShadow = true;
          scene.add(valley);
        }
      }
    } else if (config.style === 't-shaped') {
      // T-Shaped: main gable + centered wing
      const mainRoofLen = Math.sqrt(Math.pow(buildingWidth / 2, 2) + Math.pow(roofRise, 2));
      const mainRoofAngle = Math.atan2(roofRise, buildingWidth / 2);

      const mainRoofG = new BoxGeometry(mainRoofLen + rakeOverhang, 0.1, buildingLength + eaveOverhang * 2);
      for (const s of [-1, 1]) {
        const panel = new Mesh(mainRoofG, roofMaterial);
        panel.position.set(s * buildingWidth / 4, wH + roofRise / 2, 0);
        panel.rotation.z = s * mainRoofAngle;
        panel.castShadow = true;
        panel.receiveShadow = true;
        scene.add(panel);
      }
      const ridgeMat3 = new MeshStandardMaterial({ color: roofColor, roughness: 0.5 });
      const mainRidgeG = new BoxGeometry(0.15, 0.12, buildingLength + eaveOverhang * 2);
      const mainRidgeM = new Mesh(mainRidgeG, ridgeMat3);
      mainRidgeM.position.set(0, wH + roofRise + 0.06, 0);
      scene.add(mainRidgeM);

      for (const zPos of [buildingLength / 2, -buildingLength / 2]) {
        const gG = new BufferGeometry();
        gG.setAttribute('position', new BufferAttribute(new Float32Array([
          -buildingWidth / 2, wH, zPos,
          buildingWidth / 2, wH, zPos,
          0, wH + roofRise, zPos,
        ]), 3));
        gG.computeVertexNormals();
        scene.add(new Mesh(gG, wallMaterial));
      }

      if (config.tShapeConfig) {
        const wing = config.tShapeConfig;
        const wW = wing.wingWidth * scale;
        const wL = wing.wingLength * scale;
        const wRise = (wW / 2) * roofPitch;
        const side = wing.wingSide;
        const isHoriz = side === 'left' || side === 'right';
        const signX = side === 'right' ? 1 : side === 'left' ? -1 : 0;
        const signZ = side === 'front' ? 1 : side === 'back' ? -1 : 0;

        let wCX = 0, wCZ = 0;
        if (isHoriz) {
          wCX = signX * (buildingWidth / 2 + wL / 2);
        } else {
          wCZ = signZ * (buildingLength / 2 + wW / 2);
        }

        // Wing walls
        if (isHoriz) {
          for (const zOff of [-wW / 2, wW / 2]) {
            const wg = new BoxGeometry(wL, wallHeight, 0.2);
            const w = new Mesh(wg, wallMaterial);
            w.position.set(wCX, wH / 2, wCZ + zOff);
            w.castShadow = true;
            scene.add(w);
          }
          const eg = new BoxGeometry(0.2, wallHeight, wW);
          const ew = new Mesh(eg, wallMaterial);
          ew.position.set(wCX + signX * wL / 2, wH / 2, wCZ);
          ew.castShadow = true;
          scene.add(ew);
        } else {
          for (const xOff of [-wL / 2, wL / 2]) {
            const wg = new BoxGeometry(0.2, wallHeight, wW);
            const w = new Mesh(wg, wallMaterial);
            w.position.set(wCX + xOff, wH / 2, wCZ);
            w.castShadow = true;
            scene.add(w);
          }
          const eg = new BoxGeometry(wL, wallHeight, 0.2);
          const ew = new Mesh(eg, wallMaterial);
          ew.position.set(wCX, wH / 2, wCZ + signZ * wW / 2);
          ew.castShadow = true;
          scene.add(ew);
        }

        // Wing roof
        const wRoofLen = Math.sqrt(Math.pow(wW / 2, 2) + Math.pow(wRise, 2));
        const wRoofAngle = Math.atan2(wRise, wW / 2);
        if (isHoriz) {
          const wrg = new BoxGeometry(wL + rakeOverhang, 0.1, wRoofLen + eaveOverhang);
          for (const s of [-1, 1]) {
            const p = new Mesh(wrg, roofMaterial);
            p.position.set(wCX, wH + wRise / 2, wCZ + s * wW / 4);
            p.rotation.x = -s * wRoofAngle;
            p.castShadow = true;
            scene.add(p);
          }
          const wrr = new BoxGeometry(wL + rakeOverhang, 0.12, 0.15);
          const wr = new Mesh(wrr, ridgeMat3);
          wr.position.set(wCX, wH + wRise + 0.06, wCZ);
          scene.add(wr);
        } else {
          const wrg = new BoxGeometry(wRoofLen + eaveOverhang, 0.1, wW + rakeOverhang);
          for (const s of [-1, 1]) {
            const p = new Mesh(wrg, roofMaterial);
            p.position.set(wCX + s * wW / 4, wH + wRise / 2, wCZ);
            p.rotation.z = s * wRoofAngle;
            p.castShadow = true;
            scene.add(p);
          }
        }
      }
    } else if (config.style === 'u-shaped') {
      // U-Shaped: main gable + two symmetrical wings
      const mainRoofLen = Math.sqrt(Math.pow(buildingWidth / 2, 2) + Math.pow(roofRise, 2));
      const mainRoofAngle = Math.atan2(roofRise, buildingWidth / 2);

      const mainRoofG = new BoxGeometry(mainRoofLen + rakeOverhang, 0.1, buildingLength + eaveOverhang * 2);
      for (const s of [-1, 1]) {
        const panel = new Mesh(mainRoofG, roofMaterial);
        panel.position.set(s * buildingWidth / 4, wH + roofRise / 2, 0);
        panel.rotation.z = s * mainRoofAngle;
        panel.castShadow = true;
        scene.add(panel);
      }
      const ridgeMat4 = new MeshStandardMaterial({ color: roofColor, roughness: 0.5 });
      const mainRidgeG2 = new BoxGeometry(0.15, 0.12, buildingLength + eaveOverhang * 2);
      const mainRidgeM2 = new Mesh(mainRidgeG2, ridgeMat4);
      mainRidgeM2.position.set(0, wH + roofRise + 0.06, 0);
      scene.add(mainRidgeM2);

      for (const zPos of [buildingLength / 2, -buildingLength / 2]) {
        const gG = new BufferGeometry();
        gG.setAttribute('position', new BufferAttribute(new Float32Array([
          -buildingWidth / 2, wH, zPos,
          buildingWidth / 2, wH, zPos,
          0, wH + roofRise, zPos,
        ]), 3));
        gG.computeVertexNormals();
        scene.add(new Mesh(gG, wallMaterial));
      }

      if (config.uShapeConfig) {
        const wing = config.uShapeConfig;
        const wW = wing.wingWidth * scale;
        const wL = wing.wingLength * scale;
        const wRise = (wW / 2) * roofPitch;
        const isLR = wing.wingSide === 'left-right';

        const wingPositions = isLR
          ? [{ cx: buildingWidth / 2 + wL / 2, cz: buildingLength / 2 - wW / 2, sign: 1 },
             { cx: -(buildingWidth / 2 + wL / 2), cz: buildingLength / 2 - wW / 2, sign: -1 }]
          : [{ cx: 0, cz: buildingLength / 2 + wW / 2, sign: 1 },
             { cx: 0, cz: -(buildingLength / 2 + wW / 2), sign: -1 }];

        for (const wp of wingPositions) {
          if (isLR) {
            for (const zOff of [-wW / 2, wW / 2]) {
              const wg = new BoxGeometry(wL, wallHeight, 0.2);
              const w = new Mesh(wg, wallMaterial);
              w.position.set(wp.cx, wH / 2, wp.cz + zOff);
              w.castShadow = true;
              scene.add(w);
            }
            const eg = new BoxGeometry(0.2, wallHeight, wW);
            const ew = new Mesh(eg, wallMaterial);
            ew.position.set(wp.cx + wp.sign * wL / 2, wH / 2, wp.cz);
            scene.add(ew);

            const wRoofLen = Math.sqrt(Math.pow(wW / 2, 2) + Math.pow(wRise, 2));
            const wRoofAngle = Math.atan2(wRise, wW / 2);
            const wrg = new BoxGeometry(wL + rakeOverhang, 0.1, wRoofLen + eaveOverhang);
            for (const s of [-1, 1]) {
              const p = new Mesh(wrg, roofMaterial);
              p.position.set(wp.cx, wH + wRise / 2, wp.cz + s * wW / 4);
              p.rotation.x = -s * wRoofAngle;
              p.castShadow = true;
              scene.add(p);
            }
            const wrr = new BoxGeometry(wL + rakeOverhang, 0.12, 0.15);
            const wr = new Mesh(wrr, ridgeMat4);
            wr.position.set(wp.cx, wH + wRise + 0.06, wp.cz);
            scene.add(wr);
          } else {
            for (const xOff of [-wL / 2, wL / 2]) {
              const wg = new BoxGeometry(0.2, wallHeight, wW);
              const w = new Mesh(wg, wallMaterial);
              w.position.set(wp.cx + xOff, wH / 2, wp.cz);
              scene.add(w);
            }
            const eg = new BoxGeometry(wL, wallHeight, 0.2);
            const ew = new Mesh(eg, wallMaterial);
            ew.position.set(wp.cx, wH / 2, wp.cz + wp.sign * wW / 2);
            scene.add(ew);

            const wRoofLen = Math.sqrt(Math.pow(wW / 2, 2) + Math.pow(wRise, 2));
            const wRoofAngle = Math.atan2(wRise, wW / 2);
            const wrg = new BoxGeometry(wRoofLen + eaveOverhang, 0.1, wW + rakeOverhang);
            for (const s of [-1, 1]) {
              const p = new Mesh(wrg, roofMaterial);
              p.position.set(wp.cx + s * wW / 4, wH + wRise / 2, wp.cz);
              p.rotation.z = s * wRoofAngle;
              p.castShadow = true;
              scene.add(p);
            }
          }
        }
      }
    }

    // Gable end fills for gable style
    if (config.style === 'gable') {
      for (const zPos of [buildingLength / 2, -buildingLength / 2]) {
        const gableGeom = new BufferGeometry();
        gableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
          -buildingWidth / 2, wH, zPos,
          buildingWidth / 2, wH, zPos,
          0, wH + roofRise, zPos,
        ]), 3));
        gableGeom.computeVertexNormals();
        const gableMesh = new Mesh(gableGeom, wallMaterial);
        gableMesh.castShadow = true;
        scene.add(gableMesh);
      }
    }

    // Chimney (if configured) — with brick texture
    if (config.hasChimney && config.chimneyCount && config.chimneyCount > 0) {
      const brickTex = createBrickTexture();
      const chimneyMaterial = new MeshStandardMaterial({ 
        color: 0x8b4513,
        roughness: 0.9,
        map: brickTex
      });
      // Main chimney body
      const chimneyGeometry = new BoxGeometry(0.6, 2.5, 0.6);
      const chimney = new Mesh(chimneyGeometry, chimneyMaterial);
      chimney.position.set(buildingWidth * 0.2, wH + roofRise / 2 + 1.25, buildingLength * 0.2);
      chimney.castShadow = true;
      scene.add(chimney);
      addEdgeOutline(scene, chimneyGeometry, chimney, 0x444444);
      // Chimney cap
      const capGeom = new BoxGeometry(0.72, 0.08, 0.72);
      const capMat = new MeshStandardMaterial({ color: 0x666666, roughness: 0.6, metalness: 0.3 });
      const cap = new Mesh(capGeom, capMat);
      cap.position.set(buildingWidth * 0.2, wH + roofRise / 2 + 2.54, buildingLength * 0.2);
      scene.add(cap);
      // Flue
      const flueGeom = new CylinderGeometry(0.08, 0.08, 0.3, 8);
      const flueMat = new MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.5 });
      const flue = new Mesh(flueGeom, flueMat);
      flue.position.set(buildingWidth * 0.2, wH + roofRise / 2 + 2.73, buildingLength * 0.2);
      scene.add(flue);
    }

    // Skylights (if configured)
    if (config.hasSkylight && config.skylightCount && config.skylightCount > 0) {
      for (let i = 0; i < config.skylightCount; i++) {
        const skylightGeometry = new BoxGeometry(0.8, 0.08, 1.2);
        const skylightMaterial = new MeshStandardMaterial({ 
          color: 0x87ceeb,
          transparent: true,
          opacity: 0.6,
          metalness: 0.9,
          roughness: 0.1
        });
        const skylight = new Mesh(skylightGeometry, skylightMaterial);
        
        const xPos = -buildingWidth * 0.3 + i * 1.5;
        const roofAngle = Math.atan2(roofRise, buildingWidth / 2);
        
        skylight.position.set(xPos, wH + roofRise * 0.6, -buildingLength * 0.2);
        skylight.rotation.z = roofAngle;
        scene.add(skylight);
      }
    }

    // Ridge vent (if applicable)
    if (config.style === 'gable' && config.ridgeVentLength) {
      const ventGeometry = new CylinderGeometry(0.08, 0.08, buildingLength * 0.8, 16);
      const ventMaterial = new MeshStandardMaterial({ 
        color: 0x2c3e50,
        roughness: 0.6
      });
      const vent = new Mesh(ventGeometry, ventMaterial);
      vent.rotation.x = Math.PI / 2;
      vent.position.set(0, wH + roofRise + 0.12, 0);
      scene.add(vent);
    }

    // Dormers (if configured)
    if (config.hasDormers && config.dormers && config.dormers.length > 0) {
      const dormerWallMat = new MeshStandardMaterial({ 
        color: 0xf0ead6,
        roughness: 0.8,
        side: DoubleSide
      });
      const dormerRoofMat = new MeshStandardMaterial({ 
        color: roofColor,
        roughness: config.shingleType === 'metal' ? 0.2 : 0.95,
        metalness: config.shingleType === 'metal' ? 0.7 : 0.0
      });
      const windowMat = new MeshStandardMaterial({ 
        color: 0x87ceeb,
        transparent: true,
        metalness: 0.8,
        roughness: 0.1
      });

      // For gable roofs: slopes go across X axis, ridge runs along Z.
      // "front" slope = -X side, "back" slope = +X side.
      // Dormer depth extends toward ridge (toward X=0).

      for (const dormer of config.dormers) {
        const dW = dormer.width * scale;
        const dH = dormer.height * scale;
        // User configured depth - but we will dynamically adjust it to hit the roof
        const configuredDepth = dormer.depth * scale;

        // Z position along building length
        const zPos = -buildingLength / 2 + (buildingLength * dormerPositionToPercent(dormer.horizontalPosition) / 100);

        // slopeSign: -1 for front slope (-X side), +1 for back slope (+X side)
        const slopeSign = dormer.side === 'front' ? -1 : 1;

        // X position on slope: partway from eave toward ridge
        const slopeProgress = 0.35;
        const xEave = slopeSign * buildingWidth / 2;
        const xFront = xEave * (1 - slopeProgress);
        const surfaceYFront = wH + roofRise * slopeProgress;
        const floorY = surfaceYFront;

        // Calculate required depth so the dormer roof intersects the main roof
        let yMax = floorY + dH;
        if (dormer.style === 'gable') yMax += dH * 0.4;
        else if (dormer.style === 'shed') yMax += dH * 0.3;
        else if (dormer.style === 'hip') yMax += dH * 0.35;
        else if (dormer.style === 'flat') yMax += 0.08;
        else if (dormer.style === 'eyebrow') yMax += dH * 0.3;

        let reqAbsX = (buildingWidth / 2) * (1 - (yMax - wH) / roofRise);
        reqAbsX = Math.max(0.1, reqAbsX); // Prevent extending past the ridge

        // Dynamically override depth to hit the roof perfectly (add slight buffer to avoid gaps)
        const dD = Math.abs(Math.abs(xFront) - reqAbsX) + 0.1;

        // Depth direction toward ridge: -slopeSign
        const depthDir = -slopeSign;
        // X at center of dormer depth
        const xCenter = xFront + depthDir * dD / 2;

        // Front wall: faces outward along X, spans Z (width) and Y (height)
        const frontWallGeom = new BoxGeometry(0.08, dH, dW);
        const frontWall = new Mesh(frontWallGeom, dormerWallMat);
        frontWall.position.set(xFront, floorY + dH / 2, zPos);
        frontWall.castShadow = true;
        frontWall.receiveShadow = true;
        scene.add(frontWall);

        // Side walls: span along X (depth direction), thin in Z
        const sideWallGeom = new BoxGeometry(dD, dH, 0.08);
        const leftSideWall = new Mesh(sideWallGeom, dormerWallMat);
        leftSideWall.position.set(xCenter, floorY + dH / 2, zPos - dW / 2);
        leftSideWall.castShadow = true;
        scene.add(leftSideWall);

        const rightSideWall = new Mesh(sideWallGeom, dormerWallMat);
        rightSideWall.position.set(xCenter, floorY + dH / 2, zPos + dW / 2);
        rightSideWall.castShadow = true;
        scene.add(rightSideWall);

        // Back wall: faces outward along X, spans Z (width) and Y (height)
        const xBack = xFront + depthDir * dD;
        const backWallGeom = new BoxGeometry(0.08, dH, dW);
        const backWall = new Mesh(backWallGeom, dormerWallMat);
        backWall.position.set(xBack, floorY + dH / 2, zPos);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        scene.add(backWall);

        // Dormer roof based on style
        if (dormer.style === 'gable') {
          const dormerRoofRise = dH * 0.4;
          const dormerRoofLen = Math.sqrt(Math.pow(dW / 2, 2) + Math.pow(dormerRoofRise, 2));
          const dormerRoofAngle = Math.atan2(dormerRoofRise, dW / 2);

          // Dormer gable roof panels span along X (depth), tilted around X axis
          const drGeom = new BoxGeometry(dD + 0.1, 0.06, dormerRoofLen);
          const leftDRoof = new Mesh(drGeom, dormerRoofMat);
          leftDRoof.position.set(xCenter, floorY + dH + dormerRoofRise / 2, zPos - dW / 4);
          leftDRoof.rotation.x = -dormerRoofAngle;
          leftDRoof.castShadow = true;
          scene.add(leftDRoof);

          const rightDRoof = new Mesh(drGeom, dormerRoofMat);
          rightDRoof.position.set(xCenter, floorY + dH + dormerRoofRise / 2, zPos + dW / 4);
          rightDRoof.rotation.x = dormerRoofAngle;
          rightDRoof.castShadow = true;
          scene.add(rightDRoof);

          // Front Gable Wall (Triangle)
          const gableGeom = new BufferGeometry();
          // Place slightly outward to align with the outer face of the front wall
          const gX = xFront + (slopeSign * 0.04);
          const gY1 = floorY + dH;
          const gY2 = floorY + dH + dormerRoofRise;
          const gZ1 = zPos - dW / 2;
          const gZ2 = zPos + dW / 2;
          const gZ3 = zPos;

          // Define triangle vertices
          const vertices = new Float32Array([
            gX, gY1, gZ1,
            gX, gY1, gZ2,
            gX, gY2, gZ3
          ]);
          
          gableGeom.setAttribute('position', new BufferAttribute(vertices, 3));
          gableGeom.computeVertexNormals();
          
          const frontGable = new Mesh(gableGeom, dormerWallMat);
          frontGable.castShadow = true;
          frontGable.receiveShadow = true;
          scene.add(frontGable);

          // Back Gable Wall (Triangle)
          const backGableGeom = new BufferGeometry();
          const bgX = xBack - (slopeSign * 0.04);
          const backVertices = new Float32Array([
            bgX, gY1, gZ1,
            bgX, gY1, gZ2,
            bgX, gY2, gZ3
          ]);
          backGableGeom.setAttribute('position', new BufferAttribute(backVertices, 3));
          backGableGeom.computeVertexNormals();
          const backGable = new Mesh(backGableGeom, dormerWallMat);
          backGable.castShadow = true;
          backGable.receiveShadow = true;
          scene.add(backGable);

        } else if (dormer.style === 'shed') {
          const shedRise = dH * 0.3;
          const shedLen = Math.sqrt(dD * dD + shedRise * shedRise);
          const shedAngle = Math.atan2(shedRise, dD);

          // Shed roof tilts along X (depth direction)
          const shedRoofGeom = new BoxGeometry(shedLen, 0.06, dW + 0.1);
          const shedRoof = new Mesh(shedRoofGeom, dormerRoofMat);
          shedRoof.position.set(xCenter, floorY + dH + shedRise / 2, zPos);
          shedRoof.rotation.z = depthDir * shedAngle;
          shedRoof.castShadow = true;
          scene.add(shedRoof);

          // Back Shed Wall Extension (Rectangle)
          const backShedExtGeom = new BoxGeometry(0.08, shedRise, dW);
          const backShedExt = new Mesh(backShedExtGeom, dormerWallMat);
          backShedExt.position.set(xBack, floorY + dH + shedRise / 2, zPos);
          backShedExt.castShadow = true;
          backShedExt.receiveShadow = true;
          scene.add(backShedExt);

          // Side Shed Wall Extensions (Triangles)
          const sY1 = floorY + dH;
          const sY2 = floorY + dH + shedRise;
          
          // Left side
          const leftShedVerts = new Float32Array([
            xFront, sY1, zPos - dW/2,
            xBack, sY1, zPos - dW/2,
            xBack, sY2, zPos - dW/2
          ]);
          const leftShedExtGeom = new BufferGeometry();
          leftShedExtGeom.setAttribute('position', new BufferAttribute(leftShedVerts, 3));
          leftShedExtGeom.computeVertexNormals();
          const leftShedExt = new Mesh(leftShedExtGeom, dormerWallMat);
          leftShedExt.castShadow = true;
          leftShedExt.receiveShadow = true;
          scene.add(leftShedExt);

          // Right side
          const rightShedVerts = new Float32Array([
            xFront, sY1, zPos + dW/2,
            xBack, sY1, zPos + dW/2,
            xBack, sY2, zPos + dW/2
          ]);
          const rightShedExtGeom = new BufferGeometry();
          rightShedExtGeom.setAttribute('position', new BufferAttribute(rightShedVerts, 3));
          rightShedExtGeom.computeVertexNormals();
          const rightShedExt = new Mesh(rightShedExtGeom, dormerWallMat);
          rightShedExt.castShadow = true;
          rightShedExt.receiveShadow = true;
          scene.add(rightShedExt);

        } else if (dormer.style === 'hip') {
          const hipH = dH * 0.35;
          const hipRoofGeom = new BoxGeometry(dD + 0.1, 0.06, dW * 0.6);
          const hipRoof = new Mesh(hipRoofGeom, dormerRoofMat);
          hipRoof.position.set(xCenter, floorY + dH + hipH / 2, zPos);
          hipRoof.castShadow = true;
          scene.add(hipRoof);

          const hipSideGeom = new BoxGeometry(dD * 0.6, 0.06, dW * 0.3);
          const hipLeft = new Mesh(hipSideGeom, dormerRoofMat);
          hipLeft.position.set(xCenter, floorY + dH + hipH * 0.3, zPos - dW * 0.35);
          hipLeft.rotation.x = Math.atan2(hipH, dW * 0.3);
          hipLeft.castShadow = true;
          scene.add(hipLeft);

          const hipRight = new Mesh(hipSideGeom, dormerRoofMat);
          hipRight.position.set(xCenter, floorY + dH + hipH * 0.3, zPos + dW * 0.35);
          hipRight.rotation.x = -Math.atan2(hipH, dW * 0.3);
          hipRight.castShadow = true;
          scene.add(hipRight);

        } else if (dormer.style === 'flat') {
          const flatRoofGeom = new BoxGeometry(dD + 0.1, 0.08, dW + 0.1);
          const flatRoof = new Mesh(flatRoofGeom, dormerRoofMat);
          flatRoof.position.set(xCenter, floorY + dH + 0.04, zPos);
          flatRoof.castShadow = true;
          scene.add(flatRoof);

        } else if (dormer.style === 'eyebrow') {
          const eyebrowH = dH * 0.3;
          const segments = 8;
          for (let i = 0; i < segments; i++) {
            const t = i / (segments - 1);
            const angle = t * Math.PI;
            const h = Math.sin(angle) * eyebrowH;
            const segW = dW / segments;
            const segGeom = new BoxGeometry(dD + 0.1, 0.06, segW + 0.02);
            const seg = new Mesh(segGeom, dormerRoofMat);
            seg.position.set(
              xCenter,
              floorY + dH + h,
              zPos - dW / 2 + segW * i + segW / 2
            );
            seg.castShadow = true;
            scene.add(seg);
          }
        }

        // Window on front face
        if (dormer.hasWindow) {
          const winW = dW * 0.55;
          const winH = dH * 0.6;
          const winGeom = new BoxGeometry(0.05, winH, winW);
          const win = new Mesh(winGeom, windowMat);
          const winXOffset = slopeSign * 0.05;
          win.position.set(xFront + winXOffset, floorY + dH * 0.45, zPos);
          scene.add(win);

          const frameMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
          const frameTop = new Mesh(new BoxGeometry(0.06, 0.04, winW + 0.06), frameMat);
          frameTop.position.set(xFront + winXOffset, floorY + dH * 0.45 + winH / 2, zPos);
          scene.add(frameTop);
          const frameBottom = new Mesh(new BoxGeometry(0.06, 0.04, winW + 0.06), frameMat);
          frameBottom.position.set(xFront + winXOffset, floorY + dH * 0.45 - winH / 2, zPos);
          scene.add(frameBottom);
        }
      }
    }

    // Pointer & Touch controls
    let isDragging = false;
    let previousPointerPosition = { x: 0, y: 0 };
    let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 5 };
    let cameraDistance = 15;

    // For touch pinch-to-zoom
    let initialPinchDistance: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      previousPointerPosition = { x: e.clientX, y: e.clientY };
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousPointerPosition.x;
      const deltaY = e.clientY - previousPointerPosition.y;

      cameraRotation.theta -= deltaX * 0.01;
      cameraRotation.phi -= deltaY * 0.01;
      cameraRotation.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraRotation.phi));

      previousPointerPosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      renderer.domElement.releasePointerCapture(e.pointerId);
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && initialPinchDistance !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const delta = initialPinchDistance - dist;
        cameraDistance += delta * 0.05;
        cameraDistance = Math.max(6, Math.min(35, cameraDistance));
        
        initialPinchDistance = dist;
      }
    };

    const onTouchEnd = () => {
      initialPinchDistance = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.01;
      cameraDistance = Math.max(6, Math.min(35, cameraDistance));
    };

    // Add CSS to prevent browser scrolling on the canvas
    renderer.domElement.style.touchAction = 'none';

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);

    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd);
    
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Auto-rotate disabled per user request
      // if (!isDragging) {
      //   cameraRotation.theta -= 0.002;
      // }

      camera.position.x = cameraDistance * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
      camera.position.y = cameraDistance * Math.cos(cameraRotation.phi);
      camera.position.z = cameraDistance * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
      camera.lookAt(0, wH / 2, 0);

      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { scene, camera, renderer };

    // Handle resize with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (!sceneRef.current) return;
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        if (width > 0 && height > 0) {
          sceneRef.current.camera.aspect = width / height;
          sceneRef.current.camera.updateProjectionMatrix();
          sceneRef.current.renderer.setSize(width, height);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (containerRef.current && renderer.domElement.parentElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [config]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-cyan-200 rounded-lg overflow-hidden relative">
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold text-foreground mb-1">🎮 3D Controls:</div>
        <div className="space-y-0.5 text-foreground">
          <div>🖱️ <strong>Rotate:</strong> Click + drag / Swipe</div>
          <div>🔍 <strong>Zoom:</strong> Scroll / Pinch</div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Building</div>
            <div className="font-bold text-foreground">{config.width}' × {config.length}'</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pitch</div>
            <div className="font-bold text-foreground">{config.pitch}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Style</div>
            <div className="font-bold text-foreground">{config.style}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Material</div>
            <div className="font-bold text-foreground">{config.shingleType}</div>
          </div>
          {config.style === 'l-shaped' && config.lShapeConfig && (
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Wing</div>
              <div className="font-bold text-foreground">{config.lShapeConfig.wingLength}' x {config.lShapeConfig.wingWidth}' ({config.lShapeConfig.wingPosition.replace('-', ' ')})</div>
            </div>
          )}
          {config.style === 't-shaped' && config.tShapeConfig && (
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Wing</div>
              <div className="font-bold text-foreground">{config.tShapeConfig.wingLength}' x {config.tShapeConfig.wingWidth}' ({config.tShapeConfig.wingSide})</div>
            </div>
          )}
          {config.style === 'u-shaped' && config.uShapeConfig && (
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Wings (x2)</div>
              <div className="font-bold text-foreground">{config.uShapeConfig.wingLength}' x {config.uShapeConfig.wingWidth}' ({config.uShapeConfig.wingSide})</div>
            </div>
          )}
          {config.hasDormers && (config.dormers || []).length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">Dormers</div>
              <div className="font-bold text-foreground">{(config.dormers || []).length}</div>
            </div>
          )}
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}