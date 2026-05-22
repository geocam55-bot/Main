import React, { useRef, useEffect, useState } from 'react';
import { KitchenConfig } from '../../types/kitchen';
import { parseOBJ } from '../../utils/OBJLoader';
import { projectId } from '../../utils/supabase/info';
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
  MeshBasicMaterial,
  CylinderGeometry,
  CanvasTexture,
  Object3D,
  BufferGeometry
} from '../../utils/three';
import { 
  createWoodTexture,
  createConcreteTexture 
} from '../../utils/proceduralTextures';

interface Kitchen3DRendererProps {
  config: KitchenConfig;
}

/** Add wireframe edge outlines to a mesh for crisp definition */
function addEdgeOutline(parent: Object3D, geometry: any, mesh: Mesh, color = 0x333333) {
  const edges = new EdgesGeometry(geometry);
  const lineMat = new LineBasicMaterial({ color });
  const wireframe = new LineSegments(edges, lineMat);
  wireframe.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
  wireframe.rotation.x = mesh.rotation.x;
  wireframe.rotation.y = mesh.rotation.y;
  wireframe.rotation.z = mesh.rotation.z;
  parent.add(wireframe);
}

// Lightweight cache for 3D cabinet models
const modelCache: Record<string, any> = {};
const fetchPromises: Record<string, Promise<any>> = {};

export interface Kitchen3DRendererRef {
  captureSnapshot: () => void;
  getSnapshotUrl: () => string | null;
}

