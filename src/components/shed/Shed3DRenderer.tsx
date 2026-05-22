import React, { useRef, useEffect } from 'react';
import { ShedConfig } from '../../types/shed';
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
  DoubleSide,
  BufferGeometry,
  BufferAttribute,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  CanvasTexture
} from '../../utils/three';
import { 
  createGrassTexture, 
  createConcreteTexture, 
  createSidingTexture,
  createShingleTexture,
  createWoodTexture 
} from '../../utils/proceduralTextures';

interface Shed3DRendererProps {
  config: ShedConfig;
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

function addRoofSurface(scene: Scene, geometry: BufferGeometry, material: MeshStandardMaterial, color = 0x333333) {
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  addEdgeOutline(scene, geometry, mesh, color);
  return mesh;
}

export function Shed3DRenderer({ config }: Shed3DRendererProps) {
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

    // Create scene
    const scene = new Scene();
    scene.background = new Color(0xd4e6f1);
    scene.fog = new Fog(0xd4e6f1, 12, 55);

    // Create camera
    const camera = new PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(8, 6, 8);
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
    sunLight.position.set(16, 24, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    scene.add(sunLight);

    const fillLight = new DirectionalLight(0x8ecbf0, 0.35);
    fillLight.position.set(-12, 10, -8);
    scene.add(fillLight);

    const rimLight = new DirectionalLight(0xfff0d8, 0.28);
    rimLight.position.set(-6, 8, -15);
    scene.add(rimLight);

    // Convert feet to meters
    const scale = 0.3048;
    const shedWidth = config.width * scale;
    const shedLength = config.length * scale;
    const wallHeight = config.wallHeight * scale;
    const roofPitch = config.roofPitch / 12;
    const roofRise = (shedWidth / 2) * roofPitch;

    // Procedural textures
    const grassTexture = createGrassTexture();
    const concreteTexture = createConcreteTexture();
    const woodTexture = createWoodTexture(0x6b5d4f);
    const sidingColor = config.sidingType === 'vinyl' ? 0xe8e8e8 :
                        config.sidingType === 'wood' ? 0xd4a574 :
                        config.sidingType === 'metal' ? 0xb8c5d6 : 0xc9b08a;
    const sidingTexture = createSidingTexture(sidingColor);
    const roofColor = config.roofingMaterial === 'metal' ? 0x7f8c8d :
                      config.roofingMaterial === 'architectural-shingle' ? 0x4a4a4a : 0x5a4a42;
    const roofType = config.roofingMaterial === 'metal' ? 'metal' : 'architectural-shingle';
    const roofTexture = createShingleTexture(roofColor, roofType);

    // Create ground
    const groundGeometry = new PlaneGeometry(40, 40);
    const groundMaterial = new MeshStandardMaterial({ 
      map: grassTexture,
      roughness: 0.95,
      metalness: 0.0
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground grid (Diagonal Checkerboard style matching 2D)
    const gridHelper = new GridHelper(30, 30, 0x6d9a5d, 0x8aad7a);
    gridHelper.position.y = 0.01;
    gridHelper.rotation.y = Math.PI / 4; // Rotate 45 degrees
    scene.add(gridHelper);

    // Driveway
    const drivewayWidth = shedWidth;
    const drivewayLength = 15;
    const drivewayGeometry = new BoxGeometry(drivewayWidth, 0.02, drivewayLength);
    const drivewayMaterial = new MeshStandardMaterial({
        map: concreteTexture,
        roughness: 0.8,
        metalness: 0.1
    });
    const driveway = new Mesh(drivewayGeometry, drivewayMaterial);
    driveway.position.set(0, 0.01, shedLength / 2 + drivewayLength / 2);
    driveway.receiveShadow = true;
    scene.add(driveway);

    // Foundation
    if (config.foundationType === 'concrete-slab') {
      const slabGeometry = new BoxGeometry(shedWidth + 0.2, 0.15, shedLength + 0.2);
      const slabMaterial = new MeshStandardMaterial({ 
        map: concreteTexture,
        roughness: 0.9,
        metalness: 0.0
      });
      const slab = new Mesh(slabGeometry, slabMaterial);
      slab.position.set(0, 0.075, 0);
      slab.receiveShadow = true;
      slab.castShadow = true;
      scene.add(slab);
    } else if (config.foundationType === 'skids') {
      const skidGeometry = new BoxGeometry(0.1, 0.15, shedLength);
      const skidMaterial = new MeshStandardMaterial({ 
        map: woodTexture,
        roughness: 0.9,
        metalness: 0.0
      });
      
      const skid1 = new Mesh(skidGeometry, skidMaterial);
      skid1.position.set(-shedWidth * 0.3, 0.075, 0);
      skid1.castShadow = true;
      scene.add(skid1);
      
      const skid2 = new Mesh(skidGeometry, skidMaterial);
      skid2.position.set(shedWidth * 0.3, 0.075, 0);
      skid2.castShadow = true;
      scene.add(skid2);
    }

    // Floor
    if (config.hasFloor) {
      const floorGeometry = new BoxGeometry(shedWidth, 0.05, shedLength);
      const floorMaterial = new MeshStandardMaterial({ 
        map: woodTexture,
        roughness: 0.85,
        metalness: 0.0
      });
      const floor = new Mesh(floorGeometry, floorMaterial);
      floor.position.set(0, 0.175, 0);
      floor.receiveShadow = true;
      scene.add(floor);
    }

    // Wall material
    const wallMaterial = new MeshStandardMaterial({ 
      map: sidingTexture,
      roughness: config.sidingType === 'metal' ? 0.3 : 0.85,
      metalness: config.sidingType === 'metal' ? 0.4 : 0.0,
      side: DoubleSide
    });

    // Walls
    const wallThickness = 0.1;
    
    // Front wall
    const frontWallGeometry = new BoxGeometry(shedWidth, wallHeight, wallThickness);
    const frontWall = new Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, wallHeight / 2 + 0.2, shedLength / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    scene.add(frontWall);
    addEdgeOutline(scene, frontWallGeometry, frontWall);

    // Back wall
    const backWall = new Mesh(frontWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2 + 0.2, -shedLength / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);
    addEdgeOutline(scene, frontWallGeometry, backWall);

    // Side walls
    const sideWallGeometry = new BoxGeometry(wallThickness, wallHeight, shedLength);
    const leftWall = new Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-shedWidth / 2, wallHeight / 2 + 0.2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    addEdgeOutline(scene, sideWallGeometry, leftWall);

    const rightWall = new Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(shedWidth / 2, wallHeight / 2 + 0.2, 0);
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

    if (config.style === 'gable') {
      const roofBaseY = wallHeight + 0.2;
      const ridgeY = roofBaseY + roofRise;
      const sideOverhang = 0.1;
      const endOverhang = 0.15;
      const zFront = shedLength / 2 + endOverhang;
      const zBack = -shedLength / 2 - endOverhang;

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [-shedWidth / 2 - sideOverhang, roofBaseY, zFront],
          [0, ridgeY, zFront],
          [0, ridgeY, zBack],
          [-shedWidth / 2 - sideOverhang, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [0, ridgeY, zFront],
          [shedWidth / 2 + sideOverhang, roofBaseY, zFront],
          [shedWidth / 2 + sideOverhang, roofBaseY, zBack],
          [0, ridgeY, zBack],
        ),
        roofMaterial,
      );

      const ridgeCap = new Mesh(
        new BoxGeometry(0.1, 0.08, shedLength + endOverhang * 2 + 0.04),
        roofMaterial
      );
      ridgeCap.position.set(0, ridgeY + 0.04, 0);
      ridgeCap.castShadow = true;
      ridgeCap.receiveShadow = true;
      scene.add(ridgeCap);

      // Gable end walls (triangular fills)
      const gableGeometry = new BufferGeometry();
      const gableVertices = new Float32Array([
        -shedWidth/2, wallHeight + 0.2, shedLength/2,
        shedWidth/2, wallHeight + 0.2, shedLength/2,
        0, wallHeight + 0.2 + roofRise, shedLength/2,
      ]);
      gableGeometry.setAttribute('position', new BufferAttribute(gableVertices, 3));
      gableGeometry.computeVertexNormals();
      
      const gableFront = new Mesh(gableGeometry, wallMaterial);
      gableFront.castShadow = true;
      scene.add(gableFront);
      
      const gableBackGeometry = new BufferGeometry();
      const gableBackVertices = new Float32Array([
        -shedWidth/2, wallHeight + 0.2, -shedLength/2,
        shedWidth/2, wallHeight + 0.2, -shedLength/2,
        0, wallHeight + 0.2 + roofRise, -shedLength/2,
      ]);
      gableBackGeometry.setAttribute('position', new BufferAttribute(gableBackVertices, 3));
      gableBackGeometry.computeVertexNormals();
      
      const gableBack = new Mesh(gableBackGeometry, wallMaterial);
      gableBack.castShadow = true;
      scene.add(gableBack);
    } else if (config.style === 'lean-to') {
      const roofBaseY = wallHeight + 0.2;
      const sideOverhang = 0.1;
      const endOverhang = 0.15;
      const zFront = shedLength / 2 + endOverhang;
      const zBack = -shedLength / 2 - endOverhang;

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [-shedWidth / 2 - sideOverhang, roofBaseY + roofRise, zFront],
          [shedWidth / 2 + sideOverhang, roofBaseY, zFront],
          [shedWidth / 2 + sideOverhang, roofBaseY, zBack],
          [-shedWidth / 2 - sideOverhang, roofBaseY + roofRise, zBack],
        ),
        roofMaterial,
      );

      // Lean-to gable end walls (triangular fills - right triangle shape)
      const leanGableFrontGeometry = new BufferGeometry();
      const leanGableFrontVertices = new Float32Array([
        -shedWidth/2, wallHeight + 0.2, shedLength/2,
        shedWidth/2, wallHeight + 0.2, shedLength/2,
        -shedWidth/2, wallHeight + 0.2 + roofRise, shedLength/2,
      ]);
      leanGableFrontGeometry.setAttribute('position', new BufferAttribute(leanGableFrontVertices, 3));
      leanGableFrontGeometry.computeVertexNormals();
      
      const leanGableFront = new Mesh(leanGableFrontGeometry, wallMaterial);
      leanGableFront.castShadow = true;
      scene.add(leanGableFront);
      
      const leanGableBackGeometry = new BufferGeometry();
      const leanGableBackVertices = new Float32Array([
        -shedWidth/2, wallHeight + 0.2, -shedLength/2,
        shedWidth/2, wallHeight + 0.2, -shedLength/2,
        -shedWidth/2, wallHeight + 0.2 + roofRise, -shedLength/2,
      ]);
      leanGableBackGeometry.setAttribute('position', new BufferAttribute(leanGableBackVertices, 3));
      leanGableBackGeometry.computeVertexNormals();
      
      const leanGableBack = new Mesh(leanGableBackGeometry, wallMaterial);
      leanGableBack.castShadow = true;
      scene.add(leanGableBack);
    } else if (config.style === 'barn') {
      // Gambrel roof (barn style) - simplified and corrected
      const lowerRise = roofRise * 0.5; // Lower section rises 50% of total
      const upperRise = roofRise * 0.5; // Upper section rises the remaining 50%
      
      // Lower sections (steeper angle from wall to mid-point)
      const lowerWidth = shedWidth / 4; // Quarter of the width for lower section
      const lowerRoofLength = Math.sqrt(Math.pow(lowerWidth, 2) + Math.pow(lowerRise, 2));
      const lowerRoofAngle = Math.atan2(lowerRise, lowerWidth);
      
      const roofBaseY = wallHeight + 0.2;
      const zFront = shedLength / 2 + 0.15;
      const zBack = -shedLength / 2 - 0.15;
      const leftEaveX = -shedWidth / 2 - 0.08;
      const rightEaveX = shedWidth / 2 + 0.08;
      const upperWidth = shedWidth / 4; // Quarter of the width for upper section
      const upperRoofLength = Math.sqrt(Math.pow(upperWidth, 2) + Math.pow(upperRise, 2));
      const upperRoofAngle = Math.atan2(upperRise, upperWidth);

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [leftEaveX, roofBaseY, zFront],
          [-barnLowerX, wallHeight + 0.2 + lowerRise, zFront],
          [-barnLowerX, wallHeight + 0.2 + lowerRise, zBack],
          [leftEaveX, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [-barnLowerX, wallHeight + 0.2 + lowerRise, zFront],
          [0, wallHeight + 0.2 + lowerRise + upperRise, zFront],
          [0, wallHeight + 0.2 + lowerRise + upperRise, zBack],
          [-barnLowerX, wallHeight + 0.2 + lowerRise, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [0, wallHeight + 0.2 + lowerRise + upperRise, zFront],
          [barnLowerX, wallHeight + 0.2 + lowerRise, zFront],
          [barnLowerX, wallHeight + 0.2 + lowerRise, zBack],
          [0, wallHeight + 0.2 + lowerRise + upperRise, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [barnLowerX, wallHeight + 0.2 + lowerRise, zFront],
          [rightEaveX, roofBaseY, zFront],
          [rightEaveX, roofBaseY, zBack],
          [barnLowerX, wallHeight + 0.2 + lowerRise, zBack],
        ),
        roofMaterial,
      );

      const ridgeCap = new Mesh(
        new BoxGeometry(0.1, 0.08, shedLength + 0.34),
        roofMaterial
      );
      ridgeCap.position.set(0, wallHeight + 0.2 + lowerRise + upperRise + 0.04, 0);
      ridgeCap.castShadow = true;
      ridgeCap.receiveShadow = true;
      scene.add(ridgeCap);

      // Barn/gambrel gable end walls (pentagonal shape: two triangles per side)
      const barnWallTop = wallHeight + 0.2;
      const barnLowerY = barnWallTop + lowerRise;
      const barnPeakY = barnWallTop + lowerRise + upperRise;
      const barnLowerX = shedWidth / 4; // Inner edge of lower panels

      // Front gable - lower left triangle
      const barnFrontLLGeom = new BufferGeometry();
      barnFrontLLGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, barnWallTop, shedLength/2,
        -barnLowerX, barnLowerY, shedLength/2,
        -barnLowerX, barnWallTop, shedLength/2,
      ]), 3));
      barnFrontLLGeom.computeVertexNormals();
      scene.add(new Mesh(barnFrontLLGeom, wallMaterial));

      // Front gable - lower right triangle
      const barnFrontLRGeom = new BufferGeometry();
      barnFrontLRGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        shedWidth/2, barnWallTop, shedLength/2,
        barnLowerX, barnWallTop, shedLength/2,
        barnLowerX, barnLowerY, shedLength/2,
      ]), 3));
      barnFrontLRGeom.computeVertexNormals();
      scene.add(new Mesh(barnFrontLRGeom, wallMaterial));

      // Front gable - upper triangle (from lower break points to peak)
      const barnFrontUpperGeom = new BufferGeometry();
      barnFrontUpperGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -barnLowerX, barnLowerY, shedLength/2,
        barnLowerX, barnLowerY, shedLength/2,
        0, barnPeakY, shedLength/2,
      ]), 3));
      barnFrontUpperGeom.computeVertexNormals();
      scene.add(new Mesh(barnFrontUpperGeom, wallMaterial));

      // Front gable - fill rectangle between lower triangles
      const barnFrontRectGeom = new BufferGeometry();
      barnFrontRectGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -barnLowerX, barnWallTop, shedLength/2,
        barnLowerX, barnWallTop, shedLength/2,
        barnLowerX, barnLowerY, shedLength/2,
        -barnLowerX, barnWallTop, shedLength/2,
        barnLowerX, barnLowerY, shedLength/2,
        -barnLowerX, barnLowerY, shedLength/2,
      ]), 3));
      barnFrontRectGeom.computeVertexNormals();
      scene.add(new Mesh(barnFrontRectGeom, wallMaterial));

      // Back gable - lower left triangle
      const barnBackLLGeom = new BufferGeometry();
      barnBackLLGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, barnWallTop, -shedLength/2,
        -barnLowerX, barnWallTop, -shedLength/2,
        -barnLowerX, barnLowerY, -shedLength/2,
      ]), 3));
      barnBackLLGeom.computeVertexNormals();
      scene.add(new Mesh(barnBackLLGeom, wallMaterial));

      // Back gable - lower right triangle
      const barnBackLRGeom = new BufferGeometry();
      barnBackLRGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        shedWidth/2, barnWallTop, -shedLength/2,
        barnLowerX, barnLowerY, -shedLength/2,
        barnLowerX, barnWallTop, -shedLength/2,
      ]), 3));
      barnBackLRGeom.computeVertexNormals();
      scene.add(new Mesh(barnBackLRGeom, wallMaterial));

      // Back gable - upper triangle
      const barnBackUpperGeom = new BufferGeometry();
      barnBackUpperGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -barnLowerX, barnLowerY, -shedLength/2,
        0, barnPeakY, -shedLength/2,
        barnLowerX, barnLowerY, -shedLength/2,
      ]), 3));
      barnBackUpperGeom.computeVertexNormals();
      scene.add(new Mesh(barnBackUpperGeom, wallMaterial));

      // Back gable - fill rectangle between lower triangles
      const barnBackRectGeom = new BufferGeometry();
      barnBackRectGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -barnLowerX, barnWallTop, -shedLength/2,
        barnLowerX, barnLowerY, -shedLength/2,
        barnLowerX, barnWallTop, -shedLength/2,
        -barnLowerX, barnWallTop, -shedLength/2,
        -barnLowerX, barnLowerY, -shedLength/2,
        barnLowerX, barnLowerY, -shedLength/2,
      ]), 3));
      barnBackRectGeom.computeVertexNormals();
      scene.add(new Mesh(barnBackRectGeom, wallMaterial));
    } else if (config.style === 'quaker') {
      // Quaker: gable roof with extended front overhang
      const roofSlopeLength = Math.sqrt(Math.pow(shedWidth / 2, 2) + Math.pow(roofRise, 2));
      const roofAngle = Math.atan2(roofRise, shedWidth / 2);
      const overhangDepth = shedLength * 0.15; // Front porch overhang

      const roofBaseY = wallHeight + 0.2;
      const ridgeY = roofBaseY + roofRise;
      const sideOverhang = 0.1;
      const zFront = shedLength / 2 + 0.15 + overhangDepth;
      const zBack = -shedLength / 2 - 0.15;

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [-shedWidth / 2 - sideOverhang, roofBaseY, zFront],
          [0, ridgeY, zFront],
          [0, ridgeY, zBack],
          [-shedWidth / 2 - sideOverhang, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [0, ridgeY, zFront],
          [shedWidth / 2 + sideOverhang, roofBaseY, zFront],
          [shedWidth / 2 + sideOverhang, roofBaseY, zBack],
          [0, ridgeY, zBack],
        ),
        roofMaterial,
      );

      const ridgeCap = new Mesh(
        new BoxGeometry(0.1, 0.08, shedLength + 0.34 + overhangDepth),
        roofMaterial
      );
      ridgeCap.position.set(0, ridgeY + 0.04, overhangDepth / 2);
      ridgeCap.castShadow = true;
      ridgeCap.receiveShadow = true;
      scene.add(ridgeCap);

      // Overhang support posts
      const postGeometry = new BoxGeometry(0.08, wallHeight, 0.08);
      const postMaterial = new MeshStandardMaterial({ color: 0x6b5d4f, roughness: 0.8 });

      const leftPost = new Mesh(postGeometry, postMaterial);
      leftPost.position.set(-shedWidth / 2 + 0.15, wallHeight / 2 + 0.2, shedLength / 2 + overhangDepth);
      leftPost.castShadow = true;
      scene.add(leftPost);

      const rightPost = new Mesh(postGeometry, postMaterial);
      rightPost.position.set(shedWidth / 2 - 0.15, wallHeight / 2 + 0.2, shedLength / 2 + overhangDepth);
      rightPost.castShadow = true;
      scene.add(rightPost);

      // Front gable end wall (on the main wall, not the overhang)
      const qFrontGableGeom = new BufferGeometry();
      qFrontGableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, wallHeight + 0.2, shedLength/2,
        shedWidth/2, wallHeight + 0.2, shedLength/2,
        0, wallHeight + 0.2 + roofRise, shedLength/2,
      ]), 3));
      qFrontGableGeom.computeVertexNormals();
      const qFrontGable = new Mesh(qFrontGableGeom, wallMaterial);
      qFrontGable.castShadow = true;
      scene.add(qFrontGable);

      // Back gable end wall
      const qBackGableGeom = new BufferGeometry();
      qBackGableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, wallHeight + 0.2, -shedLength/2,
        shedWidth/2, wallHeight + 0.2, -shedLength/2,
        0, wallHeight + 0.2 + roofRise, -shedLength/2,
      ]), 3));
      qBackGableGeom.computeVertexNormals();
      const qBackGable = new Mesh(qBackGableGeom, wallMaterial);
      qBackGable.castShadow = true;
      scene.add(qBackGable);

    } else if (config.style === 'saltbox') {
      // Saltbox: asymmetric gable — peak is offset toward the front
      // Front slope is shorter/steeper, back slope is longer/shallower
      const peakOffsetX = -shedWidth * 0.1; // Peak shifted toward front (left in our coord system matches 2D canvas)
      const frontHalfW = shedWidth / 2 + peakOffsetX; // shorter front side
      const backHalfW = shedWidth / 2 - peakOffsetX;  // longer back side

      const roofBaseY = wallHeight + 0.2;
      const ridgeY = roofBaseY + roofRise;
      const sideOverhang = 0.1;
      const endOverhang = 0.15;
      const zFront = shedLength / 2 + endOverhang;
      const zBack = -shedLength / 2 - endOverhang;

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [-shedWidth / 2 - sideOverhang, roofBaseY, zFront],
          [peakOffsetX, ridgeY, zFront],
          [peakOffsetX, ridgeY, zBack],
          [-shedWidth / 2 - sideOverhang, roofBaseY, zBack],
        ),
        roofMaterial,
      );

      addRoofSurface(
        scene,
        createRoofQuadGeometry(
          [peakOffsetX, ridgeY, zFront],
          [shedWidth / 2 + sideOverhang, roofBaseY, zFront],
          [shedWidth / 2 + sideOverhang, roofBaseY, zBack],
          [peakOffsetX, ridgeY, zBack],
        ),
        roofMaterial,
      );

      const ridgeCap = new Mesh(
        new BoxGeometry(0.1, 0.08, shedLength + endOverhang * 2 + 0.04),
        roofMaterial
      );
      ridgeCap.position.set(peakOffsetX, ridgeY + 0.04, 0);
      ridgeCap.castShadow = true;
      ridgeCap.receiveShadow = true;
      scene.add(ridgeCap);

      // Front gable end wall
      const sFrontGableGeom = new BufferGeometry();
      sFrontGableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, wallHeight + 0.2, shedLength/2,
        shedWidth/2, wallHeight + 0.2, shedLength/2,
        peakOffsetX, wallHeight + 0.2 + roofRise, shedLength/2,
      ]), 3));
      sFrontGableGeom.computeVertexNormals();
      const sFrontGable = new Mesh(sFrontGableGeom, wallMaterial);
      sFrontGable.castShadow = true;
      scene.add(sFrontGable);

      // Back gable end wall
      const sBackGableGeom = new BufferGeometry();
      sBackGableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, wallHeight + 0.2, -shedLength/2,
        shedWidth/2, wallHeight + 0.2, -shedLength/2,
        peakOffsetX, wallHeight + 0.2 + roofRise, -shedLength/2,
      ]), 3));
      sBackGableGeom.computeVertexNormals();
      const sBackGable = new Mesh(sBackGableGeom, wallMaterial);
      sBackGable.castShadow = true;
      scene.add(sBackGable);
    }

    // Door
    const doorWidth = config.doorWidth * scale;
    const doorHeight = config.doorHeight * scale;
    const doorGeometry = new BoxGeometry(doorWidth, doorHeight, 0.05);
    const doorMaterial = new MeshStandardMaterial({ 
      color: config.doorType === 'sliding-barn' ? 0x8b7355 :
             config.doorType === 'double' ? 0xd4d4d4 :
             config.doorType === 'roll-up' ? 0x9ca3af : 0xf5f0eb,
      roughness: config.doorType === 'roll-up' ? 0.3 : 0.5,
      metalness: config.doorType === 'roll-up' ? 0.5 : 0.1
    });
    const door = new Mesh(doorGeometry, doorMaterial);
    
    if (config.doorPosition === 'front') {
      door.position.set(0, doorHeight / 2 + 0.2, shedLength / 2 + 0.05);
    } else {
      door.position.set(0, doorHeight / 2 + 0.2, -shedLength / 2 - 0.05);
    }
    door.castShadow = true;
    scene.add(door);

    // Door frame/trim
    const trimColor = 0x4a5568;
    const trimMaterial = new MeshStandardMaterial({ color: trimColor, roughness: 0.6 });
    const trimThickness = 0.04;
    const trimDepth = 0.06;
    
    // Top trim
    const topTrimGeom = new BoxGeometry(doorWidth + trimThickness * 2, trimThickness, trimDepth);
    const topTrim = new Mesh(topTrimGeom, trimMaterial);
    topTrim.position.set(
      door.position.x,
      doorHeight + 0.2 + trimThickness / 2,
      door.position.z
    );
    scene.add(topTrim);

    // Left trim
    const sideTrimGeom = new BoxGeometry(trimThickness, doorHeight, trimDepth);
    const leftTrim = new Mesh(sideTrimGeom, trimMaterial);
    leftTrim.position.set(
      door.position.x - doorWidth / 2 - trimThickness / 2,
      doorHeight / 2 + 0.2,
      door.position.z
    );
    scene.add(leftTrim);

    // Right trim
    const rightTrim = new Mesh(sideTrimGeom, trimMaterial);
    rightTrim.position.set(
      door.position.x + doorWidth / 2 + trimThickness / 2,
      doorHeight / 2 + 0.2,
      door.position.z
    );
    scene.add(rightTrim);

    // Door handle
    const handleGeom = new BoxGeometry(0.03, 0.12, 0.04);
    const handleMaterial = new MeshStandardMaterial({ color: 0x2d2d2d, metalness: 0.8, roughness: 0.2 });
    const handle = new Mesh(handleGeom, handleMaterial);
    const handleZOffset = config.doorPosition === 'front' ? 0.04 : -0.04;
    handle.position.set(
      door.position.x + doorWidth * 0.15,
      doorHeight * 0.45 + 0.2,
      door.position.z + handleZOffset
    );
    scene.add(handle);

    // For double doors, add a center line and second handle
    if (config.doorType === 'double') {
      const centerLineGeom = new BoxGeometry(0.02, doorHeight, trimDepth);
      const centerLine = new Mesh(centerLineGeom, trimMaterial);
      centerLine.position.set(door.position.x, doorHeight / 2 + 0.2, door.position.z);
      scene.add(centerLine);

      const handle2 = new Mesh(handleGeom, handleMaterial);
      handle2.position.set(
        door.position.x - doorWidth * 0.15,
        doorHeight * 0.45 + 0.2,
        door.position.z + handleZOffset
      );
      scene.add(handle2);
    }

    // Windows
    config.windows.forEach((window) => {
      const windowWidth = window.width * scale;
      const windowHeight = window.height * scale;
      const windowGeometry = new BoxGeometry(windowWidth, windowHeight, 0.04);
      const windowMaterial = new MeshStandardMaterial({ 
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.6,
        metalness: 0.9,
        roughness: 0.1
      });
      const windowMesh = new Mesh(windowGeometry, windowMaterial);

      let x = 0, z = 0;
      const offsetY = (window.offsetFromFloor || 4) * scale;
      let rotationY = 0;
      
      if (window.position === 'front') {
        x = -shedWidth/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
        z = shedLength/2 + 0.05;
      } else if (window.position === 'back') {
        x = -shedWidth/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
        z = -shedLength/2 - 0.05;
      } else if (window.position === 'left') {
        x = -shedWidth/2 - 0.05;
        z = shedLength/2 - windowWidth/2 - (window.offsetFromLeft || 0) * scale;
        rotationY = Math.PI / 2;
      } else {
        x = shedWidth/2 + 0.05;
        z = shedLength/2 - windowWidth/2 - (window.offsetFromLeft || 0) * scale;
        rotationY = Math.PI / 2;
      }

      windowMesh.position.set(x, windowHeight/2 + offsetY, z);
      windowMesh.rotation.y = rotationY;
      scene.add(windowMesh);

      // Window trim
      if (config.hasShutters) {
        const shutterGeometry = new BoxGeometry(windowWidth * 0.4, windowHeight, 0.03);
        const shutterMaterial = new MeshStandardMaterial({ color: 0x2c3e50 });
        
        const leftShutter = new Mesh(shutterGeometry, shutterMaterial);
        const rightShutter = new Mesh(shutterGeometry, shutterMaterial);
        
        if (rotationY === 0) {
          leftShutter.position.set(x - windowWidth * 0.7, windowHeight/2 + offsetY, z);
          rightShutter.position.set(x + windowWidth * 0.7, windowHeight/2 + offsetY, z);
        } else {
          leftShutter.position.set(x, windowHeight/2 + offsetY, z - windowWidth * 0.7);
          rightShutter.position.set(x, windowHeight/2 + offsetY, z + windowWidth * 0.7);
        }
        
        leftShutter.rotation.y = rotationY;
        rightShutter.rotation.y = rotationY;

        scene.add(leftShutter);
        scene.add(rightShutter);
      }
    });

    // Pointer & Touch controls
    let isDragging = false;
    let previousPointerPosition = { x: 0, y: 0 };
    let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 5 };
    let cameraDistance = 10;
    
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
        cameraDistance = Math.max(4, Math.min(25, cameraDistance));
        
        initialPinchDistance = dist;
      }
    };

    const onTouchEnd = () => {
      initialPinchDistance = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.01;
      cameraDistance = Math.max(4, Math.min(25, cameraDistance));
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
    <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 rounded-lg overflow-hidden relative">
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
            <div className="text-xs text-muted-foreground">Style</div>
            <div className="font-bold text-foreground">{config.style}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Windows</div>
            <div className="font-bold text-foreground">{config.windows.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Door</div>
            <div className="font-bold text-foreground">{config.doorType}</div>
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}