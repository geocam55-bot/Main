import React, { useRef, useEffect } from 'react';
import { GarageConfig } from '../../types/garage';
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
  DoubleSide,
  EdgesGeometry,
  BoxGeometry,
  LineBasicMaterial,
  LineSegments,
  BufferGeometry,
  BufferAttribute,
  Vector3,
  CanvasTexture,
  CylinderGeometry
} from '../../utils/three';
import { 
  createGrassTexture, 
  createConcreteTexture, 
  createSidingTexture,
  createShingleTexture 
} from '../../utils/proceduralTextures';

interface Garage3DRendererProps {
  config: GarageConfig;
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

type RoofPoint = [number, number, number];

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

function addRoofSurface(scene: Scene, geometry: BufferGeometry, material: MeshStandardMaterial, color = 0x222222) {
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  addEdgeOutline(scene, geometry, mesh, color);
  return mesh;
}

export function Garage3DRenderer({ config }: Garage3DRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // v1.2 - Fixed door and window rotation to align with walls

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Create scene
    const scene = new Scene();
    scene.background = new Color(0xd4e6f1);
    scene.fog = new Fog(0xd4e6f1, 15, 65);

    // Create camera
    const camera = new PerspectiveCamera(60, width / height, 0.1, 100);
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

    const rimLight = new DirectionalLight(0xfff0d8, 0.28);
    rimLight.position.set(-8, 8, -18);
    scene.add(rimLight);

    // Convert feet to meters
    const scale = 0.3048;
    const garageWidth = config.width * scale;
    const garageLength = config.length * scale;
    const wallHeight = config.height * scale;
    const roofPitch = config.roofPitch / 12;
    const roofRise = (garageWidth / 2) * roofPitch;

    // Procedural textures
    const grassTexture = createGrassTexture();
    const concreteTexture = createConcreteTexture();
    const sidingColor = config.sidingType === 'vinyl' ? 0xe8e8e8 :
                        config.sidingType === 'wood' ? 0xc4a57b :
                        config.sidingType === 'metal' ? 0xb8c5d6 : 0xd9d9d9;
    const sidingTexture = createSidingTexture(sidingColor);
    const roofColor = config.roofingMaterial === 'metal' ? 0x7f8c8d :
                      config.roofingMaterial === 'rubber' ? 0x2c3e50 : 0x5a4a42;
    const roofType = config.roofingMaterial === 'metal' ? 'metal' : 'architectural-shingle';
    const roofTexture = createShingleTexture(roofColor, roofType);

    // Create ground
    const groundGeometry = new PlaneGeometry(60, 60);
    const groundMaterial = new MeshStandardMaterial({ 
      map: grassTexture,
      roughness: 0.95,
      metalness: 0.0
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground grid
    const gridHelper = new GridHelper(40, 40, 0x6b8a5b, 0x89a87a);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Foundation/Slab
    const slabGeometry = new BoxGeometry(garageWidth + 0.3, 0.2, garageLength + 0.3);
    const slabMaterial = new MeshStandardMaterial({ 
      map: concreteTexture,
      roughness: 0.9,
      metalness: 0.0
    });
    const slab = new Mesh(slabGeometry, slabMaterial);
    slab.position.set(0, 0.1, 0);
    slab.receiveShadow = true;
    slab.castShadow = true;
    scene.add(slab);

    // Wall material
    const wallMaterial = new MeshStandardMaterial({ 
      map: sidingTexture,
      roughness: config.sidingType === 'metal' ? 0.3 : 0.85,
      metalness: config.sidingType === 'metal' ? 0.4 : 0.0,
      side: DoubleSide
    });

    // Front wall
    const frontWallGeometry = new BoxGeometry(garageWidth, wallHeight, 0.15);
    const frontWall = new Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, wallHeight / 2 + 0.2, garageLength / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    scene.add(frontWall);
    addEdgeOutline(scene, frontWallGeometry, frontWall);

    // Back wall
    const backWall = new Mesh(frontWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2 + 0.2, -garageLength / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);
    addEdgeOutline(scene, frontWallGeometry, backWall);

    // Side walls
    const sideWallGeometry = new BoxGeometry(0.15, wallHeight, garageLength);
    const leftWall = new Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-garageWidth / 2, wallHeight / 2 + 0.2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    addEdgeOutline(scene, sideWallGeometry, leftWall);

    const rightWall = new Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(garageWidth / 2, wallHeight / 2 + 0.2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);
    addEdgeOutline(scene, sideWallGeometry, rightWall);

    // Roof
    const roofMaterial = new MeshStandardMaterial({ 
      map: roofTexture,
      roughness: config.roofingMaterial === 'metal' ? 0.25 : 0.95,
      metalness: config.roofingMaterial === 'metal' ? 0.6 : 0.0,
      side: DoubleSide
    });

    if (config.roofStyle === 'gable') {
      const roofBaseY = wallHeight + 0.2;
      const ridgeY = roofBaseY + roofRise;
      const sideOverhang = 0.18;
      const endOverhang = 0.3;
      const zFront = garageLength / 2 + endOverhang;
      const zBack = -garageLength / 2 - endOverhang;

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [-garageWidth / 2 - sideOverhang, roofBaseY, zFront],
          [0, ridgeY, zFront],
          [0, ridgeY, zBack],
          [-garageWidth / 2 - sideOverhang, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [0, ridgeY, zFront],
          [garageWidth / 2 + sideOverhang, roofBaseY, zFront],
          [garageWidth / 2 + sideOverhang, roofBaseY, zBack],
          [0, ridgeY, zBack],
        ),
        roofMaterial,
      );

      const ridgeCap = new Mesh(
        new BoxGeometry(0.12, 0.08, garageLength + endOverhang * 2 + 0.04),
        roofMaterial
      );
      ridgeCap.position.set(0, ridgeY + 0.04, 0);
      ridgeCap.castShadow = true;
      ridgeCap.receiveShadow = true;
      scene.add(ridgeCap);

      // Gable end walls
      const gableGeometry = new BufferGeometry();
      const gableVertices = new Float32Array([
        -garageWidth/2, wallHeight + 0.2, garageLength/2,
        garageWidth/2, wallHeight + 0.2, garageLength/2,
        0, wallHeight + 0.2 + roofRise, garageLength/2,
      ]);
      gableGeometry.setAttribute('position', new BufferAttribute(gableVertices, 3));
      gableGeometry.computeVertexNormals();
      
      const gableFront = new Mesh(gableGeometry, wallMaterial);
      gableFront.castShadow = true;
      scene.add(gableFront);
      
      const gableBack = new Mesh(gableGeometry, wallMaterial);
      gableBack.position.z = -garageLength;
      gableBack.castShadow = true;
      scene.add(gableBack);
    } else if (config.roofStyle === 'flat') {
      const flatRoofGeometry = new BoxGeometry(garageWidth + 0.3, 0.15, garageLength + 0.6);
      const flatRoof = new Mesh(flatRoofGeometry, roofMaterial);
      flatRoof.position.set(0, wallHeight + 0.275, 0);
      flatRoof.castShadow = true;
      flatRoof.receiveShadow = true;
      scene.add(flatRoof);
      addEdgeOutline(scene, flatRoofGeometry, flatRoof, 0x222222);
    }

    // Driveway (concrete path leading to garage)
    const drivewayGeom = new BoxGeometry(garageWidth * 0.9, 0.08, 6);
    const drivewayMat = new MeshStandardMaterial({ 
      map: concreteTexture,
      roughness: 0.85,
      metalness: 0.0
    });
    const driveway = new Mesh(drivewayGeom, drivewayMat);
    driveway.position.set(0, 0.04, garageLength / 2 + 3.2);
    driveway.receiveShadow = true;
    scene.add(driveway);

    // Garage doors
    config.doors.forEach((door) => {
      const doorWidth = door.width * scale;
      const doorHeight = door.height * scale;
      const doorGeometry = new BoxGeometry(doorWidth, doorHeight, 0.05);
      const doorMaterial = new MeshStandardMaterial({ 
        color: 0xf0f0f0,
        roughness: 0.4,
        metalness: 0.6
      });
      const doorMesh = new Mesh(doorGeometry, doorMaterial);

      let x = 0, z = 0, rotationY = 0;
      if (door.position === 'front') {
        x = -garageWidth/2 + doorWidth/2 + (door.offsetFromLeft || 0) * scale;
        z = garageLength/2 + 0.1;
        rotationY = 0; // Door faces +z direction (no rotation needed)
      } else if (door.position === 'side') {
        x = garageWidth/2 + 0.1;
        z = -garageLength/2 + doorWidth/2 + (door.offsetFromLeft || 0) * scale;
        rotationY = Math.PI / 2; // Rotate 90° to face +x direction
      }

      doorMesh.position.set(x, doorHeight/2 + 0.2, z);
      doorMesh.rotation.y = rotationY;
      doorMesh.castShadow = true;
      doorMesh.receiveShadow = true;
      scene.add(doorMesh);
      addEdgeOutline(scene, doorGeometry, doorMesh, 0x404040);

      // Door panels (horizontal lines)
      for (let i = 1; i < 5; i++) {
        const panelGeometry = new BoxGeometry(doorWidth * 0.96, 0.03, 0.07);
        const panelMaterial = new MeshStandardMaterial({ 
          color: 0xd0d0d0,
          roughness: 0.5,
          metalness: 0.4
        });
        const panel = new Mesh(panelGeometry, panelMaterial);
        // Position panels relative to foundation top (0.2)
        const panelZ = door.position === 'front' ? z + 0.035 : z;
        const panelX = door.position === 'front' ? x : x + 0.035;
        panel.position.set(panelX, (doorHeight / 5) * i + 0.2, panelZ);
        panel.rotation.y = rotationY;
        panel.castShadow = true;
        scene.add(panel);
      }

      // Door handle
      const handleGeometry = new BoxGeometry(0.03, 0.15, 0.05);
      const handleMaterial = new MeshStandardMaterial({ 
        color: 0x2d2d2d, 
        metalness: 0.9, 
        roughness: 0.2 
      });
      const handle = new Mesh(handleGeometry, handleMaterial);
      const handleOffsetX = door.position === 'front' ? doorWidth * 0.4 : 0;
      const handleOffsetZ = door.position === 'front' ? 0.08 : doorWidth * 0.4;
      const handleX = door.position === 'front' ? x + handleOffsetX : x + 0.08;
      const handleZ = door.position === 'front' ? z + 0.08 : z + handleOffsetZ;
      handle.position.set(handleX, doorHeight * 0.45 + 0.2, handleZ);
      handle.rotation.y = rotationY;
      scene.add(handle);
    });

    // Walk door
    if (config.hasWalkDoor && config.walkDoorPosition) {
      const walkDoorGeometry = new BoxGeometry(0.9, 2.0, 0.05);
      const walkDoorMaterial = new MeshStandardMaterial({ 
        color: 0x8b7355,
        roughness: 0.5
      });
      const walkDoor = new Mesh(walkDoorGeometry, walkDoorMaterial);

      let x = 0, z = 0, rotationY = 0;
      if (config.walkDoorPosition === 'front') {
        x = garageWidth/3;
        z = garageLength/2 + 0.1;
        rotationY = 0; // Face +z direction
      } else if (config.walkDoorPosition === 'side') {
        x = garageWidth/2 + 0.1;
        z = 0;
        rotationY = Math.PI / 2; // Rotate 90° to face +x direction
      }

      // Position door with bottom at foundation top (0.2) + half door height
      walkDoor.position.set(x, 1.0 + 0.2, z);
      walkDoor.rotation.y = rotationY;
      walkDoor.castShadow = true;
      walkDoor.receiveShadow = true;
      scene.add(walkDoor);
      addEdgeOutline(scene, walkDoorGeometry, walkDoor, 0x654321);
      
      // Door frame
      const frameThickness = 0.08;
      const frameDepth = 0.1;
      
      // Vertical left frame
      const leftFrameGeom = new BoxGeometry(frameThickness, 2.1, frameDepth);
      const frameMat = new MeshStandardMaterial({ color: 0x654321, roughness: 0.6 });
      const leftFrame = new Mesh(leftFrameGeom, frameMat);
      const leftFrameX = config.walkDoorPosition === 'front' ? x - 0.49 : x;
      const leftFrameZ = config.walkDoorPosition === 'front' ? z : z - 0.49;
      leftFrame.position.set(leftFrameX, 1.05 + 0.2, leftFrameZ);
      leftFrame.rotation.y = rotationY;
      leftFrame.castShadow = true;
      scene.add(leftFrame);
      
      // Vertical right frame
      const rightFrame = new Mesh(leftFrameGeom, frameMat);
      const rightFrameX = config.walkDoorPosition === 'front' ? x + 0.49 : x;
      const rightFrameZ = config.walkDoorPosition === 'front' ? z : z + 0.49;
      rightFrame.position.set(rightFrameX, 1.05 + 0.2, rightFrameZ);
      rightFrame.rotation.y = rotationY;
      rightFrame.castShadow = true;
      scene.add(rightFrame);
      
      // Horizontal top frame
      const topFrameGeom = new BoxGeometry(0.98, frameThickness, frameDepth);
      const topFrame = new Mesh(topFrameGeom, frameMat);
      topFrame.position.set(x, 2.1 + 0.2, z);
      topFrame.rotation.y = rotationY;
      topFrame.castShadow = true;
      scene.add(topFrame);
      
      // Door handle
      const handleGeom = new CylinderGeometry(0.025, 0.025, 0.12, 8);
      const handleMat = new MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 });
      const doorHandle = new Mesh(handleGeom, handleMat);
      const handleX = config.walkDoorPosition === 'front' ? x + 0.35 : x + 0.08;
      const handleZ = config.walkDoorPosition === 'front' ? z + 0.08 : z + 0.35;
      doorHandle.position.set(handleX, 1.0 + 0.2, handleZ);
      doorHandle.rotation.z = Math.PI / 2;
      doorHandle.rotation.y = rotationY;
      scene.add(doorHandle);
    }

