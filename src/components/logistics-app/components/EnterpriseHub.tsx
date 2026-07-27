import React, { useState, useEffect, useRef } from 'react';
import { formatPhoneNumber } from '../lib/formatters';
import { 
  Users, ShoppingBag, MapPin, Route as RouteIcon, ShieldAlert, 
  Wrench, Fuel, Signature, AlertCircle, Sparkles, CheckCircle2,
  XCircle, FileText, Bell, Search, Plus, Calendar, ShieldCheck, 
  Gauge, DollarSign, ArrowRight, ClipboardList, PenTool, CheckSquare,
  Activity, Award, RefreshCw, Trash2, HelpCircle, Navigation, Info, Clock, PlayCircle,
  Camera, Truck as TruckIcon
} from 'lucide-react';
import { Branch, Truck, User, DeliveryRecord } from '../types';
import { getFrontendSupabase } from '../lib/supabaseClient';

interface EnterpriseHubProps {
  deliveries?: DeliveryRecord[];
  branches: Branch[];
  trucks: Truck[];
  users: User[];
  currentUser: User | null;
  onAddOrUpdateDelivery?: (record: any) => void;
  defaultView?: string;
}

// Interfaces matching database schema
interface Customer {
  id?: number;
  customerNumber: string;
  customerType: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  mobilePhone: string;
  alternatePhone: string;
  address1: string;
  address2: string;
  city: string;
  provinceState: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  specialInstructions: string;
  creditLimit: number;
  isActive: boolean;
  createdDate?: string;
}

interface Order {
  id?: number | string;
  orderNumber: string;
  customerID?: number | string;
  branchID: string;
  orderDate: string;
  requestedDeliveryDate: string;
  priority: string;
  orderStatus: string;
  totalWeightKg: number;
  totalVolumeM3: number;
  itemCount: number;
  orderValue: number;
  notes: string;
  customerNameStr?: string; // For mapped deliveries
  hasSignature?: boolean;
  hasPhoto?: boolean;
}

interface RouteLog {
  id?: number;
  routeNumber: string;
  truckID: string;
  driverID: string;
  branchID: string;
  routeDate: string;
  plannedDistanceKM: number;
  actualDistanceKM: number;
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  plannedStartTime: string;
  actualStartTime: string;
  plannedEndTime: string;
  actualEndTime: string;
  routeStatus: string;
}

interface RouteStopLog {
  id?: number;
  routeID: number;
  deliveryID?: string;
  stopType: 'Pickup' | 'Delivery' | 'Return' | 'Warehouse' | 'Fuel' | 'Break' | 'Inspection';
  stopStatus: 'Pending' | 'Arrived' | 'Completed' | 'Skipped';
  stopOrder: number;
  plannedArrival: string;
  actualArrival: string;
  stopDuration: number;
  notes: string;
}

interface DriverBehaviorLog {
  id?: number;
  driverID: string;
  behaviorType: string;
  severity: 'Low' | 'Medium' | 'High';
  points: number;
  recordedAt: string;
  notes: string;
}

interface MaintenanceEvent {
  id?: number;
  truckID: string;
  maintenanceType: string;
  serviceDate: string;
  cost: number;
  vendor: string;
  mileage: number;
  nextServiceDate: string;
  notes: string;
}

interface VehicleInspectionLog {
  id?: number;
  truckID: string;
  driverID: string;
  inspectionDate: string;
  inspectionType: 'Pre-Trip' | 'Post-Trip';
  passed: boolean;
  tiresPassed: boolean;
  brakesPassed: boolean;
  lightsPassed: boolean;
  mirrorsPassed: boolean;
  hornPassed: boolean;
  fluidLevelsPassed: boolean;
  windshieldPassed: boolean;
  safetyEquipmentPassed: boolean;
  notes: string;
}

interface FuelTransaction {
  id?: number;
  truckID: string;
  driverID: string;
  transactionDate: string;
  fuelStation: string;
  amountPurchased: number;
  pricePerLiter: number;
  totalCost: number;
  mileage: number;
  receiptNumber: string;
  notes: string;
}

interface ProofOfDeliveryLog {
  id?: number;
  deliveryID: string;
  receiverName: string;
  relationshipToCustomer: string;
  gpsLatitude: number;
  gpsLongitude: number;
  timestamp: string;
  notes: string;
}

interface DocumentRecord {
  id?: number;
  documentName: string;
  documentType: string;
  expiryDate: string;
  filePath: string;
  branchID?: string;
  truckID?: string;
  driverID?: string;
}

// Static Seed Data is completely removed. Only Live Supabase tables are used.

