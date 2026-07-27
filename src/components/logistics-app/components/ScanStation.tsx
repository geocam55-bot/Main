import React, { useState, useRef, useEffect } from 'react';
import { formatPhoneNumber } from '../lib/formatters';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { DeliveryRecord, DeliveryStatus, Branch, Truck, User as AppUser } from '../types';
import { 
  Scan, 
  Truck as TruckIcon, 
  User, 
  Package, 
  MapPin, 
  Eye, 
  Phone, 
  CheckSquare, 
  Sparkles, 
  X, 
  FileSignature, 
  CornerUpLeft, 
  ShieldAlert, 
  Trash2, 
  Laptop, 
  Smartphone, 
  Search, 
  Filter, 
  Keyboard, 
  AlertCircle, 
  RefreshCw,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

interface ScanStationProps {
  deliveries: DeliveryRecord[];
  onAddOrUpdateDelivery: (record: DeliveryRecord) => void;
  onDeleteDelivery?: (id: string) => void;
  trucks: Truck[];
  branches?: Branch[];
  users: AppUser[];
}

export default function ScanStation({ deliveries, onAddOrUpdateDelivery, onDeleteDelivery, trucks, branches, users }: ScanStationProps) {
  const BRANCHES = branches || [];
  
  // DEVICE MODE: 'desktop' | 'mobile' (Auto-detected based on device / screen size)
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>(() => {
    if (typeof window !== 'undefined') {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      return isMobileDevice ? 'mobile' : 'desktop';
    }
    return 'desktop';
  });

  useEffect(() => {
    const checkDevice = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      const newMode = isMobileDevice ? 'mobile' : 'desktop';
      setDeviceMode(prev => {
        if (prev !== newMode) {
          if (newMode === 'desktop') {
            stopCamera();
            setLockFocus(true);
          } else {
            setLockFocus(false);
          }
          return newMode;
        }
        return prev;
      });
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Input fields for scanning/entry
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedRecord, setScannedRecord] = useState<DeliveryRecord | null>(null);
  
  // Multi-Criteria Lookup Search States (for Document #, Customer, Address, Phone)
  const [searchDocNum, setSearchDocNum] = useState('');
  const [searchCustName, setSearchCustName] = useState('');
  const [searchAddress, setSearchAddress] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [showSearchFilters, setShowSearchFilters] = useState(true);

  // Manual Creation/Registration State
  const [manualSalesOrder, setManualSalesOrder] = useState<{
    barcode: string;
    salesOrderNumber: string;
    invoiceNumber: string;
    customerName: string;
    deliveryAddress: string;
    phone: string;
    originBranch: string;
    destinationNotes: string;
  } | null>(null);

  // Active step in scanning process: 'IDLE' | 'REGISTER' | 'PICK' | 'DELIVER_RETURN'
  const [activeFormType, setActiveFormType] = useState<'IDLE' | 'REGISTER' | 'PICK' | 'DELIVER_RETURN'>('IDLE');

  // Form states for registrations
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [originBranch, setOriginBranch] = useState('WINDMILL_DC');
  const [customerName, setCustomerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [registerSelectedTruck, setRegisterSelectedTruck] = useState('');

  // Picker Assignment
  const [selectedTruck, setSelectedTruck] = useState(trucks[0]?.id || '');
  const [selectedPicker, setSelectedPicker] = useState('');

  // Outcome
  const [deliveryOutcome, setDeliveryOutcome] = useState<'SUCCESS' | 'RETURN'>('SUCCESS');
  const [customerSignature, setCustomerSignature] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnDestination, setReturnDestination] = useState('WINDMILL_DC');

  // Viewfinder Scanner UI States (Mobile camera)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [scanMessage, setScanMessage] = useState('');
  const [flashForm, setFlashForm] = useState(false);
  const [isAutoScan, setIsAutoScan] = useState(true);
  const [lastScan, setLastScan] = useState<{
    barcode: string;
    extractedDocNum?: string;
    timestamp: Date;
    resolvedStatus: 'NEW' | 'REGISTERED' | 'PICKED' | 'DELIVERED_OR_RETURNED' | 'NOT_FOUND';
    customerName?: string;
  } | null>(null);
  const [lastDecodedResult, setLastDecodedResult] = useState('');
  const [isScanningFrame, setIsScanningFrame] = useState(false);
  const [isBgScanning, setIsBgScanning] = useState(false);
  const [fullFrameMode, setFullFrameMode] = useState(true);

  const zxingCodeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [lockFocus, setLockFocus] = useState(true); // Default focused for Desktop wedging
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Filter deliveries list in real-time by multiple criteria
  const filteredDeliveriesList = deliveries.filter(d => {
    const docToMatch = searchDocNum.trim().toLowerCase();
    const matchDoc = !docToMatch || 
      d.id.toLowerCase().includes(docToMatch) || 
      d.epicorSalesOrder.toLowerCase().includes(docToMatch) || 
      d.invoiceNumber.toLowerCase().includes(docToMatch);

    const matchCust = !searchCustName.trim() || 
      d.customerName.toLowerCase().includes(searchCustName.trim().toLowerCase());

    const matchAddress = !searchAddress.trim() || 
      d.deliveryAddress.toLowerCase().includes(searchAddress.trim().toLowerCase());

    const matchPhone = !searchPhone.trim() || 
      d.phone.toLowerCase().includes(searchPhone.trim().toLowerCase());

    return matchDoc && matchCust && matchAddress && matchPhone;
  });

  // Mobile or Desktop tab switcher cleaner helper
  const handleModeChange = (mode: 'desktop' | 'mobile') => {
    setDeviceMode(mode);
    if (mode === 'desktop') {
      stopCamera();
      setLockFocus(true);
    } else {
      setLockFocus(false);
    }
    cancelActiveForm();
  };

  const startCamera = async (forceFullFrame?: boolean) => {
    const useFullFrame = forceFullFrame !== undefined ? forceFullFrame : fullFrameMode;
    setCameraError(null);
    setIsCameraActive(true);
    
    const isAutoScanRef = { current: isAutoScan };
    
    setTimeout(async () => {
      try {
        const videoElement = document.getElementById('zxing-video-preview') as HTMLVideoElement | null;
        if (!videoElement) {
          console.error("ZXing target video element not found in DOM.");
          setCameraError("Camera video preview element not found.");
          setIsCameraActive(false);
          return;
        }

        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.PDF_417,
        ]);

        const codeReader = new BrowserMultiFormatReader(hints);
        zxingCodeReaderRef.current = codeReader;

        let selectedDeviceId: string | undefined = undefined;
        try {
          const videoDevices = await codeReader.listVideoInputDevices();
          if (videoDevices && videoDevices.length > 0) {
            const backCamera = videoDevices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('environment') ||
              device.label.toLowerCase().includes('rear')
            );
            selectedDeviceId = backCamera ? backCamera.deviceId : videoDevices[0].deviceId;
          }
        } catch (deviceListErr) {
          console.warn("Could not query camera device list, default constraints will handle camera selection:", deviceListErr);
        }

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            facingMode: selectedDeviceId ? undefined : 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            advanced: [
              { focusMode: 'continuous' } as any,
              { focusMode: 'auto' } as any
            ]
          }
        };

        await codeReader.decodeFromConstraints(
          constraints,
          videoElement,
          (result, error) => {
            if (result) {
              const text = result.getText();
              const now = Date.now();
              
              if (text === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2500) {
                return;
              }
              lastScannedCodeRef.current = text;
              lastScannedTimeRef.current = now;

              console.log("ZXing decoded active stream barcode:", text);
              handleScanAction(text);
              
              if (!isAutoScanRef.current) {
                stopCamera();
              }
            }
          }
        );
      } catch (err: any) {
        console.error("ZXing camera startup exception:", err);
        let errMsg = err?.message || String(err);
        if (errMsg.indexOf("NotAllowedError") !== -1 || errMsg.indexOf("Permission") !== -1) {
          errMsg = "Camera permission was denied. Please allow camera access in your device settings.";
        }
        setCameraError(errMsg);
        setIsCameraActive(false);
      }
    }, 200);
  };

  const toggleFullFrameMode = async () => {
    const nextVal = !fullFrameMode;
    setFullFrameMode(nextVal);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        startCamera(nextVal);
      }, 350);
    }
  };

  const scanBarcodeFromDataUrl = async (dataUrl: string): Promise<string | null> => {
    try {
      try {
        if ('BarcodeDetector' in window) {
          const resBlob = await fetch(dataUrl);
          const blob = await resBlob.blob();
          const BarcodeDetectorClass = (window as any).BarcodeDetector;
          const barcodeDetector = new BarcodeDetectorClass({
            formats: [
              'code_128', 'code_39', 'code_93', 'codabar', 'ean_13', 'ean_8', 'itf', 'qr_code', 'upc_a', 'upc_e', 'pdf417'
            ]
          });
          const bitmap = await createImageBitmap(blob);
          const results = await barcodeDetector.detect(bitmap);
          if (results && results.length > 0) {
            console.log("Decoded barcode via client-side BarcodeDetector:", results[0].rawValue);
            return results[0].rawValue;
          }
        }
      } catch (detectorErr) {
        console.warn("Client-side BarcodeDetector failed, falling back to ZXing:", detectorErr);
      }

      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.PDF_417,
      ]);
      const codeReader = new BrowserMultiFormatReader(hints);
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const zxingResult = await codeReader.decodeFromImage(img);
      if (zxingResult) {
        const decodedText = zxingResult.getText();
        console.log("Decoded barcode via client-side ZXing:", decodedText);
        return decodedText;
      }
      return null;
    } catch (err) {
      console.warn("Client-side ZXing decoding from image failed:", err);
      return null;
    }
  };

  const snapAndScanLiveFrame = async () => {
    setCameraError(null);
    setScanMessage("Capturing viewfinder... Analyzing local barcode patterns...");
    setIsScanningFrame(true);

    try {
      const videoEl = document.querySelector("#zxing-video-preview") as HTMLVideoElement | null;
      if (!videoEl) {
        throw new Error("No active camera sensor feedback discovered in the viewfinder window. Try starting the live stream first.");
      }

      if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
        throw new Error("The live camera viewfinder is still preparing its lens. Please wait 1 second and tap the screen again.");
      }

      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to activate local canvas drawing engine.");
      }

      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const fileData = canvas.toDataURL("image/jpeg", 0.92);

      const clientSideBarcode = await scanBarcodeFromDataUrl(fileData);
      if (clientSideBarcode) {
        handleScanAction(clientSideBarcode);
        setScanMessage(`📋 Decoded Barcode (Local Decoder): ${clientSideBarcode}`);
        stopCamera();
        setTimeout(() => setScanMessage(''), 4500);
        return;
      }

      // Submit base64 dump to server-side scan-photo endpoint as fallback
      setScanMessage("Local scan unresolved. Engaging AI decrypter...");
      let isFallBackSuccess = false;
      let fallbackText = '';
      try {
        const res = await fetch("/api/scan-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData })
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.barcodeText) {
            isFallBackSuccess = true;
            fallbackText = result.barcodeText;
          }
        }
      } catch (e) {
        console.warn("Backend OCR proxy was unreachable or offline.", e);
      }

      if (isFallBackSuccess) {
        handleScanAction(fallbackText);
        setScanMessage(`📋 Decrypted Barcode (AI Fallback): ${fallbackText}`);
        stopCamera();
        setTimeout(() => setScanMessage(''), 4500);
      } else {
        throw new Error("Unable to read barcode from live frame. Hold steady, center the barcode under bright lighting, or search / enter details manually.");
      }
    } catch (err: any) {
      console.error("Frame snap capture error:", err);
      setCameraError(err?.message || "Failed to scan live frame. Please hold steady and try again.");
      setTimeout(() => setCameraError(null), 8500);
    } finally {
      setScanMessage("");
      setIsScanningFrame(false);
    }
  };

  const snapAndScanLiveFrameBackground = async () => {
    if (isScanningFrame || isBgScanning || !isCameraActive) return;
    
    try {
      const videoEl = document.querySelector("#zxing-video-preview") as HTMLVideoElement | null;
      if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
        return;
      }

      setIsBgScanning(true);

      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsBgScanning(false);
        return;
      }

      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const fileData = canvas.toDataURL("image/jpeg", 0.70);

      const clientSideBarcode = await scanBarcodeFromDataUrl(fileData);
      if (clientSideBarcode) {
        handleScanAction(clientSideBarcode);
        setScanMessage(`📋 Auto-Decoded (Local): ${clientSideBarcode}`);
        stopCamera();
        setTimeout(() => setScanMessage(''), 4500);
        return;
      }

      try {
        const res = await fetch("/api/scan-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData })
        });

        if (res.ok) {
          const result = await res.json();
          if (result.success && result.barcodeText) {
            handleScanAction(result.barcodeText);
            setScanMessage(`📋 AI Auto-Decrypted: ${result.barcodeText}`);
            stopCamera();
            setTimeout(() => setScanMessage(''), 4500);
          }
        }
      } catch (apiErr) {
        // Safe to ignore bg api failures
      }
    } catch (err: any) {
      console.warn("Background client stream scan failed:", err);
    } finally {
      setIsBgScanning(false);
    }
  };

  const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    setScanMessage("Preprocessing & optimizing image details...");
    setIsScanningFrame(true);

    try {
      if (isCameraActive) {
        stopCamera();
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
      reader.readAsDataURL(file);
      const originalBase64 = await base64Promise;

      const fileData = await compressImage(originalBase64).catch((err) => {
        console.warn("Downscaling failed, using raw upload stream:", err);
        return originalBase64;
      });

      setScanMessage("Decoding photograph using local browser engines...");
      const clientSideBarcode = await scanBarcodeFromDataUrl(fileData);
      if (clientSideBarcode) {
        handleScanAction(clientSideBarcode);
        setScanMessage(`📋 Decoded Barcode (Local Engine): ${clientSideBarcode}`);
        setTimeout(() => setScanMessage(''), 4500);
        return;
      }

      setScanMessage("Local scan unresolved. Engaging AI decrypter...");
      let isFallBackSuccess = false;
      let fallbackText = '';
      try {
        const res = await fetch("/api/scan-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData })
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.barcodeText) {
            isFallBackSuccess = true;
            fallbackText = result.barcodeText;
          }
        }
      } catch (err) {
        console.warn("Remote AI endpoint disabled or offline:", err);
      }

      if (isFallBackSuccess) {
        handleScanAction(fallbackText);
        setScanMessage(`📋 Decrypted Barcode (AI Fallback): ${fallbackText}`);
        setTimeout(() => setScanMessage(''), 4500);
      } else {
        throw new Error("Unable to read a barcode from this image. Please capture a clear, well-lit close up of the label, or search details manually.");
      }
    } catch (err: any) {
      console.error("Barcode photo analysis error:", err);
      setCameraError(err?.message || "Unable to read barcode. Make sure the labels are bright and fully visible.");
      setTimeout(() => setCameraError(null), 8500);
    } finally {
      setScanMessage("");
      setIsScanningFrame(false);
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const stopCamera = () => {
    if (zxingCodeReaderRef.current) {
      try {
        zxingCodeReaderRef.current.reset();
      } catch (err) {
        console.error("Error stopping ZXing code reader:", err);
      }
      zxingCodeReaderRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (zxingCodeReaderRef.current) {
        try {
          zxingCodeReaderRef.current.reset();
        } catch (err) {
          // safe to ignore
        }
        zxingCodeReaderRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isCameraActive) return;

    const intervalId = setInterval(() => {
      snapAndScanLiveFrameBackground();
    }, 3500);

    return () => clearInterval(intervalId);
  }, [isCameraActive, isScanningFrame]);

  // Focus keeper for physical scanner wedges on Desktop
  useEffect(() => {
    if (!lockFocus || deviceMode !== 'desktop') return;

    if (manualInputRef.current) {
      manualInputRef.current.focus();
    }

    const timer = setInterval(() => {
      if (document.activeElement !== manualInputRef.current && manualInputRef.current) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'BUTTON' && activeTag !== 'SELECT' && activeTag !== 'A') {
          manualInputRef.current.focus();
        }
      }
    }, 550);

    return () => clearInterval(timer);
  }, [lockFocus, deviceMode]);

  // Global keydown hook interceptor to catch physical wedge keyboard scanners
  useEffect(() => {
    if (!lockFocus || deviceMode !== 'desktop') return;

    let scanBuffer = '';
    let lastKeyStamp = Date.now();

    const handleWedgeKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== manualInputRef.current && activeEl.id !== 'visible-barcode-input') {
        return; 
      }

      const nowStamp = Date.now();
      if (nowStamp - lastKeyStamp > 1500) {
        scanBuffer = '';
      }
      lastKeyStamp = nowStamp;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (scanBuffer.trim().length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const parsedCode = scanBuffer.trim();
          scanBuffer = '';
          setLastDecodedResult(parsedCode);
          setBarcodeInput(parsedCode);
          handleScanAction(parsedCode);
        }
      } else if (e.key.length === 1) {
        scanBuffer += e.key;
        setLastDecodedResult(scanBuffer);
        setBarcodeInput(scanBuffer);
      }
    };

    window.addEventListener('keydown', handleWedgeKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleWedgeKeyDown, true);
    };
  }, [lockFocus, deviceMode, deliveries]);

  const playBeep = () => {
    if (!audioFeedback) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08); 
    } catch (e) {
      console.warn("Audio Context not started or supported yet.", e);
    }
  };

  const handleScanAction = (barcode: string) => {
    let rawCode = barcode.trim();
    if (!rawCode) {
      setScanMessage("⚠️ Scan aborted: Empty code.");
      setTimeout(() => setScanMessage(""), 4500);
      return;
    }

    // Extract document number. Starting at position 7 for 9 chars
    let code = rawCode;
    if (rawCode.length >= 15) {
      code = rawCode.substring(6, 15);
    }

    setFlashForm(true);
    setTimeout(() => setFlashForm(false), 900);

    playBeep();
    setBarcodeInput('');
    if (lockFocus && deviceMode === 'desktop') {
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 80);
    }

    setScanMessage(`Scanned Document ID: "${code}"`);
    setTimeout(() => setScanMessage(''), 4500);

    // Search active registered deliveries
    const existing = deliveries.find(d => 
      d.id.toLowerCase() === code.toLowerCase() ||
      d.epicorSalesOrder.toLowerCase() === code.toLowerCase() ||
      d.invoiceNumber.toLowerCase() === code.toLowerCase()
    );

    let resStatus: 'NEW' | 'REGISTERED' | 'PICKED' | 'DELIVERED_OR_RETURNED' | 'NOT_FOUND' = 'NOT_FOUND';
    let custName = '';

    if (existing) {
      custName = existing.customerName;
      if (existing.status === DeliveryStatus.REGISTERED) {
        resStatus = 'REGISTERED';
      } else if (existing.status === DeliveryStatus.PICKED_AND_LOADED) {
        resStatus = 'PICKED';
      } else {
        resStatus = 'DELIVERED_OR_RETURNED';
      }
    } else {
      resStatus = 'NEW';
    }

    setLastScan({
      barcode: rawCode,
      extractedDocNum: code,
      timestamp: new Date(),
      resolvedStatus: resStatus,
      customerName: custName
    });
    setLastDecodedResult(rawCode);

    if (existing) {
      setScannedRecord(existing);
      setManualSalesOrder(null);
      
      if (existing.status === DeliveryStatus.REGISTERED) {
        setActiveFormType('PICK');
        const storeTrucks = trucks.filter(t => t.branchId === existing.originBranch);
        setSelectedTruck(storeTrucks.length > 0 ? storeTrucks[0].id : (trucks[0]?.id || ''));
        setSelectedPicker('');
      } else if (existing.status === DeliveryStatus.PICKED_AND_LOADED) {
        setActiveFormType('DELIVER_RETURN');
        setDeliveryOutcome('SUCCESS');
        setCustomerSignature('');
        setReturnReason('');
      } else {
        setActiveFormType('IDLE');
      }
    } else {
      // Create draft registration for manual validation
      setManualSalesOrder({
        barcode: rawCode,
        salesOrderNumber: code, 
        invoiceNumber: 'INV-' + code,
        customerName: '',
        deliveryAddress: '',
        phone: '',
        originBranch: BRANCHES[0]?.id || 'WINDMILL_DC',
        destinationNotes: 'Barcode scanned at loading gate.'
      });
      setCustomerName('');
      setShippingAddress('');
      setShippingPhone('');
      setShippingNotes('Barcode scanned at loading gate.');
      setOriginBranch(BRANCHES[0]?.id || 'WINDMILL_DC');
      setInvoiceNo('INV-' + code);
      
      const firstBranchId = BRANCHES[0]?.id || 'WINDMILL_DC';
      const storeTrucks = trucks.filter(t => t.branchId === firstBranchId);
      setRegisterSelectedTruck(storeTrucks.length > 0 ? storeTrucks[0].id : '');
      
      setScannedRecord(null);
      setActiveFormType('REGISTER');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSalesOrder) return;

    const selectedTruckDetails = trucks.find(t => t.id === registerSelectedTruck);

    const brandNew: DeliveryRecord = {
      id: manualSalesOrder.barcode,
      epicorSalesOrder: manualSalesOrder.salesOrderNumber,
      invoiceNumber: invoiceNo || manualSalesOrder.invoiceNumber,
      customerName: customerName || 'Walk-in Customer',
      deliveryAddress: shippingAddress || 'Hold at Store Depot Pickup',
      phone: shippingPhone || 'No Phone Registered',
      originBranch: originBranch,
      destinationNotes: shippingNotes,
      status: DeliveryStatus.REGISTERED,
      registeredAt: new Date().toISOString(),
      assignedTruck: registerSelectedTruck || undefined,
      assignedDriver: selectedTruckDetails?.driver || undefined,
      history: [
        {
          status: DeliveryStatus.REGISTERED,
          timestamp: new Date().toISOString(),
          location: BRANCHES.find(b => b.id === originBranch)?.name || 'Central Dispatch Store',
          operator: 'Dispatch Counter Gate Operator',
          notes: registerSelectedTruck 
            ? `Delivery plan registered under ${BRANCHES.find(b => b.id === originBranch)?.name || 'Depot'}. Assigned to ${selectedTruckDetails?.name} (Driver: ${selectedTruckDetails?.driver || 'N/A'}).`
            : 'Delivery details and routing plan registered into tracking system.'
        }
      ]
    };

    onAddOrUpdateDelivery(brandNew);
    setScannedRecord(brandNew);
    setManualSalesOrder(null);
    setActiveFormType('IDLE');
    setBarcodeInput('');
  };

  const handlePickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedRecord) return;
    if (!selectedPicker) {
      alert("A warehouse loader / picker is required.");
      return;
    }

    const selectedTruckDetails = trucks.find(t => t.id === selectedTruck);
    const pickerUser = users.find(u => u.id === selectedPicker) || users.find(u => u.name === selectedPicker);
    const pickerName = pickerUser ? pickerUser.name : selectedPicker;
    
    const updated: DeliveryRecord = {
      ...scannedRecord,
      status: DeliveryStatus.PICKED_AND_LOADED,
      pickedAt: new Date().toISOString(),
      assignedTruck: selectedTruck,
      assignedDriver: selectedTruckDetails?.driver || 'Dave MacNeil',
      assignedPicker: pickerName,
      history: [
        ...scannedRecord.history,
        {
          status: DeliveryStatus.PICKED_AND_LOADED,
          timestamp: new Date().toISOString(),
          location: BRANCHES.find(b => b.id === scannedRecord.originBranch)?.name || 'Materials Loading Yard',
          operator: `Loader: ${pickerName} / Driver: ${selectedTruckDetails?.driver || 'Driver'}`,
          notes: `Materials picked by ${pickerName} and loaded securely onto truck ${selectedTruckDetails?.name || selectedTruck}.`
        }
      ]
    };

    onAddOrUpdateDelivery(updated);
    setScannedRecord(updated);
    setActiveFormType('IDLE');
    setBarcodeInput('');
  };

  const handleDeliverReturnedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedRecord) return;

    let updated: DeliveryRecord;
    const now = new Date().toISOString();

    if (deliveryOutcome === 'SUCCESS') {
      updated = {
        ...scannedRecord,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: now,
        customerSignature: customerSignature || 'Verified at Site',
        deliveryPhoto: deliveryPhoto || undefined,
        history: [
          ...scannedRecord.history,
          {
            status: DeliveryStatus.DELIVERED,
            timestamp: now,
            location: scannedRecord.deliveryAddress,
            operator: scannedRecord.assignedDriver || 'Courier Driver',
            notes: `Delivery securely received on-site. Representative signature: "${customerSignature || 'Received'}"`
          }
        ]
      };
    } else {
      updated = {
        ...scannedRecord,
        status: DeliveryStatus.RETURNED,
        returnedAt: now,
        returnReason: returnReason || 'Declined',
        history: [
          ...scannedRecord.history,
          {
            status: DeliveryStatus.RETURNED,
            timestamp: now,
            location: BRANCHES.find(b => b.id === returnDestination)?.name || 'Returned to Depot',
            operator: scannedRecord.assignedDriver || 'Courier Driver',
            notes: `Delivery incomplete. Returned back to depot ${BRANCHES.find(b => b.id === returnDestination)?.name || returnDestination}. Code: ${returnReason}`
          }
        ]
      };
    }

    onAddOrUpdateDelivery(updated);
    setScannedRecord(updated);
    setActiveFormType('IDLE');
    setBarcodeInput('');
    setDeliveryPhoto('');
    setCustomerSignature('');
    setReturnReason('');
  };

  const cancelActiveForm = () => {
    setActiveFormType('IDLE');
    setScannedRecord(null);
    setManualSalesOrder(null);
    setDeliveryPhoto('');
    setCustomerSignature('');
    setReturnReason('');
  };

  // Simulate picking a registered barcode or generating a dummy one in the system
  const triggerSimulatedHandheldScan = (barcode: string) => {
    setBarcodeInput(barcode);
    setLastDecodedResult(barcode);
    handleScanAction(barcode);
  };

  return (
    <div className="space-y-6" id="scanning-station-wrapper">
      
      {/* AUTOMATICALLY DETECTED DEVICE INTERFACE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Scan className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight font-sans">Dispatch & Delivery Verification Station</h3>
            <p className="text-[11px] text-slate-400">Automatic interface detection active for current device viewport</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 self-start sm:self-center">
          {deviceMode === 'mobile' ? (
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
              <Smartphone className="h-4 w-4" />
              <span>Mobile Handheld View</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
              <Laptop className="h-4 w-4" />
              <span>Desktop Terminal View</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🖥️ DESKTOP WORKSTATION LAYOUT */}
      {/* ========================================================================= */}
      {deviceMode === 'desktop' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* LEFT: Hardware PC Interface Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col space-y-5">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider bg-blue-105 border border-blue-200 text-blue-800 rounded uppercase">
                    Wedge Scanner Connected
                  </span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                </div>
                <h4 className="font-sans font-extrabold text-slate-950 tracking-tight text-lg">PC Gatehouse Workstation</h4>
                <p className="text-xs text-slate-400">Listening to keyboard emulation wedges & serial USB input</p>
              </div>
              
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[10px] text-slate-450 font-mono">Audio Beep</span>
                <button 
                  type="button"
                  onClick={() => setAudioFeedback(!audioFeedback)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${audioFeedback ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  aria-label="Toggle beep on scan"
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${audioFeedback ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Industrial Gun Wedge Simulator */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white flex flex-col space-y-4 shadow-inner relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
                <Keyboard className="w-40 h-40" />
              </div>

              <div className="flex items-center space-x-3 z-10">
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-emerald-400">
                  <Keyboard className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">Input Interceptor</span>
                  <span className="text-xs font-bold font-sans text-slate-200">Hardware Keyboard Wedge Wedge Mode</span>
                </div>
              </div>

              <div className="space-y-1.5 z-10">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block text-left">
                  Type or scan a barcode below
                </label>
                <div className="flex gap-2">
                  <input
                    id="desktop-wedge-input"
                    type="text"
                    value={lastDecodedResult}
                    onChange={(e) => {
                      setLastDecodedResult(e.target.value);
                      setBarcodeInput(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleScanAction(lastDecodedResult);
                      }
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 font-mono text-sm text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-semibold shadow-inner"
                    placeholder="Wedge capture field..."
                  />
                  <button
                    type="button"
                    onClick={() => handleScanAction(lastDecodedResult)}
                    disabled={!lastDecodedResult}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow transition-colors shrink-0 uppercase tracking-wider cursor-pointer"
                  >
                    Send Enter
                  </button>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 z-10">
                <div className="text-[11px] text-slate-400 leading-tight">
                  <span className="font-bold text-slate-300 block">Focus Keeper Status</span>
                  <span>Locks focus onto background reader thread</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLockFocus(!lockFocus)}
                  className={`text-[10px] px-3 py-1.5 rounded-lg border font-mono font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    lockFocus 
                      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${lockFocus ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span>{lockFocus ? "FOCUS AUTO-LOCKED" : "MANUAL CLICKS ONLY"}</span>
                </button>
              </div>

              {/* Hardware wedge hidden receiver */}
              <input 
                ref={manualInputRef}
                type="text" 
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  top: '0px',
                  width: '1px',
                  height: '1px',
                  opacity: 0.01
                }}
                inputMode="none"
                value={barcodeInput} 
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setLastDecodedResult(e.target.value);
                }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') { 
                    const value = e.currentTarget.value.trim();
                    if (value) {
                      handleScanAction(value); 
                      setLastDecodedResult(value);
                      setBarcodeInput("");
                      e.currentTarget.value = "";
                    }
                  } 
                }}
                onBlur={() => {
                  if (lockFocus && deviceMode === 'desktop') {
                    setTimeout(() => {
                      if (manualInputRef.current) {
                        const activeEl = document.activeElement;
                        if (activeEl) {
                          const tag = activeEl.tagName;
                          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT' || tag === 'A') {
                            return;
                          }
                        }
                        manualInputRef.current.focus();
                      }
                    }, 120);
                  }
                }}
              />
            </div>

            {/* Simulated Handheld Gun Trigger Simulator */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono block">
                🔫 Gun Trigger Simulator (Testing Desk)
              </span>
              <p className="text-xs text-slate-500 leading-normal">
                No physical scanner wedge plugged in? Pull the virtual trigger below to instantly emulate scanning a transit routing card.
              </p>
              
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-600 block">Select barcode to trigger scan:</span>
                <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {deliveries.length > 0 ? (
                    deliveries.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => triggerSimulatedHandheldScan(r.id)}
                        className="w-full text-left p-2 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <strong className="font-mono text-slate-800">{r.id}</strong>
                          <span className="text-slate-500 block truncate text-[10px]">{r.customerName}</span>
                        </div>
                        <span className={`text-[9px] font-mono px-1.5 py-0.25 rounded font-bold ${
                          r.status === DeliveryStatus.REGISTERED ? 'bg-orange-100 text-orange-700' :
                          r.status === DeliveryStatus.PICKED_AND_LOADED ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {r.status}
                        </span>
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerSimulatedHandheldScan("BARCODE-200923011")}
                      className="w-full text-left p-3 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl text-xs text-slate-600 transition-all font-mono text-center font-bold"
                    >
                      Emulate Scan (New Delivery Plan Draft)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ACTIVE DELIVERIES LOGS AT CURRENT GATE */}
            <div className="pt-4 border-t border-slate-100 flex-1">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Current Station Delivery Logs</h5>
                <span className="text-[10px] text-slate-400 font-mono">Total: {deliveries.length}</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {deliveries.map(record => (
                  <div
                    key={record.id}
                    className="w-full p-2 border border-slate-100 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs transition-all bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => triggerSimulatedHandheldScan(record.id)}
                      className="flex-1 text-left truncate cursor-pointer pr-1"
                    >
                      <span className="font-mono font-bold text-slate-900 block">{record.id}</span>
                      <span className="text-[10px] text-slate-450 block truncate">{record.customerName}</span>
                    </button>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className={`text-[9px] px-1.5 py-0.25 rounded font-mono font-bold uppercase ${
                        record.status === DeliveryStatus.REGISTERED ? 'bg-orange-100 text-orange-700' :
                        record.status === DeliveryStatus.PICKED_AND_LOADED ? 'bg-amber-100 text-amber-700' :
                        record.status === DeliveryStatus.DELIVERED ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.status}
                      </span>
                      {onDeleteDelivery && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete delivery ${record.id} from active database logs?`)) {
                              onDeleteDelivery(record.id);
                              if (scannedRecord?.id === record.id) {
                                setScannedRecord(null);
                                setActiveFormType('IDLE');
                              }
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT: Document Search & Multi-Criteria Search (Top Half) + Action Form (Bottom Half) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* MULTI-CRITERIA DOCUMENT LOOKUP CONTROL */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Search className="h-4 w-4" />
                  </div>
                  <h4 className="font-sans font-bold text-slate-900 text-sm">Multi-Criteria Document Lookup Engine</h4>
                </div>
                <button
                  onClick={() => setShowSearchFilters(!showSearchFilters)}
                  className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-350 rounded-lg transition-colors cursor-pointer"
                >
                  <Filter className="h-3 w-3" />
                  <span>{showSearchFilters ? "Hide Search Fields" : "Show Search Fields"}</span>
                </button>
              </div>

              {/* Collapsible Search Criteria Inputs */}
              {showSearchFilters && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl mb-4 text-left">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase font-mono mb-1">Doc # (SO / Invoice)</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchDocNum}
                        onChange={(e) => setSearchDocNum(e.target.value)}
                        placeholder="Search ID..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase font-mono mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={searchCustName}
                      onChange={(e) => setSearchCustName(e.target.value)}
                      placeholder="E.g., John..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase font-mono mb-1">Delivery Address</label>
                    <input
                      type="text"
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      placeholder="E.g., Waverley..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase font-mono mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(formatPhoneNumber(e.target.value))}
                      placeholder="E.g., 902..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Multi-Criteria Lookup Results Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase font-mono text-[9px] font-bold">
                        <th className="p-3">Doc Barcode ID</th>
                        <th className="p-3">Customer / Company</th>
                        <th className="p-3">Delivery Address</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Gate Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeliveriesList.length > 0 ? (
                        filteredDeliveriesList.slice(0, 5).map(r => (
                          <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 font-mono font-bold text-blue-600">{r.id}</td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-800 block">{r.customerName}</span>
                              <span className="text-[10px] text-slate-400 block">{r.phone}</span>
                            </td>
                            <td className="p-3 truncate max-w-[150px]" title={r.deliveryAddress}>{r.deliveryAddress}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                                r.status === DeliveryStatus.REGISTERED ? 'bg-orange-100 text-orange-700' :
                                r.status === DeliveryStatus.PICKED_AND_LOADED ? 'bg-amber-100 text-amber-700' :
                                r.status === DeliveryStatus.DELIVERED ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => triggerSimulatedHandheldScan(r.id)}
                                className="bg-slate-900 hover:bg-slate-850 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                {r.status === DeliveryStatus.REGISTERED ? "Load & Release" : r.status === DeliveryStatus.PICKED_AND_LOADED ? "Complete Handoff" : "Open Log"}
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 italic bg-slate-50">
                            No active deliveries match your search criteria. Enter a new document ID in the Wedge Simulator to register a fresh logistics entry.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* DYNAMIC FORM DISPLAY CONTAINER */}
            <div className={`bg-white p-5 rounded-2xl shadow-xs transition-all duration-300 ${
              flashForm 
                ? 'scale-[1.01] border-2 border-emerald-500 shadow-lg shadow-emerald-50 ring-2 ring-emerald-500/20' 
                : 'border border-slate-100'
            }`}>
              {activeFormType === 'IDLE' && (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 text-slate-400 space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-full text-slate-300">
                    <Scan className="h-10 w-10" />
                  </div>
                  <div>
                    {scannedRecord ? (
                      <div className="space-y-4 max-w-md mx-auto text-left">
                        <div className="border border-green-100 bg-green-50/40 p-4 rounded-xl">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-green-100">
                            <h4 className="font-semibold text-slate-900 font-sans text-sm">Gatehouse Record Verified</h4>
                            <span className="text-[10px] bg-green-100 text-green-800 font-mono px-2 py-0.5 rounded uppercase font-bold">
                              {scannedRecord.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs text-slate-700">
                            <div>
                              <span className="text-slate-400 block uppercase font-mono text-[9px]">Barcode Ref</span>
                              <strong className="font-mono text-blue-600 font-bold">{scannedRecord.id}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block uppercase font-mono text-[9px]">Purchaser</span>
                              <strong className="font-bold">{scannedRecord.customerName}</strong>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 block uppercase font-mono text-[9px]">Drop-off Address</span>
                              <strong className="font-bold">{scannedRecord.deliveryAddress}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block uppercase font-mono text-[9px]">Origin Depot</span>
                              <strong className="font-bold">{BRANCHES.find(b => b.id === scannedRecord.originBranch)?.name}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block uppercase font-mono text-[9px]">Assigned Driver</span>
                              <strong className="font-bold">{scannedRecord.assignedDriver || 'Courier Dispatch Queue'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Complete Historical Activity Log */}
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-bold text-slate-500 mb-2 uppercase font-mono tracking-wider">Lanes & Dispatch Routing Logs</h5>
                          <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4 text-xs">
                            {scannedRecord.history.map((h, i) => (
                              <div key={i} className="relative">
                                <span className="absolute -left-[21px] mt-1.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white"></span>
                                <p className="font-bold text-slate-900">{h.status}</p>
                                <p className="text-slate-400 text-[10px] font-mono">{new Date(h.timestamp).toLocaleString()} | operator: {h.operator}</p>
                                <p className="text-slate-600 mt-1 italic">&ldquo;{h.notes || 'No notes.'}&ldquo;</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            setScannedRecord(null);
                            setBarcodeInput('');
                          }}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Clear & Reset Operator Terminal
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-extrabold text-slate-900 font-sans">Awaiting Scanner Input</p>
                        <p className="text-xs max-w-xs mx-auto text-slate-500 leading-relaxed mb-1">
                          Simulate a scan or click the action button in the document lookup table above to start the logistics routing forms.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Form Renderings (Desktop shares standard logic with Mobile but styled in standard desktop formats) */}
              {activeFormType === 'REGISTER' && manualSalesOrder && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-slate-900">Step 1: Register Delivery Docket</h4>
                        <p className="text-xs text-orange-600 font-mono">Status: Awaiting Dispatch Registration</p>
                      </div>
                    </div>
                    <button type="button" onClick={cancelActiveForm} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block">Doc Barcode ID</label>
                      <input type="text" value={manualSalesOrder.barcode} disabled className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-500" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block">Order Reference</label>
                      <input type="text" value={manualSalesOrder.salesOrderNumber} disabled className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block">Invoice ID</label>
                      <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block">Origin Depot / Store</label>
                      <select 
                        value={originBranch}
                        onChange={(e) => {
                          const nextBranch = e.target.value;
                          setOriginBranch(nextBranch);
                          const storeTrucks = trucks.filter(t => t.branchId === nextBranch);
                          setRegisterSelectedTruck(storeTrucks.length > 0 ? storeTrucks[0].id : '');
                        }}
                        className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      >
                        {BRANCHES.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider font-mono text-[9px]">
                      🚚 PRE-ALLOCATE TRUCK & DISPATCH DRIVER
                    </label>
                    <select
                      value={registerSelectedTruck}
                      onChange={(e) => setRegisterSelectedTruck(e.target.value)}
                      className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs bg-white text-slate-800"
                    >
                      <option value="">-- Queue Driver Autodispatch --</option>
                      {trucks.filter(t => t.branchId === originBranch).map(t => (
                        <option key={t.id} value={t.id}>🚚 {t.name} (Driver: {t.driver}) — {t.type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Customer Consignee Shipping details</h5>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block">Customer Name</label>
                      <input type="text" required placeholder="Enter purchaser name..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block">Delivery Site Address</label>
                        <input type="text" required placeholder="E.g., 22 Waverley Rd..." value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block">Contact Phone Number</label>
                        <input type="text" placeholder="(902) 555-xxxx" value={shippingPhone} onChange={(e) => setShippingPhone(formatPhoneNumber(e.target.value))} className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block">Driver Instructions & Drop Site Guidance</label>
                      <textarea rows={2} placeholder="E.g., crane access, gate combination..." value={shippingNotes} onChange={(e) => setShippingNotes(e.target.value)} className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500" />
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold py-2.5 rounded-lg text-xs shadow-sm flex items-center justify-center space-x-1 uppercase tracking-wide cursor-pointer">
                      <CheckSquare className="h-4 w-4" />
                      <span>Save and Register Delivery</span>
                    </button>
                    <button type="button" onClick={cancelActiveForm} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">Abort</button>
                  </div>
                </form>
              )}

              {activeFormType === 'PICK' && scannedRecord && (
                <form onSubmit={handlePickSubmit} className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <TruckIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-slate-900">Step 2: Confirm Materials Picked & Loaded</h4>
                        <p className="text-xs text-amber-600 font-mono">Stage: Loading Dock Verification</p>
                      </div>
                    </div>
                    <button type="button" onClick={cancelActiveForm} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase font-mono text-[9px]">Consignee</span>
                      <strong className="text-slate-800">{scannedRecord.customerName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase font-mono text-[9px]">Address</span>
                      <strong className="text-slate-800 truncate max-w-xs">{scannedRecord.deliveryAddress}</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/50 pt-1.5 mt-1">
                      <span className="text-slate-400 uppercase font-mono text-[9px]">Cargo Base ID</span>
                      <strong className="text-blue-600 font-mono font-bold">{scannedRecord.id}</strong>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Assign Dispatch Truck & Fleet Driver</label>
                      <select value={selectedTruck} onChange={(e) => setSelectedTruck(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs bg-white text-slate-850">
                        {trucks.filter(t => t.branchId === scannedRecord.originBranch).map(t => (
                          <option key={t.id} value={t.id}>🚚 {t.name} (Driver: {t.driver}) — {t.type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Assign Loading Yard Picker *</label>
                      <select required value={selectedPicker} onChange={(e) => setSelectedPicker(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs bg-white text-slate-850">
                        <option value="">-- Select Yard Picker (Required) --</option>
                        {users.filter(u => u.role === 'Picker').map(u => (
                          <option key={u.id} value={u.id}>👤 {u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <button type="submit" className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-sm flex items-center justify-center space-x-1 uppercase tracking-wide cursor-pointer">
                      <TruckIcon className="h-4 w-4" />
                      <span>Confirm Cargo Picked & Released</span>
                    </button>
                    <button type="button" onClick={cancelActiveForm} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">Cancel</button>
                  </div>
                </form>
              )}

              {activeFormType === 'DELIVER_RETURN' && scannedRecord && (
                <form onSubmit={handleDeliverReturnedSubmit} className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                        <FileSignature className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-slate-900">Step 3: Confirm Customer Delivery Receipt</h4>
                        <p className="text-xs text-green-600 font-mono">En Route: {scannedRecord.assignedDriver} ({scannedRecord.assignedTruck})</p>
                      </div>
                    </div>
                    <button type="button" onClick={cancelActiveForm} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button type="button" onClick={() => setDeliveryOutcome('SUCCESS')} className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${deliveryOutcome === 'SUCCESS' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                      ✅ Handover Succeeded
                    </button>
                    <button type="button" onClick={() => setDeliveryOutcome('RETURN')} className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${deliveryOutcome === 'RETURN' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                      ⚠️ Return / Delivery Failed
                    </button>
                  </div>

                  {deliveryOutcome === 'SUCCESS' ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block">Customer Authorized Signature / Comments</label>
                        <input type="text" required placeholder="E.g., John Smith - Back Yard drop-off..." value={customerSignature} onChange={(e) => setCustomerSignature(e.target.value)} className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500" />
                      </div>
                      <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-[11px] text-green-800">
                        <strong className="block text-green-900">📍 Geo-Tag and Invoicing Synchronized</strong>
                        <p>Completing this action registers physical handover completion, tagging GPS stamps on client dispatch boards.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-1">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">State Reason for Return</label>
                        <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs bg-white">
                          <option value="">-- Choose Return Code --</option>
                          <option value="Damaged material on transit">Damaged material on transit</option>
                          <option value="Inaccurate package dimensions">Inaccurate package dimensions</option>
                          <option value="Site gate locked / Customer absent">Site gate locked / Customer absent</option>
                          <option value="Customer cancelled before drop">Customer cancelled before drop</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Return Depot / Store Location</label>
                        <select value={returnDestination} onChange={(e) => setReturnDestination(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs bg-white text-slate-850">
                          {BRANCHES.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-4">
                    {deliveryOutcome === 'SUCCESS' ? (
                      <button type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold py-2.5 rounded-lg text-xs shadow-sm flex items-center justify-center space-x-1 uppercase tracking-wide cursor-pointer">
                        <CheckSquare className="h-4 w-4" />
                        <span>Record Handover Completed</span>
                      </button>
                    ) : (
                      <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-sm flex items-center justify-center space-x-1 uppercase tracking-wide cursor-pointer">
                        <CornerUpLeft className="h-4 w-4" />
                        <span>Log Return to Depot Depot</span>
                      </button>
                    )}
                    <button type="button" onClick={cancelActiveForm} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">Cancel</button>
                  </div>
                </form>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 📱 MOBILE HANDHELD LAYOUT (COMPLETELY CLEANED OF "EPICOR" AND "GOOGLE") */}
      {/* ========================================================================= */}
      {deviceMode === 'mobile' && (
        <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-2xl animate-fade-in text-slate-800">
          
          {/* Mock Mobile Status bar */}
          <div className="bg-slate-900 px-4 py-1.5 flex justify-between items-center text-[10px] font-mono text-slate-400 tracking-wider">
            <span>DISPATCH APP</span>
            <div className="flex items-center space-x-1.5">
              <span>● LTE</span>
              <span>100%</span>
            </div>
          </div>

          {/* App Header */}
          <div className="bg-white px-5 py-4 border-b border-slate-150 flex items-center justify-between text-left">
            <div>
              <h4 className="font-sans font-black text-slate-900 text-base">Route Companion</h4>
              <p className="text-[10px] text-slate-500">Live Handheld Transit Portal</p>
            </div>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>

          {/* Mobile Search/Lookup Bar */}
          <div className="p-4 bg-white border-b border-slate-100 text-left">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block mb-2">
              🔍 Multi-Criteria Search & Filter
            </span>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchDocNum}
                  onChange={(e) => setSearchDocNum(e.target.value)}
                  placeholder="Enter Document # (SO or Invoice)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Collapsible Mobile Multi-Criteria Drawer */}
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div>
                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Customer Name</label>
                    <input
                      type="text"
                      value={searchCustName}
                      onChange={(e) => setSearchCustName(e.target.value)}
                      placeholder="E.g., Smith"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Phone Number</label>
                    <input
                      type="text"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(formatPhoneNumber(e.target.value))}
                      placeholder="E.g., 902"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Delivery Address</label>
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="E.g., Halifax"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Real-time search results matching mobile style */}
            {searchDocNum.trim() || searchCustName.trim() || searchAddress.trim() || searchPhone.trim() ? (
              <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto pt-2 border-t border-slate-100">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Matched search results:</span>
                {filteredDeliveriesList.length > 0 ? (
                  filteredDeliveriesList.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        handleScanAction(r.id);
                        // Reset search inputs to collapse
                        setSearchDocNum('');
                        setSearchCustName('');
                        setSearchAddress('');
                        setSearchPhone('');
                      }}
                      className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs flex justify-between items-center cursor-pointer transition-colors"
                    >
                      <div className="truncate pr-2">
                        <strong className="font-mono text-blue-600 block">{r.id}</strong>
                        <span className="text-[10px] text-slate-600 block truncate">{r.customerName}</span>
                      </div>
                      <span className="text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-bold uppercase">{r.status}</span>
                    </button>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400 italic block">No matching documents found.</span>
                )}
              </div>
            ) : null}
          </div>

          {/* Camera Scan area or Manual Result Display */}
          <div className="p-4 space-y-4 text-left">
            
            {activeFormType === 'IDLE' ? (
              <div className="space-y-4">
                
                {/* Mobile Viewfinder Panel */}
                <div className="relative min-h-[300px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-4 text-center text-slate-300">
                  {isScanningFrame && (
                    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 space-y-3">
                      <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                      <p className="text-xs text-emerald-400 font-mono font-bold uppercase tracking-widest">Decryption Active...</p>
                      <p className="text-[10px] text-slate-400 leading-normal">{scanMessage || "Processing viewpoint photo..."}</p>
                    </div>
                  )}

                  {isCameraActive ? (
                    <div className="absolute inset-0 w-full h-full flex flex-col justify-between">
                      <div className="absolute inset-0 z-0">
                        <video id="zxing-video-preview" className="w-full h-full object-cover" autoPlay playsInline muted />
                      </div>
                      
                      {/* Aim target */}
                      <div className="absolute inset-8 border-2 border-dashed border-emerald-500/30 rounded-xl flex items-center justify-center pointer-events-none z-10">
                        <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0" />
                        <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0" />
                        <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0" />
                        <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0" />
                      </div>

                      <div className="absolute inset-0 cursor-pointer pointer-events-auto flex flex-col justify-between p-3 z-20" onClick={snapAndScanLiveFrame}>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[8px] bg-red-600 text-white font-mono px-2 py-0.5 rounded font-bold animate-pulse">● LIVE CAMERA</span>
                          <span className="text-[8px] bg-slate-900/90 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Tap viewfinder to Snap</span>
                        </div>
                      </div>

                      {/* Control panel */}
                      <div className="absolute bottom-2 left-2 right-2 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-2 rounded-xl flex justify-between items-center z-30">
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Alignment Sights</span>
                        <div className="flex items-center space-x-1.5">
                          <button type="button" onClick={snapAndScanLiveFrame} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg uppercase tracking-wide cursor-pointer">
                            Snap Code
                          </button>
                          <button type="button" onClick={stopCamera} className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-[9px] font-bold px-2 py-1.5 rounded-lg uppercase tracking-wide cursor-pointer">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 py-4">
                      <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto">
                        <Scan className="h-6 w-6 text-emerald-400 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-bold text-xs tracking-wider text-emerald-400 uppercase font-mono">Camera Barcode Reader</h5>
                        <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-normal px-4">
                          Scan order transit cards or invoices in real time with your smartphone camera.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold px-4 py-3 rounded-xl transition-all inline-flex items-center justify-center space-x-2 cursor-pointer shadow-md tracking-wide uppercase border border-emerald-500"
                      >
                        <span>📷 Open Device Camera</span>
                      </button>

                      {/* File Selector for iOS gallery uploads */}
                      <div className="pt-2">
                        <label className="text-[10px] bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold border border-slate-800 px-3 py-2 rounded-xl cursor-pointer inline-block uppercase tracking-wider">
                          📁 Choose photo from library
                          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="p-2.5 bg-red-950/80 border border-red-900/50 rounded-xl text-[10px] text-red-200 leading-normal">
                    ⚠️ {cameraError}
                  </div>
                )}

                {/* Scanned/Selected Delivery Result review */}
                {scannedRecord ? (
                  <div className="bg-white border border-slate-150 p-4 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-900 font-sans text-xs">Selected Transit Docket</h4>
                      <span className="text-[8px] bg-slate-900 text-white font-mono px-2 py-0.5 rounded font-black uppercase">{scannedRecord.status}</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <span className="text-slate-400 uppercase font-mono text-[8px] block">Transit Code</span>
                          <strong className="font-mono text-blue-600 font-bold">{scannedRecord.id}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-mono text-[8px] block">Purchaser</span>
                          <strong className="font-bold">{scannedRecord.customerName}</strong>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase font-mono text-[8px] block">Delivery Address</span>
                        <strong className="font-bold block leading-snug">{scannedRecord.deliveryAddress}</strong>
                      </div>
                    </div>

                    {/* Step Activator trigger based on Mobile requirements */}
                    <div className="pt-2">
                      {scannedRecord.status === DeliveryStatus.REGISTERED && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFormType('PICK');
                            const storeTrucks = trucks.filter(t => t.branchId === scannedRecord.originBranch);
                            setSelectedTruck(storeTrucks.length > 0 ? storeTrucks[0].id : (trucks[0]?.id || ''));
                            setSelectedPicker('');
                          }}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                        >
                          <TruckIcon className="h-4 w-4" />
                          <span>Load Cargo onto Truck</span>
                        </button>
                      )}

                      {scannedRecord.status === DeliveryStatus.PICKED_AND_LOADED && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFormType('DELIVER_RETURN');
                            setDeliveryOutcome('SUCCESS');
                            setCustomerSignature('');
                            setReturnReason('');
                          }}
                          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Record Client Dropoff Receipt</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setScannedRecord(null)}
                        className="w-full mt-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase transition-colors cursor-pointer text-center block"
                      >
                        Clear Selection
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200/60 text-center">
                    <span className="text-[10px] text-slate-500">Standby. Emulate a camera scan or search order details above.</span>
                  </div>
                )}

              </div>
            ) : null}

            {/* Mobile Form displays - Cleaned of Google and Epicor references */}
            {activeFormType === 'REGISTER' && manualSalesOrder && (
              <form onSubmit={handleRegisterSubmit} className="bg-white border border-slate-150 p-4 rounded-2xl space-y-4 shadow-md text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-sans font-extrabold text-slate-950 text-sm">Docket Registration</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Routing Draft Pipeline</p>
                    </div>
                  </div>
                  <button type="button" onClick={cancelActiveForm} className="text-slate-400 p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Barcode ID</label>
                    <input type="text" value={manualSalesOrder.barcode} disabled className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono text-slate-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Invoice #</label>
                      <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:ring-1 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Depot Origin</label>
                      <select 
                        value={originBranch}
                        onChange={(e) => {
                          const nextBranch = e.target.value;
                          setOriginBranch(nextBranch);
                          const storeTrucks = trucks.filter(t => t.branchId === nextBranch);
                          setRegisterSelectedTruck(storeTrucks.length > 0 ? storeTrucks[0].id : '');
                        }}
                        className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs bg-white focus:ring-1 focus:ring-emerald-500"
                      >
                        {BRANCHES.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Pre-allocated Delivery Truck</label>
                    <select
                      value={registerSelectedTruck}
                      onChange={(e) => setRegisterSelectedTruck(e.target.value)}
                      className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs bg-white focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Autodispatch Pool --</option>
                      {trucks.filter(t => t.branchId === originBranch).map(t => (
                        <option key={t.id} value={t.id}>🚚 {t.name} ({t.driver})</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Consignee Shipping Details</span>
                    
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block">Customer Name</label>
                      <input type="text" required placeholder="E.g., Mary Jane..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block">Address Site</label>
                        <input type="text" required placeholder="E.g., 20 Waverley St..." value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block">Phone Site</label>
                        <input type="text" placeholder="Contact number..." value={shippingPhone} onChange={(e) => setShippingPhone(formatPhoneNumber(e.target.value))} className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block">Driver drop site notes</label>
                      <textarea rows={2} placeholder="Drop directions..." value={shippingNotes} onChange={(e) => setShippingNotes(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500" />
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1 cursor-pointer shadow-sm">
                      <CheckSquare className="h-4 w-4" />
                      <span>Register Plan</span>
                    </button>
                    <button type="button" onClick={cancelActiveForm} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">Abort</button>
                  </div>
                </div>
              </form>
            )}

            {activeFormType === 'PICK' && scannedRecord && (
              <form onSubmit={handlePickSubmit} className="bg-white border border-slate-150 p-4 rounded-2xl space-y-4 shadow-md text-left animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <TruckIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-sans font-extrabold text-slate-950 text-sm">Yard Load Confirmation</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Stage: Packing & Loading</p>
                    </div>
                  </div>
                  <button type="button" onClick={cancelActiveForm} className="text-slate-400 p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 uppercase font-mono text-[8px]">Client</span>
                    <strong className="text-slate-800">{scannedRecord.customerName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 uppercase font-mono text-[8px]">Address</span>
                    <strong className="text-slate-800 truncate max-w-[200px]">{scannedRecord.deliveryAddress}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 uppercase font-mono text-[8px]">Cargo ID</span>
                    <strong className="text-blue-600 font-mono font-bold">{scannedRecord.id}</strong>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Dispatch Delivery Fleet Truck</label>
                    <select value={selectedTruck} onChange={(e) => setSelectedTruck(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs bg-white">
                      {trucks.filter(t => t.branchId === scannedRecord.originBranch).map(t => (
                        <option key={t.id} value={t.id}>🚚 {t.name} (Driver: {t.driver})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Warehouse Loader / Picker *</label>
                    <select required value={selectedPicker} onChange={(e) => setSelectedPicker(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs bg-white">
                      <option value="">-- Choose Picker (Required) --</option>
                      {users.filter(u => u.role === 'Picker').map(u => (
                        <option key={u.id} value={u.id}>👤 {u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm">
                    <TruckIcon className="h-4 w-4" />
                    <span>Confirm Yard Load & Release</span>
                  </button>
                  <button type="button" onClick={cancelActiveForm} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                </div>
              </form>
            )}

            {activeFormType === 'DELIVER_RETURN' && scannedRecord && (
              <form onSubmit={handleDeliverReturnedSubmit} className="bg-white border border-slate-150 p-4 rounded-2xl space-y-4 shadow-md text-left animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <FileSignature className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-sans font-extrabold text-slate-950 text-sm">Delivery Verification</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Stage: On-Site Handover</p>
                    </div>
                  </div>
                  <button type="button" onClick={cancelActiveForm} className="text-slate-400 p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button type="button" onClick={() => setDeliveryOutcome('SUCCESS')} className={`py-2 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${deliveryOutcome === 'SUCCESS' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500'}`}>
                    ✅ Handed Over
                  </button>
                  <button type="button" onClick={() => setDeliveryOutcome('RETURN')} className={`py-2 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${deliveryOutcome === 'RETURN' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500'}`}>
                    ⚠️ Unresolved / Return
                  </button>
                </div>

                {deliveryOutcome === 'SUCCESS' ? (
                  <div className="space-y-3.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Customer Representative Name / Signature</label>
                      <input type="text" required placeholder="E.g., John Smith - Received on-site..." value={customerSignature} onChange={(e) => setCustomerSignature(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500" />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Attach Delivery Photo</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const base64 = reader.result as string;
                              try {
                                const compressed = await compressImage(base64, 800, 800);
                                setDeliveryPhoto(compressed);
                              } catch (err) {
                                console.warn("Failed to compress driver photo, using original:", err);
                                setDeliveryPhoto(base64);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                        className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs bg-slate-50 focus:ring-1 focus:ring-emerald-500" 
                      />
                      {deliveryPhoto && (
                        <div className="mt-2 text-[10px] text-green-700 font-bold flex items-center space-x-1">
                          <CheckSquare className="h-3 w-3" />
                          <span>Photo captured & attached.</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-[10.5px] text-green-800">
                      <strong className="block text-green-900 mb-0.5">📍 Geo-Location Broadcaster Active</strong>
                      <span>Recording geo-stamp and time-stamped proof of delivery data to the central dispatch queue.</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase font-mono">Select Reason for Delivery Fail</label>
                      <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs bg-white text-slate-850">
                        <option value="">-- Select Fail Reason --</option>
                        <option value="Material damaged in road transit">Material damaged in road transit</option>
                        <option value="Customer was absent / gates locked">Customer was absent / gates locked</option>
                        <option value="Customer refused materials on inspection">Customer refused materials on inspection</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase font-mono">Return Location Depot</label>
                      <select value={returnDestination} onChange={(e) => setReturnDestination(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs bg-white text-slate-850">
                        {BRANCHES.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  {deliveryOutcome === 'SUCCESS' ? (
                    <button type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1 shadow-sm cursor-pointer">
                      <CheckSquare className="h-4 w-4" />
                      <span>Confirm Complete Hand-off</span>
                    </button>
                  ) : (
                    <button type="submit" className="flex-1 bg-red-650 hover:bg-red-700 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1 shadow-sm cursor-pointer">
                      <CornerUpLeft className="h-4 w-4" />
                      <span>Log Return and Close Ticket</span>
                    </button>
                  )}
                  <button type="button" onClick={cancelActiveForm} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                </div>
              </form>
            )}

          </div>

          {/* Decorative Phone Home Indicator bar */}
          <div className="bg-slate-100 py-3 flex justify-center border-t border-slate-200">
            <div className="w-32 h-1 bg-slate-400 rounded-full" />
          </div>

        </div>
      )}

    </div>
  );
}
