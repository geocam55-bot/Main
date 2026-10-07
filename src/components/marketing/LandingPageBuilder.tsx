import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner@2.0.3';
import type { User } from '../../App';
import { landingPagesAPI, inventoryAPI } from '../../utils/api';
import { advancedSearch } from '../../utils/advanced-search';
import { useDebounce } from '../../utils/useDebounce';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogOverlay,
  DialogPortal
} from '../ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Plus, 
  Globe, 
  Edit, 
  Trash2, 
  Eye, 
  BarChart3, 
  MoreVertical, 
  Loader2,
  Type,
  FileText,
  Image as ImageIcon,
  Video,
  Layout,
  Package,
  Search,
  X,
  Upload,
  Clipboard,
  Copy,
  Monitor,
  Smartphone,
  Tablet,
  AlignLeft,
  AlignCenter,
  AlignRight,
  GripVertical,
  Heading1,
  Images,
  MousePointerClick,
  ClipboardList,
  PanelTop,
  Columns2,
  Quote,
  CircleHelp,
  SeparatorHorizontal,
  MoveVertical,
  Share2,
  PanelBottom
} from 'lucide-react';

interface LandingPageBuilderProps {
  user: User;
  accessToken?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  unitOfMeasure: string;
  quantityOnHand: number;
  priceTier1: number;
  imageUrl?: string;
  status: 'active' | 'inactive' | 'discontinued';
}

interface PageElement {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'video' | 'button' | 'form' | 'product' | 'hero' | 'gallery' | 'navigation' | 'columns' | 'testimonial' | 'faq' | 'divider' | 'spacer' | 'social' | 'footer';
  content: string;
  styles?: {
    alignment?: 'left' | 'center' | 'right';
    size?: string;
  };
  products?: Array<{
    id: string;
    name: string;
    sku?: string;
    price: number;
    image?: string;
    description?: string;
    additionalText?: string;
  }>;
  // Keep for backwards compatibility
  productData?: {
    id: string;
    name: string;
    sku?: string;
    price: number;
    image?: string;
    description?: string;
    additionalText?: string;
  };
}

interface PageSettings {
  title: string;
  slug: string;
  metaDescription: string;
  conversionGoal: string;
  trackingCode: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  contentWidth: string;
}

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  title: '',
  slug: '',
  metaDescription: '',
  conversionGoal: '',
  trackingCode: '',
  backgroundColor: '#ffffff',
  textColor: '#172033',
  accentColor: '#2563eb',
  fontFamily: 'Inter, sans-serif',
  contentWidth: '1200px'
};