export default function EnterpriseHub({ deliveries, branches, trucks, users, currentUser, onAddOrUpdateDelivery, defaultView = 'customers' }: EnterpriseHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>(defaultView);
  useEffect(() => { setActiveSubTab(defaultView); }, [defaultView]);
  
  // Real live states connected to Supabase tables
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [routes, setRoutes] = useState<RouteLog[]>([]);
  const [stops, setStops] = useState<RouteStopLog[]>([]);
  const [safetyLogs, setSafetyLogs] = useState<DriverBehaviorLog[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceEvent[]>([]);
  const [inspections, setInspections] = useState<VehicleInspectionLog[]>([]);
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const pods = React.useMemo(() => {
    return (deliveries || []).filter(d => d.status === 'DELIVERED').map(d => ({
      id: d.id,
      deliveryID: d.id,
      receiverName: d.customerName,
      relationshipToCustomer: 'Customer',
      gpsLatitude: 44.6488,
      gpsLongitude: -63.5752,
      timestamp: d.deliveredAt || d.registeredAt,
      notes: d.destinationNotes || '',
      signature: d.customerSignature,
      photo: d.deliveryPhoto
    }));
  }, [deliveries]);

  const [notifications, setNotifications] = useState<any[]>([]);

  // Search queries
  const [custSearch, setCustSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  
  // Modals / forms state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState<Partial<Customer>>({
    customerNumber: '', customerType: 'Commercial', companyName: '', firstName: '', lastName: '',
    email: '', mobilePhone: '', alternatePhone: '', address1: '', address2: '', city: 'Dartmouth',
    provinceState: 'NS', postalCode: '', country: 'Canada', latitude: 44.6488, longitude: -63.5752,
    specialInstructions: '', creditLimit: 25000, isActive: true
  });

  const [showAddOrder, setShowAddOrder] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    orderNumber: '', customerID: 0, branchID: 'prospaces-dc', requestedDeliveryDate: '',
    priority: 'Normal', orderStatus: 'Created', totalWeightKg: 100, totalVolumeM3: 0.5,
    itemCount: 5, orderValue: 1250.00, notes: ''
  });

  const [showAddRoute, setShowAddRoute] = useState(false);
  const [newRoute, setNewRoute] = useState<Partial<RouteLog>>({
    routeNumber: '', truckID: '', driverID: '', branchID: 'prospaces-dc', routeDate: new Date().toISOString().split('T')[0],
    plannedDistanceKM: 50, plannedDurationMinutes: 90, plannedStartTime: '', plannedEndTime: '', routeStatus: 'Planned'
  });

  // Proof of Delivery Simulation States
  const [selectedPODOrder, setSelectedPODOrder] = useState<string>('');
  const [podReceiver, setPodReceiver] = useState('');
  const [podRelationship, setPodRelationship] = useState('Customer');
  const [podNotes, setPodNotes] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [uploadedPhotoType, setUploadedPhotoType] = useState('Delivered Package');
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [podSuccessMsg, setPodSuccessMsg] = useState('');

  // Fleet Inspection States
  const [inspTruck, setInspTruck] = useState('');
  const [inspType, setInspType] = useState<'Pre-Trip' | 'Post-Trip'>('Pre-Trip');
  const [inspChecks, setInspChecks] = useState({
    tires: true, brakes: true, lights: true, mirrors: true,
    horn: true, fluids: true, windshield: true, safety: true
  });
  const [inspNotes, setInspNotes] = useState('');
  const [inspSuccess, setInspSuccess] = useState('');

  // Fuel Logs States
  const [fuelTruck, setFuelTruck] = useState('');
  const [fuelStation, setFuelStation] = useState('');
  const [fuelLiters, setFuelLiters] = useState(50);
  const [fuelPrice, setFuelPrice] = useState(1.65);
  const [fuelOdometer, setFuelOdometer] = useState(120000);
  const [fuelReceipt, setFuelReceipt] = useState('');
  const [fuelSuccess, setFuelSuccess] = useState('');

  // Editing state hooks for records maintenance
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingInspection, setEditingInspection] = useState<VehicleInspectionLog | null>(null);
  const [editingFuel, setEditingFuel] = useState<FuelTransaction | null>(null);

  // Expiration Warn Threshold Tracker
  const [expiredCount30, setExpiredCount30] = useState(0);
  const [expiredCountExpired, setExpiredCountExpired] = useState(0);

  // Sync / loading status
  const [isSyncingWithDb, setIsSyncingWithDb] = useState(false);
  const [dbSyncMsg, setDbSyncMsg] = useState('');

  // Synchronize from live Supabase tables
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchLiveHubData = async () => {
    const supabase = getFrontendSupabase();
    if (!supabase) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      // 1. Customers
      const { data: custData, error: custError } = await supabase.from('Customers').select('*');
      
      if (custData) {
        setCustomers(custData.map((c: any) => ({
          id: Number(c.CustomerID),
          customerNumber: c.CustomerNumber || '',
          customerType: c.CustomerType || '',
          companyName: c.CompanyName || '',
          firstName: c.FirstName || '',
          lastName: c.LastName || '',
          email: c.Email || '',
          mobilePhone: c.MobilePhone || '',
          alternatePhone: c.AlternatePhone || '',
          address1: c.Address1 || '',
          address2: c.Address2 || '',
          city: c.City || '',
          provinceState: c.ProvinceState || '',
          postalCode: c.PostalCode || '',
          country: c.Country || '',
          latitude: Number(c.Latitude || 44.6488),
          longitude: Number(c.Longitude || -63.5752),
          specialInstructions: c.SpecialInstructions || '',
          creditLimit: Number(c.CreditLimit || 0),
          isActive: c.IsActive ?? true,
          createdDate: c.CreatedDate
        })));
      } else {
        setCustomers([]);
      }

      // 2. Orders
      const { data: ordData, error: ordError } = await supabase.from('Orders').select('*');
      
      if (ordData) {
        setOrders(ordData.map((o: any) => ({
          id: Number(o.OrderID),
          orderNumber: o.OrderNumber || '',
          customerID: Number(o.CustomerID || 0),
          branchID: o.BranchID || '',
          orderDate: o.OrderDate || '',
          requestedDeliveryDate: o.RequestedDeliveryDate || '',
          priority: o.Priority || 'Normal',
          orderStatus: o.OrderStatus || 'Created',
          totalWeightKg: Number(o.TotalWeightKg || 0),
          totalVolumeM3: Number(o.TotalVolumeM3 || 0),
          itemCount: Number(o.ItemCount || 0),
          orderValue: Number(o.OrderValue || 0),
          notes: o.Notes || ''
        })));
      } else {
        setOrders([]);
      }

      // 3. Routes
      const { data: routeData, error: routeError } = await supabase.from('Routes').select('*');
      
      if (routeData) {
        setRoutes(routeData.map((r: any) => ({
          id: Number(r.RouteID),
          routeNumber: r.RouteNumber || '',
          truckID: r.TruckID || '',
          driverID: r.DriverID || '',
          branchID: r.BranchID || '',
          routeDate: r.RouteDate || '',
          plannedDistanceKM: Number(r.PlannedDistanceKM || 0),
          actualDistanceKM: Number(r.ActualDistanceKM || 0),
          plannedDurationMinutes: Number(r.PlannedDurationMinutes || 0),
          actualDurationMinutes: Number(r.ActualDurationMinutes || 0),
          plannedStartTime: r.PlannedStartTime || '',
          actualStartTime: r.ActualStartTime || '',
          plannedEndTime: r.PlannedEndTime || '',
          actualEndTime: r.ActualEndTime || '',
          routeStatus: r.RouteStatus || 'Planned'
        })));
      } else {
        setRoutes([]);
      }

      // 4. Stops (RouteStops)
      const { data: stopData, error: stopError } = await supabase.from('RouteStops').select('*');
      
      if (stopData) {
        setStops(stopData.map((s: any) => ({
          id: Number(s.StopID),
          routeID: Number(s.RouteID || 0),
          deliveryID: s.DeliveryID ? String(s.DeliveryID) : undefined,
          stopType: s.StopType || 'Delivery',
          stopStatus: s.StopStatus || 'Pending',
          stopOrder: Number(s.StopOrder || 1),
          plannedArrival: s.PlannedArrival || '',
          actualArrival: s.ActualArrival || '',
          stopDuration: Number(s.StopDuration || 0),
          notes: s.Notes || ''
        })));
      } else {
        setStops([]);
      }

      // 5. Safety Logs
      const { data: safetyData, error: safetyError } = await supabase.from('driver_behaviour').select('*');
      
      if (safetyData) {
        setSafetyLogs(safetyData.map((db: any) => ({
          id: db.id,
          driverID: db.driver_id || '',
          behaviorType: db.event_type || '',
          severity: db.severity || 'Medium',
          points: Number(db.points || 0),
          recordedAt: db.event_time || '',
          notes: db.notes || ''
        })));
      } else {
        setSafetyLogs([]);
      }

      // 6. Maintenance (vehicle_maintenance)
      const { data: maintData, error: maintError } = await supabase.from('vehicle_maintenance').select('*');
      
      if (maintData) {
        setMaintenance(maintData.map((m: any) => ({
          id: m.id,
          truckID: m.truck_id || '',
          maintenanceType: m.service_type || '',
          serviceDate: m.service_date || '',
          cost: Number(m.cost || 0),
          vendor: m.vendor || '',
          mileage: Number(m.mileage || 0),
          nextServiceDate: m.next_service_date || '',
          notes: m.notes || ''
        })));
      } else {
        setMaintenance([]);
      }

      // 7. Inspections (VehicleInspections)
      const { data: inspData, error: inspError } = await supabase.from('VehicleInspections').select('*');
      
      if (inspData) {
        setInspections(inspData.map((item: any) => ({
          id: Number(item.InspectionID),
          truckID: item.TruckID || '',
          driverID: item.DriverID || '',
          inspectionDate: item.InspectionDate || '',
          inspectionType: item.InspectionType || 'Pre-Trip',
          passed: item.Passed ?? true,
          tiresPassed: item.TiresPassed ?? true,
          brakesPassed: item.BrakesPassed ?? true,
          lightsPassed: item.LightsPassed ?? true,
          mirrorsPassed: item.MirrorsPassed ?? true,
          hornPassed: item.HornPassed ?? true,
          fluidLevelsPassed: item.FluidLevelsPassed ?? true,
          windshieldPassed: item.WindshieldPassed ?? true,
          safetyEquipmentPassed: item.SafetyEquipmentPassed ?? true,
          notes: item.Notes || ''
        })));
      } else {
        setInspections([]);
      }

      // 8. FuelTransactions
      const { data: fuelData, error: fuelError } = await supabase.from('FuelTransactions').select('*');
      
      if (fuelData) {
        setFuelTransactions(fuelData.map((tx: any) => ({
          id: Number(tx.TransactionID),
          truckID: tx.TruckID || '',
          driverID: tx.DriverID || '',
          transactionDate: tx.TransactionDate || '',
          fuelStation: tx.FuelStation || '',
          amountPurchased: Number(tx.AmountPurchased || 0),
          pricePerLiter: Number(tx.PricePerLiter || 0),
          totalCost: Number(tx.TotalCost || 0),
          mileage: Number(tx.Mileage || 0),
          receiptNumber: tx.ReceiptNumber || '',
          notes: tx.Notes || ''
        })));
      } else {
        setFuelTransactions([]);
      }

      // 9. Documents
      const { data: docData, error: docError } = await supabase.from('Documents').select('*');
      
      if (docData) {
        setDocuments(docData.map((doc: any) => ({
          id: Number(doc.DocumentID),
          documentName: doc.DocumentName || '',
          documentType: doc.DocumentType || '',
          expiryDate: doc.ExpiryDate || '',
          filePath: doc.FilePath || '',
          branchID: doc.BranchID || '',
          truckID: doc.TruckID || '',
          driverID: doc.DriverID || ''
        })));
      } else {
        setDocuments([]);
      }

      // 10. Proof of Delivery (ProofOfDelivery)
      // Removed - now derived from live deliveries array
      
      // 11. Notifications
      const { data: notifData, error: notifError } = await supabase.from('Notifications').select('*');
      
      if (notifData) {
        setNotifications(notifData.map((n: any) => ({
          id: Number(n.NotificationID),
          type: n.Type || 'Info',
          message: n.Message || '',
          isRead: n.IsRead ?? false,
          createdAt: n.CreatedAt || ''
        })));
      } else {
        setNotifications([]);
      }

    } catch (err: any) {
      console.error("Error fetching from Supabase:", err);
      setLoadError(err.message || 'Error fetching live database tables.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveHubData();
  }, []);

  useEffect(() => {
    if (customers.length > 0 && !newOrder.customerID) {
      setNewOrder(prev => ({ ...prev, customerID: customers[0].id }));
    }
  }, [customers]);

  // Automated Compliance Counter
  useEffect(() => {
    let warn30 = 0;
    let expired = 0;
    const today = new Date();

    documents.forEach(doc => {
      if (!doc.expiryDate) return;
      const expDate = new Date(doc.expiryDate);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        expired++;
      } else if (diffDays <= 30) {
        warn30++;
      }
    });

    setExpiredCount30(warn30);
    setExpiredCountExpired(expired);
  }, [documents]);

  // Sync to database if Supabase credentials are valid
  const triggerDatabaseSync = async () => {
    setIsSyncingWithDb(true);
    setDbSyncMsg('Refreshing live tables from Supabase...');
    try {
      await fetchLiveHubData();
      setDbSyncMsg('Cloud synchronization completed successfully!');
    } catch (err: any) {
      console.error(err);
      setDbSyncMsg(`Sync failed: ${err.message || 'Check connection'}`);
    } finally {
      setIsSyncingWithDb(false);
      setTimeout(() => setDbSyncMsg(''), 5000);
    }
  };

  // Add / Edit customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getFrontendSupabase();
    if (!supabase) {
      alert("No active Supabase connection configured.");
      return;
    }

    try {
      const payload = {
        CustomerNumber: newCust.customerNumber,
        CustomerType: newCust.customerType,
        CompanyName: newCust.companyName,
        FirstName: newCust.firstName,
        LastName: newCust.lastName,
        Email: newCust.email,
        MobilePhone: newCust.mobilePhone,
        AlternatePhone: newCust.alternatePhone || '',
        Address1: newCust.address1,
        Address2: newCust.address2 || '',
        City: newCust.city,
        ProvinceState: newCust.provinceState,
        PostalCode: newCust.postalCode,
        Country: newCust.country,
        Latitude: newCust.latitude || 44.6488,
        Longitude: newCust.longitude || -63.5752,
        SpecialInstructions: newCust.specialInstructions || '',
        CreditLimit: newCust.creditLimit || 0,
        IsActive: newCust.isActive ?? true
      };

      if (editingCustomer) {
        const { error } = await supabase.from('Customers')
          .update(payload)
          .eq('CustomerID', editingCustomer.id);

        if (error) throw error;

        await supabase.from('Notifications').insert({
          Type: 'Customer Profile Updated',
          Message: `Commercial Profile updated: ${newCust.companyName || (newCust.firstName + ' ' + newCust.lastName)} (${newCust.customerNumber})`,
          IsRead: false
        });
      } else {
        const { error } = await supabase.from('Customers').insert(payload);
        if (error) throw error;

        await supabase.from('Notifications').insert({
          Type: 'Customer Profile Created',
          Message: `Commercial Profile registered: ${newCust.companyName || (newCust.firstName + ' ' + newCust.lastName)} (${newCust.customerNumber})`,
          IsRead: false
        });
      }

      await fetchLiveHubData();
      setShowAddCustomer(false);
      setEditingCustomer(null);
      setNewCust({
        customerNumber: '', customerType: 'Commercial', companyName: '', firstName: '', lastName: '',
        email: '', mobilePhone: '', alternatePhone: '', address1: '', address2: '', city: 'Dartmouth',
        provinceState: 'NS', postalCode: '', country: 'Canada', latitude: 44.6488, longitude: -63.5752,
        specialInstructions: '', creditLimit: 25000, isActive: true
      });
    } catch (err: any) {
      console.error(err);
      alert(`Error saving customer: ${err.message}`);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this customer profile? This will delete associated history too.")) return;
    const supabase = getFrontendSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('Customers').delete().eq('CustomerID', id);
      if (error) throw error;
      await fetchLiveHubData();
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting customer: ${err.message}`);
    }
  };

  // Add / Edit Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getFrontendSupabase();
    if (!supabase) {
      alert("No active Supabase connection.");
      return;
    }

    try {
      let data: any = null;
      let error: any = null;

      const payload = {
        OrderNumber: newOrder.orderNumber,
        CustomerID: newOrder.customerID,
        BranchID: newOrder.branchID,
        RequestedDeliveryDate: newOrder.requestedDeliveryDate,
        Priority: newOrder.priority,
        OrderStatus: newOrder.orderStatus,
        TotalWeightKg: newOrder.totalWeightKg,
        TotalVolumeM3: newOrder.totalVolumeM3,
        ItemCount: newOrder.itemCount,
        OrderValue: newOrder.orderValue,
        Notes: newOrder.notes
      };

      if (editingOrder) {
        const result = await supabase.from('Orders').update(payload).eq('OrderID', editingOrder.id).select();
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase.from('Orders').insert({
          ...payload,
          OrderDate: new Date().toISOString()
        }).select();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      const savedOrder = data?.[0];
      const orderIdVal = savedOrder ? Number(savedOrder.OrderID) : (editingOrder?.id || 101);

      if (onAddOrUpdateDelivery) {
        const selectedCust = customers.find(c => c.id === Number(newOrder.customerID));
        const deliveryAddress = selectedCust 
          ? `${selectedCust.address1}, ${selectedCust.city}, ${selectedCust.provinceState}` 
          : '120 Windmill Road, Dartmouth';
          
        onAddOrUpdateDelivery({
          id: `SO-${newOrder.orderNumber}`,
          invoiceNumber: `INV-${100000 + orderIdVal}`,
          epicorSalesOrder: newOrder.orderNumber,
          customerName: selectedCust ? selectedCust.companyName : 'Atlantic Builders',
          deliveryAddress,
          phone: selectedCust ? selectedCust.mobilePhone : '902-555-0101',
          originBranch: newOrder.branchID || 'prospaces-dc',
          weight: `${newOrder.totalWeightKg} kg`,
          orderTotal: `$${newOrder.orderValue}`,
          status: newOrder.orderStatus === 'Completed' ? 'DELIVERED' : 'REGISTERED',
          registeredAt: new Date().toISOString(),
          history: [{ status: 'REGISTERED', timestamp: new Date().toISOString(), location: 'Windmill DC', operator: 'System Dispatcher' }]
        });
      }

      await supabase.from('Notifications').insert({
        Type: editingOrder ? 'Order Updated' : 'Order Approved',
        Message: `Order ${newOrder.orderNumber} ($${newOrder.orderValue}) was ${editingOrder ? 'updated' : 'routed to central dispatch'} successfully.`,
        IsRead: false
      });

      await fetchLiveHubData();
      setShowAddOrder(false);
      setEditingOrder(null);
      setNewOrder({
        orderNumber: '', customerID: customers[0]?.id || 0, branchID: 'prospaces-dc', requestedDeliveryDate: '',
        priority: 'Normal', orderStatus: 'Created', totalWeightKg: 100, totalVolumeM3: 0.5,
        itemCount: 5, orderValue: 1250.00, notes: ''
      });
    } catch (err: any) {
      console.error(err);
      alert(`Error saving order: ${err.message}`);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this order?")) return;
    const supabase = getFrontendSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('Orders').delete().eq('OrderID', id);
      if (error) throw error;
      await fetchLiveHubData();
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting order: ${err.message}`);
    }
  };

  // Canvas Drawing for Signatures (Support mouse & mobile touch)
  const getTouchPos = (canvas: HTMLCanvasElement, touchEvent: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
    if (!touch) return { x: 0, y: 0 };
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const pos = getTouchPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getTouchPos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const endDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base64 = canvas.toDataURL();
    setSignatureData(base64);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const originalBase64 = reader.result as string;
        // Compress and downscale the image client-side to ensure the base64 payload is compact and syncs reliably to Supabase
        const img = new Image();
        img.src = originalBase64;
        img.onload = () => {
          const max_size = 1024; // max dimension (width or height)
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height = Math.round((height * max_size) / width);
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width = Math.round((width * max_size) / height);
              height = max_size;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            setUploadedPhotoPath(compressedBase64);
          } else {
            setUploadedPhotoPath(originalBase64);
          }
        };
        img.onerror = () => {
          setUploadedPhotoPath(originalBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  // Log Proof of Delivery (POD)
  const handleLogPOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPODOrder) return;

    try {
      if (onAddOrUpdateDelivery) {
        const targetDelivery = (deliveries || []).find(d => d.id === selectedPODOrder);
        if (targetDelivery) {
          const newHistory = [
            ...(targetDelivery.history || []),
            {
              status: 'DELIVERED',
              timestamp: new Date().toISOString(),
              location: 'Delivery Site',
              operator: currentUser?.name || 'Driver',
              notes: podNotes || 'Delivered to recipient',
              customerSignature: signatureData || undefined,
              deliveryPhoto: uploadedPhotoPath || undefined
            }
          ];

          onAddOrUpdateDelivery({
            ...targetDelivery,
            status: 'DELIVERED',
            deliveredAt: new Date().toISOString(),
            customerSignature: signatureData || undefined,
            deliveryPhoto: uploadedPhotoPath || undefined,
            history: newHistory
          });
        }
      }

      setPodSuccessMsg(`Electronic POD successfully logged for ${selectedPODOrder}!`);

      setTimeout(() => {
        setPodSuccessMsg('');
        setPodReceiver('');
        setPodNotes('');
        setSignatureData(null);
        setUploadedPhotoPath(null);
        setSelectedPODOrder('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        clearSignature();
      }, 4000);
    } catch (err: any) {
      console.error(err);
      alert(`Error logging POD: ${err.message}`);
    }
  };

  // Submit digital vehicle DOT inspection
  const handleLogInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspTruck) return;

    const supabase = getFrontendSupabase();
    if (!supabase) {
      alert("No active Supabase connection.");
      return;
    }

    const allPassed = Object.values(inspChecks).every(v => v === true);

    try {
      const payload = {
        TruckID: inspTruck,
        DriverID: currentUser?.id || 'usr-1',
        InspectionType: inspType,
        Passed: allPassed,
        TiresPassed: inspChecks.tires,
        BrakesPassed: inspChecks.brakes,
        LightsPassed: inspChecks.lights,
        MirrorsPassed: inspChecks.mirrors,
        HornPassed: inspChecks.horn,
        FluidLevelsPassed: inspChecks.fluids,
        WindshieldPassed: inspChecks.windshield,
        SafetyEquipmentPassed: inspChecks.safety,
        Notes: inspNotes
      };

      if (editingInspection) {
        const { error } = await supabase.from('VehicleInspections')
          .update(payload)
          .eq('InspectionID', editingInspection.id);
        if (error) throw error;
        setInspSuccess(`DOT inspection updated successfully.`);
      } else {
        const { error } = await supabase.from('VehicleInspections').insert({
          ...payload,
          InspectionDate: new Date().toISOString()
        });
        if (error) throw error;
        setInspSuccess(`DOT inspection logged successfully. Vehicle is ${allPassed ? 'APPROVED' : 'FLAGGED FOR MAINTENANCE'}`);
      }

      await fetchLiveHubData();
      setEditingInspection(null);
      setInspTruck('');
      setInspNotes('');

      setTimeout(() => {
        setInspSuccess('');
      }, 4000);
    } catch (err: any) {
      console.error(err);
      alert(`Error saving inspection: ${err.message}`);
    }
  };

  const handleDeleteInspection = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this DOT inspection record?")) return;
    const supabase = getFrontendSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('VehicleInspections').delete().eq('InspectionID', id);
      if (error) throw error;
      await fetchLiveHubData();
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting inspection: ${err.message}`);
    }
  };

  // Submit Fuel Purchase
  const handleLogFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelTruck) return;

    const supabase = getFrontendSupabase();
    if (!supabase) {
      alert("No active Supabase connection.");
      return;
    }

    const total = Number((fuelLiters * fuelPrice).toFixed(2));

    try {
      const payload = {
        TruckID: fuelTruck,
        DriverID: currentUser?.id || 'usr-1',
        FuelStation: fuelStation || 'Irving Dartmouth',
        AmountPurchased: fuelLiters,
        PricePerLiter: fuelPrice,
        TotalCost: total,
        Mileage: fuelOdometer,
        ReceiptNumber: fuelReceipt || `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        Notes: ''
      };

      if (editingFuel) {
        const { error } = await supabase.from('FuelTransactions')
          .update(payload)
          .eq('TransactionID', editingFuel.id);
        if (error) throw error;
        setFuelSuccess(`Fuel transaction updated successfully.`);
      } else {
        const { error } = await supabase.from('FuelTransactions').insert({
          ...payload,
          TransactionDate: new Date().toISOString()
        });
        if (error) throw error;
        setFuelSuccess(`Fuel transaction of $${total} logged successfully.`);
      }

      await fetchLiveHubData();
      setEditingFuel(null);
      setFuelTruck('');
      setFuelStation('');
      setFuelReceipt('');

      setTimeout(() => {
        setFuelSuccess('');
      }, 4000);
    } catch (err: any) {
      console.error(err);
      alert(`Error saving fuel purchase: ${err.message}`);
    }
  };

  const handleDeleteFuel = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this fuel purchase record?")) return;
    const supabase = getFrontendSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('FuelTransactions').delete().eq('TransactionID', id);
      if (error) throw error;
      await fetchLiveHubData();
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting fuel purchase: ${err.message}`);
    }
  };

  // Compliance Document states
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDoc, setNewDoc] = useState<Partial<DocumentRecord>>({
    documentName: '', documentType: 'Driver License', expiryDate: '', filePath: '', branchID: 'prospaces-dc', truckID: '', driverID: ''
  });
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getFrontendSupabase();
    if (!supabase) {
      alert("No active Supabase connection.");
      return;
    }

    try {
      const payload = {
        DocumentName: newDoc.documentName,
        DocumentType: newDoc.documentType,
        ExpiryDate: newDoc.expiryDate,
        FilePath: newDoc.filePath || `/docs/doc_${Date.now() % 10000}.pdf`,
        BranchID: newDoc.branchID || 'prospaces-dc',
        TruckID: newDoc.truckID || null,
        DriverID: newDoc.driverID || null
      };

      if (editingDoc) {
        const { error } = await supabase.from('Documents')
          .update(payload)
          .eq('DocumentID', editingDoc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('Documents').insert(payload);
        if (error) throw error;
      }

      await fetchLiveHubData();
      setShowAddDoc(false);
      setEditingDoc(null);
      setNewDoc({
        documentName: '', documentType: 'Driver License', expiryDate: '', filePath: '', branchID: 'prospaces-dc', truckID: '', driverID: ''
      });
    } catch (err: any) {
      console.error(err);
      alert(`Error saving compliance document: ${err.message}`);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this compliance document?")) return;
    const supabase = getFrontendSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('Documents').delete().eq('DocumentID', id);
      if (error) throw error;
      await fetchLiveHubData();
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting compliance document: ${err.message}`);
    }
  };

  // Helper functions to populate forms for editing
  const startEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setNewCust({
      customerNumber: c.customerNumber,
      customerType: c.customerType,
      companyName: c.companyName,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      mobilePhone: c.mobilePhone,
      alternatePhone: c.alternatePhone,
      address1: c.address1,
      address2: c.address2,
      city: c.city,
      provinceState: c.provinceState,
      postalCode: c.postalCode,
      country: c.country,
      latitude: c.latitude,
      longitude: c.longitude,
      specialInstructions: c.specialInstructions,
      creditLimit: c.creditLimit,
      isActive: c.isActive
    });
    setShowAddCustomer(true);
  };

  const startEditOrder = (o: Order) => {
    setEditingOrder(o);
    setNewOrder({
      orderNumber: o.orderNumber,
      customerID: o.customerID,
      branchID: o.branchID,
      requestedDeliveryDate: o.requestedDeliveryDate,
      priority: o.priority,
      orderStatus: o.orderStatus,
      totalWeightKg: o.totalWeightKg,
      totalVolumeM3: o.totalVolumeM3,
      itemCount: o.itemCount,
      orderValue: o.orderValue,
      notes: o.notes
    });
    setShowAddOrder(true);
  };

  const startEditInspection = (item: VehicleInspectionLog) => {
    setEditingInspection(item);
    setInspTruck(item.truckID);
    setInspType(item.inspectionType);
    setInspChecks({
      tires: item.tiresPassed,
      brakes: item.brakesPassed,
      lights: item.lightsPassed,
      mirrors: item.mirrorsPassed,
      horn: item.hornPassed,
      fluids: item.fluidLevelsPassed,
      windshield: item.windshieldPassed,
      safety: item.safetyEquipmentPassed
    });
    setInspNotes(item.notes);
  };

  const startEditFuel = (tx: FuelTransaction) => {
    setEditingFuel(tx);
    setFuelTruck(tx.truckID);
    setFuelStation(tx.fuelStation);
    setFuelLiters(tx.amountPurchased);
    setFuelPrice(tx.pricePerLiter);
    setFuelOdometer(tx.mileage);
    setFuelReceipt(tx.receiptNumber);
  };

  const startEditDoc = (doc: DocumentRecord) => {
    setEditingDoc(doc);
    setNewDoc({
      documentName: doc.documentName,
      documentType: doc.documentType,
      expiryDate: doc.expiryDate,
      filePath: doc.filePath,
      branchID: doc.branchID || 'prospaces-dc',
      truckID: doc.truckID || '',
      driverID: doc.driverID || ''
    });
    setShowAddDoc(true);
  };

  // Helper safety scores calculation (100 minus penalty points based on driver events)
  const getDriverSafetyScore = (driverId: string) => {
    const driverEvents = safetyLogs.filter(log => log.driverID === driverId);
    const penaltyPoints = driverEvents.reduce((acc, ev) => acc + (ev.points || 0), 0);
    return Math.max(10, 100 - penaltyPoints);
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => 
    c.companyName.toLowerCase().includes(custSearch.toLowerCase()) ||
    c.customerNumber.toLowerCase().includes(custSearch.toLowerCase()) ||
    c.city.toLowerCase().includes(custSearch.toLowerCase())
  );

  const combinedOrders = React.useMemo(() => {
    const deliveryOrders = (deliveries || []).map(d => ({
      id: d.id,
      orderNumber: d.invoiceNumber || d.epicorSalesOrder || (d.id || '').substring(0, 8),
      customerID: 'delivery',
      customerNameStr: d.customerName,
      branchID: d.originBranch,
      orderDate: d.registeredAt,
      requestedDeliveryDate: d.registeredAt,
      priority: 'Normal',
      orderStatus: d.status,
      totalWeightKg: d.weight ? parseFloat(d.weight) || 0 : 0,
      totalVolumeM3: 0,
      itemCount: d.orderTotal ? parseFloat(d.orderTotal) || 1 : 1,
      orderValue: 0,
      notes: d.destinationNotes || '',
      hasSignature: !!d.customerSignature,
      hasPhoto: !!d.deliveryPhoto
    } as Order));
    return [...deliveryOrders, ...orders];
  }, [deliveries, orders]);

  // Filter orders
  const filteredOrders = combinedOrders.filter(o => 
    o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
    String(o.customerID).includes(orderSearch) ||
    (o.customerNameStr || '').toLowerCase().includes(orderSearch.toLowerCase())
  );

  const isDriver = currentUser?.role === 'Driver';

  return (
    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl shadow-xs overflow-hidden w-full p-4 md:p-6" id="enterprise-logistics-hub">
      {/* Upper header action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/80 pb-5 mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className={`p-2 rounded-lg ${isDriver ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
              {isDriver ? (
                <TruckIcon className="h-5 w-5 text-emerald-600" />
              ) : (
                <Sparkles className="h-5 w-5 text-blue-600" />
              )}
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {isDriver ? 'Driver Mobile Portal' : 'Enterprise Logistics Hub'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isDriver 
              ? 'Complete electronic proofs of delivery, submit vehicle pre-trips, and log fuel transactions.'
              : 'Multi-phase central hub for Customers, Orders, Compliance, Maintenance, Fuel Management and Signatures.'}
          </p>
        </div>

        {/* Sync buttons & stats - only shown for dispatchers/admins */}
        {!isDriver && (
          <div className="flex items-center gap-2">
            {expiredCount30 > 0 && (
              <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-1.5 text-amber-800 text-xs font-semibold">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 animate-bounce" />
                <span>{expiredCount30} Expirations Due (30d)</span>
              </div>
            )}

            <button
              onClick={triggerDatabaseSync}
              disabled={isSyncingWithDb}
              className={`px-4 py-2 text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition-all text-white ${
                isSyncingWithDb ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-800 hover:bg-blue-900'
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingWithDb ? 'animate-spin' : ''}`} />
              <span>{isSyncingWithDb ? 'Syncing...' : 'Sync to Supabase'}</span>
            </button>
          </div>
        )}
      </div>

      {dbSyncMsg && (
        <div className="p-3 mb-4 bg-slate-800 text-slate-100 border-l-4 border-blue-500 rounded-r-lg text-xs font-mono flex items-center justify-between animate-fade-in">
          <span>{dbSyncMsg}</span>
          <button onClick={() => setDbSyncMsg('')} className="text-slate-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="bg-white border border-slate-200/60 p-1 rounded-xl flex flex-nowrap overflow-x-auto gap-1 shadow-xs w-full scrollbar-none select-none mb-6">
        {[
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'routes', label: 'Routes & Stops', icon: RouteIcon },
          { id: 'maintenance', label: 'Maintenance', icon: Wrench },
          { id: 'pod', label: 'Proof of Delivery', icon: Signature },
          { id: 'safety', label: 'Safety Scorecards', icon: ShieldCheck },
          { id: 'inspections', label: 'DOT Inspections', icon: ClipboardList },
          { id: 'fuel', label: 'Fuel Tracking', icon: Fuel },
          { id: 'compliance', label: 'Compliance Vault', icon: FileText },
          { id: 'notifications', label: 'Alerts', icon: Bell }
        ].filter(tab => {
          if (isDriver) {
            return ['pod', 'inspections', 'fuel'].includes(tab.id);
          }
          return true;
        }).map(tab => {
          const IconComp = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`shrink-0 py-2.5 px-4 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-slate-50 hover:text-gray-900'
              }`}
            >
              <IconComp className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: CUSTOMERS */}
      {activeSubTab === 'customers' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 border border-slate-200/50 rounded-xl shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search customers by company, number, region..."
                value={custSearch}
                onChange={e => setCustSearch(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-xs rounded-lg border border-slate-200 focus:outline-blue-500 bg-slate-50"
              />
            </div>
            <button 
              onClick={() => {
                setEditingCustomer(null);
                setNewCust({
                  customerNumber: '', customerType: 'Commercial', companyName: '', firstName: '', lastName: '',
                  email: '', mobilePhone: '', alternatePhone: '', address1: '', address2: '', city: 'Dartmouth',
                  provinceState: 'NS', postalCode: '', country: 'Canada', latitude: 44.6488, longitude: -63.5752,
                  specialInstructions: '', creditLimit: 25000, isActive: true
                });
                setShowAddCustomer(!showAddCustomer);
              }}
              className="px-3.5 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Customer</span>
            </button>
          </div>

          {showAddCustomer && (
            <form onSubmit={handleCreateCustomer} className="p-4 bg-white border border-slate-200/70 rounded-xl space-y-4 shadow-sm animate-fade-in">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {editingCustomer ? 'Edit Commercial/Residential Profile' : 'Register New Commercial/Residential Profile'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Customer Number</label>
                  <input required type="text" placeholder="e.g. CUST-901" value={newCust.customerNumber} onChange={e => setNewCust({...newCust, customerNumber: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Customer Type</label>
                  <select value={newCust.customerType} onChange={e => setNewCust({...newCust, customerType: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500">
                    <option value="Commercial">Commercial</option>
                    <option value="Residential">Residential</option>
                    <option value="Government">Government</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Company Name</label>
                  <input required type="text" placeholder="e.g. Dartmouth Framing" value={newCust.companyName} onChange={e => setNewCust({...newCust, companyName: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Contact First Name</label>
                  <input required type="text" value={newCust.firstName} onChange={e => setNewCust({...newCust, firstName: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Contact Last Name</label>
                  <input required type="text" value={newCust.lastName} onChange={e => setNewCust({...newCust, lastName: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Email Address</label>
                  <input required type="email" placeholder="john@company.com" value={newCust.email} onChange={e => setNewCust({...newCust, email: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Street Address 1</label>
                  <input required type="text" placeholder="100 Windmill Road" value={newCust.address1} onChange={e => setNewCust({...newCust, address1: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">City</label>
                  <input required type="text" value={newCust.city} onChange={e => setNewCust({...newCust, city: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Postal Code</label>
                  <input required type="text" placeholder="B3B 1B7" value={newCust.postalCode} onChange={e => setNewCust({...newCust, postalCode: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Credit Limit ($)</label>
                  <input type="number" value={newCust.creditLimit} onChange={e => setNewCust({...newCust, creditLimit: Number(e.target.value)})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Mobile Phone</label>
                  <input required type="tel" placeholder="902-555-0101" value={newCust.mobilePhone} onChange={e => setNewCust({...newCust, mobilePhone: formatPhoneNumber(e.target.value)})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Special Delivery Instructions</label>
                <textarea rows={2} placeholder="e.g. Enter rear gate..." value={newCust.specialInstructions} onChange={e => setNewCust({...newCust, specialInstructions: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddCustomer(false);
                    setEditingCustomer(null);
                    setNewCust({
                      customerNumber: '', customerType: 'Commercial', companyName: '', firstName: '', lastName: '',
                      email: '', mobilePhone: '', alternatePhone: '', address1: '', address2: '', city: 'Dartmouth',
                      provinceState: 'NS', postalCode: '', country: 'Canada', latitude: 44.6488, longitude: -63.5752,
                      specialInstructions: '', creditLimit: 25000, isActive: true
                    });
                  }} 
                  className="px-3.5 py-2 border border-slate-200 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3.5 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-lg">
                  {editingCustomer ? 'Update Profile' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Company / Client</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">HQ / Location</th>
                  <th className="px-4 py-3">Email & Contact</th>
                  <th className="px-4 py-3 text-right">Credit Limit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-800">{c.customerNumber}</td>
                    <td className="px-4 py-3">
                      <div>
                        <strong className="text-slate-900 block font-semibold">{c.companyName}</strong>
                        <span className="text-[10px] text-slate-400">{c.firstName} {c.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.customerType === 'Commercial' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {c.customerType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>
                        <span className="block font-medium text-slate-800">{c.address1}</span>
                        <span className="text-[10px] text-slate-400">{c.city}, {c.provinceState} | Lat:{c.latitude.toFixed(3)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="block text-slate-700 font-medium">{c.mobilePhone}</span>
                        <span className="text-[10px] text-slate-400 block">{c.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                      ${c.creditLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center space-x-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase">Active</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => startEditCustomer(c)}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-[10px] font-bold rounded text-slate-700 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(Number(c.id))}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 hover:text-red-800 text-[10px] font-bold rounded text-red-700 transition-all"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* SUB-VIEW 2: ORDERS */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 border border-slate-200/50 rounded-xl shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search orders..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-xs rounded-lg border border-slate-200 focus:outline-blue-500 bg-slate-50"
              />
            </div>
            <button 
              onClick={() => {
                setEditingOrder(null);
                setNewOrder({
                  orderNumber: '', customerID: customers[0]?.id || 0, branchID: 'prospaces-dc', requestedDeliveryDate: '',
                  priority: 'Normal', orderStatus: 'Created', totalWeightKg: 100, totalVolumeM3: 0.5,
                  itemCount: 5, orderValue: 1250.00, notes: ''
                });
                setShowAddOrder(!showAddOrder);
              }}
              className="px-3.5 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Order</span>
            </button>
          </div>

          {showAddOrder && (
            <form onSubmit={handleCreateOrder} className="p-4 bg-white border border-slate-200/70 rounded-xl space-y-4 shadow-sm animate-fade-in">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {editingOrder ? 'Edit Logistical Delivery Order' : 'Create New Logistical Delivery Order'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Order Number</label>
                  <input required type="text" placeholder="e.g. ORD-2026-004" value={newOrder.orderNumber} onChange={e => setNewOrder({...newOrder, orderNumber: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Customer Associated</label>
                  <select value={newOrder.customerID} onChange={e => setNewOrder({...newOrder, customerID: Number(e.target.value)})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500">
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.companyName} ({c.customerNumber})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Source Depot / Branch</label>
                  <select value={newOrder.branchID} onChange={e => setNewOrder({...newOrder, branchID: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500">
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Priority</label>
                  <select value={newOrder.priority} onChange={e => setNewOrder({...newOrder, priority: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500">
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Requested Delivery Date</label>
                  <input required type="datetime-local" value={newOrder.requestedDeliveryDate} onChange={e => setNewOrder({...newOrder, requestedDeliveryDate: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Order Value ($)</label>
                  <input type="number" step="0.01" value={newOrder.orderValue} onChange={e => setNewOrder({...newOrder, orderValue: Number(e.target.value)})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Total Weight (Kg)</label>
                  <input type="number" step="0.1" value={newOrder.totalWeightKg} onChange={e => setNewOrder({...newOrder, totalWeightKg: Number(e.target.value)})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Total Volume (m³)</label>
                  <input type="number" step="0.01" value={newOrder.totalVolumeM3} onChange={e => setNewOrder({...newOrder, totalVolumeM3: Number(e.target.value)})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Items / Packages Count</label>
                  <input type="number" value={newOrder.itemCount} onChange={e => setNewOrder({...newOrder, itemCount: Number(e.target.value)})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Order Status</label>
                  <select value={newOrder.orderStatus} onChange={e => setNewOrder({...newOrder, orderStatus: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500">
                    <option value="Created">Created</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Dispatcher Operational Notes</label>
                <textarea rows={2} value={newOrder.notes} onChange={e => setNewOrder({...newOrder, notes: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddOrder(false);
                    setEditingOrder(null);
                    setNewOrder({
                      orderNumber: '', customerID: customers[0]?.id || 0, branchID: 'prospaces-dc', requestedDeliveryDate: '',
                      priority: 'Normal', orderStatus: 'Created', totalWeightKg: 100, totalVolumeM3: 0.5,
                      itemCount: 5, orderValue: 1250.00, notes: ''
                    });
                  }} 
                  className="px-3.5 py-2 border border-slate-200 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3.5 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-lg">
                  {editingOrder ? 'Update Order' : 'Approve & Dispatch'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer Profile</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Req. Delivery</th>
                  <th className="px-4 py-3 text-right">Weight / Vol</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredOrders.map(o => {
                  const cust = customers.find(c => c.id === o.customerID);
                  const displayCustomerName = cust ? cust.companyName : (o.customerNameStr || `ID: ${o.customerID}`);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {displayCustomerName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.priority === 'High' ? 'bg-red-100 text-red-800' : o.priority === 'Normal' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {o.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-[10px]">
                        {new Date(o.requestedDeliveryDate || Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <div>
                          <strong className="text-slate-800">{o.totalWeightKg} Kg</strong>
                          <span className="text-[10px] text-slate-400 block">{o.totalVolumeM3} m³ | {o.itemCount} pkgs</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        ${o.orderValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.orderStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>
                          {o.orderStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {o.customerID === 'delivery' ? (
                          <span className="px-2 py-1 bg-slate-100 text-[10px] font-bold rounded text-slate-500 flex flex-col items-end gap-1">
                            <span>Freight Board Item</span>
                            <span className="flex items-center gap-1.5 mt-0.5">
                              {o.hasSignature && <span className="text-blue-600 flex items-center bg-blue-50 px-1 rounded"><Signature className="h-3 w-3 mr-0.5" /> Signed</span>}
                              {o.hasPhoto && <span className="text-emerald-600 flex items-center bg-emerald-50 px-1 rounded"><Camera className="h-3 w-3 mr-0.5" /> Photo</span>}
                            </span>
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditOrder(o)}
                              className="px-2 py-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-[10px] font-bold rounded text-slate-700 transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(Number(o.id))}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 hover:text-red-800 text-[10px] font-bold rounded text-red-700 transition-all"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* SUB-VIEW 3: PROOF OF DELIVERY & SIGNATURES */}
      {activeSubTab === 'pod' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Simulation controller */}
          <div className="bg-white p-5 border border-slate-200/50 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Signature className="h-5 w-5 text-blue-700 animate-pulse" />
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Electronic Signature & Photo Upload</h3>
            </div>

            {podSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{podSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogPOD} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Select Dispatched Active Order</label>
                <select 
                  required
                  value={selectedPODOrder} 
                  onChange={e => setSelectedPODOrder(e.target.value)} 
                  className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500"
                >
                  <option value="">-- Choose Dispatched Active Delivery --</option>
                  {(deliveries || []).filter(d => d.status === 'PICKED_AND_LOADED' || d.status === 'REGISTERED').map(d => (
                    <option key={d.id} value={d.id}>{d.id} - {d.customerName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Receiver Person Name</label>
                  <input required type="text" placeholder="e.g. John Smith" value={podReceiver} onChange={e => setPodReceiver(e.target.value)} className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Relationship to Customer</label>
                  <select value={podRelationship} onChange={e => setPodRelationship(e.target.value)} className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500">
                    <option value="Customer">Primary Customer</option>
                    <option value="Employee">Site Foreman / Employee</option>
                    <option value="Neighbor">Neighboring tenant</option>
                    <option value="Porch">Left on porch / unattended</option>
                  </select>
                </div>
              </div>

              {/* DRAW SIGNATURE CANVAS */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500">Sign Ink Signature</label>
                  <div className="space-x-1">
                    <button type="button" onClick={clearSignature} className="px-1.5 py-0.5 text-[9px] font-extrabold border border-slate-200 rounded hover:bg-slate-50">Clear</button>
                    <button type="button" onClick={saveSignature} className="px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-800 text-white rounded hover:bg-blue-900">Lock Ink</button>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden relative">
                  <canvas 
                    ref={canvasRef}
                    width={400}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={() => setIsDrawing(false)}
                    onMouseLeave={() => setIsDrawing(false)}
                    onTouchStart={startDrawingTouch}
                    onTouchMove={drawTouch}
                    onTouchEnd={endDrawingTouch}
                    className="w-full bg-slate-50 cursor-crosshair h-[120px] touch-none"
                  />
                  {!signatureData && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-[10px] text-slate-400 font-mono">
                      Draw signature above with cursor or finger
                    </div>
                  )}
                </div>
                {signatureData && (
                  <div className="mt-1 flex items-center space-x-1 text-[10px] text-emerald-800 font-medium">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Signature ink locked successfully.</span>
                  </div>
                )}
              </div>

              {/* PHOTO UPLOAD */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Proof of Delivery Photo Category</label>
                <div className="flex gap-2">
                  <select value={uploadedPhotoType} onChange={e => setUploadedPhotoType(e.target.value)} className="p-2 text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500 flex-1">
                    <option value="Delivered Package">Delivered Package in Front Lobby</option>
                    <option value="Damage">Damage Pre-existing Check</option>
                    <option value="Pickup Condition">Warehouse Loading state</option>
                    <option value="Return">Returned Freight Verification</option>
                  </select>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    ref={fileInputRef} 
                    onChange={handlePhotoCapture} 
                    className="hidden" 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold flex items-center space-x-1"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Take Photo</span>
                  </button>
                </div>
                {uploadedPhotoPath && (
                  <div className="mt-2 text-[10px] flex items-center justify-center bg-slate-50 p-2 rounded border border-slate-200">
                    <img src={uploadedPhotoPath} alt="Captured delivery proof" className="max-h-32 object-contain rounded" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Recipient delivery notes / exceptions</label>
                <textarea rows={2} placeholder="e.g. Forklift operator unloaded safely to backyard..." value={podNotes} onChange={e => setPodNotes(e.target.value)} className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500" />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition-all flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Submit Digital Proof of Delivery (EPOD)</span>
              </button>
            </form>
          </div>

          {/* Historical Logs and receipt layout */}
          <div className="bg-white p-5 border border-slate-200/50 rounded-xl shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Active Proof of Delivery Records</h3>
            
            {pods.length === 0 ? (
              <div className="p-10 text-center space-y-2 border-2 border-dashed border-slate-100 rounded-xl">
                <Signature className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400">No active EPODs logged. Submit the simulation form to trigger real-time POD capture.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto scrollbar-none pr-1">
                {pods.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-blue-800 font-mono">ORDER: {p.deliveryID}</span>
                      <span className="text-slate-400 text-[10px]">{new Date(p.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <strong>Recipient:</strong> {p.receiverName} ({p.relationshipToCustomer})
                      </div>
                      <div>
                        <strong>Coordinates:</strong> {p.gpsLatitude.toFixed(4)}, {p.gpsLongitude.toFixed(4)}
                      </div>
                    </div>
                    {p.notes && (
                      <p className="p-1.5 bg-white border border-slate-100 rounded text-[10px] text-slate-500 italic">
                        "{p.notes}"
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {p.signature && (
                        <div className="bg-white p-1 border border-slate-200 rounded">
                          <div className="text-[9px] font-bold text-slate-400 mb-1">Customer Signature</div>
                          {p.signature.startsWith('data:image') ? (
                            <img src={p.signature} alt="Signature" className="h-10 object-contain mx-auto" />
                          ) : (
                            <div className="h-10 flex items-center justify-center font-mono text-[9px] text-slate-500 bg-slate-50 rounded">
                              {p.signature}
                            </div>
                          )}
                        </div>
                      )}
                      {p.photo && (
                         <div className="bg-white p-1 border border-slate-200 rounded flex items-center space-x-2">
                           <Camera className="h-4 w-4 text-slate-400 shrink-0" />
                           <div className="text-[9px] font-mono text-slate-600 truncate" title={p.photo}>
                             {p.photo}
                           </div>
                         </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[9px] text-slate-400">
                      <span className="px-1 bg-emerald-100 text-emerald-800 rounded font-bold font-mono">DELIVERED</span>
                      <span>Signature and telemetry stored on Cloud block.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: DRIVER SAFETY & SCORECARDS */}
      {activeSubTab === 'safety' && (
        <div className="space-y-6 animate-fade-in">
          {/* Driver Safety Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {users.filter(u => u.role === 'Driver').map(driver => {
              const score = getDriverSafetyScore(driver.id);
              const events = safetyLogs.filter(log => log.driverID === driver.id);
              return (
                <div key={driver.id} className="bg-white p-4 border border-slate-200/50 rounded-xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-500 uppercase">Driver Safety Score</h4>
                      <strong className="text-sm font-semibold text-slate-800 block mt-0.5">{driver.name}</strong>
                    </div>
                    <span className={`p-2 rounded-lg text-xs font-extrabold font-mono flex items-center justify-center h-12 w-12 border ${
                      score >= 90 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : score >= 75 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      {score}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <div>
                      <span className="block font-medium">Overspeed Events:</span>
                      <strong className="text-slate-700 font-semibold">{events.filter(e => e.behaviorType === 'Speeding').length}</strong>
                    </div>
                    <div>
                      <span className="block font-medium">Harsh Braking:</span>
                      <strong className="text-slate-700 font-semibold">{events.filter(e => e.behaviorType === 'Harsh Braking').length}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Event Log */}
          <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Telemetric Safety Violations Event Log</h3>
              <span className="text-[10px] text-slate-400 font-mono">Sensors sync: 300ms intervals</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Recorded At</th>
                  <th className="px-4 py-3">Driver Profile</th>
                  <th className="px-4 py-3">Violation Event</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Deduction Points</th>
                  <th className="px-4 py-3">Sensory Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {safetyLogs.map(log => {
                  const drv = users.find(u => u.id === log.driverID);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{new Date(log.recordedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{drv ? drv.name : 'Unknown Driver'}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center space-x-1.5 font-medium text-slate-800">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                          <span>{log.behaviorType}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          log.severity === 'High' ? 'bg-red-100 text-red-800' : log.severity === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">-{log.points} pts</td>
                      <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">{log.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* SUB-VIEW 5: VEHICLE INSPECTIONS */}
      {activeSubTab === 'inspections' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form */}
          <div className="lg:col-span-1 bg-white p-5 border border-slate-200/50 rounded-xl shadow-xs space-y-4 h-fit">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              {editingInspection ? 'Edit DOT Inspection Log' : 'Perform Digital Pre/Post Trip DOT Inspection'}
            </h3>
            
            {inspSuccess && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>{inspSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLogInspection} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Select Truck / Vehicle</label>
                <select required value={inspTruck} onChange={e => setInspTruck(e.target.value)} className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500">
                  <option value="">-- Choose Truck --</option>
                  {trucks.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Inspection Window</label>
                <select value={inspType} onChange={e => setInspType(e.target.value as any)} className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500">
                  <option value="Pre-Trip">Pre-Trip (Safety Walkaround)</option>
                  <option value="Post-Trip">Post-Trip (End of shift)</option>
                </select>
              </div>

              {/* Grid of checkmarks */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                {Object.keys(inspChecks).map(key => {
                  const typedKey = key as keyof typeof inspChecks;
                  return (
                    <label key={key} className="flex items-center space-x-2 py-1 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={inspChecks[typedKey]} 
                        onChange={e => setInspChecks({...inspChecks, [typedKey]: e.target.checked})}
                        className="rounded text-blue-800 focus:ring-blue-500"
                      />
                      <span className="text-[11px] font-medium text-slate-700 capitalize">{key}</span>
                    </label>
                  );
                })}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Inspector Notes</label>
                <textarea rows={2} placeholder="All tire pressure and oil level verified..." value={inspNotes} onChange={e => setInspNotes(e.target.value)} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
              </div>

              <div className="flex space-x-2">
                {editingInspection && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingInspection(null);
                      setInspTruck('');
                      setInspNotes('');
                      setInspChecks({
                        tires: true, brakes: true, lights: true, mirrors: true, horn: true, fluids: true, windshield: true, safety: true
                      });
                    }} 
                    className="flex-1 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="flex-1 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded text-xs font-bold transition-all">
                  {editingInspection ? 'Update Log' : 'Certify & File Inspection'}
                </button>
              </div>
            </form>
          </div>

          {/* History table */}
          <div className="lg:col-span-2 bg-white p-5 border border-slate-200/50 rounded-xl shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">DOT Compliance Inspections Log</h3>
            
            <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-none pr-1">
              {inspections.map(item => (
                <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-800">{item.inspectionType} - {item.truckID}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      item.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.passed ? 'PASSED' : 'FLAGGED'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                    <div>
                      <strong>Date:</strong> {new Date(item.inspectionDate).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Inspector ID:</strong> {item.driverID}
                    </div>
                    <div>
                      <strong>Tires/Brakes:</strong> {item.tiresPassed && item.brakesPassed ? 'OK' : 'FAIL'}
                    </div>
                  </div>
                  {item.notes && <p className="text-[10px] text-slate-500 italic">"{item.notes}"</p>}
                  <div className="flex justify-end space-x-1.5 pt-2 border-t border-slate-200/50">
                    <button
                      onClick={() => startEditInspection(item)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-[10px] font-bold rounded text-slate-700 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteInspection(Number(item.id))}
                      className="px-2 py-0.5 bg-red-50 hover:bg-red-100 hover:text-red-800 text-[10px] font-bold rounded text-red-700 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: FUEL TRACKING */}
      {activeSubTab === 'fuel' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Log fuel transaction */}
          <div className="lg:col-span-1 bg-white p-5 border border-slate-200/50 rounded-xl shadow-xs space-y-4 h-fit">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              {editingFuel ? 'Edit Fuel Transaction' : 'Log Fuel Transaction'}
            </h3>
            
            {fuelSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{fuelSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLogFuel} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Truck ID</label>
                <select required value={fuelTruck} onChange={e => setFuelTruck(e.target.value)} className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500">
                  <option value="">-- Choose Truck --</option>
                  {trucks.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Liters Purchased</label>
                  <input required type="number" step="0.01" value={fuelLiters} onChange={e => setFuelLiters(Number(e.target.value))} className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Price Per Liter ($)</label>
                  <input required type="number" step="0.001" value={fuelPrice} onChange={e => setFuelPrice(Number(e.target.value))} className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Odometer Mileage (km)</label>
                  <input required type="number" value={fuelOdometer} onChange={e => setFuelOdometer(Number(e.target.value))} className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Receipt Number</label>
                  <input type="text" placeholder="SH-92831" value={fuelReceipt} onChange={e => setFuelReceipt(e.target.value)} className="p-2 w-full text-base md:text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Fuel Station Brand / Place</label>
                <input required type="text" placeholder="e.g. Shell Dartmouth" value={fuelStation} onChange={e => setFuelStation(e.target.value)} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
              </div>

              <div className="flex space-x-2 pt-1">
                {editingFuel && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingFuel(null);
                      setFuelTruck('');
                      setFuelStation('');
                      setFuelLiters(50);
                      setFuelPrice(1.65);
                      setFuelOdometer(120000);
                      setFuelReceipt('');
                    }} 
                    className="flex-1 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold transition-all">
                  {editingFuel ? 'Update Transaction' : 'Log Fuel Transaction'}
                </button>
              </div>
            </form>
          </div>

          {/* Transactions list */}
          <div className="lg:col-span-2 bg-white p-5 border border-slate-200/50 rounded-xl shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Fleet Fuel Consumption & Cost Metrics</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Truck ID</th>
                  <th className="px-3 py-2.5">Station</th>
                  <th className="px-3 py-2.5 text-right">Liters</th>
                  <th className="px-3 py-2.5 text-right">Cost / Liter</th>
                  <th className="px-3 py-2.5 text-right">Total Cost</th>
                  <th className="px-3 py-2.5 text-right">Mileage</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {fuelTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-[10px] text-slate-400 font-mono">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 font-bold text-blue-800">{tx.truckID}</td>
                    <td className="px-3 py-2.5 text-slate-600">{tx.fuelStation}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{tx.amountPurchased} L</td>
                    <td className="px-3 py-2.5 text-right font-mono">${tx.pricePerLiter.toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">${tx.totalCost.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-slate-500">{tx.mileage.toLocaleString()} km</td>
                    <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => startEditFuel(tx)}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-[10px] font-bold rounded text-slate-700 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteFuel(Number(tx.id))}
                        className="px-1.5 py-0.5 bg-red-50 hover:bg-red-100 hover:text-red-800 text-[10px] font-bold rounded text-red-700 transition-all"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 7: COMPLIANCE VAULT */}
      {activeSubTab === 'compliance' && (
        <div className="space-y-4 animate-fade-in">
          {/* Alerts banner */}
          {(expiredCount30 > 0 || expiredCountExpired > 0) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
              <h4 className="font-extrabold text-amber-900 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span>Automated Expiration Safety Warnings (DOT Regulation)</span>
              </h4>
              <p className="text-slate-600 text-[11px]">
                The following driver or vehicle licenses are near expiration. Schedule physical updates to maintain active status:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {documents.map(doc => {
                  if (!doc.expiryDate) return null;
                  const expDate = new Date(doc.expiryDate);
                  const diffTime = expDate.getTime() - new Date().getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays <= 30) {
                    return (
                      <div key={doc.id} className="p-2 rounded bg-white border border-amber-200/60 font-medium flex justify-between items-center">
                        <span className="text-slate-800">{doc.documentName}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          diffDays <= 0 ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {diffDays <= 0 ? 'EXPIRED' : `${diffDays} days left`}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center bg-white p-3 border border-slate-200/50 rounded-xl shadow-xs">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Compliance Documents</h3>
            <button 
              onClick={() => {
                setEditingDoc(null);
                setNewDoc({
                  documentName: '', documentType: 'Driver License', expiryDate: '', filePath: '', branchID: 'prospaces-dc', truckID: '', driverID: ''
                });
                setShowAddDoc(!showAddDoc);
              }}
              className="px-3.5 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Document</span>
            </button>
          </div>

          {showAddDoc && (
            <form onSubmit={handleCreateDocument} className="p-4 bg-white border border-slate-200/70 rounded-xl space-y-4 shadow-sm animate-fade-in">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {editingDoc ? 'Edit Compliance Document' : 'Register New Compliance Document'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Document Name / Title</label>
                  <input required type="text" placeholder="e.g. Class 1 Driver License" value={newDoc.documentName} onChange={e => setNewDoc({...newDoc, documentName: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Document Type</label>
                  <select value={newDoc.documentType} onChange={e => setNewDoc({...newDoc, documentType: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500">
                    <option value="Driver License">Driver License</option>
                    <option value="Vehicle Registration">Vehicle Registration</option>
                    <option value="Cargo Insurance">Cargo Insurance</option>
                    <option value="Training Certificate">Training Certificate</option>
                    <option value="Permit">Special Transport Permit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Expiry Date</label>
                  <input required type="date" value={newDoc.expiryDate} onChange={e => setNewDoc({...newDoc, expiryDate: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Link to Driver (Optional)</label>
                  <select value={newDoc.driverID || ''} onChange={e => setNewDoc({...newDoc, driverID: e.target.value || undefined})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500">
                    <option value="">-- None --</option>
                    {users.filter(u => u.role === 'Driver').map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Link to Truck (Optional)</label>
                  <select value={newDoc.truckID || ''} onChange={e => setNewDoc({...newDoc, truckID: e.target.value || undefined})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500">
                    <option value="">-- None --</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">File Path / Location</label>
                  <input type="text" placeholder="/docs/lic_driver.pdf" value={newDoc.filePath} onChange={e => setNewDoc({...newDoc, filePath: e.target.value})} className="p-2 w-full text-xs rounded border border-slate-200 focus:outline-blue-500" />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddDoc(false);
                    setEditingDoc(null);
                    setNewDoc({
                      documentName: '', documentType: 'Driver License', expiryDate: '', filePath: '', branchID: 'prospaces-dc', truckID: '', driverID: ''
                    });
                  }} 
                  className="px-3.5 py-2 border border-slate-200 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3.5 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-lg">
                  {editingDoc ? 'Update Document' : 'Register Document'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Document Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Linked Profile</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">File Asset Location</th>
                  <th className="px-4 py-3">Compliance Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map(doc => {
                  const today = new Date();
                  const expDate = new Date(doc.expiryDate);
                  const isExpired = expDate.getTime() <= today.getTime();
                  
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{doc.documentName}</td>
                      <td className="px-4 py-3">{doc.documentType}</td>
                      <td className="px-4 py-3 font-medium text-slate-600">
                        {doc.driverID ? `Driver Profile: ${doc.driverID}` : doc.truckID ? `Truck Profile: ${doc.truckID}` : 'Corporate'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-800">{doc.expiryDate}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{doc.filePath}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isExpired ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isExpired ? 'NON-COMPLIANT' : 'VERIFIED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => startEditDoc(doc)}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-[10px] font-bold rounded text-slate-700 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(Number(doc.id))}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 hover:text-red-800 text-[10px] font-bold rounded text-red-700 transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* SUB-VIEW 9: ROUTES & STOPS */}
      {activeSubTab === 'routes' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white border border-slate-200/60 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 font-bold text-slate-800 text-xs flex justify-between items-center border-b border-slate-100">
              <span>Active Routing Ledger</span>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50/50 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Route #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Truck / Driver</th>
                    <th className="px-4 py-3">Distance (KM)</th>
                    <th className="px-4 py-3">Duration (Min)</th>
                    <th className="px-4 py-3 text-right">Stops Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {routes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">No routes recorded.</td>
                    </tr>
                  ) : (
                    routes.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.routeNumber}</td>
                        <td className="px-4 py-3 font-mono">{r.routeDate.split('T')[0]}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.routeStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.routeStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <span className="text-blue-700">{r.truckID}</span> <span className="text-slate-400 mx-1">|</span> {r.driverID}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {r.actualDistanceKM > 0 ? r.actualDistanceKM : r.plannedDistanceKM}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {r.actualDurationMinutes > 0 ? r.actualDurationMinutes : r.plannedDurationMinutes}
                        </td>
                        <td className="px-4 py-3 font-mono text-right font-bold">
                          {stops.filter(s => s.routeID === r.id).length}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 10: MAINTENANCE */}
      {activeSubTab === 'maintenance' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white border border-slate-200/60 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 font-bold text-slate-800 text-xs flex justify-between items-center border-b border-slate-100">
              <span>Fleet Maintenance Logs</span>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50/50 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Truck ID</th>
                    <th className="px-4 py-3">Service Type</th>
                    <th className="px-4 py-3">Service Date</th>
                    <th className="px-4 py-3">Mileage</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {maintenance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">No maintenance records found.</td>
                    </tr>
                  ) : (
                    maintenance.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{m.truckID}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{m.maintenanceType}</td>
                        <td className="px-4 py-3 font-mono">{m.serviceDate.split('T')[0]}</td>
                        <td className="px-4 py-3 font-mono">{m.mileage.toLocaleString()}</td>
                        <td className="px-4 py-3">{m.vendor}</td>
                        <td className="px-4 py-3 font-mono font-bold text-right text-slate-900">
                          ${m.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 8: NOTIFICATIONS & ALERTS */}
      {activeSubTab === 'notifications' && (
        <div className="bg-white border border-slate-200/60 rounded-xl shadow-xs overflow-hidden divide-y divide-slate-100 animate-fade-in">
          <div className="p-4 bg-slate-50 font-bold text-slate-800 text-xs flex justify-between items-center">
            <span>System Log Notifications (Dispatcher HQ Stream)</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-mono">Real-time active</span>
          </div>

          <div className="divide-y divide-slate-100">
            {notifications.map(alert => (
              <div key={alert.id} className={`p-4 text-xs flex items-start space-x-3 transition-colors ${alert.isRead ? 'bg-white' : 'bg-blue-50/20'}`}>
                <span className={`p-1.5 rounded-lg text-white mt-0.5 ${
                  alert.type.includes('Maintenance') ? 'bg-amber-600' : 'bg-blue-700'
                }`}>
                  <Bell className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{alert.type}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