export const Kitchen3DRenderer = React.forwardRef<Kitchen3DRendererRef, Kitchen3DRendererProps>(
  ({ config }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [snapshotUrl, setSnapshotUrl] = React.useState<string | null>(null);
    const [modelUpdateTick, setModelUpdateTick] = useState(0);

    React.useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        updateSnapshot();
      },
      getSnapshotUrl: () => snapshotUrl
    }));

    // Function to update the snapshot image
    const updateSnapshot = () => {
      if (sceneRef.current) {
        const { renderer, scene, camera } = sceneRef.current;
        // Need to render once to ensure buffer has the latest image
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.85);
        setSnapshotUrl(dataUrl);
      }
    };

    const sceneRef = useRef<{
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer;
    controls: any;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Create scene
    const scene = new Scene();
    scene.background = new Color(0xd4e6f1);
    scene.fog = new Fog(0xd4e6f1, 12, 55);

    // Create camera
    const camera = new PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(8, 6, 8);
    camera.lookAt(0, 0, 0);

    // Create renderer
    const renderer = new WebGLRenderer({ 
      antialias: true,
      preserveDrawingBuffer: true // Required for printing/screenshots
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Enhanced 3-point lighting + sky ambient
    const ambientLight = new AmbientLight(0xc8d8f0, 0.6);
    scene.add(ambientLight);

    const sunLight = new DirectionalLight(0xfff5e6, 0.95);
    sunLight.position.set(12, 18, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    scene.add(sunLight);

    const fillLight = new DirectionalLight(0x8ecbf0, 0.4);
    fillLight.position.set(-8, 8, -6);
    scene.add(fillLight);

    const rimLight = new DirectionalLight(0xfff0d8, 0.3);
    rimLight.position.set(-5, 6, -12);
    scene.add(rimLight);

    // Convert inches to meters (1 inch = 0.0254 meters)
    const scale = 0.0254;
    const roomWidth = config.roomWidth * 12 * scale;
    const roomLength = config.roomLength * 12 * scale;
    const roomHeight = config.roomHeight * 12 * scale;

    // Procedural textures
    const woodTexture = createWoodTexture(0xc4a57b);
    const concreteTexture = createConcreteTexture();

    // Create room
    // Floor
    const floorGeometry = new PlaneGeometry(roomWidth, roomLength);
    const floorMaterial = new MeshStandardMaterial({ 
      map: woodTexture,
      roughness: 0.85,
      metalness: 0.05
    });
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor grid
    const gridHelper = new GridHelper(
      Math.max(roomWidth, roomLength),
      20,
      0x94a3b8,
      0xcbd5e1
    );
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);

    // Walls
    const wallMaterial = new MeshStandardMaterial({ 
      color: 0xfefce8,
      side: DoubleSide,
      roughness: 0.9
    });

    const wallOffset = 0.005; // 5mm offset to prevent z-fighting with cabinets

    // Back wall
    const backWallGeometry = new PlaneGeometry(roomWidth + wallOffset*2, roomHeight);
    const backWall = new Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, roomHeight / 2, -roomLength / 2 - wallOffset);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left wall
    const leftWallGeometry = new PlaneGeometry(roomLength + wallOffset*2, roomHeight);
    const leftWall = new Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-roomWidth / 2 - wallOffset, roomHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall
    const rightWall = new Mesh(leftWallGeometry, wallMaterial);
    rightWall.position.set(roomWidth / 2 + wallOffset, roomHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);
    
    // Add wall label markers to help debug coordinate system
    const createWallLabel = (text: string, x: number, y: number, z: number, rotY: number = 0) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;
      
      canvas.width = 512;
      canvas.height = 128;
      context.fillStyle = '#ef4444';
      context.font = 'bold 80px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Flip the canvas vertically so WebGL maps it right-side up
      context.translate(0, canvas.height);
      context.scale(1, -1);
      
      context.fillText(text, 256, 64);
      
      const texture = new CanvasTexture(canvas);
      const material = new MeshBasicMaterial({ map: texture, transparent: true });
      const geometry = new PlaneGeometry(1, 0.25);
      
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      return mesh;
    };
    
    // Add labels (import THREE at the top if not already)
    const northLabel = createWallLabel('NORTH', 0, roomHeight - 0.3, -roomLength / 2 + 0.01, 0);
    const westLabel = createWallLabel('WEST', -roomWidth / 2 + 0.01, roomHeight - 0.3, 0, Math.PI / 2);
    const eastLabel = createWallLabel('EAST', roomWidth / 2 - 0.01, roomHeight - 0.3, 0, -Math.PI / 2);
    const southLabel = createWallLabel('SOUTH', 0, roomHeight - 0.3, roomLength / 2 - 0.01, Math.PI);
    
    if (northLabel) scene.add(northLabel);
    if (westLabel) scene.add(westLabel);
    if (eastLabel) scene.add(eastLabel);
    if (southLabel) scene.add(southLabel);

    // Wall edges
    const edgesGeometry = new EdgesGeometry(
      new BoxGeometry(roomWidth, roomHeight, roomLength)
    );
    const edgesMaterial = new LineBasicMaterial({ color: 0x64748b, linewidth: 2 });
    const edges = new LineSegments(edgesGeometry, edgesMaterial);
    edges.position.y = roomHeight / 2;
    scene.add(edges);

    // Add cabinets
    config.cabinets.forEach((cabinet) => {
      // Convert from inches to meters
      const w = cabinet.width * scale;
      const h = (cabinet.height || 34) * scale;
      const d = cabinet.depth * scale;

      const pivotX = -roomWidth / 2 + (cabinet.x * scale);
      const pivotZ = -roomLength / 2 + (cabinet.y * scale);
      
      const pivot = new Object3D();
      pivot.position.set(pivotX, 0, pivotZ);
      pivot.rotation.y = -(cabinet.rotation || 0) * Math.PI / 180;
      scene.add(pivot);

      // In local pivot space, the center of the cabinet is at w/2 and d/2
      const localX = w / 2;
      const localZ = d / 2;
      
      let y = 0;
      if (cabinet.type === 'wall' || cabinet.type === 'corner-wall') {
        y = (cabinet.height || 30) * scale / 2 + 1.2;
      } else if (cabinet.type === 'tall') {
        y = (cabinet.height || 84) * scale / 2;
      } else {
        y = (cabinet.height || 34) * scale / 2;
      }

      let cabinetGeometry: any = new BoxGeometry(w, h, d);
      let isCustomModel = false;
      const isCornerCabinet = cabinet.type === 'corner-base' || cabinet.type === 'corner-wall';

      // Handle custom 3D model injection
      if (cabinet.modelUrl) {
        if (modelCache[cabinet.modelUrl] && modelCache[cabinet.modelUrl] !== 'failed') {
          cabinetGeometry = modelCache[cabinet.modelUrl];
          isCustomModel = true;
        } else if (modelCache[cabinet.modelUrl] === undefined && !fetchPromises[cabinet.modelUrl]) {
          const fetchModel = async () => {
            let url = cabinet.modelUrl;
            if (url && !url.startsWith('http')) {
              // It's a filename, get signed URL from server
              const { publicAnonKey } = await import('../../utils/supabase/info');
              const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/models/signed-url?filename=${url}&bucket=make-8405be07-models`, {
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`
                }
              });
              if (!res.ok) throw new Error('Failed to get signed URL');
              const data = await res.json();
              if (data.error) throw new Error(data.error);
              url = data.url;
            }
            
            const res = await fetch(url as string);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.text();
          };

          fetchPromises[cabinet.modelUrl] = fetchModel()
            .then(text => {
              const geom = parseOBJ(text);
              geom.center(); // Center geometry around its origin to match BoxGeometry alignment
              modelCache[cabinet.modelUrl] = geom;
              setModelUpdateTick(t => t + 1); // Trigger scene re-render once parsed
            })
            .catch(() => {
              // Mark as failed so we don't infinitely retry, but use procedural fallback
              modelCache[cabinet.modelUrl] = 'failed';
              setModelUpdateTick(t => t + 1);
            });
        }
      }

      let color = 0xd1d5db;
      if (cabinet.type === 'wall' || cabinet.type === 'corner-wall') color = 0xf3f4f6;
      if (cabinet.type === 'tall') color = 0xe5e7eb;
      
      const cabinetMaterial = new MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.1
      });

      if (!isCustomModel && isCornerCabinet) {
        // Procedurally build L-shape from two standard BoxGeometries
        const thickness = Math.min(w, d) * 0.45;
        
        // Main back arm (along X axis)
        const arm1Geo = new BoxGeometry(w, h, thickness);
        const arm1 = new Mesh(arm1Geo, cabinetMaterial);
        arm1.position.set(localX, y, thickness / 2);
        arm1.castShadow = true;
        arm1.receiveShadow = true;
        pivot.add(arm1);
        addEdgeOutline(pivot, arm1Geo, arm1);

        // Side arm (along Z axis) extending forward
        const arm2Depth = d - thickness;
        const arm2Geo = new BoxGeometry(thickness, h, arm2Depth);
        const arm2 = new Mesh(arm2Geo, cabinetMaterial);
        arm2.position.set(thickness / 2, y, thickness + arm2Depth / 2);
        arm2.castShadow = true;
        arm2.receiveShadow = true;
        pivot.add(arm2);
        addEdgeOutline(pivot, arm2Geo, arm2);

      } else {
        // Standard cabinet or custom model
        const cabinetMesh = new Mesh(cabinetGeometry, cabinetMaterial);

        if (isCustomModel) {
          if (!cabinetGeometry.boundingBox) {
            cabinetGeometry.computeBoundingBox();
          }
          const bbox = cabinetGeometry.boundingBox;
          if (bbox) {
            const sizeX = bbox.max.x - bbox.min.x || 1;
            const sizeY = bbox.max.y - bbox.min.y || 1;
            const sizeZ = bbox.max.z - bbox.min.z || 1;
            cabinetMesh.scale.set(w / sizeX, h / sizeY, d / sizeZ);
            cabinetMesh.position.set(localX, y, localZ);
          } else {
            cabinetMesh.position.set(localX, y, localZ);
          }
        } else {
          cabinetMesh.position.set(localX, y, localZ);
        }

        cabinetMesh.castShadow = true;
        cabinetMesh.receiveShadow = true;
        pivot.add(cabinetMesh);
        addEdgeOutline(pivot, cabinetGeometry, cabinetMesh);
      }

      // Add doors if applicable (only if not a custom model, and skip for procedural corner cabinets)
      if (cabinet.hasDoors && cabinet.numberOfDoors && !isCustomModel && !isCornerCabinet) {
        const doorMaterial = new MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.2,
          metalness: 0.3
        });

        for (let i = 0; i < cabinet.numberOfDoors; i++) {
          const doorWidth = w / cabinet.numberOfDoors;
          const doorX = localX - w / 2 + doorWidth / 2 + i * doorWidth;
          
          const doorGeometry = new BoxGeometry(doorWidth * 0.95, h * 0.95, 0.005);
          const door = new Mesh(doorGeometry, doorMaterial);
          door.position.set(doorX, y, localZ + d / 2 + 0.003);
          door.castShadow = true;
          pivot.add(door);

          // Door handle
          const handleGeometry = new CylinderGeometry(0.008, 0.008, h * 0.4, 8);
          const handleMaterial = new MeshStandardMaterial({
            color: 0x374151,
            roughness: 0.1,
            metalness: 0.8
          });
          const handle = new Mesh(handleGeometry, handleMaterial);
          handle.position.set(doorX + doorWidth * 0.3, y, localZ + d / 2 + 0.015);
          pivot.add(handle);
        }
      } else if (cabinet.hasDoors && !isCustomModel && isCornerCabinet) {
        const doorMaterial = new MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.2,
          metalness: 0.3
        });
        const handleMaterial = new MeshStandardMaterial({
          color: 0x374151,
          roughness: 0.1,
          metalness: 0.8
        });
        const handleGeometry = new CylinderGeometry(0.008, 0.008, h * 0.4, 8);
        const thickness = Math.min(w, d) * 0.45;
        
        // Door 1 (Face 1 facing +Z)
        const door1Width = w - thickness;
        const door1X = thickness + door1Width / 2;
        const door1Geometry = new BoxGeometry(door1Width * 0.95, h * 0.95, 0.005);
        const door1 = new Mesh(door1Geometry, doorMaterial);
        door1.position.set(door1X, y, thickness + 0.003);
        door1.castShadow = true;
        pivot.add(door1);

        const handle1 = new Mesh(handleGeometry, handleMaterial);
        handle1.position.set(door1X - door1Width * 0.35, y, thickness + 0.015);
        pivot.add(handle1);

        // Door 2 (Face 2 facing +X)
        const door2Width = d - thickness;
        const door2Z = thickness + door2Width / 2;
        const door2Geometry = new BoxGeometry(door2Width * 0.95, h * 0.95, 0.005);
        const door2 = new Mesh(door2Geometry, doorMaterial);
        door2.position.set(thickness + 0.003, y, door2Z);
        door2.rotation.y = Math.PI / 2;
        door2.castShadow = true;
        pivot.add(door2);

        const handle2 = new Mesh(handleGeometry, handleMaterial);
        handle2.position.set(thickness + 0.015, y, door2Z - door2Width * 0.35);
        pivot.add(handle2);
      }

      // Add countertop for base cabinets
      if (cabinet.type === 'base' || cabinet.type === 'island' || cabinet.type === 'corner-base') {
        const countertopMaterial = new MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.1,
          metalness: 0.5
        });

        if (isCornerCabinet && !isCustomModel) {
          // Countertop L-shape
          const baseThickness = Math.min(w, d) * 0.45;
          const ctThickness = baseThickness + 0.05; // 0.025 overhang on both sides (back and front)
          const cw = w + 0.05; // 0.025 overhang on left and right
          const cd = d + 0.05; // 0.025 overhang on back and front
          
          // Main back arm (along X axis)
          // Spans X from -0.025 to w + 0.025. Center X = w/2
          // Spans Z from -0.025 to baseThickness + 0.025. Center Z = baseThickness/2
          const ctArm1Geo = new BoxGeometry(cw, 0.04, ctThickness);
          const ctArm1 = new Mesh(ctArm1Geo, countertopMaterial);
          ctArm1.position.set(w / 2, y + h / 2 + 0.02, baseThickness / 2);
          ctArm1.castShadow = true;
          ctArm1.receiveShadow = true;
          pivot.add(ctArm1);

          // Side arm (along Z axis) extending forward
          // Needs to cover the rest of the left arm.
          // Left arm spans X from -0.025 to baseThickness + 0.025. Center X = baseThickness/2
          // Spans Z from baseThickness + 0.025 to d + 0.025.
          // Depth = d + 0.025 - (baseThickness + 0.025) = d - baseThickness.
          // Center Z = baseThickness + 0.025 + (d - baseThickness)/2 = (d + baseThickness)/2 + 0.025
          const ctArm2Depth = d - baseThickness;
          const ctArm2Geo = new BoxGeometry(ctThickness, 0.04, ctArm2Depth);
          const ctArm2 = new Mesh(ctArm2Geo, countertopMaterial);
          ctArm2.position.set(baseThickness / 2, y + h / 2 + 0.02, (d + baseThickness) / 2 + 0.025);
          ctArm2.castShadow = true;
          ctArm2.receiveShadow = true;
          pivot.add(ctArm2);

        } else {
          const countertopGeometry = new BoxGeometry(w + 0.05, 0.04, d + 0.05);
          const countertop = new Mesh(countertopGeometry, countertopMaterial);
          countertop.position.set(localX, y + h / 2 + 0.02, localZ);
          countertop.castShadow = true;
          countertop.receiveShadow = true;
          pivot.add(countertop);
        }
      }
    });

    // Add appliances
    config.appliances.forEach((appliance) => {
      // Convert from inches to meters
      const w = appliance.width * scale;
      const h = appliance.height * scale;
      const d = appliance.depth * scale;

      const pivotX = -roomWidth / 2 + (appliance.x * scale);
      const pivotZ = -roomLength / 2 + (appliance.y * scale);

      const pivot = new Object3D();
      pivot.position.set(pivotX, 0, pivotZ);
      pivot.rotation.y = -(appliance.rotation || 0) * Math.PI / 180;
      scene.add(pivot);

      const localX = w / 2;
      const localZ = d / 2;
      const y = h / 2;

      let color = 0xcbd5e1;
      let metalness = 0.6;
      let roughness = 0.2;

      if (appliance.type === 'refrigerator') {
        color = 0xe2e8f0;
        metalness = 0.7;
      } else if (appliance.type === 'stove') {
        color = 0x1f2937;
        metalness = 0.8;
        roughness = 0.1;
      } else if (appliance.type === 'sink') {
        color = 0x94a3b8;
        metalness = 0.9;
        roughness = 0.05;
      }

      const applianceGeometry = new BoxGeometry(w, h, d);
      const applianceMaterial = new MeshStandardMaterial({
        color: color,
        roughness: roughness,
        metalness: metalness
      });
      const applianceMesh = new Mesh(applianceGeometry, applianceMaterial);
      applianceMesh.position.set(localX, y, localZ);
      applianceMesh.castShadow = true;
      applianceMesh.receiveShadow = true;
      pivot.add(applianceMesh);

      // Add edge outlines
      addEdgeOutline(pivot, applianceGeometry, applianceMesh);

      // Type-specific details
      if (appliance.type === 'refrigerator') {
        // Freezer door line
        const lineGeometry = new PlaneGeometry(w * 0.9, 0.01);
        const lineMaterial = new MeshBasicMaterial({ color: 0x94a3b8 });
        const line = new Mesh(lineGeometry, lineMaterial);
        line.position.set(localX, y + h * 0.25, localZ + d / 2 + 0.001);
        pivot.add(line);

        // Door handles
        const handleGeometry = new BoxGeometry(0.02, h * 0.2, 0.03);
        const handleMaterial = new MeshStandardMaterial({ 
          color: 0x374151, 
          metalness: 0.9 
        });
        const handle1 = new Mesh(handleGeometry, handleMaterial);
        handle1.position.set(localX + w * 0.4, y + h * 0.15, localZ + d / 2 + 0.02);
        pivot.add(handle1);

        const handle2Geometry = new BoxGeometry(0.02, h * 0.4, 0.03);
        const handle2 = new Mesh(handle2Geometry, handleMaterial);
        handle2.position.set(localX + w * 0.4, y - h * 0.2, localZ + d / 2 + 0.02);
        pivot.add(handle2);
      } else if (appliance.type === 'stove') {
        // Burner grates
        const burnerPositions = [
          [-0.2, 0.2], [0.2, 0.2], 
          [-0.2, -0.2], [0.2, -0.2]
        ];
        const burnerGeometry = new CylinderGeometry(0.08, 0.08, 0.02, 16);
        const burnerMaterial = new MeshStandardMaterial({ 
          color: 0x1f2937, 
          metalness: 0.3 
        });
        
        burnerPositions.forEach(([bx, bz]) => {
          const burner = new Mesh(burnerGeometry, burnerMaterial);
          burner.position.set(localX + bx, y + h / 2 + 0.01, localZ + bz);
          pivot.add(burner);
        });

        // Oven window
        const windowGeometry = new PlaneGeometry(w * 0.7, h * 0.4);
        const windowMaterial = new MeshStandardMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.8,
          metalness: 1,
          roughness: 0
        });
        const window = new Mesh(windowGeometry, windowMaterial);
        window.position.set(localX, y - h * 0.1, localZ + d / 2 + 0.001);
        pivot.add(window);
      }
    });

    // Simple orbit controls using mouse
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 6 };
    let cameraDistance = 10;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cameraRotation.theta -= deltaX * 0.01;
      cameraRotation.phi -= deltaY * 0.01;

      // Limit phi to prevent camera flip
      cameraRotation.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraRotation.phi));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.01;
      cameraDistance = Math.max(3, Math.min(25, cameraDistance));
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Update camera position based on rotation
      camera.position.x = cameraDistance * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
      camera.position.y = cameraDistance * Math.cos(cameraRotation.phi);
      camera.position.z = cameraDistance * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
      camera.lookAt(0, 1, 0);

      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { scene, camera, renderer, controls: null };

    // Handle resize with ResizeObserver to capture layout changes
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
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (containerRef.current && renderer.domElement.parentElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [config, modelUpdateTick]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden relative">
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold text-foreground mb-1">🎮 3D Controls:</div>
        <div className="space-y-0.5 text-foreground">
          <div>🖱️ <strong>Rotate:</strong> Click + drag</div>
          <div>🔍 <strong>Zoom:</strong> Scroll wheel</div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Cabinets</div>
            <div className="font-bold text-foreground">{config.cabinets.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Appliances</div>
            <div className="font-bold text-foreground">{config.appliances.length}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground">Room Size</div>
            <div className="font-bold text-foreground">
              {config.roomWidth}' × {config.roomLength}' × {config.roomHeight}'
            </div>
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});