export function LandingPageBuilder({ user, accessToken }: LandingPageBuilderProps) {
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [landingPages, setLandingPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [pageElements, setPageElements] = useState<PageElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [editingProductIndexes, setEditingProductIndexes] = useState<Record<string, number>>({});
  const [pageSettings, setPageSettings] = useState<PageSettings>({
    ...DEFAULT_PAGE_SETTINGS
  });
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Inventory State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  
  const debouncedInventorySearch = useDebounce(inventorySearchQuery, 200);

  const filteredInventory = useMemo(() => {
    if (!debouncedInventorySearch.trim()) {
      return inventory.filter(item => item.status === 'active').slice(0, 50);
    }
    const searchResults = advancedSearch(inventory, debouncedInventorySearch, {
      fuzzyThreshold: 0.6,
      includeInactive: false,
      minScore: 0.05,
      maxResults: 50,
      sortBy: 'relevance'
    });
    return searchResults.map(result => result.item as InventoryItem);
  }, [debouncedInventorySearch, inventory]);

  useEffect(() => {
    loadLandingPages();
    loadInventory();
  }, [user.organizationId]);

  const loadInventory = async () => {
    if (!user.organizationId) return;
    try {
      setLoadingInventory(true);
      const data = await inventoryAPI.getAll();
      if (data && data.items) {
        setInventory(data.items);
      }
    } catch (error) {
      // Handle silently
    } finally {
      setLoadingInventory(false);
    }
  };

  const loadLandingPages = async () => {
    if (!user.organizationId) return;
    setIsLoading(true);
    try {
      const data = await landingPagesAPI.getAll(user.organizationId);
      setLandingPages(data);
    } catch (error) {
      toast.error('Failed to load landing pages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePage = async () => {
    if (!user.organizationId) return;
    setIsSaving(true);
    try {
      const newPage = {
        name: 'New Landing Page ' + new Date().toLocaleDateString(),
        slug: 'new-page-' + Date.now(),
        status: 'draft',
        content: {
          elements: [],
          settings: DEFAULT_PAGE_SETTINGS
        },
        views_count: 0,
        conversions_count: 0,
        conversion_rate: 0
      };
      const created = await landingPagesAPI.create(newPage, user.organizationId);
      setLandingPages([created, ...landingPages]);
      handleSelectPage(created);
      toast.success('Landing page created');
    } catch (error) {
      toast.error('Failed to create landing page');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePage = async () => {
    if (!selectedPage || !user.organizationId) return;
    setIsSaving(true);
    try {
      const content = {
        elements: pageElements,
        settings: pageSettings
      };
      
      const updated = await landingPagesAPI.update(selectedPage, {
        content,
        name: pageSettings.title || 'Untitled Page',
        slug: pageSettings.slug,
        updated_at: new Date().toISOString()
      });
      
      setLandingPages(landingPages.map(p => p.id === selectedPage ? updated : p));
      toast.success('Page saved successfully');
    } catch (error) {
      toast.error('Failed to save page');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      await landingPagesAPI.delete(id);
      setLandingPages(landingPages.filter(p => p.id !== id));
      if (selectedPage === id) {
        setSelectedPage(null);
        setPageElements([]);
        setPageSettings({ ...DEFAULT_PAGE_SETTINGS });
      }
      toast.success('Page deleted');
    } catch (error) {
      toast.error('Failed to delete page');
    }
  };

  const handleSelectPage = (page: any) => {
    setSelectedPage(page.id);
    const content = page.content || {};
    setPageElements(content.elements || []);
    setPageSettings({
      ...DEFAULT_PAGE_SETTINGS,
      ...content.settings,
      title: content.settings?.title || page.name || '',
      slug: content.settings?.slug || page.slug || ''
    });
  };

  const builderElements = [
    { 
      icon: Heading1,
      name: 'Heading', 
      type: 'heading' as const, 
      category: 'Text', 
      defaultContent: 'Your Heading Here',
      color: 'text-blue-700 bg-blue-50'
    },
    { 
      icon: AlignLeft,
      name: 'Paragraph', 
      type: 'paragraph' as const, 
      category: 'Text', 
      defaultContent: 'Add your paragraph text here. You can customize this content to match your message.',
      color: 'text-teal-700 bg-teal-50'
    },
    { 
      icon: ImageIcon, 
      name: 'Image', 
      type: 'image' as const, 
      category: 'Media', 
      defaultContent: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
      color: 'text-rose-700 bg-rose-50'
    },
    {
      icon: Images,
      name: 'Gallery',
      type: 'gallery' as const,
      category: 'Media',
      defaultContent: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=700, https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=700, https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=700',
      color: 'text-fuchsia-700 bg-fuchsia-50'
    },
    { 
      icon: Video, 
      name: 'Video', 
      type: 'video' as const, 
      category: 'Media', 
      defaultContent: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      color: 'text-orange-700 bg-orange-50'
    },
    {
      icon: PanelTop,
      name: 'Navigation',
      type: 'navigation' as const,
      category: 'Layout',
      defaultContent: 'Brand | About | Services | Contact',
      color: 'text-slate-700 bg-slate-100'
    },
    {
      icon: Columns2,
      name: 'Columns',
      type: 'columns' as const,
      category: 'Layout',
      defaultContent: 'Plan your project | Choose your materials | Build with confidence',
      color: 'text-cyan-700 bg-cyan-50'
    },
    {
      icon: SeparatorHorizontal,
      name: 'Divider',
      type: 'divider' as const,
      category: 'Layout',
      defaultContent: '',
      color: 'text-slate-600 bg-slate-100'
    },
    {
      icon: MoveVertical,
      name: 'Spacer',
      type: 'spacer' as const,
      category: 'Layout',
      defaultContent: '48',
      color: 'text-indigo-700 bg-indigo-50'
    },
    {
      icon: PanelBottom,
      name: 'Footer',
      type: 'footer' as const,
      category: 'Layout',
      defaultContent: '© 2026 Your Company. All rights reserved.',
      color: 'text-slate-700 bg-slate-100'
    },
    {
      icon: Layout,
      name: 'Hero section',
      type: 'hero' as const,
      category: 'Sections',
      defaultContent: 'Design a space that feels like you.|A considered process. Beautiful materials. Built around your life.|Start your project',
      color: 'text-amber-700 bg-amber-50'
    },
    {
      icon: Quote,
      name: 'Testimonial',
      type: 'testimonial' as const,
      category: 'Sections',
      defaultContent: 'The team made every detail easy, from the first sketch to the final finish.|Alex Morgan, homeowner',
      color: 'text-violet-700 bg-violet-50'
    },
    { 
      icon: MousePointerClick,
      name: 'Button', 
      type: 'button' as const, 
      category: 'Interactive', 
      defaultContent: 'Click Here',
      color: 'text-blue-700 bg-blue-50'
    },
    { 
      icon: ClipboardList,
      name: 'Form', 
      type: 'form' as const, 
      category: 'Interactive', 
      defaultContent: 'Email Signup Form',
      color: 'text-emerald-700 bg-emerald-50'
    },
    {
      icon: CircleHelp,
      name: 'FAQ',
      type: 'faq' as const,
      category: 'Interactive',
      defaultContent: 'How does it work?|We will guide you through each step and keep you informed along the way.',
      color: 'text-amber-700 bg-amber-50'
    },
    {
      icon: Share2,
      name: 'Social links',
      type: 'social' as const,
      category: 'Interactive',
      defaultContent: 'Instagram | Facebook | LinkedIn',
      color: 'text-pink-700 bg-pink-50'
    },
    { 
      icon: Package, 
      name: 'Product', 
      type: 'product' as const, 
      category: 'Commerce', 
      defaultContent: 'Select Product',
      color: 'text-orange-700 bg-orange-50'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'archived':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAddElement = (type: PageElement['type'], defaultContent: string) => {
    if (type === 'product') {
      setShowProductSelector(true);
      return;
    }

    const newElement: PageElement = {
      id: `element-${Date.now()}`,
      type,
      content: defaultContent,
      styles: {
        alignment: 'center',
        size: type === 'heading' ? 'large' : 'medium'
      }
    };
    setPageElements([...pageElements, newElement]);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added to page`);
  };

  const handleAddProduct = (item: InventoryItem) => {
    // Check if we're editing an existing product widget
    if (selectedElement) {
      const element = pageElements.find(el => el.id === selectedElement);
      if (element && element.type === 'product' && element.products) {
        const editingIndex = editingProductIndexes[selectedElement] || 0;
        const updatedProducts = [...element.products];
        updatedProducts[editingIndex] = {
          id: item.id,
          name: item.name,
          sku: item.sku,
          price: item.priceTier1 || 0,
          image: item.imageUrl,
          description: item.description,
          additionalText: ''
        };
        
        setPageElements(pageElements.map(el => 
          el.id === selectedElement 
            ? { ...el, products: updatedProducts }
            : el
        ));
        setShowProductSelector(false);
        toast.success(`Product ${editingIndex + 1} updated`);
        return;
      }
    }
    
    // Creating a new product widget
    const newElement: PageElement = {
      id: `element-${Date.now()}`,
      type: 'product',
      content: item.name,
      styles: {
        alignment: 'center',
        size: 'medium'
      },
      products: [
        {
          id: item.id,
          name: item.name,
          sku: item.sku,
          price: item.priceTier1 || 0,
          image: item.imageUrl,
          description: item.description,
          additionalText: ''
        }
      ]
      // No logging
    };
    setPageElements([...pageElements, newElement]);
    setShowProductSelector(false);
    toast.success('Product widget added to page');
  };

  const handleUpdateElement = (id: string, content: string) => {
    setPageElements(pageElements.map(el => 
      el.id === id ? { ...el, content } : el
    ));
  };

  const handleUpdateAlignment = (id: string, alignment: 'left' | 'center' | 'right') => {
    setPageElements(pageElements.map((element) =>
      element.id === id
        ? { ...element, styles: { ...element.styles, alignment } }
        : element
    ));
  };
  
  const handleUpdateProductData = (id: string, field: string, value: any, productIndex: number = 0) => {
    setPageElements(pageElements.map(el => {
      if (el.id === id && el.products) {
        const updatedProducts = [...el.products];
        updatedProducts[productIndex] = {
          ...updatedProducts[productIndex],
          [field]: value
        };
        return {
          ...el,
          products: updatedProducts
        };
      }
      // Backwards compatibility with old productData structure
      if (el.id === id && el.productData) {
        return {
          ...el,
          productData: {
            ...el.productData,
            [field]: value
          }
        };
      }
      return el;
    }));
  };

  const handleDeleteElement = (id: string) => {
    setPageElements(pageElements.filter(el => el.id !== id));
    setSelectedElement(null);
    toast.success('Element removed');
  };

  const handleMoveElement = (id: string, direction: 'up' | 'down') => {
    const index = pageElements.findIndex(el => el.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      const newElements = [...pageElements];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      setPageElements(newElements);
    } else if (direction === 'down' && index < pageElements.length - 1) {
      const newElements = [...pageElements];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      setPageElements(newElements);
    }
  };

  const handleDuplicateElement = (id: string) => {
    const index = pageElements.findIndex((element) => element.id === id);
    if (index < 0) return;
    const original = pageElements[index];
    const duplicate: PageElement = {
      ...original,
      id: `element-${Date.now()}`,
      styles: original.styles ? { ...original.styles } : undefined,
      products: original.products?.map((product) => ({ ...product })),
      productData: original.productData ? { ...original.productData } : undefined
    };
    const nextElements = [...pageElements];
    nextElements.splice(index + 1, 0, duplicate);
    setPageElements(nextElements);
    setSelectedElement(duplicate.id);
    toast.success('Element duplicated');
  };

  const handleDropElement = (targetId: string) => {
    if (!draggedElement || draggedElement === targetId) return;
    const nextElements = [...pageElements];
    const sourceIndex = nextElements.findIndex((element) => element.id === draggedElement);
    const targetIndex = nextElements.findIndex((element) => element.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [movedElement] = nextElements.splice(sourceIndex, 1);
    nextElements.splice(targetIndex, 0, movedElement);
    setPageElements(nextElements);
    setDraggedElement(null);
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle product image upload from file
  const handleProductImageUpload = async (elementId: string, file: File, productIndex: number = 0) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (!accessToken) {
      toast.error('Authentication required to upload images');
      return;
    }

    const loadingToast = toast.loading('Uploading image...');

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      // Upload to server with user's access token
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64,
          fileName: file.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { url } = await response.json();
      
      // Update element with permanent URL
      handleUpdateProductData(elementId, 'image', url, productIndex);
      toast.success('Image uploaded successfully', { id: loadingToast });
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message}`, { id: loadingToast });
    }
  };

  // Handle product image paste
  const handleProductImagePaste = async (elementId: string, event: React.ClipboardEvent, productIndex: number = 0) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        event.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleProductImageUpload(elementId, file, productIndex);
        }
        break;
      }
    }
  };

  // Handle general image upload from file (for Image widget)
  const handleImageUpload = async (elementId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (!accessToken) {
      toast.error('Authentication required to upload images');
      return;
    }

    const loadingToast = toast.loading('Uploading image...');

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      // Upload to server with user's access token
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64,
          fileName: file.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { url } = await response.json();
      
      // Update element with permanent URL
      handleUpdateElement(elementId, url);
      toast.success('Image uploaded successfully', { id: loadingToast });
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message}`, { id: loadingToast });
    }
  };

  // Handle general image paste (for Image widget)
  const handleImagePaste = async (elementId: string, event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        event.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleImageUpload(elementId, file);
        }
        break;
      }
    }
  };

  const renderElement = (element: PageElement, isPreview: boolean = false) => {
    const isSelected = selectedElement === element.id;
    const alignment = element.styles?.alignment || 'center';
    
    const alignmentClass = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    }[alignment];

    switch (element.type) {
      case 'heading':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
              <div className="space-y-3">
                <Input
                  value={element.content}
                  onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                  className="text-3xl font-bold text-gray-900 text-center"
                />
                <Button 
                  size="sm"
                  variant="outline"
                  className="w-full" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement(null);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <h1 className="text-4xl font-bold" style={{ color: pageSettings.textColor }}>{element.content}</h1>
            )}
          </div>
        );
      
      case 'paragraph':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
              <div className="space-y-3">
                <Textarea
                  value={element.content}
                  onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                  className="text-gray-700 min-h-24"
                  rows={4}
                />
                <Button 
                  size="sm"
                  variant="outline"
                  className="w-full" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement(null);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <p className="text-lg" style={{ color: pageSettings.textColor }}>{element.content}</p>
            )}
          </div>
        );
      
      case 'image':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
              <div 
                className="space-y-4 max-w-md mx-auto p-4 bg-white rounded border border-gray-200 shadow-sm text-left"
                onPaste={(e) => handleImagePaste(element.id, e)}
              >
                <div className="font-medium text-center border-b pb-2 mb-2 text-gray-900">Editing Image Widget</div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500">Image URL</label>
                  <Input
                    value={element.content}
                    onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                    placeholder="Enter Image URL or Upload below"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500">Upload Image</label>
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(element.id, file);
                        }}
                        className="hidden"
                      />
                      <Button variant="outline" className="w-full" type="button" onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        input?.click();
                      }}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </Button>
                    </label>
                    <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => {
                        toast.info('Press Ctrl+V (or Cmd+V on Mac) to paste an image');
                      }}
                      title="Paste image from clipboard"
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {element.content && (
                  <div className="relative mt-2">
                    <img src={element.content} alt="Preview" className="w-full h-auto max-h-64 object-contain rounded border bg-gray-50" />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1"
                      onClick={() => handleUpdateElement(element.id, '')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                    <Button 
                      className="w-full" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement(null);
                      }}
                    >
                      Done Editing
                    </Button>
                  </div>
              </div>
            ) : (
              <img src={element.content} alt="Content" className="w-full max-w-2xl mx-auto rounded-lg" />
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
              <div className="space-y-2">
                <Input
                  value={element.content}
                  onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                  placeholder="Video embed URL"
                />
                <iframe
                  src={element.content}
                  className="w-full max-w-2xl mx-auto aspect-video rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <Button 
                  size="sm"
                  variant="outline"
                  className="w-full" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement(null);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <iframe
                src={element.content}
                className="w-full max-w-2xl mx-auto aspect-video rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        );
      
      case 'button':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
              <div className="space-y-3">
                <Input
                  value={element.content}
                  onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                  className="text-center"
                />
                <Button 
                  size="sm"
                  variant="outline"
                  className="w-full" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement(null);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <Button size="lg" className="text-lg px-8 py-6" style={{ backgroundColor: pageSettings.accentColor }}>{element.content}</Button>
            )}
          </div>
        );
      
      case 'form':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            <div className="max-w-md mx-auto space-y-4 p-6 bg-gray-50 rounded-lg">
              {!isPreview && isSelected ? (
                <div className="space-y-3">
                  <Input
                    value={element.content}
                    onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                    placeholder="Form title"
                    className="text-center font-semibold"
                  />
                  <Button 
                    size="sm"
                    variant="outline"
                    className="w-full" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElement(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <h3 className="text-xl font-semibold text-gray-900">{element.content}</h3>
              )}
              <Input placeholder="Enter your email" type="email" />
              <Button className="w-full">Submit</Button>
            </div>
          </div>
        );

      case 'hero': {
        const [title, description, action] = element.content.split('|');
        return (
          <section className="rounded-lg bg-slate-950 px-8 py-16 text-center text-white sm:px-14 sm:py-24">
            <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{description}</p>
            <Button className="mt-8" style={{ backgroundColor: pageSettings.accentColor }}>{action || 'Learn more'}</Button>
          </section>
        );
      }

      case 'navigation': {
        const [brand, ...links] = element.content.split('|').map((item) => item.trim());
        return (
          <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-2 py-4" aria-label="Page navigation">
            <span className="text-lg font-semibold">{brand || 'Brand'}</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">{links.map((link, index) => <span key={`${link}-${index}`}>{link}</span>)}</div>
          </nav>
        );
      }

      case 'columns': {
        const columns = element.content.split('|').map((item) => item.trim()).filter(Boolean);
        return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {columns.map((column, index) => <div key={`${column}-${index}`} className="min-h-32 border-t-2 border-slate-200 px-4 py-5 text-lg font-medium">{column}</div>)}
          </div>
        );
      }

      case 'gallery': {
        const images = element.content.split(',').map((item) => item.trim()).filter(Boolean);
        return (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Gallery image ${index + 1}`} className="aspect-[4/3] w-full rounded-md object-cover" />)}
          </div>
        );
      }

      case 'testimonial': {
        const [quote, author] = element.content.split('|');
        return (
          <figure className="mx-auto max-w-3xl py-8 text-center">
            <Quote className="mx-auto mb-4 h-7 w-7 text-slate-400" />
            <blockquote className="text-2xl font-medium leading-relaxed">“{quote}”</blockquote>
            <figcaption className="mt-4 text-sm text-slate-500">{author}</figcaption>
          </figure>
        );
      }

      case 'faq': {
        const [question, answer] = element.content.split('|');
        return (
          <details className="group border-b border-slate-200 py-4">
            <summary className="cursor-pointer list-none font-medium marker:hidden">{question}<span className="float-right text-slate-400">+</span></summary>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{answer}</p>
          </details>
        );
      }

      case 'divider':
        return <hr className="my-6 border-0 border-t border-slate-200" />;

      case 'spacer': {
        const height = Math.min(Math.max(Number.parseInt(element.content, 10) || 48, 8), 240);
        return <div aria-hidden="true" style={{ height }} className="border border-dashed border-slate-200 bg-slate-50/40" />;
      }

      case 'social': {
        const networks = element.content.split('|').map((item) => item.trim()).filter(Boolean);
        return <div className="flex flex-wrap justify-center gap-3">{networks.map((network, index) => <span key={`${network}-${index}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">{network}</span>)}</div>;
      }

      case 'footer':
        return <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">{element.content}</footer>;

      case 'product':
        // Support both new products array and old productData for backwards compatibility
        const products = element.products || (element.productData ? [element.productData] : []);
        if (!products || products.length === 0) return null;
        
        const editingProductIndex = editingProductIndexes[element.id] || 0;
        const productToEdit = products[editingProductIndex];
        
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
               <div 
                 className="space-y-4 max-w-md mx-auto p-4 bg-white rounded border border-gray-200 shadow-sm text-left"
                 onPaste={(e) => handleProductImagePaste(element.id, e, editingProductIndex)}
               >
                  <div className="font-medium text-center border-b pb-2 mb-2 text-gray-900">Editing Product Widget</div>
                  
                  {/* Product selector tabs */}
                  {products.length > 1 && (
                    <div className="flex gap-2 mb-4">
                      {products.map((_, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant={editingProductIndex === index ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProductIndexes({
                              ...editingProductIndexes,
                              [element.id]: index
                            });
                          }}
                          className="flex-1"
                        >
                          Product {index + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProductSelector(true);
                      }}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Select Product {products.length > 1 ? `${editingProductIndex + 1} ` : ''}from Inventory
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">Product Image</label>
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleProductImageUpload(element.id, file, editingProductIndex);
                          }}
                          className="hidden"
                        />
                        <Button variant="outline" className="w-full" type="button" onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          input?.click();
                        }}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Image
                        </Button>
                      </label>
                      <Button 
                        variant="outline" 
                        type="button"
                        onClick={() => {
                          toast.info('Press Ctrl+V (or Cmd+V on Mac) to paste an image');
                        }}
                        title="Paste image from clipboard"
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                    {productToEdit.image && (
                      <div className="relative mt-2">
                        <img src={productToEdit.image} alt="Product" className="w-full h-32 object-contain rounded border bg-gray-50" />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1"
                          onClick={() => handleUpdateProductData(element.id, 'image', undefined, editingProductIndex)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">Product Name</label>
                    <Input 
                      value={productToEdit.name} 
                      onChange={(e) => handleUpdateProductData(element.id, 'name', e.target.value, editingProductIndex)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">Product Number (SKU)</label>
                    <Input 
                      value={productToEdit.sku || ''} 
                      onChange={(e) => handleUpdateProductData(element.id, 'sku', e.target.value, editingProductIndex)}
                      placeholder="Enter SKU"
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-400">SKU is set from inventory</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">Description</label>
                    <Textarea 
                      value={productToEdit.description || ''} 
                      onChange={(e) => handleUpdateProductData(element.id, 'description', e.target.value, editingProductIndex)}
                      placeholder="Product description"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">Price ($)</label>
                    <Input 
                      type="number" 
                      value={productToEdit.price} 
                      onChange={(e) => handleUpdateProductData(element.id, 'price', parseFloat(e.target.value), editingProductIndex)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">Additional Text</label>
                    <Textarea 
                      value={productToEdit.additionalText || ''} 
                      onChange={(e) => handleUpdateProductData(element.id, 'additionalText', e.target.value, editingProductIndex)}
                      placeholder="Add specific details or promo text..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button 
                      className="w-full" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement(null);
                      }}
                    >
                      Done Editing
                    </Button>
                  </div>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
                {products.map((productData, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 text-left hover:shadow-lg transition-shadow">
                    {productData.image ? (
                      <div className="h-48 w-full bg-gray-50 relative flex items-center justify-center">
                         <img className="max-h-full max-w-full object-contain p-2" src={productData.image} alt={productData.name} />
                      </div>
                    ) : (
                      <div className="h-48 w-full bg-gray-100 flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">{productData.name}</div>
                        {productData.sku ? (
                          <div className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded font-mono whitespace-nowrap">
                            #{productData.sku}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded italic">
                            No SKU
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-slate-700 text-sm leading-relaxed">
                        {productData.description || <span className="text-gray-400 italic">No description available</span>}
                      </p>
                      {productData.additionalText && (
                        <div className="mt-4 p-3 bg-indigo-50 rounded text-gray-700 text-sm">
                          {productData.additionalText}
                        </div>
                      )}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg shadow-md">
                          <div className="text-xs font-medium opacity-90 uppercase tracking-wide">Price</div>
                          <div className="text-3xl font-bold">${productData.price.toFixed(2)}</div>
                        </div>
                        <Button size="sm" style={{ backgroundColor: pageSettings.accentColor }}>Buy Now</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-gray-900">Landing Page Builder</h2>
          <p className="text-sm text-gray-600 mt-1">Create high-converting landing pages with drag-and-drop</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2" 
            onClick={() => window.open('?view=landing-page-diagnostic', '_blank')}
          >
            <Search className="h-4 w-4" />
            Debug Pages
          </Button>
          <Button className="flex items-center gap-2" onClick={handleCreatePage} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Landing Page
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : landingPages.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-gray-500">
              <p>No landing pages found</p>
              <p className="text-sm mt-2">Create one to get started</p>
            </CardContent>
          </Card>
        ) : (
          landingPages.map((page) => (
            <Card key={page.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer ${selectedPage === page.id ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => handleSelectPage(page)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{page.name}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">{page.slug ? `/landing/${page.slug}` : 'No slug set'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(page.status)}>{page.status}</Badge>
                        {!page.slug && <Badge variant="destructive" className="text-xs">No Public URL</Badge>}
                        <span className="text-xs text-gray-500">• {new Date(page.updatedAt || page.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectPage(page); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info('Preview mode active'); handleSelectPage(page); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info('Viewing analytics...'); }}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Views</p>
                    <p className="text-lg text-gray-900 mt-1">{(page.views_count || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Conversions</p>
                    <p className="text-lg text-gray-900 mt-1">{(page.conversions_count || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Conv. Rate</p>
                    <p className="text-lg text-green-600 mt-1">{page.conversion_rate || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedPage} onOpenChange={(open) => !open && setSelectedPage(null)}>
        <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content className="fixed inset-0 z-[100] w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none border-0 bg-white flex flex-col gap-0 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSelectedPage(null)} className="gap-2">
                <X className="h-4 w-4" />
                Close
              </Button>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <DialogTitle className="text-lg">Editing: {pageSettings.title || 'Untitled Page'}</DialogTitle>
                <DialogDescription className="text-xs">
                  {pageSettings.slug ? `https://yoursite.com/landing/${pageSettings.slug}` : 'No URL set'}
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleSavePage} disabled={isSaving} className="px-8 shadow-sm">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="builder" className="h-full flex flex-col">
              <div className="px-6 py-2 bg-gray-50 border-b">
                <TabsList>
                  <TabsTrigger value="builder">Builder</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                <TabsContent value="builder" className="m-0 -mx-6 -mb-6 min-h-[calc(100vh-158px)]">
                  <div className="grid min-h-[calc(100vh-158px)] grid-cols-1 bg-[#e9edf2] lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_270px]">
                    <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
                      <div className="border-b border-slate-100 px-4 py-4">
                        <div className="text-sm font-semibold text-slate-900">Add to page</div>
                        <div className="mt-1 text-xs text-slate-500">Click a block to insert it</div>
                      </div>
                      <div className="space-y-5 p-3">
                        {['Sections', 'Text', 'Media', 'Layout', 'Interactive', 'Commerce'].map((category) => (
                          <section key={category}>
                            <h3 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{category}</h3>
                            <div className="grid grid-cols-5 gap-1.5">
                              {builderElements.filter((element) => element.category === category).map((element) => {
                                const Icon = element.icon;
                                return (
                                  <div key={element.name} className="group relative flex justify-center">
                                    <button
                                      onClick={() => handleAddElement(element.type, element.defaultContent)}
                                      aria-label={`Add ${element.name}`}
                                      title={element.name}
                                      className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:ring-1 hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${element.color}`}
                                    >
                                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                                    </button>
                                    <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{element.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    </aside>

                    <section className="flex min-w-0 flex-col">
                      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-800">Page canvas</span>
                          <span>/</span>
                          <span>{pageElements.length} {pageElements.length === 1 ? 'block' : 'blocks'}</span>
                        </div>
                        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-0.5">
                          <Button variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" aria-label="Desktop canvas" title="Desktop" onClick={() => setPreviewDevice('desktop')}><Monitor className="h-4 w-4" /></Button>
                          <Button variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" aria-label="Tablet canvas" title="Tablet" onClick={() => setPreviewDevice('tablet')}><Tablet className="h-4 w-4" /></Button>
                          <Button variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" aria-label="Mobile canvas" title="Mobile" onClick={() => setPreviewDevice('mobile')}><Smartphone className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="min-h-[600px] flex-1 overflow-auto p-5 sm:p-8" style={{ backgroundColor: '#e9edf2', backgroundImage: 'radial-gradient(#c9d0da 0.7px, transparent 0.7px)', backgroundSize: '16px 16px' }}>
                        <div
                          className="mx-auto min-h-[650px] space-y-4 p-6 shadow-xl ring-1 ring-slate-900/10 transition-[max-width] duration-200 sm:p-10"
                          style={{ maxWidth: previewDevice === 'mobile' ? '375px' : previewDevice === 'tablet' ? '768px' : pageSettings.contentWidth, backgroundColor: pageSettings.backgroundColor, color: pageSettings.textColor, fontFamily: pageSettings.fontFamily }}
                        >
                          {pageElements.length === 0 ? (
                            <div className="mx-auto max-w-2xl py-28 text-center">
                              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Layout className="h-5 w-5" /></div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your page starts here</p>
                              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{pageSettings.title || 'Build a page that brings your story to life.'}</h1>
                              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">Choose a block from the left to begin shaping your landing page.</p>
                              <Button className="mt-6" onClick={() => handleAddElement('heading', 'Your Heading Here')}><Plus className="mr-2 h-4 w-4" />Add a heading</Button>
                            </div>
                          ) : pageElements.map((element, index) => (
                            <div
                              key={element.id}
                              draggable
                              onDragStart={() => setDraggedElement(element.id)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => { event.preventDefault(); handleDropElement(element.id); }}
                              onDragEnd={() => setDraggedElement(null)}
                              onClick={() => setSelectedElement(element.id)}
                              className={`group relative cursor-pointer transition-shadow ${draggedElement === element.id ? 'opacity-50' : ''} ${selectedElement === element.id ? 'z-[1] rounded-sm ring-2 ring-blue-500 ring-offset-2' : 'hover:outline hover:outline-1 hover:outline-blue-300'}`}
                            >
                              <div className={`absolute -left-9 top-2 z-10 flex items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 shadow-sm transition-opacity ${selectedElement === element.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <span className="flex h-7 w-6 cursor-grab items-center justify-center text-slate-400" title="Drag to reorder"><GripVertical className="h-4 w-4" /></span>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500" title="Duplicate block" aria-label="Duplicate block" onClick={(event) => { event.stopPropagation(); handleDuplicateElement(element.id); }}><Copy className="h-3.5 w-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" title="Delete block" aria-label="Delete block" onClick={(event) => { event.stopPropagation(); handleDeleteElement(element.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                              <div className="pointer-events-none">{renderElement(element, true)}</div>
                              <span className="absolute -top-2 left-2 rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">{element.type} {index + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                    <aside className="border-t border-slate-200 bg-white xl:border-l xl:border-t-0">
                      {(() => {
                        const element = pageElements.find((item) => item.id === selectedElement);
                        return (
                          <>
                            <div className="border-b border-slate-100 px-4 py-4">
                              <div className="text-sm font-semibold text-slate-900">{element ? `${element.type.charAt(0).toUpperCase()}${element.type.slice(1)} properties` : 'Page design'}</div>
                              <div className="mt-1 text-xs text-slate-500">{element ? 'Edit the selected block' : 'Set the look for your page'}</div>
                            </div>
                            <div className="space-y-5 p-4">
                              {element ? (
                                <>
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600">Content</label>
                                    {['paragraph', 'image', 'video', 'hero', 'gallery', 'navigation', 'columns', 'testimonial', 'faq', 'social', 'footer'].includes(element.type) ? (
                                      <Textarea value={element.content} onChange={(event) => handleUpdateElement(element.id, event.target.value)} rows={element.type === 'paragraph' || element.type === 'hero' || element.type === 'gallery' ? 5 : 3} />
                                    ) : element.type !== 'product' ? (
                                      <Input value={element.content} onChange={(event) => handleUpdateElement(element.id, event.target.value)} />
                                    ) : (
                                      <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">Product cards use your inventory details.</div>
                                    )}
                                  </div>
                                  {(element.type === 'heading' || element.type === 'paragraph' || element.type === 'button' || element.type === 'hero' || element.type === 'testimonial') && (
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium text-slate-600">Alignment</label>
                                      <div className="flex gap-1">
                                        {([{ value: 'left', Icon: AlignLeft }, { value: 'center', Icon: AlignCenter }, { value: 'right', Icon: AlignRight }] as const).map(({ value, Icon }) => (
                                          <Button key={value} variant={(element.styles?.alignment || 'center') === value ? 'secondary' : 'outline'} size="sm" className="h-9 flex-1" aria-label={`Align ${value}`} title={`Align ${value}`} onClick={() => handleUpdateAlignment(element.id, value)}><Icon className="h-4 w-4" /></Button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {element.type === 'product' && (
                                    <Button variant="outline" className="w-full" onClick={() => { setEditingProductIndexes({ ...editingProductIndexes, [element.id]: 0 }); setShowProductSelector(true); }}><Search className="mr-2 h-4 w-4" />Choose inventory product</Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="w-full text-slate-500" onClick={() => setSelectedElement(null)}>Deselect block</Button>
                                </>
                              ) : (
                                <>
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600">Page background</label>
                                    <div className="flex items-center gap-2"><Input type="color" value={pageSettings.backgroundColor} onChange={(event) => setPageSettings({ ...pageSettings, backgroundColor: event.target.value })} className="h-9 w-12 p-1" /><Input value={pageSettings.backgroundColor} onChange={(event) => setPageSettings({ ...pageSettings, backgroundColor: event.target.value })} className="h-9 font-mono text-xs uppercase" /></div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600">Text color</label>
                                    <div className="flex items-center gap-2"><Input type="color" value={pageSettings.textColor} onChange={(event) => setPageSettings({ ...pageSettings, textColor: event.target.value })} className="h-9 w-12 p-1" /><Input value={pageSettings.textColor} onChange={(event) => setPageSettings({ ...pageSettings, textColor: event.target.value })} className="h-9 font-mono text-xs uppercase" /></div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600">Brand accent</label>
                                    <div className="flex items-center gap-2"><Input type="color" value={pageSettings.accentColor} onChange={(event) => setPageSettings({ ...pageSettings, accentColor: event.target.value })} className="h-9 w-12 p-1" /><Input value={pageSettings.accentColor} onChange={(event) => setPageSettings({ ...pageSettings, accentColor: event.target.value })} className="h-9 font-mono text-xs uppercase" /></div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600">Typography</label>
                                    <select value={pageSettings.fontFamily} onChange={(event) => setPageSettings({ ...pageSettings, fontFamily: event.target.value })} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm">
                                      <option value="Inter, sans-serif">Modern sans</option><option value="Georgia, serif">Editorial serif</option><option value="Arial, sans-serif">Classic sans</option><option value="'Trebuchet MS', sans-serif">Friendly rounded</option>
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600">Content width</label>
                                    <select value={pageSettings.contentWidth} onChange={(event) => setPageSettings({ ...pageSettings, contentWidth: event.target.value })} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm">
                                      <option value="960px">Compact</option><option value="1200px">Wide</option><option value="1440px">Extra wide</option>
                                    </select>
                                  </div>
                                  <div className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Select a block on the canvas to edit its content and alignment.</div>
                                </>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </aside>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="m-0 space-y-4 max-w-2xl mx-auto">
                  <Card>
                    <CardHeader>
                        <CardTitle>Page Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-700 font-medium">Page Title</label>
                        <Input 
                          placeholder="Enter page title" 
                          value={pageSettings.title}
                          onChange={(e) => setPageSettings({...pageSettings, title: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-700 font-medium">URL Slug</label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">/landing/</span>
                          <Input 
                            placeholder="url-slug" 
                            value={pageSettings.slug}
                            onChange={(e) => setPageSettings({...pageSettings, slug: e.target.value})}
                          />
                        </div>
                        {!pageSettings.slug && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-2">
                            <p className="text-sm text-yellow-800 font-medium">⚠️ URL slug is required</p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Without a slug, your landing page won't be publicly accessible. 
                              Enter a URL-friendly slug like "winter-blast" or "WinterBlast".
                            </p>
                          </div>
                        )}
                        {pageSettings.slug && (
                          <div className="space-y-2 bg-green-50 border border-green-200 rounded p-3 mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-green-800">✓ Public URLs</span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-700 font-medium w-20">Path:</span>
                                <code className="text-xs bg-white px-2 py-1 rounded border border-green-300 flex-1">
                                  /landing/{pageSettings.slug}
                                </code>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-700 font-medium w-20">Query:</span>
                                <code className="text-xs bg-white px-2 py-1 rounded border border-green-300 flex-1">
                                  ?view=landing&slug={pageSettings.slug}
                                </code>
                              </div>
                            </div>
                            <p className="text-xs text-green-700 mt-2">
                              💡 Use the query URL if the path URL doesn't work in your environment
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-700 font-medium">SEO Meta Description</label>
                        <Textarea 
                          placeholder="Brief description for search engines" 
                          value={pageSettings.metaDescription}
                          onChange={(e) => setPageSettings({...pageSettings, metaDescription: e.target.value})}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-700 font-medium">Conversion Goal</label>
                        <Input 
                          placeholder="e.g., Form submission, Download" 
                          value={pageSettings.conversionGoal}
                          onChange={(e) => setPageSettings({...pageSettings, conversionGoal: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-700 font-medium">Tracking Code</label>
                        <Textarea 
                          placeholder="Google Analytics, Facebook Pixel, etc." 
                          value={pageSettings.trackingCode}
                          onChange={(e) => setPageSettings({...pageSettings, trackingCode: e.target.value})}
                          rows={4}
                        />
                      </div>
                      <div className="border-t pt-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Design</h3>
                        <div className="grid grid-cols-3 gap-3">
                          <label className="space-y-2 text-sm text-gray-700">
                            <span>Background</span>
                            <Input type="color" value={pageSettings.backgroundColor} onChange={(e) => setPageSettings({ ...pageSettings, backgroundColor: e.target.value })} className="h-10 p-1" />
                          </label>
                          <label className="space-y-2 text-sm text-gray-700">
                            <span>Text</span>
                            <Input type="color" value={pageSettings.textColor} onChange={(e) => setPageSettings({ ...pageSettings, textColor: e.target.value })} className="h-10 p-1" />
                          </label>
                          <label className="space-y-2 text-sm text-gray-700">
                            <span>Accent</span>
                            <Input type="color" value={pageSettings.accentColor} onChange={(e) => setPageSettings({ ...pageSettings, accentColor: e.target.value })} className="h-10 p-1" />
                          </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="space-y-2 text-sm text-gray-700 block">
                            <span>Typography</span>
                            <select value={pageSettings.fontFamily} onChange={(e) => setPageSettings({ ...pageSettings, fontFamily: e.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">
                              <option value="Inter, sans-serif">Modern sans</option>
                              <option value="Georgia, serif">Editorial serif</option>
                              <option value="Arial, sans-serif">Classic sans</option>
                              <option value="'Trebuchet MS', sans-serif">Friendly rounded</option>
                            </select>
                          </label>
                          <label className="space-y-2 text-sm text-gray-700 block">
                            <span>Content width</span>
                            <select value={pageSettings.contentWidth} onChange={(e) => setPageSettings({ ...pageSettings, contentWidth: e.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">
                              <option value="960px">Compact</option>
                              <option value="1200px">Wide</option>
                              <option value="1440px">Extra wide</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preview" className="m-0">
                  <div className="border rounded-lg overflow-hidden mx-auto shadow-lg" style={{ maxWidth: previewDevice === 'mobile' ? '390px' : previewDevice === 'tablet' ? '768px' : '100%' }}>
                    <div className="bg-gray-100 p-4 border-b">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="h-3 w-3 rounded-full bg-red-500" />
                          <div className="h-3 w-3 rounded-full bg-yellow-500" />
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                        </div>
                        <Input
                          value={`https://yoursite.com/landing/${pageSettings.slug || 'your-page'}`}
                          readOnly
                          className="text-sm bg-white h-8"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1 border-b bg-white py-2">
                      <Button variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'} size="sm" aria-label="Desktop preview" title="Desktop preview" onClick={() => setPreviewDevice('desktop')}><Monitor className="h-4 w-4" /></Button>
                      <Button variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'} size="sm" aria-label="Tablet preview" title="Tablet preview" onClick={() => setPreviewDevice('tablet')}><Tablet className="h-4 w-4" /></Button>
                      <Button variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'} size="sm" aria-label="Mobile preview" title="Mobile preview" onClick={() => setPreviewDevice('mobile')}><Smartphone className="h-4 w-4" /></Button>
                    </div>
                    <div className="p-4 sm:p-8 min-h-[500px] space-y-6" style={{ backgroundColor: pageSettings.backgroundColor, color: pageSettings.textColor, fontFamily: pageSettings.fontFamily, maxWidth: pageSettings.contentWidth, margin: '0 auto' }}>
                      {pageElements.length === 0 ? (
                        <div className="max-w-2xl mx-auto text-center py-20">
                          <h1 className="text-4xl text-gray-900 mb-4">{pageSettings.title || 'Your Landing Page Title'}</h1>
                          <p className="text-lg text-gray-600 mb-8">
                            Compelling description that converts visitors into customers
                          </p>
                          <Button size="lg">Get Started</Button>
                        </div>
                      ) : (
                        pageElements.map((element) => (
                          <div key={element.id}>
                            {renderElement(element, true)}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="templates" className="m-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { name: 'Free Quote Request', description: 'Simple lead capture for renovations', color: 'blue' },
                      { name: 'Show Home Reveal', description: 'Showcase a new completed project', color: 'purple' },
                      { name: 'Home Builder Workshop', description: 'Event sign-up for potential buyers', color: 'green' },
                      { name: 'Style Guide Download', description: 'Lead magnet for design trends', color: 'orange' },
                      { name: 'Design Consultation', description: 'Book a meeting with an architect', color: 'indigo' },
                      { name: 'New Product Blast', description: 'Announce new materials or fixtures', color: 'pink' },
                    ].map((template) => (
                      <div
                        key={template.name}
                        className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 cursor-pointer transition-colors bg-white shadow-sm"
                        onClick={() => {
                          let newElements: PageElement[] = [];
                          const timestamp = Date.now();
                          
                          switch (template.name) {
                            case 'Free Quote Request':
                              newElements = [
                                { id: `temp-${timestamp}-1`, type: 'heading', content: 'Get a Free Quote for Your Dream Renovation', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-2`, type: 'paragraph', content: 'Ready to transform your home? Fill out the form below for a complimentary consultation and detailed estimate from our expert builders.', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-3`, type: 'form', content: 'Request Free Quote', styles: { alignment: 'center' } },
                              ];
                              break;
                              
                            case 'Show Home Reveal':
                              newElements = [
                                { id: `temp-${timestamp}-1`, type: 'heading', content: 'Visit Our New Luxury Show Home', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-2`, type: 'image', content: 'https://images.unsplash.com/photo-1758548157275-d939cf0f0e32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsdXh1cnklMjBraXRjaGVuJTIwcmVub3ZhdGlvbiUyMGJyaWdodxlbnwxfHx8fDE3Njk0Nzg4MzF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-3`, type: 'paragraph', content: 'Experience the quality of our craftsmanship firsthand. Join us for the grand opening of the "Evergreen Estate" model home this weekend.', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-4`, type: 'button', content: 'Book a Private Tour', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-5`, type: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', styles: { alignment: 'center' } },
                              ];
                              break;
                              
                            case 'Home Builder Workshop':
                              newElements = [
                                { id: `temp-${timestamp}-1`, type: 'heading', content: 'Workshop: 5 Steps to Building Your Custom Home', styles: { alignment: 'left' } },
                                { id: `temp-${timestamp}-2`, type: 'paragraph', content: 'Join our master builders as they walk you through the process of planning, designing, and building your perfect custom home without the stress.', styles: { alignment: 'left' } },
                                { id: `temp-${timestamp}-3`, type: 'image', content: 'https://images.unsplash.com/photo-1721132537184-5494c01ed87f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwY29uc3RydWN0aW9uJTIwc2l0ZSUyMGJ1aWxkZXIlMjBtZWV0aW5nJTIwYmx1ZXByaW50c3xlbnwxfHx8fDE3Njk0Nzg4MzF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-4`, type: 'form', content: 'Register for Workshop', styles: { alignment: 'center' } },
                              ];
                              break;
                              
                            case 'Style Guide Download':
                              newElements = [
                                { id: `temp-${timestamp}-1`, type: 'heading', content: '2025 Home Design & Remodeling Trends', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-2`, type: 'image', content: 'https://images.unsplash.com/photo-1673625570731-8bff2023acb6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbnRlcmlvciUyMGRlc2lnbiUyMG1hZ2F6aW5lJTIwY29mZmVlJTIwdGFibGV8ZW58MXx8fHwxNzY5NDc4ODMxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-3`, type: 'paragraph', content: 'Discover the latest styles in kitchens, bathrooms, and outdoor living spaces. Download our free style guide to inspire your next project.', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-4`, type: 'button', content: 'Download Free PDF', styles: { alignment: 'center' } },
                              ];
                              break;
                              
                            case 'Design Consultation':
                                newElements = [
                                { id: `temp-${timestamp}-1`, type: 'heading', content: 'Book Your Complimentary Design Session', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-2`, type: 'paragraph', content: 'Meet with our award-winning architects to discuss your vision. No commitment required.', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-3`, type: 'button', content: 'Schedule Consultation', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-4`, type: 'image', content: 'https://images.unsplash.com/photo-1581674662583-5e89b374fae6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcmNoaXRlY3QlMjBzaG93aW5nJTIwcGxhbnMlMjB0byUyMGNsaWVudHN8ZW58MXx8fHwxNzY5NDc4ODMxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', styles: { alignment: 'center' } },
                              ];
                              break;
                              
                            case 'New Product Blast':
                                newElements = [
                                { id: `temp-${timestamp}-1`, type: 'heading', content: 'The Ultimate Outdoor Kitchen Series', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-2`, type: 'paragraph', content: 'Upgrade your backyard entertainment with our new line of weather-resistant, stainless steel outdoor cabinetry and appliances.', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-3`, type: 'image', content: 'https://images.unsplash.com/photo-1631878083932-a9eb6e128cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBvdXRkb29yJTIwa2l0Y2hlbiUyMGJicSUyMHBhdGlvfGVufDF8fHx8MTc2OTQ3OTA4MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', styles: { alignment: 'center' } },
                                { id: `temp-${timestamp}-4`, type: 'button', content: 'View Product Catalog', styles: { alignment: 'center' } },
                              ];
                              break;
                          }
                          
                          if (newElements.length > 0) {
                            if (confirm(`Replace current content with ${template.name} template?`)) {
                              setPageElements(newElements);
                              toast.success(`${template.name} template loaded!`);
                              // Switch to builder tab to see changes
                              const builderTab = document.querySelector('[data-value="builder"]') as HTMLElement;
                              if (builderTab) builderTab.click();
                            }
                          }
                        }}
                      >
                        <div className={`h-32 bg-${template.color}-100 rounded mb-3 flex items-center justify-center`}>
                          <Layout className={`h-12 w-12 text-${template.color}-600`} />
                        </div>
                        <h3 className="text-lg text-gray-900 font-medium">{template.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                        <Button variant="outline" size="sm" className="w-full mt-4">
                          Use Template
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
      </Dialog>

      <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col z-[200] bg-white">
          <DialogHeader>
            <DialogTitle>Select Product</DialogTitle>
            <DialogDescription>
              Choose a product from your inventory to add to the landing page.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Search products by name, SKU, or category..." 
              value={inventorySearchQuery}
              onChange={(e) => setInventorySearchQuery(e.target.value)}
              className="flex-1"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-md">
            {loadingInventory ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <Package className="h-12 w-12 mb-2 opacity-20" />
                <p>No products found</p>
                {inventorySearchQuery && <p className="text-sm mt-1">Try a different search term</p>}
              </div>
            ) : (
              <div className="divide-y">
                {filteredInventory.map(item => (
                  <div 
                    key={item.id} 
                    className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between group transition-colors"
                    onClick={() => handleAddProduct(item)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                         {item.imageUrl ? (
                           <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                         ) : (
                           <div className="h-full w-full flex items-center justify-center text-gray-400 bg-gray-50">
                             <Package className="h-6 w-6" />
                           </div>
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{item.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{item.sku}</span>
                          <span>•</span>
                          <span>{item.category}</span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="font-bold text-gray-900 text-lg">${(item.priceTier1 || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className={`text-xs ${item.quantityOnHand > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.quantityOnHand > 0 ? `${item.quantityOnHand} in stock` : 'Out of stock'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}