    // Windows
    config.windows.forEach((window) => {
      const windowWidth = window.width * scale;
      const windowHeight = window.height * scale;
      const windowGeometry = new BoxGeometry(windowWidth, windowHeight, 0.06);
      const windowMaterial = new MeshStandardMaterial({ 
        color: 0x87ceeb,
        transparent: true,
        roughness: 0.1,
        metalness: 0.9
      });
      const windowMesh = new Mesh(windowGeometry, windowMaterial);

      let x = 0, z = 0, rotationY = 0;
      // offsetFromFloor is in feet, convert to meters and add foundation height (0.2)
      const offsetY = (window.offsetFromFloor || 5) * scale + 0.2;
      
      if (window.position === 'front') {
        x = -garageWidth/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
        z = garageLength/2 + 0.11;
        rotationY = 0; // Face +z direction
      } else if (window.position === 'back') {
        x = -garageWidth/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
        z = -garageLength/2 - 0.11;
        rotationY = Math.PI; // Rotate 180° to face -z direction
      } else if (window.position === 'left') {
        x = -garageWidth/2 - 0.11;
        z = -garageLength/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
        rotationY = -Math.PI / 2; // Rotate -90° to face -x direction
      } else { // right
        x = garageWidth/2 + 0.11;
        z = -garageLength/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
        rotationY = Math.PI / 2; // Rotate 90° to face +x direction
      }

      // Position window: offsetY is bottom of window, add half window height for center
      windowMesh.position.set(x, windowHeight/2 + offsetY, z);
      windowMesh.rotation.y = rotationY;
      windowMesh.castShadow = true;
      windowMesh.receiveShadow = true;
      scene.add(windowMesh);
      addEdgeOutline(scene, windowGeometry, windowMesh, 0x404040);
      
      // Window frame
      const frameThickness = 0.05;
      const frameDepth = 0.08;
      const frameMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.2 });
      
