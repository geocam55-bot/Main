import urllib.request
import json
import os

req = urllib.request.Request(
    "https://api.fleetcomplete.com/login/token",
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    data=b"grant_type=client_credentials&client_id=george.campbell%40ronadartmouth.ca&client_secret=c33d718fbf2992b37aefb2e161f668a9:8e2951efe8844756dc6838c38e630196"
)
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode('utf-8'))
except Exception as e:
    print(e)
