#!/usr/bin/env python3
"""One-time DNS bootstrap; renewals switch to webroot after the public cutover."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time

ALLOWED = {'furubira-kanko.com', 'www.furubira-kanko.com', 'deervery.com',
           'www.deervery.com', 'company.deervery.com'}
directory = Path('/run/deervery-site-acme')
directory.mkdir(mode=0o700, exist_ok=True)
domain = os.environ.get('CERTBOT_DOMAIN', '')
validation = os.environ.get('CERTBOT_VALIDATION', '')
if domain not in ALLOWED or not re.fullmatch(r'[A-Za-z0-9_-]{20,150}', validation):
    raise SystemExit('Unexpected certificate challenge')
payload = {'domain': domain, 'name': '_acme-challenge.' + domain, 'type': 'TXT', 'value': validation}
path = directory / (domain + '.json')
path.write_text(json.dumps(payload))
path.chmod(0o600)
if int(os.environ.get('CERTBOT_REMAINING_CHALLENGES', '0')):
    raise SystemExit(0)
# Only the final hook waits; all SAN challenge values are available together.
selected = set(os.environ.get('CERTBOT_ALL_DOMAINS', domain).split(','))
if not selected or not selected.issubset(ALLOWED):
    raise SystemExit('Unexpected certificate domain set')
records = sorted((json.loads(p.read_text()) for p in directory.glob('*.json')
                  if p.stem in selected), key=lambda row: row['domain'])
if {row['domain'] for row in records} != selected:
    raise SystemExit('Not all domain challenges are prepared')
fingerprint = hashlib.sha256(json.dumps(records, sort_keys=True).encode()).hexdigest()
(directory / 'fingerprint').write_text(fingerprint)
deadline = time.monotonic() + 1500
while time.monotonic() < deadline:
    ready = directory / 'ready'
    if ready.exists() and ready.read_text().strip() == fingerprint:
        raise SystemExit(0)
    time.sleep(2)
raise SystemExit('Timed out waiting for verified authoritative TXT records')
