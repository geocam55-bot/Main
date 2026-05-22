import React, { useState, useEffect, useRef } from 'react';
import { Ruler, Package, Brush, Trash2, UploadCloud, Undo, Maximize2, Square, Minus, DoorOpen, LayoutGrid, AlertCircle, MousePointer2, ZoomIn, ZoomOut, Save, FolderOpen, RotateCw, Check, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner@2.0.3';
import type { User } from '../../App';
import { PermissionGate } from '../PermissionGate';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { SavedProjectDesigns } from '../SavedProjectDesigns';
import { searchInventoryClient } from '../../utils/inventory-client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';
import { PlannerDefaults } from '../PlannerDefaults';
import { PlannerExportDialog } from './PlannerExportDialog';
import { Monitor, Smartphone } from 'lucide-react';

interface InteriorFinishingPlannerProps {
  user: User;
}

type Point = { x: number; y: number };
type Wall = { p1: Point; p2: Point };
type PlacedItem = { p: Point; id: string; doorType?: string; doorSize?: string; doorHanding?: string };

export function InteriorFinishingPlanner({ user }: InteriorFinishingPlannerProps) {
  // Restrict access to admin while in development
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <Brush className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Under Construction</h2>
        <p className="text-muted-foreground mt-2 text-center max-w-md">
          The Finishing Planner is currently being developed and is only visible to administrators.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'digitizer' | 'materials' | 'defaults'>('digitizer');
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // --- PDF Modal State ---
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pdfThumbnails, setPdfThumbnails] = useState<{ index: number, dataUrl: string }[]>([]);
  const [selectedPdfPages, setSelectedPdfPages] = useState<Set<number>>(new Set());

  // --- Digitizer State ---
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [pagesData, setPagesData] = useState<Record<number, any>>({});
  
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [mode, setMode] = useState<'idle' | 'calibrate' | 'perimeter' | 'wall' | 'door' | 'window'>('idle');

  const [scaleData, setScaleData] = useState<{ p1: Point | null; p2: Point | null; distance: number }>({ p1: null, p2: null, distance: 0 });
  const [perimeter, setPerimeter] = useState<Point[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [doors, setDoors] = useState<PlacedItem[]>([]);
  const [windows, setWindows] = useState<PlacedItem[]>([]);

  // Door placement settings
  const [currentDoorType, setCurrentDoorType] = useState('Prehung');
  const [currentDoorSize, setCurrentDoorSize] = useState('30"');
  const [currentDoorHanding, setCurrentDoorHanding] = useState('Left');

  // Interactive tracking
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [currentWallPoint, setCurrentWallPoint] = useState<Point | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);

  // Canvas Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Only zoom on ctrl+wheel or meta+wheel (standard map behavior),
    // OR if they just use wheel, let's make it zoom since that's often what people mean by "mouse wheel zoom"
    // To prevent scrolling while zooming, we handle preventDefault in the useEffect attached to the container.
    const zoomDelta = -e.deltaY * 0.002;
    setZoom(z => Math.max(0.1, Math.min(10, z + (z * zoomDelta))));
  };

  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || (e.button === 0 && mode === 'idle')) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !containerRef.current) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    containerRef.current.scrollLeft -= dx;
    containerRef.current.scrollTop -= dy;
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleContainerMouseUp = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleNativeWheel = (e: WheelEvent) => {
      // Prevent default scrolling so we use wheel for zoom without jumping around
      e.preventDefault();
    };
    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleNativeWheel);
  }, [containerRef.current]);

  type HistoryState = {
    scaleData: { p1: Point | null; p2: Point | null; distance: number };
    perimeter: Point[];
    walls: Wall[];
    doors: PlacedItem[];
    windows: PlacedItem[];
    currentWallPoint: Point | null;
  };
  const historyRef = useRef<HistoryState[]>([]);

  // Since handleUndoAction requires access to the latest state, we should use a generic state approach,
  // but let's actually just use refs for the latest state inside the event listener to avoid stale closures,
  // or simply rely on React state since handleUndoAction updates state. 
  // Actually, to push the *current* state to history, we need access to the current state variables.
  const stateRef = useRef({ scaleData, perimeter, walls, doors, windows, currentWallPoint });
  useEffect(() => {
    stateRef.current = { scaleData, perimeter, walls, doors, windows, currentWallPoint };
  }, [scaleData, perimeter, walls, doors, windows, currentWallPoint]);

  const saveHistory = () => {
    historyRef.current.push({
      scaleData: { ...stateRef.current.scaleData },
      perimeter: [...stateRef.current.perimeter],
      walls: [...stateRef.current.walls],
      doors: [...stateRef.current.doors],
      windows: [...stateRef.current.windows],
      currentWallPoint: stateRef.current.currentWallPoint
    });
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
  };

  const handleUndoAction = () => {
    if (historyRef.current.length === 0) {
      toast.info('Nothing to undo.');
      return;
    }
    const lastState = historyRef.current.pop()!;
    setScaleData(lastState.scaleData);
    setPerimeter(lastState.perimeter);
    setWalls(lastState.walls);
    setDoors(lastState.doors);
    setWindows(lastState.windows);
    setCurrentWallPoint(lastState.currentWallPoint);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleUndoAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Material preferences
  const [mouldingMaterialType, setMouldingMaterialType] = useState('mdf');
  const [baseboardId, setBaseboardId] = useState('modern-5');
  const [casingId, setCasingId] = useState('colonial-2');
  const [crownId, setCrownId] = useState('none');
  const [wainscottingId, setWainscottingId] = useState('none');
  
  // Additional door material preferences
  const [jambStockSize, setJambStockSize] = useState('5"');
  const [bipassTrackSize, setBipassTrackSize] = useState('48"');
  const [hingeSize, setHingeSize] = useState('3"');
  const [doorKnobType, setDoorKnobType] = useState('Passage');

  useEffect(() => {
    async function loadInventory() {
      if (!user.organizationId) return;
      setLoading(true);
      try {
        const result = await searchInventoryClient({ organizationId: user.organizationId });
        if (result && result.items) {
          setInventoryItems(result.items);
        }
      } catch (err) {
        // Failed to load inventory
      } finally {
        setLoading(false);
      }
    }
    loadInventory();
  }, [user.organizationId]);

  const handleSaveDraft = async () => {
    if (!bgImage) {
      toast.error('Nothing to save. Please upload a floorplan first.');
      return;
    }
    setLoading(true);
    try {
      const draft = {
        bgImage,
        pdfPages,
        activePageIndex,
        pagesData: {
          ...pagesData,
          [activePageIndex]: {
            imageDims,
            scaleData,
            perimeter,
            walls,
            doors,
            windows
          }
        },
        imageDims,
        scaleData,
        perimeter,
        walls,
        doors,
        windows,
        baseboardId,
        casingId,
        crownId,
        wainscottingId,
        jambStockSize,
        bipassTrackSize,
        hingeSize,
        doorKnobType,
        lastSaved: Date.now(),
      };

      const jsonStr = JSON.stringify(draft);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      const defaultFileName = `finishing-planner-${new Date().toISOString().split('T')[0]}.pjt`;
      
      let usedFallback = false;

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFileName,
            types: [{
              description: 'Project File',
              accept: { 'application/json': ['.pjt'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          toast.success('Project saved to your device!');
        } catch (err: any) {
          if (err.name === 'AbortError') {
            // User cancelled the prompt, do nothing
            return;
          } else {
            // Likely a SecurityError due to cross-origin iframe restrictions
            usedFallback = true;
          }
        }
      } else {
        usedFallback = true;
      }

      if (usedFallback) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Project saved to your device!');
      }

    } catch (err) {
      // Save failed
      toast.error('Failed to save project.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const draft = JSON.parse(text);

      if (draft && draft.bgImage) {
        setPdfPages(draft.pdfPages || [draft.bgImage]);
        setActivePageIndex(draft.activePageIndex || 0);
        setPagesData(draft.pagesData || {});
        
        setBgImage(draft.bgImage);
        setImageDims(draft.imageDims || null);
        setScaleData(draft.scaleData || { p1: null, p2: null, distance: 0 });
        setPerimeter(draft.perimeter || []);
        setWalls(draft.walls || []);
        setDoors(draft.doors || []);
        setWindows(draft.windows || []);
        setBaseboardId(draft.baseboardId || 'modern-5');
        setCasingId(draft.casingId || 'colonial-2');
        setCrownId(draft.crownId || 'none');
        setWainscottingId(draft.wainscottingId || 'none');
        
        setJambStockSize(draft.jambStockSize || '5"');
        setBipassTrackSize(draft.bipassTrackSize || '48"');
        setHingeSize(draft.hingeSize || '3"');
        setDoorKnobType(draft.doorKnobType || 'Passage');
        
        setMode('idle');
        
        // Ensure zoom is recalculated in case image onLoad doesn't fire for base64
        setTimeout(() => {
          if (containerRef.current && draft.imageDims) {
            const cw = containerRef.current.clientWidth - 40;
            const ch = containerRef.current.clientHeight - 40;
            const scale = Math.min(cw / draft.imageDims.w, ch / draft.imageDims.h);
            setZoom(scale > 0 ? scale : 1);
          }
        }, 100);

        toast.success('Draft loaded successfully!');
      } else {
        toast.info('No saved draft found.');
      }
    } catch (err) {
      // Load failed
      toast.error('Failed to load draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleRotateImage = () => {
    if (!bgImage || !imageDims) return;
    setLoading(true);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setLoading(false);
        return;
      }
      
      // Rotate 90 degrees clockwise
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      const newBgImage = canvas.toDataURL('image/png', 1.0);
      const newDims = { w: imageDims.h, h: imageDims.w };
      
      const rotatePoint = (p: Point | null): Point | null => {
        if (!p) return null;
        return { x: newDims.w - p.y, y: p.x };
      };

      setBgImage(newBgImage);
      setImageDims(newDims);
      
      setScaleData(prev => ({
        ...prev,
        p1: rotatePoint(prev.p1),
        p2: rotatePoint(prev.p2),
      }));
      setPerimeter(prev => prev.map(p => ({ x: newDims.w - p.y, y: p.x })));
      setWalls(prev => prev.map(w => ({ p1: { x: newDims.w - w.p1.y, y: w.p1.x }, p2: { x: newDims.w - w.p2.y, y: w.p2.x } })));
      setDoors(prev => prev.map(d => ({ ...d, p: { x: newDims.w - d.p.y, y: d.p.x } })));
      setWindows(prev => prev.map(w => ({ ...w, p: { x: newDims.w - w.p.y, y: w.p.x } })));
      
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth - 40;
        const ch = containerRef.current.clientHeight - 40;
        const scale = Math.min(cw / newDims.w, ch / newDims.h);
        setZoom(scale > 0 ? scale : 1);
      }
      
      setLoading(false);
    };
    img.onerror = () => {
      toast.error('Failed to rotate image.');
      setLoading(false);
    };
    img.src = bgImage;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      try {
        setLoading(true);
        toast.info('Converting PDF to image...', { duration: 3000 });
        
        // Load PDF.js via script tag to avoid bundler configuration issues
        const pdfjsLib: any = await new Promise((resolve, reject) => {
          if ((window as any).pdfjsLib) {
            resolve((window as any).pdfjsLib);
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve((window as any).pdfjsLib);
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (pdf.numPages === 1) {
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
            const extracted = canvas.toDataURL('image/jpeg', 0.8);
            
            setPdfPages([extracted]);
            setActivePageIndex(0);
            setPagesData({});
            
            setBgImage(extracted);
            setScaleData({ p1: null, p2: null, distance: 0 });
            setPerimeter([]);
            setWalls([]);
            setDoors([]);
            setWindows([]);
            setMode('calibrate');
            toast.success(`Loaded 1 page from PDF! Please set the scale first.`);
          }
        } else {
          toast.info('Generating previews...', { duration: 2000 });
          setPdfDocument(pdf);
          
          const thumbs = [];
          // To avoid freezing, we could just render thumbnails for the first 20 pages max for quick preview, 
          // or just loop sequentially. Given it's a browser, looping 20 pages at 0.2 scale is usually <1s.
          for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: context, viewport }).promise;
              thumbs.push({ index: i, dataUrl: canvas.toDataURL('image/jpeg', 0.5) });
            }
          }
          setPdfThumbnails(thumbs);
          setSelectedPdfPages(new Set([1]));
          setShowPdfModal(true);
        }
      } catch (error) {
        // PDF processing error
        toast.error("Failed to process the PDF. Please try a different file.");
      } finally {
        setLoading(false);
        e.target.value = ''; // Reset input
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPdfPages([result]);
      setActivePageIndex(0);
      setPagesData({});
      
      setBgImage(result);
      setScaleData({ p1: null, p2: null, distance: 0 });
      setPerimeter([]);
      setWalls([]);
      setDoors([]);
      setWindows([]);
      setMode('calibrate');
      toast.success('Floorplan loaded. Please set the scale first.');
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleExtractSelectedPages = async () => {
    if (!pdfDocument || selectedPdfPages.size === 0) return;
    try {
      setLoading(true);
      setShowPdfModal(false);
      toast.info('Extracting selected pages...', { duration: 3000 });
      
      const extractedPages: string[] = [];
      const sortedPages = Array.from(selectedPdfPages).sort((a, b) => a - b);
      
      for (const pageNum of sortedPages) {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        extractedPages.push(canvas.toDataURL('image/jpeg', 0.8));
      }
      
      if (extractedPages.length > 0) {
        setPdfPages(extractedPages);
        setActivePageIndex(0);
        setPagesData({});
        
        setBgImage(extractedPages[0]);
        setScaleData({ p1: null, p2: null, distance: 0 });
        setPerimeter([]);
        setWalls([]);
        setDoors([]);
        setWindows([]);
        setMode('calibrate');
        toast.success(`Loaded ${extractedPages.length} page(s) from PDF! Please set the scale first.`);
      }
    } catch (error) {
      // Extraction error
      toast.error("Failed to extract the selected pages.");
    } finally {
      setLoading(false);
      setPdfDocument(null);
      setPdfThumbnails([]);
    }
  };

  const handlePageSwitch = (index: number) => {
    if (index === activePageIndex) return;
    
    // Save current active page state
    setPagesData(prev => ({
      ...prev,
      [activePageIndex]: {
        imageDims,
        scaleData,
        perimeter,
        walls,
        doors,
        windows
      }
    }));

    // Load target page state
    const next = pagesData[index] || {
      imageDims: null,
      scaleData: { p1: null, p2: null, distance: 0 },
      perimeter: [],
      walls: [],
      doors: [],
      windows: []
    };

    setImageDims(next.imageDims);
    setScaleData(next.scaleData);
    setPerimeter(next.perimeter);
    setWalls(next.walls);
    setDoors(next.doors);
    setWindows(next.windows);
    
    setActivePageIndex(index);
    setBgImage(pdfPages[index]);
    setMode('idle');
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement> | Event) => {
    const target = e.target as HTMLImageElement;
    const w = target.naturalWidth;
    const h = target.naturalHeight;
    setImageDims({ w, h });
    
    if (containerRef.current) {
      // Auto-fit image to container with slight padding
      const cw = containerRef.current.clientWidth - 40;
      const ch = containerRef.current.clientHeight - 40;
      const scale = Math.min(cw / w, ch / h);
      setZoom(scale > 0 ? scale : 1);
    }
  };

  useEffect(() => {
    if (bgImage && imgRef.current && imgRef.current.complete) {
      // Trigger image load manually if it completed instantly
      if (imgRef.current.naturalWidth > 0 && !imageDims) {
        handleImageLoad({ target: imgRef.current } as any);
      }
    }
  }, [bgImage, imageDims]);

  // Canvas Interactions
  const getNaturalCoords = (e: React.MouseEvent | React.PointerEvent) => {
    if (!imageDims || !svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = imageDims.w / rect.width;
    const scaleY = imageDims.h / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getNaturalCoords(e);
    if (coords) setMousePos(coords);
  };

  const handleClick = (e: React.MouseEvent) => {
    const pt = getNaturalCoords(e);
    if (!pt) return;

    if (mode !== 'idle') {
      saveHistory();
    }

    if (mode === 'calibrate') {
      if (!scaleData.p1) {
        setScaleData({ ...scaleData, p1: pt });
      } else if (!scaleData.p2) {
        setScaleData({ ...scaleData, p2: pt });
        const distStr = prompt('Enter the distance between these two points in FEET (e.g. 10.5):');
        const dist = parseFloat(distStr || '');
        if (!isNaN(dist) && dist > 0) {
          setScaleData(prev => ({ ...prev, distance: dist }));
          setMode('perimeter');
          toast.success(`Scale calibrated! Now trace the exterior perimeter.`);
        } else {
          toast.error('Invalid distance. Calibration reset.');
          setScaleData({ p1: null, p2: null, distance: 0 });
        }
      }
    } else if (mode === 'perimeter') {
      setPerimeter([...perimeter, pt]);
    } else if (mode === 'wall') {
      if (!currentWallPoint) {
        setCurrentWallPoint(pt);
      } else {
        setWalls([...walls, { p1: currentWallPoint, p2: pt }]);
        setCurrentWallPoint(null);
      }
    } else if (mode === 'door') {
      setDoors([...doors, { p: pt, id: Date.now().toString(), doorType: currentDoorType, doorSize: currentDoorSize, doorHanding: currentDoorHanding }]);
    } else if (mode === 'window') {
      setWindows([...windows, { p: pt, id: Date.now().toString() }]);
    }
  };

  // Math Helpers
  const getDistance = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

  const pixelsPerFoot = scaleData.distance > 0 && scaleData.p1 && scaleData.p2 
    ? getDistance(scaleData.p1, scaleData.p2) / scaleData.distance 
    : 0;

  const calculateArea = () => {
    if (perimeter.length < 3 || pixelsPerFoot === 0) return 0;
    let area = 0;
    for (let i = 0; i < perimeter.length; i++) {
      const j = (i + 1) % perimeter.length;
      area += perimeter[i].x * perimeter[j].y - perimeter[j].x * perimeter[i].y;
    }
    const sqPixels = Math.abs(area / 2);
    return sqPixels / (pixelsPerFoot * pixelsPerFoot);
  };

  const calculatePerimeterLF = () => {
    if (perimeter.length < 2 || pixelsPerFoot === 0) return 0;
    let len = 0;
    for (let i = 0; i < perimeter.length; i++) {
      const j = (i + 1) % perimeter.length;
      len += getDistance(perimeter[i], perimeter[j]);
    }
    return len / pixelsPerFoot;
  };

  const calculateWallsLF = () => {
    if (pixelsPerFoot === 0) return 0;
    const len = walls.reduce((sum, w) => sum + getDistance(w.p1, w.p2), 0);
    return len / pixelsPerFoot;
  };

  const getAggregatedTakeoffData = () => {
    const allPagesData = { ...pagesData };
    allPagesData[activePageIndex] = { imageDims, scaleData, perimeter, walls, doors, windows };

    let totalSqFt = 0;
    let totalExteriorLF = 0;
    let totalInteriorLF = 0;
    let allDoors: PlacedItem[] = [];
    let allWindows: PlacedItem[] = [];

    Object.values(allPagesData).forEach((page: any) => {
      if (!page) return;
      const pScale = page.scaleData || { p1: null, p2: null, distance: 0 };
      const pPerimeter = page.perimeter || [];
      const pWalls = page.walls || [];
      
      const ppf = pScale.distance > 0 && pScale.p1 && pScale.p2
        ? getDistance(pScale.p1, pScale.p2) / pScale.distance
        : 0;

      if (ppf > 0 && pPerimeter.length >= 3) {
        let area = 0;
        for (let i = 0; i < pPerimeter.length; i++) {
          const j = (i + 1) % pPerimeter.length;
          area += pPerimeter[i].x * pPerimeter[j].y - pPerimeter[j].x * pPerimeter[i].y;
        }
        totalSqFt += Math.abs(area / 2) / (ppf * ppf);
      }

      if (ppf > 0 && pPerimeter.length >= 2) {
        let len = 0;
        for (let i = 0; i < pPerimeter.length; i++) {
          const j = (i + 1) % pPerimeter.length;
          len += getDistance(pPerimeter[i], pPerimeter[j]);
        }
        totalExteriorLF += len / ppf;
      }

      if (ppf > 0) {
        const len = pWalls.reduce((sum: number, w: Wall) => sum + getDistance(w.p1, w.p2), 0);
        totalInteriorLF += len / ppf;
      }

      if (page.doors) allDoors = [...allDoors, ...page.doors];
      if (page.windows) allWindows = [...allWindows, ...page.windows];
    });

    return { totalSqFt, totalExteriorLF, totalInteriorLF, allDoors, allWindows };
  };

  const aggData = getAggregatedTakeoffData();
  const sqFt = aggData.totalSqFt;
  const exteriorLF = aggData.totalExteriorLF;
  const interiorLF = aggData.totalInteriorLF;
  const allDoors = aggData.allDoors;
  const allWindows = aggData.allWindows;
  
  // Assume a door removes ~3 feet of baseboard and a window doesn't affect baseboard.
  // Interior walls have baseboard on both sides (x2), exterior perimeter has 1 side.
  const rawBaseboardLF = (exteriorLF + (interiorLF * 2)) - (allDoors.length * 3);
  const totalBaseboardLF = Math.max(0, rawBaseboardLF);
  const doorCasingLF = allDoors.length * 17; // rough estimate per door
  const windowCasingLF = allWindows.length * 12; // rough estimate per window
  const totalCasingLF = doorCasingLF + windowCasingLF;
  const totalCrownLF = exteriorLF + (interiorLF * 2);

  // Generate Materials Array
  const getMaterialDetails = (id: string, fallbackDesc: string, fallbackPrice: number) => {
    if (!id || id === 'none') return null;
    const item = inventoryItems.find(i => i.id === id || i.sku === id);
    if (item) {
      const resolvedPrice = Number(item.unitPrice ?? item.unit_price ?? fallbackPrice);
      return {
        id: item.id,
        sku: item.sku,
        description: item.name || fallbackDesc,
        price: Number.isFinite(resolvedPrice) ? resolvedPrice : fallbackPrice,
      };
    }
    return { description: fallbackDesc, price: fallbackPrice };
  };

  const materials: any[] = [];
  
  const baseboardDetails = getMaterialDetails(baseboardId, "Standard Baseboard", 2.50);
  if (baseboardDetails && totalBaseboardLF > 0) {
    materials.push({ itemId: baseboardDetails.id, sku: baseboardDetails.sku, description: baseboardDetails.description, quantity: Math.ceil(totalBaseboardLF * 1.1), unit: 'LF', price: baseboardDetails.price });
  }

  const casingDetails = getMaterialDetails(casingId, "Standard Casing", 1.75);
  if (casingDetails) {
    if (doorCasingLF > 0) {
      materials.push({ itemId: casingDetails.id, sku: casingDetails.sku, description: `${casingDetails.description} (Doors)`, quantity: Math.ceil(doorCasingLF * 1.1), unit: 'LF', price: casingDetails.price });
    }
    if (windowCasingLF > 0) {
      materials.push({ itemId: casingDetails.id, sku: casingDetails.sku, description: `${casingDetails.description} (Windows)`, quantity: Math.ceil(windowCasingLF * 1.1), unit: 'LF', price: casingDetails.price });
    }
  }

  const crownDetails = getMaterialDetails(crownId, "Crown Molding", 3.00);
  if (crownDetails && totalCrownLF > 0 && crownId !== 'none') {
    materials.push({ itemId: crownDetails.id, sku: crownDetails.sku, description: crownDetails.description, quantity: Math.ceil(totalCrownLF * 1.1), unit: 'LF', price: crownDetails.price });
  }

  const wainscottingDetails = getMaterialDetails(wainscottingId, "Wainscotting Panels", 12.00);
  if (wainscottingDetails && totalBaseboardLF > 0 && wainscottingId !== 'none') {
    materials.push({ itemId: wainscottingDetails.id, sku: wainscottingDetails.sku, description: wainscottingDetails.description, quantity: Math.ceil(totalBaseboardLF * 1.1), unit: 'LF', price: wainscottingDetails.price });
  }

  if (allDoors.length > 0) {
    const doorGroups = allDoors.reduce((acc, door) => {
      const type = door.doorType || 'Prehung';
      const size = door.doorSize || '30"';
      let handingStr = '';
      if (type === 'Prehung') {
        const hand = door.doorHanding || 'Left';
        handingStr = ` - ${hand} Hand`;
      }
      
      const desc = `${type} Interior Door (${size})${handingStr}`;
      acc[desc] = (acc[desc] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(doorGroups).forEach(([desc, qty]) => {
      // Basic estimated prices based on type
      let price = 150.00;
      if (desc.includes('BiFolding')) price = 120.00;
      if (desc.includes('Slab')) price = 80.00;
      
      materials.push({ description: desc, quantity: qty, unit: 'EA', price });
    });

    // Hardware based on door count
    let standardDoorCount = allDoors.filter(d => d.doorType !== 'BiFolding' && d.doorType !== 'BiPassing').length;
    let bifoldPassCount = allDoors.filter(d => d.doorType === 'BiFolding' || d.doorType === 'BiPassing').length;
    
    // Fallback if types aren't matching perfectly
    if (standardDoorCount === 0 && bifoldPassCount === 0 && allDoors.length > 0) {
      standardDoorCount = allDoors.length;
    }

    if (standardDoorCount > 0) {
      materials.push({ description: `Jamb Stock (${jambStockSize})`, quantity: standardDoorCount, unit: 'EA', price: 25.00 });
      materials.push({ description: `Door Hinges (${hingeSize})`, quantity: standardDoorCount * 3, unit: 'EA', price: 4.50 });
      materials.push({ description: `Door Knob Set (${doorKnobType})`, quantity: standardDoorCount, unit: 'EA', price: 35.00 });
    }

    if (bifoldPassCount > 0) {
      materials.push({ description: `BiPassing/BiFold Track (${bipassTrackSize})`, quantity: bifoldPassCount, unit: 'EA', price: 45.00 });
    }
  }

  const totalCost = materials.reduce(
    (sum, item) => sum + (Number(item.quantity) * Number(item.price ?? 0)),
    0,
  );

  // Filter inventory items for dropdowns
  const baseboardItems = inventoryItems.filter(i => i.name?.toLowerCase().includes('base') || i.category?.toLowerCase() === 'trim');
  const casingItems = inventoryItems.filter(i => i.name?.toLowerCase().includes('casing') || i.category?.toLowerCase() === 'trim');
  const crownItems = inventoryItems.filter(i => i.name?.toLowerCase().includes('crown') || i.category?.toLowerCase() === 'trim');
  const wainscottingItems = inventoryItems.filter(i => i.name?.toLowerCase().includes('wainscot') || i.category?.toLowerCase() === 'panel');

  const currentConfig = {
    bgImage,
    pdfPages,
    activePageIndex,
    pagesData,
    imageDims,
    scaleData,
    perimeter,
    walls,
    doors,
    windows,
    sqFt,
    exteriorLF,
    interiorLF,
    allDoors,
    allWindows,
    baseboardId,
    casingId,
    crownId,
    wainscottingId,
    jambStockSize,
    bipassTrackSize,
    hingeSize,
    doorKnobType,
  };

  const handleLoadSavedDesign = (savedConfig: any) => {
    if (!savedConfig) return;

    setPdfPages(savedConfig.pdfPages || (savedConfig.bgImage ? [savedConfig.bgImage] : []));
    setActivePageIndex(savedConfig.activePageIndex || 0);
    setPagesData(savedConfig.pagesData || {});

    setBgImage(savedConfig.bgImage || null);
    setImageDims(savedConfig.imageDims || null);
    setScaleData(savedConfig.scaleData || { p1: null, p2: null, distance: 0 });
    setPerimeter(savedConfig.perimeter || []);
    setWalls(savedConfig.walls || []);
    setDoors(savedConfig.doors || []);
    setWindows(savedConfig.windows || []);

    if (savedConfig.baseboardId !== undefined) setBaseboardId(savedConfig.baseboardId);
    if (savedConfig.casingId !== undefined) setCasingId(savedConfig.casingId);
    if (savedConfig.crownId !== undefined) setCrownId(savedConfig.crownId);
    if (savedConfig.wainscottingId !== undefined) setWainscottingId(savedConfig.wainscottingId);
    if (savedConfig.jambStockSize !== undefined) setJambStockSize(savedConfig.jambStockSize);
    if (savedConfig.bipassTrackSize !== undefined) setBipassTrackSize(savedConfig.bipassTrackSize);
    if (savedConfig.hingeSize !== undefined) setHingeSize(savedConfig.hingeSize);
    if (savedConfig.doorKnobType !== undefined) setDoorKnobType(savedConfig.doorKnobType);

    setMode('idle');
    toast.success('Saved design loaded successfully!');
  };

  return (
    <PermissionGate user={user} module="project-wizards" action="view">
      {/* Mobile restriction message */}
      <div className="lg:hidden flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
        <div className="relative">
          <div className="bg-muted p-4 rounded-full">
            <Monitor className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-background p-1 rounded-full shadow-sm">
            <Smartphone className="w-6 h-6 text-red-500" />
          </div>
        </div>
        <div className="max-w-md space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">Desktop Only</h2>
          <p className="text-muted-foreground leading-relaxed">
            Due to the size restrictions of mobile displays, the Finishing Planner requires a larger screen space for precision design. 
            For the best experience, please access this feature on your desktop or laptop computer.
          </p>
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden lg:block bg-muted min-h-screen pb-12">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <LayoutGrid className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Floorplan Digitizer & Takeoff</h3>
                <p className="text-sm text-blue-700">Upload a floorplan, trace walls, and instantly generate material takeoffs.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background border-b border-border print:hidden sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('digitizer')}
                className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'digitizer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Ruler className="w-4 h-4" /> Trace Floorplan
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'materials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="w-4 h-4" /> Takeoff & Materials
              </button>
              <button
                onClick={() => setActiveTab('defaults')}
                className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'defaults' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="w-4 h-4" /> Defaults
              </button>
            </nav>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'digitizer' && (
            <div className="flex flex-col gap-4">
              {/* Top Toolbar */}
              <div className="bg-background p-3 rounded-lg shadow-sm border border-border flex flex-wrap items-center gap-3">
                {/* Upload & Draft */}
                <div className="flex items-center gap-1 pr-3 border-r border-border">
                  <label className={`cursor-pointer flex flex-col items-center justify-center p-2 rounded-md hover:bg-purple-50 transition-colors ${loading ? 'opacity-50' : ''}`}>
                    <UploadCloud className="w-5 h-5 mb-1 text-purple-500" />
                    <span className="text-[10px] font-medium text-muted-foreground">Upload</span>
                    <input type="file" accept="application/pdf, image/jpeg, image/png" className="hidden" disabled={loading} onChange={handleFileUpload} />
                  </label>
                  <button onClick={handleSaveDraft} disabled={loading || !bgImage} className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-green-50 transition-colors disabled:opacity-50">
                    <Save className="w-5 h-5 mb-1 text-green-500" />
                    <span className="text-[10px] font-medium text-muted-foreground">Save</span>
                  </button>
                  <label className={`cursor-pointer flex flex-col items-center justify-center p-2 rounded-md hover:bg-orange-50 transition-colors ${loading ? 'opacity-50' : ''}`}>
                    <FolderOpen className="w-5 h-5 mb-1 text-orange-500" />
                    <span className="text-[10px] font-medium text-muted-foreground">Load</span>
                    <input type="file" accept=".pjt" className="hidden" disabled={loading} onChange={handleLoadProjectFile} />
                  </label>
                </div>

                {/* History Tools */}
                <div className="flex items-center gap-1 pr-3 border-r border-border">
                  <button onClick={handleUndoAction} className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-muted transition-colors">
                    <Undo className="w-5 h-5 mb-1 text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground">Undo</span>
                  </button>
                  <button onClick={() => {
                    if (confirm("Clear all tracing data?")) {
                      saveHistory();
                      setPerimeter([]); setWalls([]); setDoors([]); setWindows([]);
                    }
                  }} className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-red-50 transition-colors">
                    <Trash2 className="w-5 h-5 mb-1 text-red-500" />
                    <span className="text-[10px] font-medium text-muted-foreground">Clear</span>
                  </button>
                </div>

                {/* Digitizing Tools */}
                <div className="flex items-center gap-1 flex-1">
                  <button onClick={() => setMode('calibrate')} className={`flex flex-col items-center justify-center py-2 px-3 rounded-md transition-colors ${mode === 'calibrate' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-indigo-50 text-muted-foreground'}`}>
                    <Maximize2 className={`w-5 h-5 mb-1 ${mode === 'calibrate' ? 'text-white' : 'text-indigo-500'}`} />
                    <span className="text-[10px] font-medium">Set Scale</span>
                  </button>
                  <button onClick={() => setMode('perimeter')} className={`flex flex-col items-center justify-center py-2 px-3 rounded-md transition-colors ${mode === 'perimeter' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-50 text-muted-foreground'}`}>
                    <Square className={`w-5 h-5 mb-1 ${mode === 'perimeter' ? 'text-white' : 'text-blue-500'}`} />
                    <span className="text-[10px] font-medium">Perimeter</span>
                  </button>
                  <button onClick={() => { setMode('wall'); setCurrentWallPoint(null); }} className={`flex flex-col items-center justify-center py-2 px-3 rounded-md transition-colors ${mode === 'wall' ? 'bg-cyan-600 text-white shadow-md' : 'hover:bg-cyan-50 text-muted-foreground'}`}>
                    <Minus className={`w-5 h-5 mb-1 ${mode === 'wall' ? 'text-white' : 'text-cyan-500'}`} />
                    <span className="text-[10px] font-medium">Int. Walls</span>
                  </button>
                  <button onClick={() => setMode('door')} className={`flex flex-col items-center justify-center py-2 px-3 rounded-md transition-colors ${mode === 'door' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-emerald-50 text-muted-foreground'}`}>
                    <DoorOpen className={`w-5 h-5 mb-1 ${mode === 'door' ? 'text-white' : 'text-emerald-500'}`} />
                    <span className="text-[10px] font-medium">Doors</span>
                  </button>
                  <button onClick={() => setMode('window')} className={`flex flex-col items-center justify-center py-2 px-3 rounded-md transition-colors ${mode === 'window' ? 'bg-teal-600 text-white shadow-md' : 'hover:bg-teal-50 text-muted-foreground'}`}>
                    <LayoutGrid className={`w-5 h-5 mb-1 ${mode === 'window' ? 'text-white' : 'text-teal-500'}`} />
                    <span className="text-[10px] font-medium">Windows</span>
                  </button>
                  <button onClick={() => setMode('idle')} className={`flex flex-col items-center justify-center py-2 px-3 rounded-md transition-colors ${mode === 'idle' ? 'bg-slate-700 text-white shadow-md' : 'hover:bg-muted text-muted-foreground'}`}>
                    <MousePointer2 className={`w-5 h-5 mb-1 ${mode === 'idle' ? 'text-white' : 'text-muted-foreground'}`} />
                    <span className="text-[10px] font-medium">Select/Pan</span>
                  </button>

                  {/* Door Settings Inline */}
                  {mode === 'door' && (
                    <div className="flex items-center gap-3 pl-4 border-l border-border ml-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-[9px] uppercase text-muted-foreground font-bold">Type</Label>
                        <Select value={currentDoorType} onValueChange={setCurrentDoorType}>
                          <SelectTrigger className="h-7 text-xs bg-muted w-[100px] border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Prehung">Prehung</SelectItem>
                            <SelectItem value="BiFolding">BiFolding</SelectItem>
                            <SelectItem value="BiPassing">BiPassing</SelectItem>
                            <SelectItem value="Slab">Slab</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[9px] uppercase text-muted-foreground font-bold">Size</Label>
                        <Select value={currentDoorSize} onValueChange={setCurrentDoorSize}>
                          <SelectTrigger className="h-7 text-xs bg-muted w-[80px] border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['18"','24"','28"','30"','32"','34"','38"'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {currentDoorType === 'Prehung' && (
                        <div className="flex flex-col gap-1">
                          <Label className="text-[9px] uppercase text-muted-foreground font-bold">Handing</Label>
                          <Select value={currentDoorHanding} onValueChange={setCurrentDoorHanding}>
                            <SelectTrigger className="h-7 text-xs bg-muted w-[80px] border-border"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Left">Left</SelectItem>
                              <SelectItem value="Right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Material Selection */}
                <div className="flex items-center gap-3 pl-4 border-l border-border ml-auto min-w-max">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[9px] uppercase text-muted-foreground font-bold">Moulding Type</Label>
                    <Select value={mouldingMaterialType} onValueChange={setMouldingMaterialType}>
                      <SelectTrigger className="h-7 text-xs bg-muted w-[110px] border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mdf">MDF</SelectItem>
                        <SelectItem value="finger_joint">Finger Joint</SelectItem>
                        <SelectItem value="pine">Pine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Takeoff Quick Stats */}
                <div className="flex items-center gap-4 text-xs pl-4 border-l border-border min-w-max">
                  <div className="flex flex-col items-end">
                    <span className="text-muted-foreground text-[9px] uppercase font-semibold">Area</span>
                    <span className="font-bold text-foreground">{sqFt > 0 ? sqFt.toFixed(1) : '--'} sqft</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-muted-foreground text-[9px] uppercase font-semibold">Baseboard</span>
                    <span className="font-bold text-foreground">{totalBaseboardLF > 0 ? totalBaseboardLF.toFixed(1) : '--'} lf</span>
                  </div>
                  {pixelsPerFoot === 0 && perimeter.length > 0 && (
                    <div className="text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1.5 ml-2 shadow-sm">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium text-[10px]">Set Scale</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Full Width Canvas Area */}
              <div className="flex flex-col h-full">
                {pdfPages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-thin scrollbar-thumb-slate-300">
                    {pdfPages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handlePageSwitch(index)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg border-t border-x transition-colors whitespace-nowrap ${
                          activePageIndex === index
                            ? 'bg-background text-blue-600 border-border border-b-white'
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted'
                        }`}
                        style={{ marginBottom: activePageIndex === index ? '-2px' : '0' }}
                      >
                        Page {index + 1}
                      </button>
                    ))}
                  </div>
                )}
                <div className={`relative border-2 border-border shadow-inner bg-muted ${pdfPages.length > 1 ? 'rounded-b-lg rounded-tr-lg' : 'rounded-lg'}`}>
                  {bgImage && imageDims && (
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur rounded-lg shadow-md border border-border flex items-center p-1 z-10">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-medium w-12 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => setZoom(z => z + 0.1)}>
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-4 bg-muted mx-1" />
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => {
                        if (imageDims && containerRef.current) {
                          const cw = containerRef.current.clientWidth - 40;
                          const ch = containerRef.current.clientHeight - 40;
                          const scale = Math.min(cw / imageDims.w, ch / imageDims.h);
                          setZoom(scale > 0 ? scale : 1);
                          // Reset scroll so the fitted image is visible in the center
                          containerRef.current.scrollLeft = 0;
                          containerRef.current.scrollTop = 0;
                        }
                      }}>
                        Fit
                      </Button>
                      <div className="w-px h-4 bg-muted mx-1" />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={handleRotateImage} title="Rotate 90°">
                        <RotateCw className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <div 
                    ref={containerRef}
                    className={`overflow-auto h-[700px] w-full ${isPanning ? 'cursor-grabbing' : mode === 'idle' && bgImage ? 'cursor-grab' : ''}`}
                    onWheel={handleWheel}
                    onMouseDown={handleContainerMouseDown}
                    onMouseMove={handleContainerMouseMove}
                    onMouseUp={handleContainerMouseUp}
                    onMouseLeave={handleContainerMouseUp}
                  >
                    {!bgImage ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                        <UploadCloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium text-muted-foreground">No Floorplan Uploaded</p>
                        <p className="text-sm">Upload a floorplan file using the toolbar above to begin tracing.</p>
                      </div>
                    ) : (
                      <div className="min-w-full min-h-full w-max h-max flex items-center justify-center p-4">
                        <div 
                          className={`relative shrink-0 inline-block bg-background shadow-sm transition-transform duration-75 ${mode !== 'idle' ? 'cursor-crosshair' : 'cursor-default'}`}
                          style={{ 
                            width: imageDims ? imageDims.w * zoom : 'auto', 
                            height: imageDims ? imageDims.h * zoom : 'auto' 
                          }}
                        >
                          <img 
                            ref={imgRef}
                            src={bgImage} 
                            alt="Floorplan" 
                            onLoad={handleImageLoad}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ objectFit: 'fill' }}
                            draggable={false}
                          />
                          
                          {imageDims && (
                            <svg
                              ref={svgRef}
                          viewBox={`0 0 ${imageDims.w} ${imageDims.h}`}
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-auto"
                          onMouseMove={handleMouseMove}
                          onClick={handleClick}
                        >
                          {/* Scale Calibration Line */}
                          {scaleData.p1 && (
                            <line 
                              x1={scaleData.p1.x} y1={scaleData.p1.y} 
                              x2={scaleData.p2 ? scaleData.p2.x : mousePos.x} y2={scaleData.p2 ? scaleData.p2.y : mousePos.y}
                              stroke="#4f46e5" strokeWidth={Math.max(2, imageDims.w / 500)} strokeDasharray="5,5"
                            />
                          )}
                          {scaleData.p1 && <circle cx={scaleData.p1.x} cy={scaleData.p1.y} r={Math.max(4, imageDims.w / 300)} fill="#4f46e5" />}
                          {scaleData.p2 && <circle cx={scaleData.p2.x} cy={scaleData.p2.y} r={Math.max(4, imageDims.w / 300)} fill="#4f46e5" />}

                          {/* Perimeter Polygon */}
                          {perimeter.length > 0 && (
                            <>
                              <polygon 
                                points={perimeter.map(p => `${p.x},${p.y}`).join(' ')} 
                                fill="rgba(59, 130, 246, 0.15)" 
                                stroke="#2563eb" 
                                strokeWidth={Math.max(2, imageDims.w / 400)} 
                              />
                              {/* Line to mouse if actively tracing perimeter */}
                              {mode === 'perimeter' && (
                                <line 
                                  x1={perimeter[perimeter.length - 1].x} y1={perimeter[perimeter.length - 1].y}
                                  x2={mousePos.x} y2={mousePos.y}
                                  stroke="#3b82f6" strokeWidth={Math.max(2, imageDims.w / 400)} strokeDasharray="5,5"
                                />
                              )}
                              {perimeter.map((p, i) => (
                                <circle key={`perim-${i}`} cx={p.x} cy={p.y} r={Math.max(3, imageDims.w / 400)} fill="#1d4ed8" />
                              ))}
                            </>
                          )}

                          {/* Interior Walls */}
                          {walls.map((w, i) => (
                            <line 
                              key={`wall-${i}`}
                              x1={w.p1.x} y1={w.p1.y} x2={w.p2.x} y2={w.p2.y}
                              stroke="#475569" strokeWidth={Math.max(3, imageDims.w / 200)} strokeLinecap="round"
                            />
                          ))}
                          
                          {/* Active Wall Line */}
                          {mode === 'wall' && currentWallPoint && (
                            <line 
                              x1={currentWallPoint.x} y1={currentWallPoint.y}
                              x2={mousePos.x} y2={mousePos.y}
                              stroke="#64748b" strokeWidth={Math.max(3, imageDims.w / 200)} strokeDasharray="5,5" strokeLinecap="round"
                            />
                          )}

                          {/* Doors */}
                          {doors.map((d) => {
                            const dType = d.doorType || 'Prehung';
                            const dSize = d.doorSize || '30"';
                            const dHand = d.doorHanding || 'Left';
                            const dTitle = `${dType} (${dSize})${dType === 'Prehung' ? ` - ${dHand}` : ''}`;
                            return (
                              <g key={d.id} transform={`translate(${d.p.x}, ${d.p.y})`} className="cursor-pointer">
                                <title>{dTitle}</title>
                                <circle cx={0} cy={0} r={Math.max(6, imageDims.w / 150)} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                                <text x={0} y={Math.max(16, imageDims.w / 80)} fontSize={Math.max(12, imageDims.w / 100)} textAnchor="middle" fill="#b45309" fontWeight="bold">D</text>
                              </g>
                            );
                          })}

                          {/* Windows */}
                          {windows.map((w) => (
                            <g key={w.id} transform={`translate(${w.p.x}, ${w.p.y})`}>
                              <rect 
                                x={-Math.max(6, imageDims.w / 150)} y={-Math.max(6, imageDims.w / 150)} 
                                width={Math.max(12, imageDims.w / 75)} height={Math.max(12, imageDims.w / 75)} 
                                fill="#06b6d4" stroke="#fff" strokeWidth={2} 
                              />
                              <text x={0} y={Math.max(18, imageDims.w / 80)} fontSize={Math.max(12, imageDims.w / 100)} textAnchor="middle" fill="#0891b2" fontWeight="bold">W</text>
                            </g>
                          ))}
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

          {activeTab === 'materials' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Material Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Moulding Type</Label>
                      <Select value={mouldingMaterialType} onValueChange={setMouldingMaterialType}>
                        <SelectTrigger><SelectValue placeholder="Select Material..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mdf">MDF</SelectItem>
                          <SelectItem value="finger_joint">Finger Joint</SelectItem>
                          <SelectItem value="pine">Pine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Baseboard Profile</Label>
                      <Select value={baseboardId} onValueChange={setBaseboardId}>
                        <SelectTrigger><SelectValue placeholder="Select Baseboard..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern-5">5" Modern Flat (Default)</SelectItem>
                          <SelectItem value="colonial-3">3" Colonial (Default)</SelectItem>
                          {baseboardItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Door & Window Casing</Label>
                      <Select value={casingId} onValueChange={setCasingId}>
                        <SelectTrigger><SelectValue placeholder="Select Casing..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="colonial-2">2-1/4" Colonial (Default)</SelectItem>
                          <SelectItem value="modern-2">2-1/2" Modern (Default)</SelectItem>
                          {casingItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Crown Molding</Label>
                      <Select value={crownId} onValueChange={setCrownId}>
                        <SelectTrigger><SelectValue placeholder="Select Crown..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="standard-crown">Standard Crown Molding</SelectItem>
                          {crownItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Wainscotting</Label>
                      <Select value={wainscottingId} onValueChange={setWainscottingId}>
                        <SelectTrigger><SelectValue placeholder="Select Wainscotting..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="shaker-panel">Shaker Panel</SelectItem>
                          {wainscottingItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h4 className="text-sm font-semibold mb-4 text-foreground">Door Hardware & Framing</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Jamb Stock</Label>
                          <Select value={jambStockSize} onValueChange={setJambStockSize}>
                            <SelectTrigger><SelectValue placeholder="Select size..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value='5"'>5"</SelectItem>
                              <SelectItem value='6"'>6"</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>BiPassing Track Size</Label>
                          <Select value={bipassTrackSize} onValueChange={setBipassTrackSize}>
                            <SelectTrigger><SelectValue placeholder="Select size..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value='48"'>48"</SelectItem>
                              <SelectItem value='72"'>72"</SelectItem>
                              <SelectItem value='96"'>96"</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Hinges Size</Label>
                          <Select value={hingeSize} onValueChange={setHingeSize}>
                            <SelectTrigger><SelectValue placeholder="Select size..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value='3"'>3"</SelectItem>
                              <SelectItem value='3-1/2"'>3-1/2"</SelectItem>
                              <SelectItem value='4"'>4"</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Door Knob Set</Label>
                          <Select value={doorKnobType} onValueChange={setDoorKnobType}>
                            <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Passage">Passage</SelectItem>
                              <SelectItem value="Bed and Bath">Bed and Bath</SelectItem>
                              <SelectItem value="Entrance">Entrance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3 space-y-6">
                <div className="bg-background rounded-lg shadow-sm border border-border p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex-1 w-full sm:w-auto">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700">Estimated Finishing Cost</p>
                          <p className="text-xs text-blue-600 mt-1">Based on linked inventory pricing</p>
                        </div>
                        <p className="text-2xl font-semibold text-blue-900">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <PlannerExportDialog
                        organizationId={user.organizationId || user.organization_id || ''}
                        projectType="interior"
                        materials={materials}
                        totalCost={totalCost}
                        defaultDesignName="interior-finishing-design"
                      />
                      <ProjectQuoteGenerator 
                        user={user}
                        projectType="interior"
                        materials={materials}
                        totalCost={totalCost}
                        projectData={currentConfig}
                      />
                    </div>
                  </div>

                  <div className="mt-8 border-t pt-8">
                    <SavedProjectDesigns
                      user={user}
                      projectType="interior"
                      currentConfig={currentConfig}
                      materials={materials}
                      totalCost={totalCost}
                      onLoadDesign={handleLoadSavedDesign}
                    />
                  </div>

                  {materials.length === 0 ? (
                    <div className="text-center py-12 bg-muted rounded-lg border border-dashed border-border">
                      <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No materials calculated</p>
                      <p className="text-sm text-muted-foreground mt-1">Upload a floorplan and set the scale to generate a takeoff.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted border-b">
                          <tr>
                            <th className="px-4 py-3">Item Description</th>
                            <th className="px-4 py-3 text-right">Quantity (+10% Waste)</th>
                            <th className="px-4 py-3">Unit</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className="px-4 py-3 text-right">Ext. Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {materials.map((item, index) => {
                            const unitPrice = Number(item.price ?? 0);
                            const quantity = Number(item.quantity ?? 0);

                            return (
                              <tr key={index} className="hover:bg-muted transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">{item.description}</td>
                                <td className="px-4 py-3 text-right">{quantity}</td>
                                <td className="px-4 py-3">{item.unit}</td>
                                <td className="px-4 py-3 text-right">${unitPrice.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-medium text-foreground">${(quantity * unitPrice).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'defaults' && (
            <PlannerDefaults 
              organizationId={user.organizationId || user.organization_id || ''}
              userId={user.id}
              plannerType="finishing"
              materialTypes={['mdf', 'finger_joint', 'pine']}
            />
          )}
        </div>
      </div>

      {/* PDF Page Selection Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted">
              <div>
                <h3 className="font-semibold text-foreground text-lg">Select Pages to Extract</h3>
                <p className="text-sm text-muted-foreground">Choose which pages from the PDF you want to digitize.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => {
                  setShowPdfModal(false);
                  setPdfDocument(null);
                  setPdfThumbnails([]);
                }}>Cancel</Button>
                <Button onClick={handleExtractSelectedPages} disabled={selectedPdfPages.size === 0 || loading}>
                  {loading ? 'Processing...' : `Extract ${selectedPdfPages.size} Page${selectedPdfPages.size !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-muted/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">{pdfThumbnails.length} Pages Available</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedPdfPages(new Set(pdfThumbnails.map(t => t.index)))}>Select All</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedPdfPages(new Set())}>Clear All</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {pdfThumbnails.map((thumb) => {
                  const isSelected = selectedPdfPages.has(thumb.index);
                  return (
                    <div 
                      key={thumb.index}
                      onClick={() => {
                        const newSet = new Set(selectedPdfPages);
                        if (isSelected) newSet.delete(thumb.index);
                        else newSet.add(thumb.index);
                        setSelectedPdfPages(newSet);
                      }}
                      className={`relative cursor-pointer group rounded-lg overflow-hidden transition-all duration-200 border-2 ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border hover:border-border'}`}
                    >
                      <div className="aspect-[3/4] bg-background flex items-center justify-center p-2 relative">
                        <img src={thumb.dataUrl} alt={`Page ${thumb.index}`} className={`max-w-full max-h-full object-contain ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`} />
                        
                        {/* Selection indicator */}
                        <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-background/80 border-border text-transparent group-hover:border-slate-400'}`}>
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                      <div className={`text-center py-2 text-xs font-medium ${isSelected ? 'bg-blue-50 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                        Page {thumb.index}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </PermissionGate>
  );
}

