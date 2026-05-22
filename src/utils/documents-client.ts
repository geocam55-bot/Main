import { createClient } from './supabase/client';

const supabase = createClient();

export interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  contactId?: string;
  contactName?: string;
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  uploadedBy: string;
  uploadedByName?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isLatestVersion: boolean;
  parentDocumentId?: string;
}

// Helper function to transform snake_case from database to camelCase
function transformFromDbFormat(documentData: any) {
  if (!documentData) return documentData;
  
  const transformed: any = { ...documentData };
  
  if ('created_at' in transformed) {
    transformed.createdAt = transformed.created_at;
    delete transformed.created_at;
  }
  if ('updated_at' in transformed) {
    transformed.updatedAt = transformed.updated_at;
    delete transformed.updated_at;
  }
  if ('file_name' in transformed) {
    transformed.fileName = transformed.file_name;
    delete transformed.file_name;
  }
  if ('file_type' in transformed) {
    transformed.fileType = transformed.file_type;
    delete transformed.file_type;
  }
  if ('file_size' in transformed) {
    transformed.fileSize = transformed.file_size;
    delete transformed.file_size;
  }
  if ('file_path' in transformed) {
    transformed.filePath = transformed.file_path;
    delete transformed.file_path;
  }
  if ('contact_id' in transformed) {
    transformed.contactId = transformed.contact_id;
    delete transformed.contact_id;
  }
  if ('contact_name' in transformed) {
    transformed.contactName = transformed.contact_name;
    delete transformed.contact_name;
  }
  if ('uploaded_by' in transformed) {
    transformed.uploadedBy = transformed.uploaded_by;
    delete transformed.uploaded_by;
  }
  if ('uploaded_by_name' in transformed) {
    transformed.uploadedByName = transformed.uploaded_by_name;
    delete transformed.uploaded_by_name;
  }
  if ('organization_id' in transformed) {
    transformed.organizationId = transformed.organization_id;
    delete transformed.organization_id;
  }
  if ('is_latest_version' in transformed) {
    transformed.isLatestVersion = transformed.is_latest_version;
    delete transformed.is_latest_version;
  }
  if ('parent_document_id' in transformed) {
    transformed.parentDocumentId = transformed.parent_document_id;
    delete transformed.parent_document_id;
  }
  
  return transformed;
}

// Helper function to transform camelCase to snake_case for database
function transformToDbFormat(documentData: any) {
  const transformed: any = { ...documentData };
  
  if ('fileName' in transformed) {
    transformed.file_name = transformed.fileName;
    delete transformed.fileName;
  }
  if ('fileType' in transformed) {
    transformed.file_type = transformed.fileType;
    delete transformed.fileType;
  }
  if ('fileSize' in transformed) {
    transformed.file_size = transformed.fileSize;
    delete transformed.fileSize;
  }
  if ('filePath' in transformed) {
    transformed.file_path = transformed.filePath;
    delete transformed.filePath;
  }
  if ('contactId' in transformed) {
    transformed.contact_id = transformed.contactId;
    delete transformed.contactId;
  }
  if ('contactName' in transformed) {
    transformed.contact_name = transformed.contactName;
    delete transformed.contactName;
  }
  if ('uploadedBy' in transformed) {
    transformed.uploaded_by = transformed.uploadedBy;
    delete transformed.uploadedBy;
  }
  if ('uploadedByName' in transformed) {
    transformed.uploaded_by_name = transformed.uploadedByName;
    delete transformed.uploadedByName;
  }
  if ('organizationId' in transformed) {
    transformed.organization_id = transformed.organizationId;
    delete transformed.organizationId;
  }
  if ('createdAt' in transformed) {
    transformed.created_at = transformed.createdAt;
    delete transformed.createdAt;
  }
  if ('updatedAt' in transformed) {
    transformed.updated_at = transformed.updatedAt;
    delete transformed.updatedAt;
  }
  if ('isLatestVersion' in transformed) {
    transformed.is_latest_version = transformed.isLatestVersion;
    delete transformed.isLatestVersion;
  }
  if ('parentDocumentId' in transformed) {
    transformed.parent_document_id = transformed.parentDocumentId;
    delete transformed.parentDocumentId;
  }
  
  return transformed;
}

export async function getAllDocumentsClient(contactId?: string, scope: 'personal' | 'team' = 'personal') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('documents')
      .select('*');

    // Filter by contact if specified
    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    // Apply scope-based filtering for user's own documents
    if (scope === 'personal' && user) {
      query = query.eq('uploaded_by', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // Only log if it's not a table-not-found error (user hasn't run migration yet)
      if (error.code !== 'PGRST205' && error.code !== '42P01' && !error.message?.includes('Could not find the table')) {
        // Database error
      }
      throw error;
    }

    const transformedData = (data || []).map(transformFromDbFormat);
    return { documents: transformedData };
  } catch (error: any) {
    // Only log if it's not a table-not-found error (user hasn't run migration yet)
    if (error.code !== 'PGRST205' && error.code !== '42P01' && !error.message?.includes('Could not find the table')) {
      // Error loading documents
    }
    throw error;
  }
}

export async function uploadDocumentClient(file: File, metadata: {
  contactId?: string;
  contactName?: string;
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const organizationId = user.user_metadata?.organizationId;
    if (!organizationId) throw new Error('Organization ID not found');

    // Create a unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${organizationId}/${timestamp}_${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Create document metadata record
    const documentData = {
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_path: filePath,
      contact_id: metadata.contactId || null,
      contact_name: metadata.contactName || null,
      title: metadata.title || file.name,
      description: metadata.description || null,
      tags: metadata.tags || [],
      category: metadata.category || null,
      uploaded_by: user.id,
      uploaded_by_name: user.user_metadata?.name || user.email,
      organization_id: organizationId,
      version: 1,
      is_latest_version: true,
      parent_document_id: null
    };

    const { data, error } = await supabase
      .from('documents')
      .insert([documentData])
      .select()
      .single();

    if (error) {
      // If database insert fails, delete the uploaded file
      await supabase.storage.from('documents').remove([filePath]);
      throw error;
    }

    return { document: transformFromDbFormat(data) };
  } catch (error: any) {
    // Error uploading document
    throw error;
  }
}

export async function updateDocumentClient(id: string, updates: {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  contactId?: string;
  contactName?: string;
}) {
  try {
    const dbData = transformToDbFormat(updates);

    const { data, error } = await supabase
      .from('documents')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { document: transformFromDbFormat(data) };
  } catch (error: any) {
    // Error updating document
    throw error;
  }
}

export async function deleteDocumentClient(id: string) {
  try {
    // First, get the document to find the file path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path]);

    if (storageError) {
      // Error deleting file from storage
      // Continue with database deletion even if storage deletion fails
    }

    // Delete the document record
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    // Error deleting document
    throw error;
  }
}

export async function downloadDocumentClient(filePath: string) {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (error) throw error;

    return data;
  } catch (error: any) {
    // Error downloading document
    throw error;
  }
}

export async function getDocumentUrlClient(filePath: string, expiresIn: number = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;

    return data.signedUrl;
  } catch (error: any) {
    // Error getting document URL
    throw error;
  }
}

export async function getDocumentVersionsClient(parentDocumentId: string) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .or(`id.eq.${parentDocumentId},parent_document_id.eq.${parentDocumentId}`)
      .order('version', { ascending: false });

    if (error) throw error;

    const transformedData = (data || []).map(transformFromDbFormat);
    return { versions: transformedData };
  } catch (error: any) {
    // Error getting document versions
    throw error;
  }
}