// API client for Import/Export module (frontend to backend communication)


// Real backend implementation for file upload
export async function uploadFile(file: File): Promise<{ fileId: string; originalName: string }> {
	const formData = new FormData();
	formData.append('file', file);
	const res = await fetch('/api/import-export/upload', {
		method: 'POST',
		body: formData,
	});
	if (!res.ok) throw new Error('File upload failed');
	return await res.json();
}

// The rest of the API (mapping, validation, importJob, status) can still use mockServer for now
export * from './mockServer';
