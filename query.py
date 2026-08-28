import urllib.request
import json
import os

supabase_url = os.environ.get("VITE_SUPABASE_URL")
supabase_key = os.environ.get("VITE_SUPABASE_ANON_KEY")

req = urllib.request.Request(
    f"{supabase_url}/rest/v1/api_connections?select=*",
    headers={
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}"
    }
)
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode('utf-8'))
except Exception as e:
    print(e)
