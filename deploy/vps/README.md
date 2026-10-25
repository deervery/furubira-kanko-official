# VPS static staging

These scripts package already-built public files. No Go/Node compilation or package
installation runs on the VPS. GitHub Actions builds the site, tests the archive
boundary, starts real nginx in isolation, compares public bytes and routing, then
uploads a checksum-pinned artifact. The workflow has no SSH credential or automatic
production deployment.

Only 127.0.0.1:18098 (tourism) and 127.0.0.1:18099 (company) are used. The private
company preview deliberately returns 503/ready:false for inquiry intake. Its
production form is still hosted by the existing Vercel deployment. A separately
tested API migration is required before company DNS cutover.

The receiver validates SHA-256, all file hashes, revision and archive paths before
switching current atomically. Current and previous releases are retained. Shared
content-addressed assets survive rollback so already-open pages keep working.
No volume/image pruning, service restart or DNS modification is part of receipt.

After installing an artifact, validate and reload only the isolated staging nginx
service and run verify-nginx.py. If validation or HTTP checks fail, invoke
receive-release.py KIND PREVIOUS_REVISION --rollback and revalidate/reload. Always
keep an independently verified previous deployment until the next release passes.

The routing fingerprint fails packaging if upstream Vercel routing changes; review
this adapter explicitly instead of silently ignoring a new rule. Before public
cutover, prepare TLS, external DNS/IPv6/alias checks, production inquiry behavior
(company), external backup cadence, monitoring and an observed load test.

Cloudflare's documented test site key is used only for private staging artifacts.
Do not promote this package into a live company form without rebuilding it with the
real public site key and passing the separate company inquiry release gate.

The isolated nginx unit and main config are included as staging-nginx.conf and
deervery-static-staging.service. Install the config under /opt/static-sites/nginx/
and the unit under /etc/systemd/system/. It runs as www-data, binds loopback only,
and has a 128MiB memory limit and 50% of one CPU. Check it with systemd-analyze verify
and start/reload only deervery-static-staging.service. The host nginx config and
existing application containers do not need to be restarted.

An artifact receipt switches files only. Validate nginx configuration before
reloading this isolated unit; run the HTTP verifier afterward. On failure, roll
back to the recorded previous revision, validate and reload, then verify that
revision before resuming deployment. The initial bootstrap requires both the
config files and at least one installed site before starting the unit.
