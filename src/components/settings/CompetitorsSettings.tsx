import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Edit, Plus, Trash2, Globe, MapPin, Code } from 'lucide-react';
import { CompetitorConfig } from '../../types/competitive-pricing';
import { toast } from 'sonner';

export default function CompetitorsSettings() {
  const supabase = createClient();
  const [competitors, setCompetitors] = useState<CompetitorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<CompetitorConfig | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<CompetitorConfig>>({
    name: '',
    websiteUrl: '',
    storeLocation: '',
    colorHex: '#64748b',
    active: true,
    scrapingInfo: '{}' // string representation of JSON
  });

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        // Fallback for if table doesn't exist yet, we'll just show empty state
        if (error.code === '42P01') {
          console.warn('Competitors table not found yet.');
          setCompetitors([]);
        } else {
          throw error;
        }
      } else {
        const mapped = data.map((d: any) => ({
          ...d,
          websiteUrl: d.website_url,
          searchUrlTemplate: d.search_url_template,
          productUrlPattern: d.product_url_pattern,
          scrapingMethod: d.scraping_method,
          storeLocation: d.store_location,
          colorHex: d.color_hex,
          scrapingInfo: d.scraping_info,
          lastSuccessfulCheck: d.last_successful_check,
          lastError: d.last_error,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
        setCompetitors(mapped);
      }
    } catch (err: any) {
      console.error('Error fetching competitors:', err);
      toast.error('Failed to load competitors');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (competitor?: CompetitorConfig) => {
    if (competitor) {
      setEditingCompetitor(competitor);
      setFormData({
        ...competitor,
        scrapingInfo: typeof competitor.scrapingInfo === 'object' 
          ? JSON.stringify(competitor.scrapingInfo, null, 2) 
          : (competitor.scrapingInfo || '{}')
      });
    } else {
      setEditingCompetitor(null);
      setFormData({
        name: '',
        websiteUrl: '',
        storeLocation: '',
        colorHex: '#64748b',
        active: true,
        scrapingInfo: '{\n  "priceSelector": "",\n  "waitMs": 3000\n}'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.websiteUrl) {
        toast.error('Name and Website URL are required');
        return;
      }

      // Basic URL validation
      try {
        new URL(formData.websiteUrl);
      } catch (e) {
        toast.error('Please enter a valid Website URL (including http:// or https://)');
        return;
      }

      // Parse JSON
      let parsedScrapingInfo = {};
      try {
        if (formData.scrapingInfo) {
          parsedScrapingInfo = JSON.parse(formData.scrapingInfo);
        }
      } catch (e) {
        toast.error('Invalid JSON in Scraping Information');
        return;
      }

      const payload = {
        name: formData.name,
        website_url: formData.websiteUrl,
        store_location: formData.storeLocation,
        color_hex: formData.colorHex,
        active: formData.active,
        scraping_info: parsedScrapingInfo
      };

      if (editingCompetitor) {
        const { error } = await supabase
          .from('competitors')
          .update(payload)
          .eq('id', editingCompetitor.id);
          
        if (error) throw error;
        toast.success('Competitor updated');
      } else {
        const { error } = await supabase
          .from('competitors')
          .insert([payload]);
          
        if (error) throw error;
        toast.success('Competitor added');
      }

      setIsDialogOpen(false);
      fetchCompetitors();
    } catch (err: any) {
      console.error('Error saving competitor:', err);
      toast.error(`Failed to save: ${err.message}`);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this competitor?')) return;
    
    try {
      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      toast.success('Competitor deleted');
      fetchCompetitors();
    } catch (err: any) {
      console.error('Error deleting competitor:', err);
      toast.error('Failed to delete competitor');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Competitors & Shopping List</h3>
          <p className="text-sm text-slate-500">
            Manage competitors, store locations, visual colors, and scraping rules for the Competitive Pricing module.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" />
          Add Competitor
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competitor / Store</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  Loading competitors...
                </TableCell>
              </TableRow>
            ) : competitors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  No competitors configured. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              competitors.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{comp.name}</span>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                        {comp.storeLocation && (
                          <span className="flex items-center">
                            <MapPin className="mr-1 h-3 w-3" />
                            {comp.storeLocation}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Globe className="mr-1 h-3 w-3" />
                          <a href={comp.websiteUrl} target="_blank" rel="noreferrer" className="hover:underline text-blue-600">
                            {(() => {
                              try {
                                return new URL(comp.websiteUrl).hostname.replace('www.', '');
                              } catch(e) {
                                return comp.websiteUrl || 'No URL';
                              }
                            })()}
                          </a>
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="h-6 w-6 rounded-md border shadow-sm" 
                        style={{ backgroundColor: comp.colorHex || '#64748b' }}
                      />
                      <span className="text-sm text-slate-600">{comp.colorHex || '#64748b'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      comp.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {comp.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(comp)}>
                        <Edit className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(comp.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCompetitor ? 'Edit Competitor' : 'Add Competitor'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Competitor Name *</Label>
              <Input 
                id="name" 
                value={formData.name || ''} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Home Depot"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="storeLocation">Store Location</Label>
              <Input 
                id="storeLocation" 
                value={formData.storeLocation || ''} 
                onChange={(e) => setFormData({...formData, storeLocation: e.target.value})} 
                placeholder="e.g. Halifax - Lacewood"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="websiteUrl">Website URL *</Label>
              <Input 
                id="websiteUrl" 
                value={formData.websiteUrl || ''} 
                onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})} 
                placeholder="https://www.homedepot.ca"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="colorHex">Brand Color (Hex)</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  type="color" 
                  id="colorHex" 
                  value={formData.colorHex || '#64748b'} 
                  onChange={(e) => setFormData({...formData, colorHex: e.target.value})} 
                  className="w-16 p-1 h-10"
                />
                <Input 
                  type="text" 
                  value={formData.colorHex || ''} 
                  onChange={(e) => setFormData({...formData, colorHex: e.target.value})} 
                  className="flex-1 uppercase font-mono"
                  placeholder="#F96302"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center space-x-2">
                <Code className="h-4 w-4 text-slate-500" />
                <Label htmlFor="scrapingInfo">Scraping Rules (JSON)</Label>
              </div>
              <Textarea 
                id="scrapingInfo" 
                value={formData.scrapingInfo as string} 
                onChange={(e) => setFormData({...formData, scrapingInfo: e.target.value})} 
                placeholder='{"priceSelector": ".price", "waitMs": 3000}'
                className="font-mono text-xs h-32"
              />
              <p className="text-xs text-slate-500">Valid JSON for scraper configuration</p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch 
                id="active" 
                checked={formData.active} 
                onCheckedChange={(c) => setFormData({...formData, active: c})} 
              />
              <Label htmlFor="active">Active (Enable Monitoring)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800">
              {editingCompetitor ? 'Save Changes' : 'Add Competitor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
