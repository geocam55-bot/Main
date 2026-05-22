import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  FileText,
  Download,
  Eye,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FilePlus2,
  Calendar,
} from 'lucide-react';

interface PortalDocumentsProps {
  documents: any[];
}

export function PortalDocuments({ documents }: PortalDocumentsProps) {
  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string, name: string) => {
    const ext = name?.split('.').pop()?.toLowerCase();
    if (type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon className="h-5 w-5 text-pink-600" />;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext || '') || type?.includes('spreadsheet')) {
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    }
    if (type === 'application/pdf' || ext === 'pdf') {
      return <FileText className="h-5 w-5 text-red-600" />;
    }
    return <File className="h-5 w-5 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Shared Documents</h2>
        <p className="text-muted-foreground text-sm mt-1">Documents shared with you by your service provider</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FilePlus2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">No documents yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Documents shared with you will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {getFileIcon(doc.file_type || doc.type, doc.file_name || doc.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.title || doc.file_name || doc.name || 'Document'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(doc.created_at)}
                        </span>
                        {doc.file_size && (
                          <span>&middot; {formatFileSize(doc.file_size)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {doc.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                        className="gap-1"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                    )}
                  </div>
                </div>
                {doc.description && (
                  <p className="text-xs text-muted-foreground mt-2 pl-13 ml-13">{doc.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
