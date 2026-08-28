import urllib.request
import json
import os
import urllib.parse

req = urllib.request.Request(
    "https://api.fleetcomplete.com/login/token",
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    data=urllib.parse.urlencode({
        "grant_type": "password",
        "username": "george.campbell@ronadartmouth.ca",
        "password": "c33d718fbf2992b37aefb2e161f668a9:8e2951efe8844756dc6838c38e630196"
    }).encode('utf-8')
)
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode('utf-8'))
except Exception as e:
    print(e)