      // Determine frame offsets based on wall position
      const isVerticalWall = window.position === 'left' || window.position === 'right';
      
      // Vertical left frame
      const vFrameGeom = new BoxGeometry(frameThickness, windowHeight + frameThickness * 2, frameDepth);
      const leftFrame = new Mesh(vFrameGeom, frameMat);
      const leftFrameOffsetX = isVerticalWall ? 0 : -windowWidth/2 - frameThickness/2;
      const leftFrameOffsetZ = isVerticalWall ? -windowWidth/2 - frameThickness/2 : 0;
      leftFrame.position.set(x + leftFrameOffsetX, windowHeight/2 + offsetY, z + leftFrameOffsetZ);
      leftFrame.rotation.y = rotationY;
      leftFrame.castShadow = true;
      scene.add(leftFrame);
      
      // Vertical right frame
      const rightFrame = new Mesh(vFrameGeom, frameMat);
      const rightFrameOffsetX = isVerticalWall ? 0 : windowWidth/2 + frameThickness/2;
      const rightFrameOffsetZ = isVerticalWall ? windowWidth/2 + frameThickness/2 : 0;
      rightFrame.position.set(x + rightFrameOffsetX, windowHeight/2 + offsetY, z + rightFrameOffsetZ);
      rightFrame.rotation.y = rotationY;
      rightFrame.castShadow = true;
      scene.add(rightFrame);
      
