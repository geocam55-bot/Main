import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUCKET_NAME = 'make-8405be07-3d-models';

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

export function modelsAPI(app: Hono) {
  const PREFIX = '/make-server-8405be07/models';

  // Idempotently create the bucket
  const initBucket = async () => {
    const supabase = getSupabase();
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
      });
    }
  };

  // Run on startup
  initBucket().catch(() => {});

  app.post(`${PREFIX}/upload`, async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);

      const formData = await c.req.parseBody();
      const file = formData['file'] as File;
      const name = formData['name'] as string;

      if (!file || !name) {
        return c.json({ error: 'File and name are required' }, 400);
      }

      const supabase = getSupabase();
      
      const fileExt = file.name.split('.').pop() || 'obj';
      const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${Date.now()}_${safeName}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, arrayBuffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: true
        });

      if (error) {
        throw error;
      }

      return c.json({ success: true, path: data.path });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  app.get(`${PREFIX}/list`, async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);

      const supabase = getSupabase();
      
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list();

      if (error) throw error;

      // Filter out only .obj or relevant files and create signed URLs
      const models = await Promise.all((files || [])
        .filter(f => !f.name.startsWith('.emptyFolderPlaceholder'))
        .map(async (file) => {
          const { data: signedUrlData } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(file.name, 60 * 60 * 24); // 24 hours

          return {
            name: file.name,
            url: signedUrlData?.signedUrl,
            size: file.metadata?.size,
            created_at: file.created_at
          };
        }));

      return c.json({ models });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  app.get(`${PREFIX}/signed-url`, async (c) => {
    try {
      const filename = c.req.query('filename');
      const bucket = c.req.query('bucket') || BUCKET_NAME;
      if (!filename) return c.json({ error: 'Filename is required' }, 400);

      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filename, 60 * 60 * 24);

      if (error) throw error;
      return c.json({ url: data.signedUrl });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });
}
