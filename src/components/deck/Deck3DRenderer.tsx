import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { DeckConfig } from '../../types/deck';
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
  CanvasTexture,
  BufferGeometry,
  CylinderGeometry
} from '../../utils/three';
import { 
  createGrassTexture, 
  createConcreteTexture, 
  createSidingTexture,
  createWoodTexture 
} from '../../utils/proceduralTextures';

interface Deck3DRendererProps {
  config: DeckConfig;
  onRenderComplete?: () => void;
}

export interface Deck3DRendererRef {
  captureSnapshot: () => void;
  getSnapshotUrl: () => string | null;
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

export const Deck3DRenderer = forwardRef<Deck3DRendererRef, Deck3DRendererProps>(({ config, onRenderComplete }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer;
  } | null>(null);
  const snapshotImgRef = useRef<HTMLImageElement | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  // Expose the captureSnapshot method and snapshotUrl to parent components
  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      updateSnapshot();
    },
    getSnapshotUrl: () => snapshotUrl
  }));

  // Function to update the snapshot image
  const updateSnapshot = () => {
    if (sceneRef.current && containerRef.current) {
      try {
        const dataUrl = sceneRef.current.renderer.domElement.toDataURL('image/png');
        setSnapshotUrl(dataUrl);
        
        // Create snapshot image if it doesn't exist
        if (!snapshotImgRef.current) {
          const img = document.createElement('img');
          img.alt = '3D Deck Render';
          img.className = 'print-snapshot hidden print:block absolute inset-0 w-full h-full object-contain';
          img.style.position = 'absolute';
          img.style.top = '0';
          img.style.left = '0';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'contain';
          img.style.zIndex = '9999';
          containerRef.current.appendChild(img);
          snapshotImgRef.current = img;
        }
        
        // Update the image source
        snapshotImgRef.current.src = dataUrl;
      } catch (error) {
        // Failed to capture 3D canvas
      }
    }
  };

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
    const deckWidth = config.width * scale;
    const deckLength = config.length * scale;
    const deckHeight = (config.height || 2) * scale;

    // BC Building Code specifications
    const foundationAboveGrade = 0.152; // 152mm (6") above grade per code
    const postStandoff = 0.025; // 25mm (1") standoff above foundation
    const postSize = deckHeight <= 2.0 * scale ? 0.089 : 0.140; // 89mm for low decks, 140mm for higher
    const deckingSpacing = 0.006; // 6mm minimum spacing between boards
    const deckBoardWidth = 0.140; // ~5.5 inches actual board width
    
    // L-shape dimensions
    const isLShape = config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength;
    const lShapeWidth = isLShape ? config.lShapeWidth * scale : 0;
    const lShapeLength = isLShape ? config.lShapeLength * scale : 0;
    const lShapePosition = config.lShapePosition || 'top-left';
    
    const isUShape = config.shape === 'u-shape';
    const uLeftWidth = isUShape ? (config.uShapeLeftWidth || 6) * scale : 0;
    const uRightWidth = isUShape ? (config.uShapeRightWidth || 6) * scale : 0;
    const uDepth = isUShape ? (config.uShapeDepth || 8) * scale : 0;
    
    // Procedural textures
    const grassTex = createGrassTexture();
    const sidingTex = createSidingTexture();
    const concreteTex = createConcreteTexture();
    const woodTex = createWoodTexture(0x8b6f47);
    
    // Create ground with grass texture
    const groundGeometry = new PlaneGeometry(50, 50);
    const groundMaterial = new MeshStandardMaterial({ 
      color: 0x4a7c59,
      roughness: 0.9,
      metalness: 0.0,
      map: grassTex
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -deckHeight - foundationAboveGrade;
    ground.receiveShadow = true;
    scene.add(ground);

    // Subtle grid
    const gridHelper = new GridHelper(40, 40, 0x7b9a6b, 0x9aad8a);
    gridHelper.position.y = -deckHeight - foundationAboveGrade + 0.01;
    scene.add(gridHelper);

    // House wall on back side (permanent structure) with siding texture
    if (!config.isDetached) {
      const wallHeight = 3.0; // 3 meters tall wall
      const wallThickness = 0.2; // 200mm thick wall
      const wallWidth = isLShape ? Math.max(deckWidth, deckWidth + lShapeWidth) : deckWidth;
      
      const wallGeometry = new BoxGeometry(wallWidth * 1.5, wallHeight, wallThickness);
      const wallMaterial = new MeshStandardMaterial({ 
        color: 0xd4c5b0, // Beige/tan house color
        roughness: 0.85,
        metalness: 0.0,
        map: sidingTex
      });
      const wall = new Mesh(wallGeometry, wallMaterial);
      wall.position.set(0, -deckHeight + wallHeight/2, -deckLength/2 - wallThickness/2);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);

      // Wall trim/siding detail lines
      const trimMaterial = new MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.0
      });
      
      // Horizontal trim board at deck level
      const trimGeometry = new BoxGeometry(wallWidth * 1.5, 0.15, 0.05);
      const deckLevelTrim = new Mesh(trimGeometry, trimMaterial);
      deckLevelTrim.position.set(0, 0, -deckLength/2 - wallThickness - 0.025);
      deckLevelTrim.castShadow = true;
      scene.add(deckLevelTrim);

      // Concrete foundation strip along wall base
      const foundationH = 0.25;
      const foundationMat = new MeshStandardMaterial({ 
        color: 0x8a8278, 
        roughness: 0.95, 
        map: concreteTex 
      });
      const wallFoundation = new Mesh(
        new BoxGeometry(wallWidth * 1.5, foundationH, wallThickness + 0.3), 
        foundationMat
      );
      wallFoundation.position.set(0, -deckHeight + foundationH / 2, -deckLength/2 - wallThickness/2);
      wallFoundation.receiveShadow = true;
      scene.add(wallFoundation);

      // Add windows to wall (2 windows)
      const windowGlassMat = new MeshStandardMaterial({ 
        color: 0x87ceeb, 
        roughness: 0.1, 
        metalness: 0.8, 
        transparent: true 
      });
      const winFrameMat = new MeshStandardMaterial({ 
        color: 0xffffff, 
        roughness: 0.3 
      });
      const winW = 0.7, winH = 0.6;
      for (const wx of [-wallWidth * 0.3, wallWidth * 0.3]) {
        const winGlass = new Mesh(
          new BoxGeometry(winW, winH, 0.04), 
          windowGlassMat
        );
        winGlass.position.set(wx, -deckHeight + wallHeight * 0.55, -deckLength/2 - wallThickness + 0.02);
        scene.add(winGlass);
        // Window frame
        const fTop = new Mesh(
          new BoxGeometry(winW + 0.08, 0.04, 0.06), 
          winFrameMat
        );
        fTop.position.set(wx, -deckHeight + wallHeight * 0.55 + winH / 2 + 0.02, -deckLength/2 - wallThickness + 0.02);
        scene.add(fTop);
        const fBot = new Mesh(
          new BoxGeometry(winW + 0.1, 0.05, 0.07), 
          winFrameMat
        );
        fBot.position.set(wx, -deckHeight + wallHeight * 0.55 - winH / 2 - 0.02, -deckLength/2 - wallThickness + 0.02);
        scene.add(fBot);
        // Mullion cross
        const mullV = new Mesh(
          new BoxGeometry(0.025, winH, 0.05), 
          winFrameMat
        );
        mullV.position.set(wx, -deckHeight + wallHeight * 0.55, -deckLength/2 - wallThickness + 0.03);
        scene.add(mullV);
        const mullH = new Mesh(
          new BoxGeometry(winW, 0.025, 0.05), 
          winFrameMat
        );
        mullH.position.set(wx, -deckHeight + wallHeight * 0.55, -deckLength/2 - wallThickness + 0.03);
        scene.add(mullH);
      }

      // Sliding door on wall (centered)
      const doorMat = new MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.7 });
      const slidingDoorW = 1.8, slidingDoorH = 2.1;
      const slidingDoor = new Mesh(
        new BoxGeometry(slidingDoorW, slidingDoorH, 0.06), 
        doorMat
      );
      slidingDoor.position.set(0, -deckHeight + slidingDoorH / 2 + foundationH, -deckLength/2 - wallThickness + 0.03);
      scene.add(slidingDoor);
      // Door frame
      const dFrameMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const dFrameTop = new Mesh(
        new BoxGeometry(slidingDoorW + 0.12, 0.06, 0.08), 
        dFrameMat
      );
      dFrameTop.position.set(0, -deckHeight + slidingDoorH + foundationH + 0.03, -deckLength/2 - wallThickness + 0.03);
      scene.add(dFrameTop);

      // Corner trim boards
      const trimH = wallHeight + foundationH;
      const wallCorners = [
        [-wallWidth * 0.75, -deckLength/2 - wallThickness/2 - 0.15],
        [wallWidth * 0.75, -deckLength/2 - wallThickness/2 - 0.15],
        [-wallWidth * 0.75, -deckLength/2 - wallThickness/2 + 0.15],
        [wallWidth * 0.75, -deckLength/2 - wallThickness/2 + 0.15]
      ];
      for (const [cx, cz] of wallCorners) {
        const hTrim = new Mesh(
          new BoxGeometry(0.08, trimH, 0.08), 
          trimMaterial
        );
        hTrim.position.set(cx, -deckHeight + trimH / 2, cz);
        scene.add(hTrim);
      }
    }

    // Deck material with wood texture
    const deckMaterial = new MeshStandardMaterial({ 
      color: 0x8b6f47,
      roughness: 0.8,
      metalness: 0.1,
      map: woodTex
    });

    // Create deck surfaces (main + L-shape extension if applicable)
    if (isLShape) {
      // Main deck section
      const mainDeckGeometry = new BoxGeometry(deckWidth, 0.15, deckLength);
      const mainDeck = new Mesh(mainDeckGeometry, deckMaterial);
      mainDeck.position.set(0, 0.075, 0);
      mainDeck.castShadow = true;
      mainDeck.receiveShadow = true;
      scene.add(mainDeck);

      // L-shape extension
      const lDeckGeometry = new BoxGeometry(lShapeWidth, 0.15, lShapeLength);
      const lDeck = new Mesh(lDeckGeometry, deckMaterial);
      
      // Position based on lShapePosition
      switch (lShapePosition) {
        case 'top-right':
          lDeck.position.set(deckWidth/2 + lShapeWidth/2, 0.075, -deckLength/2 + lShapeLength/2);
          break;
        case 'bottom-right':
          lDeck.position.set(deckWidth/2 + lShapeWidth/2, 0.075, deckLength/2 - lShapeLength/2);
          break;
        case 'bottom-left':
          lDeck.position.set(-deckWidth/2 - lShapeWidth/2, 0.075, deckLength/2 - lShapeLength/2);
          break;
        case 'top-left':
        default:
          lDeck.position.set(-deckWidth/2 - lShapeWidth/2, 0.075, -deckLength/2 + lShapeLength/2);
          break;
      }
      lDeck.castShadow = true;
      lDeck.receiveShadow = true;
      scene.add(lDeck);

      // Add edges to L-shape decks
      const mainDeckEdges = new EdgesGeometry(mainDeckGeometry);
      const edgesMaterial = new LineBasicMaterial({ color: 0x5a4a3a, linewidth: 2 });
      const mainDeckLines = new LineSegments(mainDeckEdges, edgesMaterial);
      mainDeckLines.position.copy(mainDeck.position);
      scene.add(mainDeckLines);

      const lDeckEdges = new EdgesGeometry(lDeckGeometry);
      const lDeckLines = new LineSegments(lDeckEdges, edgesMaterial);
      lDeckLines.position.copy(lDeck.position);
      scene.add(lDeckLines);
    } else if (isUShape) {
      // Main deck section
      const mainDeckGeometry = new BoxGeometry(deckWidth, 0.15, deckLength);
      const mainDeck = new Mesh(mainDeckGeometry, deckMaterial);
      mainDeck.position.set(0, 0.075, 0);
      mainDeck.castShadow = true;
      mainDeck.receiveShadow = true;
      scene.add(mainDeck);

      // Left arm
      const leftArmGeo = new BoxGeometry(uLeftWidth, 0.15, uDepth);
      const leftArm = new Mesh(leftArmGeo, deckMaterial);
      leftArm.position.set(-deckWidth/2 + uLeftWidth/2, 0.075, deckLength/2 + uDepth/2);
      leftArm.castShadow = true;
      leftArm.receiveShadow = true;
      scene.add(leftArm);

      // Right arm
      const rightArmGeo = new BoxGeometry(uRightWidth, 0.15, uDepth);
      const rightArm = new Mesh(rightArmGeo, deckMaterial);
      rightArm.position.set(deckWidth/2 - uRightWidth/2, 0.075, deckLength/2 + uDepth/2);
      rightArm.castShadow = true;
      rightArm.receiveShadow = true;
      scene.add(rightArm);

      // Add edges
      const edgesMaterial = new LineBasicMaterial({ color: 0x5a4a3a, linewidth: 2 });
      
      const mainDeckEdges = new EdgesGeometry(mainDeckGeometry);
      const mainDeckLines = new LineSegments(mainDeckEdges, edgesMaterial);
      mainDeckLines.position.copy(mainDeck.position);
      scene.add(mainDeckLines);

      const lArmEdges = new EdgesGeometry(leftArmGeo);
      const lArmLines = new LineSegments(lArmEdges, edgesMaterial);
      lArmLines.position.copy(leftArm.position);
      scene.add(lArmLines);

      const rArmEdges = new EdgesGeometry(rightArmGeo);
      const rArmLines = new LineSegments(rArmEdges, edgesMaterial);
      rArmLines.position.copy(rightArm.position);
      scene.add(rArmLines);
    } else {
      // Regular rectangular deck
      const deckGeometry = new BoxGeometry(deckWidth, 0.15, deckLength);
      const deck = new Mesh(deckGeometry, deckMaterial);
      deck.position.set(0, 0.075, 0);
      deck.castShadow = true;
      deck.receiveShadow = true;
      scene.add(deck);

      // Add edges to deck
      const deckEdges = new EdgesGeometry(deckGeometry);
      const edgesMaterial = new LineBasicMaterial({ color: 0x5a4a3a, linewidth: 2 });
      const deckLines = new LineSegments(deckEdges, edgesMaterial);
      deckLines.position.copy(deck.position);
      scene.add(deckLines);
    }

    // Deck boards (visual detail with proper spacing and wood texture)
    const boardWoodTex = createWoodTexture(0x9d7f54);
    const boardMaterial = new MeshStandardMaterial({ 
      color: 0x9d7f54,
      roughness: 0.9,
      map: boardWoodTex
    });

    // Main deck boards
    const numBoards = Math.floor(deckLength / (deckBoardWidth + deckingSpacing));
    for (let i = 0; i < numBoards; i++) {
      const boardGeometry = new BoxGeometry(deckWidth * 0.98, 0.03, deckBoardWidth - deckingSpacing);
      const board = new Mesh(boardGeometry, boardMaterial);
      board.position.set(
        0, 
        0.165,
        -deckLength/2 + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2
      );
      scene.add(board);
    }

    // L-shape extension boards
    if (isLShape) {
      const numLBoards = Math.floor(lShapeLength / (deckBoardWidth + deckingSpacing));
      for (let i = 0; i < numLBoards; i++) {
        const boardGeometry = new BoxGeometry(lShapeWidth * 0.98, 0.03, deckBoardWidth - deckingSpacing);
        const board = new Mesh(boardGeometry, boardMaterial);
        
        let boardX = 0, boardZ = 0;
        switch (lShapePosition) {
          case 'top-right':
            boardX = deckWidth/2 + lShapeWidth/2;
            boardZ = -deckLength/2 + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2;
            break;
          case 'bottom-right':
            boardX = deckWidth/2 + lShapeWidth/2;
            boardZ = deckLength/2 - lShapeLength + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2;
            break;
          case 'bottom-left':
            boardX = -deckWidth/2 - lShapeWidth/2;
            boardZ = deckLength/2 - lShapeLength + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2;
            break;
          case 'top-left':
          default:
            boardX = -deckWidth/2 - lShapeWidth/2;
            boardZ = -deckLength/2 + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2;
            break;
        }
        
        board.position.set(boardX, 0.165, boardZ);
        scene.add(board);
      }
    } else if (isUShape) {
      // Left arm boards
      const numLeftBoards = Math.floor(uDepth / (deckBoardWidth + deckingSpacing));
      for (let i = 0; i < numLeftBoards; i++) {
        const boardGeometry = new BoxGeometry(uLeftWidth * 0.98, 0.03, deckBoardWidth - deckingSpacing);
        const board = new Mesh(boardGeometry, boardMaterial);
        board.position.set(
          -deckWidth/2 + uLeftWidth/2,
          0.165,
          deckLength/2 + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2
        );
        scene.add(board);
      }
      
      // Right arm boards
      const numRightBoards = Math.floor(uDepth / (deckBoardWidth + deckingSpacing));
      for (let i = 0; i < numRightBoards; i++) {
        const boardGeometry = new BoxGeometry(uRightWidth * 0.98, 0.03, deckBoardWidth - deckingSpacing);
        const board = new Mesh(boardGeometry, boardMaterial);
        board.position.set(
          deckWidth/2 - uRightWidth/2,
          0.165,
          deckLength/2 + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2
        );
        scene.add(board);
      }
    }

    // Default concrete walkway (removed, will be drawn dynamically with stairs if they exist)

    // Concrete foundations (piers) - 152mm (6") above grade per BC Building Code
    const foundationGeometry = new BoxGeometry(0.3, foundationAboveGrade, 0.3);
    const foundationMaterial = new MeshStandardMaterial({ 
      color: 0x888888,
      roughness: 0.9,
      metalness: 0.0,
      map: concreteTex
    });

    // Support posts with proper standoff and sizing per BC Building Code
    const supportPostHeight = deckHeight - postStandoff;
    const supportPostGeometry = new BoxGeometry(postSize, supportPostHeight, postSize);
    const postWoodTex = createWoodTexture(0x6b5d4f);
    const supportPostMaterial = new MeshStandardMaterial({ 
      color: 0x6b5d4f,
      roughness: 0.7,
      map: postWoodTex
    });

    // Post base/saddle anchor (simulated as standoff)
    const standoffGeometry = new BoxGeometry(postSize + 0.02, postStandoff, postSize + 0.02);
    const standoffMaterial = new MeshStandardMaterial({ 
      color: 0x999999,
      roughness: 0.4,
      metalness: 0.6
    });

    // Calculate post positions based on shape
    let postPositions: number[][] = [];
    
    if (isLShape) {
      // For L-shape, we need posts at corners of both rectangles
      // Main deck corners
      postPositions.push(
        [-deckWidth/2 + 0.3, 0, -deckLength/2 + 0.3],
        [deckWidth/2 - 0.3, 0, -deckLength/2 + 0.3],
        [-deckWidth/2 + 0.3, 0, deckLength/2 - 0.3],
        [deckWidth/2 - 0.3, 0, deckLength/2 - 0.3]
      );
      
      // L-shape extension corners (varies by position)
      switch (lShapePosition) {
        case 'top-right':
          postPositions.push(
            [deckWidth/2 + lShapeWidth - 0.3, 0, -deckLength/2 + 0.3],
            [deckWidth/2 + lShapeWidth - 0.3, 0, -deckLength/2 + lShapeLength - 0.3]
          );
          break;
        case 'bottom-right':
          postPositions.push(
            [deckWidth/2 + lShapeWidth - 0.3, 0, deckLength/2 - lShapeLength + 0.3],
            [deckWidth/2 + lShapeWidth - 0.3, 0, deckLength/2 - 0.3]
          );
          break;
        case 'bottom-left':
          postPositions.push(
            [-deckWidth/2 - lShapeWidth + 0.3, 0, deckLength/2 - lShapeLength + 0.3],
            [-deckWidth/2 - lShapeWidth + 0.3, 0, deckLength/2 - 0.3]
          );
          break;
        case 'top-left':
        default:
          postPositions.push(
            [-deckWidth/2 - lShapeWidth + 0.3, 0, -deckLength/2 + 0.3],
            [-deckWidth/2 - lShapeWidth + 0.3, 0, -deckLength/2 + lShapeLength - 0.3]
          );
          break;
      }
    } else if (isUShape) {
      postPositions = [
        [-deckWidth/2 + 0.3, 0, -deckLength/2 + 0.3], // main top left
        [deckWidth/2 - 0.3, 0, -deckLength/2 + 0.3],  // main top right
        [-deckWidth/2 + 0.3, 0, deckLength/2 - 0.3],  // main bottom left inner
        [deckWidth/2 - 0.3, 0, deckLength/2 - 0.3],   // main bottom right inner
        [-deckWidth/2 + 0.3, 0, deckLength/2 + uDepth - 0.3], // left arm bottom left
        [-deckWidth/2 + uLeftWidth - 0.3, 0, deckLength/2 + uDepth - 0.3], // left arm bottom right
        [deckWidth/2 - 0.3, 0, deckLength/2 + uDepth - 0.3], // right arm bottom right
        [deckWidth/2 - uRightWidth + 0.3, 0, deckLength/2 + uDepth - 0.3], // right arm bottom left
      ];
    } else {
      // Regular rectangular deck
      postPositions = [
        [-deckWidth/2 + 0.3, 0, -deckLength/2 + 0.3],
        [deckWidth/2 - 0.3, 0, -deckLength/2 + 0.3],
        [-deckWidth/2 + 0.3, 0, deckLength/2 - 0.3],
        [deckWidth/2 - 0.3, 0, deckLength/2 - 0.3],
      ];
    }

    postPositions.forEach(([x, _, z]) => {
      // Concrete foundation pier
      const foundation = new Mesh(foundationGeometry, foundationMaterial);
      foundation.position.set(x, -deckHeight - foundationAboveGrade/2, z);
      foundation.castShadow = true;
      foundation.receiveShadow = true;
      scene.add(foundation);

      // Metal post base/standoff (25mm standoff per code)
      const standoff = new Mesh(standoffGeometry, standoffMaterial);
      standoff.position.set(x, -deckHeight + postStandoff/2, z);
      standoff.castShadow = true;
      scene.add(standoff);

      // Support post (elevated above foundation)
      const post = new Mesh(supportPostGeometry, supportPostMaterial);
      post.position.set(x, -supportPostHeight/2 - postStandoff, z);
      post.castShadow = true;
      scene.add(post);
    });

     // Get outer perimeter segments
    const getOuterPerimeterSegments = () => {
      const segments: Array<{x1: number, z1: number, x2: number, z2: number, side: string, part: 'main'|'l-shape'|'u-left'|'u-right', isConnection?: boolean}> = [];
      
      if (isLShape) {
        switch (lShapePosition) {
          case 'top-right':
            segments.push({ x1: deckWidth/2 + lShapeWidth, z1: -deckLength/2, x2: deckWidth/2 + lShapeWidth, z2: -deckLength/2 + lShapeLength, side: 'right', part: 'l-shape' });
            segments.push({ x1: deckWidth/2 + lShapeWidth, z1: -deckLength/2 + lShapeLength, x2: deckWidth/2, z2: -deckLength/2 + lShapeLength, side: 'front', part: 'l-shape' });
            segments.push({ x1: deckWidth/2, z1: -deckLength/2 + lShapeLength, x2: deckWidth/2, z2: deckLength/2, side: 'right', part: 'main' });
            segments.push({ x1: deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: deckLength/2, side: 'front', part: 'main' });
            segments.push({ x1: -deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: -deckLength/2, side: 'left', part: 'main' });
            if (config.isDetached) {
              segments.push({ x1: -deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: -deckLength/2, side: 'back', part: 'main' });
              segments.push({ x1: deckWidth/2, z1: -deckLength/2, x2: deckWidth/2 + lShapeWidth, z2: -deckLength/2, side: 'back', part: 'l-shape' });
            }
            break;
          case 'bottom-right':
            segments.push({ x1: deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: deckLength/2 - lShapeLength, side: 'right', part: 'main' });
            segments.push({ x1: deckWidth/2, z1: deckLength/2 - lShapeLength, x2: deckWidth/2 + lShapeWidth, z2: deckLength/2 - lShapeLength, side: 'back', part: 'l-shape' });
            segments.push({ x1: deckWidth/2 + lShapeWidth, z1: deckLength/2 - lShapeLength, x2: deckWidth/2 + lShapeWidth, z2: deckLength/2, side: 'right', part: 'l-shape' });
            segments.push({ x1: deckWidth/2 + lShapeWidth, z1: deckLength/2, x2: deckWidth/2, z2: deckLength/2, side: 'front', part: 'l-shape' });
            segments.push({ x1: deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: deckLength/2, side: 'front', part: 'main' });
            segments.push({ x1: -deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: -deckLength/2, side: 'left', part: 'main' });
            if (config.isDetached) {
              segments.push({ x1: -deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: -deckLength/2, side: 'back', part: 'main' });
            }
            break;
          case 'bottom-left':
            segments.push({ x1: deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: deckLength/2, side: 'right', part: 'main' });
            segments.push({ x1: deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: deckLength/2, side: 'front', part: 'main' });
            segments.push({ x1: -deckWidth/2, z1: deckLength/2, x2: -deckWidth/2 - lShapeWidth, z2: deckLength/2, side: 'front', part: 'l-shape' });
            segments.push({ x1: -deckWidth/2 - lShapeWidth, z1: deckLength/2, x2: -deckWidth/2 - lShapeWidth, z2: deckLength/2 - lShapeLength, side: 'left', part: 'l-shape' });
            segments.push({ x1: -deckWidth/2 - lShapeWidth, z1: deckLength/2 - lShapeLength, x2: -deckWidth/2, z2: deckLength/2 - lShapeLength, side: 'back', part: 'l-shape' });
            segments.push({ x1: -deckWidth/2, z1: deckLength/2 - lShapeLength, x2: -deckWidth/2, z2: -deckLength/2, side: 'left', part: 'main' });
            if (config.isDetached) {
              segments.push({ x1: -deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: -deckLength/2, side: 'back', part: 'main' });
            }
            break;
          case 'top-left':
          default:
            segments.push({ x1: deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: deckLength/2, side: 'right', part: 'main' });
            segments.push({ x1: deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: deckLength/2, side: 'front', part: 'main' });
            segments.push({ x1: -deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: -deckLength/2 + lShapeLength, side: 'left', part: 'main' });
            segments.push({ x1: -deckWidth/2, z1: -deckLength/2 + lShapeLength, x2: -deckWidth/2 - lShapeWidth, z2: -deckLength/2 + lShapeLength, side: 'front', part: 'l-shape' });
            segments.push({ x1: -deckWidth/2 - lShapeWidth, z1: -deckLength/2 + lShapeLength, x2: -deckWidth/2 - lShapeWidth, z2: -deckLength/2, side: 'left', part: 'l-shape' });
            if (config.isDetached) {
              segments.push({ x1: -deckWidth/2 - lShapeWidth, z1: -deckLength/2, x2: -deckWidth/2, z2: -deckLength/2, side: 'back', part: 'l-shape' });
              segments.push({ x1: -deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: -deckLength/2, side: 'back', part: 'main' });
            }
            break;
        }
      } else if (isUShape) {
        // u-shape: arms extend forward (+z) from the main deck
        // Right arm
        segments.push({ x1: deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: deckLength/2 + uDepth, side: 'right', part: 'u-right' });
        segments.push({ x1: deckWidth/2, z1: deckLength/2 + uDepth, x2: deckWidth/2 - uRightWidth, z2: deckLength/2 + uDepth, side: 'front', part: 'u-right' });
        segments.push({ x1: deckWidth/2 - uRightWidth, z1: deckLength/2 + uDepth, x2: deckWidth/2 - uRightWidth, z2: deckLength/2, side: 'left', part: 'u-right' });
        // Main deck front gap between arms
        segments.push({ x1: deckWidth/2 - uRightWidth, z1: deckLength/2, x2: -deckWidth/2 + uLeftWidth, z2: deckLength/2, side: 'front', part: 'main' });
        // Left arm
        segments.push({ x1: -deckWidth/2 + uLeftWidth, z1: deckLength/2, x2: -deckWidth/2 + uLeftWidth, z2: deckLength/2 + uDepth, side: 'right', part: 'u-left' });
        segments.push({ x1: -deckWidth/2 + uLeftWidth, z1: deckLength/2 + uDepth, x2: -deckWidth/2, z2: deckLength/2 + uDepth, side: 'front', part: 'u-left' });
        segments.push({ x1: -deckWidth/2, z1: deckLength/2 + uDepth, x2: -deckWidth/2, z2: -deckLength/2, side: 'left', part: 'u-left' });
        if (config.isDetached) {
          segments.push({ x1: -deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: -deckLength/2, side: 'back', part: 'main' });
        }
      } else {
        // Main rectangle
        segments.push({ x1: deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: deckLength/2, side: 'right', part: 'main' });
        segments.push({ x1: deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: deckLength/2, side: 'front', part: 'main' });
        segments.push({ x1: -deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: -deckLength/2, side: 'left', part: 'main' });
        // Back edge excluded unless detached
        if (config.isDetached) {
          segments.push({ x1: -deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: -deckLength/2, side: 'back', part: 'main' });
        }
      }
      return segments;
    };

    // Railings - Complete perimeter excluding house side (back) and stairs
    // Draw railings using outer perimeter segments for all deck shapes
    if (config.railingStyle !== 'None') {
      const railingHeight = (config.railingHeight || 42) / 12 * scale;
      
      const deckSurfaceY = 0.15;
      const bottomGap = (2 / 12) * scale;
      const railThickness = 0.05;
      
      const topRailY = deckSurfaceY + railingHeight - railThickness/2;
      const bottomRailY = deckSurfaceY + bottomGap + railThickness/2;
      
      const balusterTopY = topRailY - railThickness/2;
      const balusterBottomY = bottomRailY + railThickness/2;
      const balusterLength = balusterTopY - balusterBottomY;
      const balusterCenterY = (balusterTopY + balusterBottomY) / 2;
      
      const postExtraHeight = (2 / 12) * scale;
      const postHeight = railingHeight + postExtraHeight;
      const postY = postHeight / 2 + deckSurfaceY;
      const isAluminumRailing = config.railingStyle === 'Aluminum';
      const aluminumColor = config.aluminumRailingColor || 'White';
      const useGlassInfill = isAluminumRailing && (config.aluminumInfillType || 'Pickets') === 'Glass';
      const frameColor = isAluminumRailing
        ? (aluminumColor === 'Black' ? 0x1f2937 : 0xf8fafc)
        : 0x8b6f47;
      
      const railingMaterial = new MeshStandardMaterial({ 
        color: frameColor,
        roughness: isAluminumRailing ? 0.3 : 0.7,
        metalness: isAluminumRailing ? 0.35 : 0.05
      });

      const postGeometry = new BoxGeometry(postSize, postHeight, postSize);
      const postMaterial = new MeshStandardMaterial({ 
        color: frameColor,
        roughness: isAluminumRailing ? 0.4 : 0.75,
        metalness: isAluminumRailing ? 0.15 : 0.05
      });
      const glassPanelMaterial = new MeshStandardMaterial({
        color: 0xbfe7f7,
        roughness: 0.05,
        metalness: 0.0,
        transparent: true,
        opacity: 0.45,
      });

      // Define complete outer perimeter segments
      const railingSegments = getOuterPerimeterSegments();

      // Draw railings for each segment
      railingSegments.forEach(seg => {
        const segLength = Math.sqrt((seg.x2 - seg.x1) ** 2 + (seg.z2 - seg.z1) ** 2);
        const centerX = (seg.x1 + seg.x2) / 2;
        const centerZ = (seg.z1 + seg.z2) / 2;
        const angle = Math.atan2(seg.z2 - seg.z1, seg.x2 - seg.x1);
        
        const stairWidth = (config.stairWidth || 4) * scale;
        // Apply stair gaps to matching perimeter segments
        const activeStairPart = config.stairPart || 'main';
        const activeStairSide = config.stairSide || 'front';
        const hasStairsOnSegment = !seg.isConnection && config.hasStairs && activeStairSide === seg.side && activeStairPart === seg.part;
        
        if (segLength > 0.1) {
          if (hasStairsOnSegment) {
            // Split railing into two sections around stairs
            const gapHalfWidth = stairWidth / 2;
            const segmentVector = { x: seg.x2 - seg.x1, z: seg.z2 - seg.z1 };
            const segmentLength = Math.sqrt(segmentVector.x ** 2 + segmentVector.z ** 2);
            const unitVector = { x: segmentVector.x / segmentLength, z: segmentVector.z / segmentLength };
            
            // Calculate center of segment for stair placement based on offset
            const defaultOffsetMeters = (segmentLength - stairWidth) / 2;
            const userOffsetMeters = config.stairOffset !== undefined ? config.stairOffset * scale : defaultOffsetMeters;
            
            // Clamp the offset to ensure stairs don't hang off the edge
            const clampedOffset = Math.max(0, Math.min(userOffsetMeters, segmentLength - stairWidth));
            const stairCenterDist = clampedOffset + stairWidth / 2;

            const centerPt = { 
              x: seg.x1 + unitVector.x * stairCenterDist, 
              z: seg.z1 + unitVector.z * stairCenterDist 
            };
            
            // Left section (from seg.x1,z1 to center - gap)
            const leftEndPt = { 
              x: centerPt.x - unitVector.x * gapHalfWidth, 
              z: centerPt.z - unitVector.z * gapHalfWidth 
            };
            const leftLength = Math.sqrt((leftEndPt.x - seg.x1) ** 2 + (leftEndPt.z - seg.z1) ** 2);
            
            // Right section (from center + gap to seg.x2,z2)
            const rightStartPt = { 
              x: centerPt.x + unitVector.x * gapHalfWidth, 
              z: centerPt.z + unitVector.z * gapHalfWidth 
            };
            const rightLength = Math.sqrt((seg.x2 - rightStartPt.x) ** 2 + (seg.z2 - rightStartPt.z) ** 2);
            
            // Draw left section
            if (leftLength > 0.2) {
              const leftCenterX = (seg.x1 + leftEndPt.x) / 2;
              const leftCenterZ = (seg.z1 + leftEndPt.z) / 2;
              
              const topRailGeometry = new BoxGeometry(leftLength, 0.05, 0.05);
              const topRail = new Mesh(topRailGeometry, railingMaterial);
              topRail.position.set(leftCenterX, topRailY, leftCenterZ);
              topRail.rotation.y = angle;
              topRail.castShadow = true;
              scene.add(topRail);
              
              const bottomRail = new Mesh(topRailGeometry.clone(), railingMaterial);
              bottomRail.position.set(leftCenterX, bottomRailY, leftCenterZ);
              bottomRail.rotation.y = angle;
              scene.add(bottomRail);

              if (useGlassInfill) {
                const panelLength = Math.max(leftLength - 0.12, 0.12);
                const panelHeight = Math.max(balusterLength - 0.06, 0.12);
                const glassPanel = new Mesh(
                  new BoxGeometry(panelLength, panelHeight, 0.02),
                  glassPanelMaterial
                );
                glassPanel.position.set(leftCenterX, balusterCenterY, leftCenterZ);
                glassPanel.rotation.y = angle;
                scene.add(glassPanel);
              } else {
                const balusterSpacing = 0.15;
                const balusterGeometry = new BoxGeometry(0.04, balusterLength, 0.04);
                const numBalusters = Math.floor(leftLength / balusterSpacing);

                for (let i = 0; i < numBalusters; i++) {
                  const t = i / (numBalusters - 1 || 1);
                  const balX = seg.x1 + (leftEndPt.x - seg.x1) * t;
                  const balZ = seg.z1 + (leftEndPt.z - seg.z1) * t;
                  const baluster = new Mesh(balusterGeometry, railingMaterial);
                  baluster.position.set(balX, balusterCenterY, balZ);
                  scene.add(baluster);
                }
              }

              // Posts for left section (including end post at gap)
              const maxPostSpacing = 8 * scale;
              const numSpaces = Math.ceil(leftLength / maxPostSpacing);
              const numPosts = numSpaces + 1;

              for (let i = 0; i < numPosts; i++) {
                const t = i / numSpaces;
                const postX = seg.x1 + (leftEndPt.x - seg.x1) * t;
                const postZ = seg.z1 + (leftEndPt.z - seg.z1) * t;
                const post = new Mesh(postGeometry, postMaterial);
                post.position.set(postX, postY, postZ);
                post.castShadow = true;
                scene.add(post);
              }
            }
            
            // Draw right section
            if (rightLength > 0.2) {
              const rightCenterX = (rightStartPt.x + seg.x2) / 2;
              const rightCenterZ = (rightStartPt.z + seg.z2) / 2;
              
              const topRailGeometry = new BoxGeometry(rightLength, 0.05, 0.05);
              const topRail = new Mesh(topRailGeometry, railingMaterial);
              topRail.position.set(rightCenterX, topRailY, rightCenterZ);
              topRail.rotation.y = angle;
              topRail.castShadow = true;
              scene.add(topRail);
              
              const bottomRail = new Mesh(topRailGeometry.clone(), railingMaterial);
              bottomRail.position.set(rightCenterX, bottomRailY, rightCenterZ);
              bottomRail.rotation.y = angle;
              scene.add(bottomRail);

              if (useGlassInfill) {
                const panelLength = Math.max(rightLength - 0.12, 0.12);
                const panelHeight = Math.max(balusterLength - 0.06, 0.12);
                const glassPanel = new Mesh(
                  new BoxGeometry(panelLength, panelHeight, 0.02),
                  glassPanelMaterial
                );
                glassPanel.position.set(rightCenterX, balusterCenterY, rightCenterZ);
                glassPanel.rotation.y = angle;
                scene.add(glassPanel);
              } else {
                const balusterSpacing = 0.15;
                const balusterGeometry = new BoxGeometry(0.04, balusterLength, 0.04);
                const numBalusters = Math.floor(rightLength / balusterSpacing);

                for (let i = 0; i < numBalusters; i++) {
                  const t = i / (numBalusters - 1 || 1);
                  const balX = rightStartPt.x + (seg.x2 - rightStartPt.x) * t;
                  const balZ = rightStartPt.z + (seg.z2 - rightStartPt.z) * t;
                  const baluster = new Mesh(balusterGeometry, railingMaterial);
                  baluster.position.set(balX, balusterCenterY, balZ);
                  scene.add(baluster);
                }
              }

              // Posts for right section (including start post at gap)
              const maxPostSpacing = 8 * scale;
              const numSpaces = Math.ceil(rightLength / maxPostSpacing);
              const numPosts = numSpaces + 1;

              for (let i = 0; i < numPosts; i++) {
                const t = i / numSpaces;
                const postX = rightStartPt.x + (seg.x2 - rightStartPt.x) * t;
                const postZ = rightStartPt.z + (seg.z2 - rightStartPt.z) * t;
                const post = new Mesh(postGeometry, postMaterial);
                post.position.set(postX, postY, postZ);
                post.castShadow = true;
                scene.add(post);
              }
            }
          } else {
            // No stairs on this segment - full length railing
            // Top rail
            const topRailGeometry = new BoxGeometry(segLength, 0.05, 0.05);
            const topRail = new Mesh(topRailGeometry, railingMaterial);
            topRail.position.set(centerX, topRailY, centerZ);
            topRail.rotation.y = angle;
            topRail.castShadow = true;
            scene.add(topRail);
            
            // Bottom rail
            const bottomRail = new Mesh(topRailGeometry.clone(), railingMaterial);
            bottomRail.position.set(centerX, bottomRailY, centerZ);
            bottomRail.rotation.y = angle;
            scene.add(bottomRail);

            if (useGlassInfill) {
              const panelLength = Math.max(segLength - 0.12, 0.12);
              const panelHeight = Math.max(balusterLength - 0.06, 0.12);
              const glassPanel = new Mesh(
                new BoxGeometry(panelLength, panelHeight, 0.02),
                glassPanelMaterial
              );
              glassPanel.position.set(centerX, balusterCenterY, centerZ);
              glassPanel.rotation.y = angle;
              scene.add(glassPanel);
            } else {
              const balusterSpacing = 0.15;
              const balusterGeometry = new BoxGeometry(0.04, balusterLength, 0.04);
              const numBalusters = Math.floor(segLength / balusterSpacing);

              for (let i = 0; i < numBalusters; i++) {
                const t = i / (numBalusters - 1 || 1);
                const balX = seg.x1 + (seg.x2 - seg.x1) * t;
                const balZ = seg.z1 + (seg.z2 - seg.z1) * t;
                const baluster = new Mesh(balusterGeometry, railingMaterial);
                baluster.position.set(balX, balusterCenterY, balZ);
                scene.add(baluster);
              }
            }

            // Posts along segment
            const maxPostSpacing = 8 * scale;
            const numSpaces = Math.ceil(segLength / maxPostSpacing);
            const numPosts = numSpaces + 1;

            for (let i = 0; i < numPosts; i++) {
              const t = i / numSpaces;
              const postX = seg.x1 + (seg.x2 - seg.x1) * t;
              const postZ = seg.z1 + (seg.z2 - seg.z1) * t;
              const post = new Mesh(postGeometry, postMaterial);
              post.position.set(postX, postY, postZ);
              post.castShadow = true;
              scene.add(post);
            }
          }
        }
      });
    }

    // Stairs (if configured)
    let stairBaseX = 0;
    let stairBaseZ = 0;
    let stairRotation = 0;

    if (config.hasStairs) {
      const stairWidth = (config.stairWidth || 4) * scale;
      const numSteps = Math.ceil(deckHeight / 0.18);
      const stepHeight = deckHeight / numSteps;
      const stepDepth = 0.28;
      const totalRun = numSteps * stepDepth;

      const activeStairPart = config.stairPart || 'main';
      const activeStairSide = config.stairSide || 'front';
      
      const allSegments = getOuterPerimeterSegments();
      const stairSegment = allSegments.find(s => s.side === activeStairSide && s.part === activeStairPart && !s.isConnection);

      if (stairSegment) {
        const segLength = Math.sqrt((stairSegment.x2 - stairSegment.x1) ** 2 + (stairSegment.z2 - stairSegment.z1) ** 2);
        const segmentVector = { x: stairSegment.x2 - stairSegment.x1, z: stairSegment.z2 - stairSegment.z1 };
        const segmentLength = Math.sqrt(segmentVector.x ** 2 + segmentVector.z ** 2);
        const unitVector = { x: segmentVector.x / segmentLength, z: segmentVector.z / segmentLength };
        
        const defaultOffsetMeters = (segmentLength - stairWidth) / 2;
        const userOffsetMeters = config.stairOffset !== undefined ? config.stairOffset * scale : defaultOffsetMeters;
        const clampedOffset = Math.max(0, Math.min(userOffsetMeters, segmentLength - stairWidth));
        
        const stairCenterDist = clampedOffset + stairWidth / 2;

        stairBaseX = stairSegment.x1 + unitVector.x * stairCenterDist;
        stairBaseZ = stairSegment.z1 + unitVector.z * stairCenterDist;
        
        // Calculate outward normal and exact rotation
        const dx = stairSegment.x2 - stairSegment.x1;
        const dz = stairSegment.z2 - stairSegment.z1;
        const len = Math.sqrt(dx*dx + dz*dz);
        const nx = dz / len;
        const nz = -dx / len;
        stairRotation = Math.atan2(nx, nz);
      } else {
        // Fallback if segment not found
        stairBaseZ = deckLength/2;
      }

      for (let i = 0; i < numSteps; i++) {
        const stepGeometry = new BoxGeometry(stairWidth, 0.05, stepDepth);
        const step = new Mesh(stepGeometry, deckMaterial);
        
        // Advance outward from the edge along the normal vector
        const stepCenterDist = stepDepth * (i + 0.5);
        const stepX = stairBaseX + Math.sin(stairRotation) * stepCenterDist;
        const stepZ = stairBaseZ + Math.cos(stairRotation) * stepCenterDist;
        
        step.position.set(stepX, 0.15 - stepHeight * (i + 1), stepZ);
        step.rotation.y = stairRotation;
        step.castShadow = true;
        step.receiveShadow = true;
        scene.add(step);
      }

      // Walkway: position dynamically at bottom of stairs!
      const drivewayGeom = new BoxGeometry(stairWidth + 1.5, 0.04, deckLength * 0.3 + 2);
      const drivewayMat = new MeshStandardMaterial({ 
        color: 0xb5ad9e, 
        roughness: 0.95, 
        map: concreteTex 
      });
      const driveway = new Mesh(drivewayGeom, drivewayMat);
      
      const walkwayCenterDist = totalRun + (deckLength * 0.3 + 2) / 2;
      driveway.position.set(
        stairBaseX + Math.sin(stairRotation) * walkwayCenterDist, 
        -deckHeight - foundationAboveGrade + 0.02, 
        stairBaseZ + Math.cos(stairRotation) * walkwayCenterDist
      );
      driveway.rotation.y = stairRotation;
      driveway.receiveShadow = true;
      scene.add(driveway);

      // STAIR RAILING
      if (config.railingStyle !== 'None' && config.stairRailing !== false) {
         const railingHeight = (config.railingHeight || 42) / 12 * scale;
         const railingOffset = 0.05; // inset from edge
         const w = stairWidth/2 - railingOffset;
        const isAluminumRailing = config.railingStyle === 'Aluminum';
        const aluminumColor = config.aluminumRailingColor || 'White';
        const stairFrameColor = isAluminumRailing
          ? (aluminumColor === 'Black' ? 0x1f2937 : 0xf8fafc)
          : 0x8b6f47;
         
         const railingMaterial = new MeshStandardMaterial({ 
          color: stairFrameColor,
          roughness: isAluminumRailing ? 0.3 : 0.7,
          metalness: isAluminumRailing ? 0.35 : 0.05
         });
         const postMaterial = new MeshStandardMaterial({ 
          color: stairFrameColor,
          roughness: isAluminumRailing ? 0.4 : 0.75,
          metalness: isAluminumRailing ? 0.15 : 0.05
         });
         const postSize = 0.089;

         // New height params
         const bottomGap = (2 / 12) * scale;
         const railThickness = 0.05;

         // Define rail paths based on exact stair position
         const railPaths: {x1: number, z1: number, x2: number, z2: number}[] = [];
          
         // We use the normal vector we found earlier to shoot outward
         const normalX = Math.sin(stairRotation);
         const normalZ = Math.cos(stairRotation);
         
         // Left rail path
         const leftBaseX = stairBaseX - Math.cos(stairRotation) * w;
         const leftBaseZ = stairBaseZ + Math.sin(stairRotation) * w;
         railPaths.push({ 
            x1: leftBaseX, 
            z1: leftBaseZ, 
            x2: leftBaseX + normalX * totalRun, 
            z2: leftBaseZ + normalZ * totalRun 
         });

         // Right rail path
         const rightBaseX = stairBaseX + Math.cos(stairRotation) * w;
         const rightBaseZ = stairBaseZ - Math.sin(stairRotation) * w;
         railPaths.push({ 
            x1: rightBaseX, 
            z1: rightBaseZ, 
            x2: rightBaseX + normalX * totalRun, 
            z2: rightBaseZ + normalZ * totalRun 
         });
         
         railPaths.forEach(path => {
            const dx = path.x2 - path.x1;
            const dz = path.z2 - path.z1;
            const run = Math.sqrt(dx*dx + dz*dz);
            const rise = -deckHeight; // Going down
            const length = Math.sqrt(run*run + rise*rise);
            
            const midX = (path.x1 + path.x2) / 2;
            const midZ = (path.z1 + path.z2) / 2;

            // Updated Height Calculations
            const midYTop = 0.15 + rise/2 + railingHeight - railThickness/2;
            const midYBottom = 0.15 + rise/2 + bottomGap + railThickness/2;
            
            const yaw = Math.atan2(dz, dx);
            const pitch = -Math.atan2(Math.abs(rise), run);
            
            // Top Rail
            const railGeo = new BoxGeometry(length, 0.05, 0.05);
            const topRail = new Mesh(railGeo, railingMaterial);
            topRail.position.set(midX, midYTop, midZ);
            topRail.rotation.order = 'YXZ';
            topRail.rotation.y = -yaw;
            topRail.rotation.z = pitch; 
            topRail.castShadow = true;
            scene.add(topRail);
            
            // Bottom Rail
            const bottomRail = new Mesh(railGeo, railingMaterial);
            bottomRail.position.set(midX, midYBottom, midZ);
            bottomRail.rotation.order = 'YXZ';
            bottomRail.rotation.y = -yaw;
            bottomRail.rotation.z = pitch;
            bottomRail.castShadow = true;
            scene.add(bottomRail);
            
            // Posts (Top and Bottom)
            const postGeo = new BoxGeometry(postSize, railingHeight + 0.1, postSize);
            
            const topPostX = path.x1;
            const topPostZ = path.z1;
            const topPostY = 0.15 + railingHeight/2;
            const topPost = new Mesh(postGeo, postMaterial);
            topPost.position.set(topPostX, topPostY, topPostZ);
            topPost.castShadow = true;
            scene.add(topPost);

            const bottomPostX = path.x2;
            const bottomPostZ = path.z2;
            const bottomPostY = -deckHeight + 0.15 + railingHeight/2; 
            const bottomPost = new Mesh(postGeo, postMaterial);
            bottomPost.position.set(bottomPostX, bottomPostY, bottomPostZ);
            bottomPost.castShadow = true;
            scene.add(bottomPost);
            
            // Balusters
            const balusterLength = railingHeight - bottomGap - railThickness;
            const balGeo = new BoxGeometry(0.04, balusterLength, 0.04);
            const numBalusters = Math.floor(length / 0.15);
            
            const balusterMidOffset = (railingHeight - railThickness/2 + bottomGap + railThickness/2) / 2;

            for(let k=0; k<numBalusters; k++) {
                const t = k / numBalusters;
                const bx = path.x1 + dx * t;
                const bz = path.z1 + dz * t;
                const by = 0.15 + rise * t + balusterMidOffset;
                
                const bal = new Mesh(balGeo, railingMaterial);
                bal.position.set(bx, by, bz);
                scene.add(bal);
            }
         });
      }
    }

    // Pointer controls (Mouse & Touch)
    let isDragging = false;
    let previousPointerPosition = { x: 0, y: 0 };
    let cameraRotation = { azimuth: Math.PI / 4, elevation: Math.PI / 5 };
    let cameraDistance = 12;

    // For touch pinch-to-zoom
    let initialPinchDistance: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      // Ignore right clicks or other buttons if needed, but pointerId is what matters
      isDragging = true;
      previousPointerPosition = { x: e.clientX, y: e.clientY };
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault();
      if (!isDragging) return;

      const deltaX = e.clientX - previousPointerPosition.x;
      const deltaY = e.clientY - previousPointerPosition.y;

      cameraRotation.azimuth -= deltaX * 0.01;
      cameraRotation.elevation -= deltaY * 0.01;
      cameraRotation.elevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraRotation.elevation));

      previousPointerPosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      e.preventDefault();
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
        cameraDistance = Math.max(5, Math.min(30, cameraDistance));
        
        initialPinchDistance = dist;
      }
    };

    const onTouchEnd = () => {
      initialPinchDistance = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.01;
      cameraDistance = Math.max(5, Math.min(30, cameraDistance));
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
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update camera position based on mouse
      if (isDragging) {
        camera.position.x = cameraDistance * Math.sin(cameraRotation.azimuth) * Math.cos(cameraRotation.elevation);
        camera.position.y = cameraDistance * Math.sin(cameraRotation.elevation);
        camera.position.z = cameraDistance * Math.cos(cameraRotation.azimuth) * Math.cos(cameraRotation.elevation);
        camera.lookAt(0, 0, 0);
      }
      
      renderer.render(scene, camera);
    };

    animate();

    // Notify that initial render is complete
    setTimeout(() => {
      if (onRenderComplete) {
        onRenderComplete();
      }
    }, 500);

    sceneRef.current = { scene, camera, renderer };

    // Auto-update snapshot using requestAnimationFrame for smoother updates
    // This prevents "callback is no longer runnable" errors during print
    let frameCount = 0;
    let snapshotAnimationId: number;
    const animateSnapshot = () => {
      frameCount++;
      // Update snapshot every ~60 frames (roughly once per second at 60fps)
      if (frameCount >= 60) {
        updateSnapshot();
        frameCount = 0;
      }
      snapshotAnimationId = requestAnimationFrame(animateSnapshot);
    };
    snapshotAnimationId = requestAnimationFrame(animateSnapshot);

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
      cancelAnimationFrame(snapshotAnimationId);
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
  }, [
    config.width,
    config.length,
    config.height,
    config.shape,
    config.lShapeWidth,
    config.lShapeLength,
    config.lShapePosition,
    config.hasStairs,
    config.stairSide,
    config.stairWidth,
    config.stairRailing,
    config.railingSides,
    config.railingHeight,
    config.joistSpacing,
    config.deckingType
  ]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-200 rounded-lg overflow-hidden relative print:h-[600px] print:bg-background print:border-2 print:border-black print:rounded-none select-none touch-none">
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm print:hidden">
        <div className="font-semibold text-foreground mb-1">🎮 3D Controls:</div>
        <div className="space-y-0.5 text-foreground">
          <div>🖱️/👆 <strong>Rotate:</strong> Click + drag / 1-finger swipe</div>
          <div>🔍/✌️ <strong>Zoom:</strong> Scroll wheel / 2-finger pinch</div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg shadow-lg p-3 print:hidden">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Size</div>
            <div className="font-bold text-foreground">{config.width}' × {config.length}'</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Height</div>
            <div className="font-bold text-foreground">{config.height || 2}'</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Railings</div>
            <div className="font-bold text-foreground">{config.railingSides.length} sides</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Stairs</div>
            <div className="font-bold text-foreground">{config.hasStairs ? 'Yes' : 'No'}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">Post Size</div>
          <div className="text-xs font-medium text-foreground">
            {config.height && config.height > 2 ? '5.5" × 5.5"' : '3.5" × 3.5"'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Per BCBC 9.17.4.1
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full print:h-[600px]" />
    </div>
  );
});