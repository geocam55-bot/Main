import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  File,
  Calendar,
  User,
  Building,
  Tag,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { User as UserType } from '../App';
import type { Document } from '../utils/documents-client';
import { 
  downloadDocumentClient, 
  getDocumentUrlClient,
  deleteDocumentClient 
} from '../utils/documents-client';

interface DocumentDetailProps {
  document: Document;
  user: UserType;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function DocumentDetail({ document, user, onBack, onEdit, onDelete }: DocumentDetailProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await downloadDocumentClient(document.filePath);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Document downloaded');
    } catch (error: any) {
      // Error downloading document
      toast.error('Failed to download document');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleView = async () => {
    setIsViewing(true);
    try {
      const url = await getDocumentUrlClient(document.filePath);
      window.open(url, '_blank');
    } catch (error: any) {
      // Error viewing document
      toast.error('Failed to view document');
    } finally {
      setIsViewing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="w-8 h-8 text-blue-500" />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FileText className="w-8 h-8 text-green-500" />;
    if (fileType.includes('image')) return <File className="w-8 h-8 text-purple-500" />;
    return <File className="w-8 h-8 text-muted-foreground" />;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Button>
          <div>
            <h1 className="text-3xl">{document.title || document.fileName}</h1>
            <p className="text-muted-foreground">Document Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleView} disabled={isViewing}>
            {isViewing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Eye className="w-4 h-4 mr-2" />
            )}
            View
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download
          </Button>
          <Button variant="outline" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Document Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Preview */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              {getFileIcon(document.fileType)}
              <div className="flex-1">
                <p className="font-medium">{document.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {document.fileType} • {formatFileSize(document.fileSize)}
                </p>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Title</label>
                <p className="text-lg">{document.title || document.fileName}</p>
              </div>

              {document.description && (
                <div>
                  <label className="text-sm text-muted-foreground">Description</label>
                  <p>{document.description}</p>
                </div>
              )}

              {document.category && (
                <div>
                  <label className="text-sm text-muted-foreground">Category</label>
                  <div className="mt-1">
                    <Badge variant="outline">{document.category}</Badge>
                  </div>
                </div>
              )}

              {document.tags && document.tags.length > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {document.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metadata Sidebar */}
        <div className="space-y-6">
          {/* Contact Association */}
          {document.contactName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Associated Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{document.contactName}</p>
                    <p className="text-sm text-muted-foreground">Contact</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Uploaded By
                </label>
                <p className="mt-1">{document.uploadedByName || 'Unknown'}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Upload Date
                </label>
                <p className="mt-1">{formatDate(document.createdAt)}</p>
              </div>

              {document.updatedAt !== document.createdAt && (
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Last Modified
                  </label>
                  <p className="mt-1">{formatDate(document.updatedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Version Info (for future versioning feature) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Version</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="outline">v{document.version}</Badge>
                {document.isLatestVersion && (
                  <Badge variant="default">Latest</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Timeline (Future Enhancement) */}
      {/* This section can be expanded to show document view/download history */}
    </div>
  );
}