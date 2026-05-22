import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  Search, 
  Plus, 
  Upload, 
  File, 
  FileText, 
  Download, 
  Trash2, 
  Edit, 
  MoreVertical, 
  Eye,
  Loader2,
  Filter,
  Tag,
  User,
  Building,
  Calendar,
  Paperclip
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import type { User as UserType } from '../App';
import { PermissionGate, PermissionButton } from './PermissionGate';
import { canAdd, canChange, canDelete } from '../utils/permissions';
import { 
  getAllDocumentsClient, 
  uploadDocumentClient, 
  updateDocumentClient, 
  deleteDocumentClient,
  downloadDocumentClient,
  getDocumentUrlClient,
  type Document 
} from '../utils/documents-client';
import { contactsAPI } from '../utils/api';
import { DocumentsSetup } from './DocumentsSetup';
import { DocumentsModuleHelp } from './DocumentsModuleHelp';

interface DocumentsProps {
  user: UserType;
}

interface Contact {
  id: string;
  name: string;
  company: string;
}

export function Documents({ user }: DocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [tableNotFound, setTableNotFound] = useState(false);
  
  // Upload dialog state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    contactId: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [editMetadata, setEditMetadata] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    contactId: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    loadDocuments();
    loadContacts();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    setTableNotFound(false);
    try {
      const { documents: docs } = await getAllDocumentsClient();
      setDocuments(docs);
    } catch (error: any) {
      // Only log if it's not a table-not-found error (user hasn't run migration yet)
      if (error.code !== 'PGRST205' && error.code !== '42P01' && !error.message?.includes('Could not find the table')) {
        // Error loading documents
      }
      
      // Check if it's a table not found error
      if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('Could not find the table')) {
        setTableNotFound(true);
      } else {
        toast.error('Failed to load documents');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await contactsAPI.getAll();
      setContacts(response.contacts || []);
    } catch (error) {
      // Error loading contacts
      toast.error('Failed to load contacts');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingFile(file);
      setUploadMetadata(prev => ({
        ...prev,
        title: file.name,
      }));
    }
  };

  const handleUpload = async () => {
    if (!uploadingFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!canAdd('documents', user.role)) {
      toast.error('You do not have permission to upload documents');
      return;
    }

    setIsUploading(true);
    try {
      const selectedContact = contacts.find(c => c.id === uploadMetadata.contactId);
      
      await uploadDocumentClient(uploadingFile, {
        title: uploadMetadata.title || uploadingFile.name,
        description: uploadMetadata.description || undefined,
        category: uploadMetadata.category || undefined,
        tags: uploadMetadata.tags ? uploadMetadata.tags.split(',').map(t => t.trim()) : undefined,
        contactId: uploadMetadata.contactId || undefined,
        contactName: selectedContact ? `${selectedContact.name} - ${selectedContact.company}` : undefined,
      });

      toast.success('Document uploaded successfully');
      setIsUploadDialogOpen(false);
      setUploadingFile(null);
      setUploadMetadata({
        title: '',
        description: '',
        category: '',
        tags: '',
        contactId: '',
      });
      loadDocuments();
    } catch (error: any) {
      // Error uploading document
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditDocument = (doc: Document) => {
    setEditingDocument(doc);
    setEditMetadata({
      title: doc.title || '',
      description: doc.description || '',
      category: doc.category || '',
      tags: doc.tags?.join(', ') || '',
      contactId: doc.contactId || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDocument) return;

    if (!canChange('documents', user.role)) {
      toast.error('You do not have permission to edit documents');
      return;
    }

    setIsSaving(true);
    try {
      const selectedContact = contacts.find(c => c.id === editMetadata.contactId);
      
      await updateDocumentClient(editingDocument.id, {
        title: editMetadata.title,
        description: editMetadata.description,
        category: editMetadata.category,
        tags: editMetadata.tags ? editMetadata.tags.split(',').map(t => t.trim()) : [],
        contactId: editMetadata.contactId || undefined,
        contactName: selectedContact ? `${selectedContact.name} - ${selectedContact.company}` : undefined,
      });

      toast.success('Document updated successfully');
      setIsEditDialogOpen(false);
      setEditingDocument(null);
      loadDocuments();
    } catch (error: any) {
      // Error updating document
      toast.error('Failed to update document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await downloadDocumentClient(doc.filePath);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Document downloaded');
    } catch (error: any) {
      // Error downloading document
      toast.error('Failed to download document');
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!canDelete('documents', user.role)) {
      toast.error('You do not have permission to delete documents');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${doc.title || doc.fileName}"?`)) {
      return;
    }

    try {
      await deleteDocumentClient(doc.id);
      toast.success('Document deleted successfully');
      loadDocuments();
    } catch (error: any) {
      // Error deleting document
      toast.error('Failed to delete document');
    }
  };

  const handleView = async (doc: Document) => {
    try {
      const url = await getDocumentUrlClient(doc.filePath);
      window.open(url, '_blank');
    } catch (error: any) {
      // Error viewing document
      toast.error('Failed to view document');
    }
  };

  // Filter and search documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesContact = contactFilter === 'all' || doc.contactId === contactFilter;

    return matchesSearch && matchesCategory && matchesContact;
  });

  // Get unique categories and contacts for filters
  const categories = Array.from(new Set(documents.map(d => d.category).filter(Boolean))) as string[];
  const documentContacts = Array.from(
    new Set(documents.filter(d => d.contactId).map(d => ({ id: d.contactId!, name: d.contactName! })))
      .values()
  );

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FileText className="w-5 h-5 text-green-500" />;
    if (fileType.includes('image')) return <File className="w-5 h-5 text-purple-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  // Show setup screen if table not found
  if (tableNotFound) {
    return <DocumentsSetup />;
  }

  return (
    <PermissionGate user={user} module="documents" action="view">
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-end items-center">
        <DocumentsModuleHelp
          userId={user.id}
          totalDocuments={documents.length}
          onOpenSearchExample={(query) => {
            setSearchQuery(query);
            setCurrentPage(1);
          }}
          onShowAllCategories={() => {
            setCategoryFilter('all');
            setCurrentPage(1);
          }}
          onShowAllContacts={() => {
            setContactFilter('all');
            setCurrentPage(1);
          }}
          onClearFilters={() => {
            setSearchQuery('');
            setCategoryFilter('all');
            setContactFilter('all');
            setCurrentPage(1);
          }}
          onOpenUploadForm={() => setIsUploadDialogOpen(true)}
        />
        <PermissionButton module="documents" action="add" userRole={user.role}>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-background">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a new document and associate it with a contact
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <Label htmlFor="file">File *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                  />
                  {uploadingFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {uploadingFile.name} ({formatFileSize(uploadingFile.size)})
                    </p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={uploadMetadata.title}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Document title"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={uploadMetadata.description}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the document"
                    rows={3}
                  />
                </div>

                {/* Contact */}
                <div>
                  <Label htmlFor="contact">Associated Contact</Label>
                  <Select
                    value={uploadMetadata.contactId}
                    onValueChange={(value) => setUploadMetadata(prev => ({ ...prev, contactId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contact (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} - {contact.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={uploadMetadata.category}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Contract, Invoice, Proposal"
                  />
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={uploadMetadata.tags}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="Comma-separated tags"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpload} disabled={!uploadingFile || isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </PermissionButton>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Filter */}
            <div>
              <Select value={contactFilter} onValueChange={setContactFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Contacts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  {documentContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredDocuments.length} {filteredDocuments.length === 1 ? 'Document' : 'Documents'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents found</p>
              {canAdd('documents', user.role) && (
                <p className="text-sm">Upload your first document to get started</p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">File</th>
                      <th className="text-left p-3 hidden sm:table-cell">Title</th>
                      <th className="text-left p-3 hidden lg:table-cell">Contact</th>
                      <th className="text-left p-3 hidden md:table-cell">Category</th>
                      <th className="text-left p-3 hidden md:table-cell">Size</th>
                      <th className="text-left p-3 hidden lg:table-cell">Uploaded</th>
                      <th className="text-left p-3 hidden lg:table-cell">Tags</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocuments.map((doc) => (
                      <tr key={doc.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {getFileIcon(doc.fileType)}
                            <span className="text-sm truncate max-w-[200px]" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <div>
                            <div className="truncate max-w-[200px]" title={doc.title}>
                              {doc.title}
                            </div>
                            {doc.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]" title={doc.description}>
                                {doc.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          {doc.contactName ? (
                            <span className="text-sm truncate max-w-[150px] inline-block" title={doc.contactName}>
                              {doc.contactName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {doc.category ? (
                            <Badge variant="outline">{doc.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                          {formatFileSize(doc.fileSize)}
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <div className="text-sm">
                            <div>{formatDate(doc.createdAt)}</div>
                            <div className="text-muted-foreground">{doc.uploadedByName}</div>
                          </div>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {doc.tags && doc.tags.length > 0 ? (
                              doc.tags.slice(0, 2).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                            {doc.tags && doc.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{doc.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(doc)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canChange('documents', user.role) && (
                                  <DropdownMenuItem onClick={() => handleEditDocument(doc)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Details
                                  </DropdownMenuItem>
                                )}
                                {canDelete('documents', user.role) && (
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(doc)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredDocuments.length)} of{' '}
                    {filteredDocuments.length} documents
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-background">
          <DialogHeader>
            <DialogTitle>Edit Document Details</DialogTitle>
            <DialogDescription>
              Update document information and associations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editMetadata.title}
                onChange={(e) => setEditMetadata(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Document title"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editMetadata.description}
                onChange={(e) => setEditMetadata(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the document"
                rows={3}
              />
            </div>

            {/* Contact */}
            <div>
              <Label htmlFor="edit-contact">Associated Contact</Label>
              <Select
                value={editMetadata.contactId}
                onValueChange={(value) => setEditMetadata(prev => ({ ...prev, contactId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} - {contact.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={editMetadata.category}
                onChange={(e) => setEditMetadata(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Contract, Invoice, Proposal"
              />
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={editMetadata.tags}
                onChange={(e) => setEditMetadata(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Comma-separated tags"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGate>
  );
}