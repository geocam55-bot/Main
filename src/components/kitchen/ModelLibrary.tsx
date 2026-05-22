import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Upload, FileBox, Trash2, Link as LinkIcon, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';
import { copyToClipboard as utilCopyToClipboard } from '../../utils/clipboard';

export function ModelLibrary() {
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/models/list`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setModels(data.models || []);
    } catch (err: any) {
      toast.error(`Failed to fetch models: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadName) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', uploadName);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/models/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      toast.success('Model uploaded successfully!');
      setUploadName('');
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchModels();
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    const success = await utilCopyToClipboard(url);
    if (success) {
      toast.success('URL copied to clipboard!');
    } else {
      toast.error('Failed to copy URL. Please try selecting and copying manually.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">3D Model Library</h2>
          <p className="text-muted-foreground mt-1">Upload and manage .obj files for use in the 3D planner.</p>
        </div>
        <Button onClick={fetchModels} variant="outline" className="gap-2">
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-1">
          <h3 className="text-lg font-medium mb-4">Upload New Model</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Model Name</label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. Modern Sink"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">File (.obj)</label>
              <Input
                id="file-upload"
                type="file"
                accept=".obj"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                required
                className="cursor-pointer"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gap-2" 
              disabled={isUploading || !selectedFile || !uploadName}
            >
              {isUploading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploading ? 'Uploading...' : 'Upload Model'}
            </Button>
          </form>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h3 className="text-lg font-medium mb-4">Available Models</h3>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileBox className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No 3D models uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {models.map((model, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded text-blue-600">
                      <FileBox className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{model.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {model.size ? (model.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'} • 
                        {new Date(model.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => copyToClipboard(model.url)}
                    >
                      <LinkIcon className="w-4 h-4" />
                      Copy URL
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