      // Horizontal top frame
      const hFrameGeom = new BoxGeometry(windowWidth + frameThickness * 2, frameThickness, frameDepth);
      const topFrame = new Mesh(hFrameGeom, frameMat);
      topFrame.position.set(x, windowHeight/2 + offsetY + windowHeight/2 + frameThickness/2, z);
      topFrame.rotation.y = rotationY;
      topFrame.castShadow = true;
      scene.add(topFrame);
      
      // Horizontal bottom frame
      const bottomFrame = new Mesh(hFrameGeom, frameMat);
      bottomFrame.position.set(x, windowHeight/2 + offsetY - windowHeight/2 - frameThickness/2, z);
      bottomFrame.rotation.y = rotationY;
      bottomFrame.castShadow = true;
      scene.add(bottomFrame);
    });

    // Pointer controls (Mouse & Touch)
    let isDragging = false;
    let previousPointerPosition = { x: 0, y: 0 };
    // Increased phi from Math.PI/5 to Math.PI/2.5 to see the walls/doors instead of mostly roof
    let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 2.5 };
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

      // Removed auto-rotation

      camera.position.x = cameraDistance * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
      camera.position.y = cameraDistance * Math.cos(cameraRotation.phi);
      camera.position.z = cameraDistance * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
      camera.lookAt(0, wallHeight / 2, 0);

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
    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 rounded-lg overflow-hidden relative">
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
            <div className="text-xs text-muted-foreground">Size</div>
            <div className="font-bold text-foreground">{config.width}' × {config.length}'</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Bays</div>
            <div className="font-bold text-foreground">{config.bays}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Roof</div>
            <div className="font-bold text-foreground">{config.roofStyle}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Doors</div>
            <div className="font-bold text-foreground">{config.doors.length}</div>
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}