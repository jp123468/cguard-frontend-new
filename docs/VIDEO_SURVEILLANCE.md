# Video Surveillance — Architecture & Operations

Multi-tenant video surveillance for cguard-pro. Each tenant (security company) connects
their DVRs/NVRs/IP cameras to the CRM and runs live monitoring tied into operations
(incidents, patrols, customers, posts/stations).

---

## 1. The hard reality (read this first)

Two physical constraints drive the entire design:

1. **Browsers cannot play raw RTSP.** RTSP/RTP is the native protocol of virtually every
   DVR/NVR and IP camera, but no browser can open an `rtsp://` URL. Browsers play only
   **HLS** (`.m3u8` over HTTP), **WebRTC**, or **MSE/fMP4 over WebSocket**. Something must
   transcode/repackage RTSP → a browser-friendly transport. We never put an `rtsp://` URL
   into a `<video>` tag; `rtspUrl` is an internal field, `streamUrl` is what the UI plays.

2. **DVRs live on the tenant's private LAN, not the public internet.** A camera at
   `192.168.1.64:554` is unreachable from our cloud CRM. Asking customers to expose DVRs
   directly to the internet via naive port-forwarding is insecure and often impossible
   (CGNAT, no static IP, locked-down sites). The cloud cannot reach the cameras directly —
   we need a way to bridge the LAN to the gateway.

Everything below exists to solve these two problems while keeping each tenant isolated.

---

## 2. Recommended architecture

```
  TENANT LAN (a guarded site)                     CLOUD (cguard-pro)
  ┌─────────────────────────────┐                 ┌──────────────────────────────┐
  │  DVR / NVR / IP cameras      │                 │  CRM backend (this repo)     │
  │  rtsp://192.168.1.64:554/... │                 │   - videoDevice/Camera/...   │
  │            │                 │                 │   - REST API /video/*        │
  │            ▼                 │   secure link   │   - incidents, patrols       │
  │  ON-SITE BRIDGE / RELAY  ────┼───(VPN / P2P /──┼──▶ Media Gateway             │
  │  (go2rtc or MediaMTX, or     │    reverse      │   (go2rtc / MediaMTX)        │
  │   reverse-tunnel agent)      │    tunnel)      │   RTSP in → WebRTC/HLS out   │
  └─────────────────────────────┘                 │            │                 │
                                                   │            ▼                 │
                                                   │  Frontend (React)            │
                                                   │  <video> plays HLS/WebRTC    │
                                                   └──────────────────────────────┘
```

### 2a. Media gateway (the RTSP→browser bridge)

Use **go2rtc** (recommended — tiny, WebRTC-first, ONVIF discovery, zero-copy passthrough
when codecs allow) or **MediaMTX** (formerly rtsp-simple-server; great HLS/WebRTC/RTSP hub).

Responsibilities:
- **Ingest** each camera's `rtspUrl` (pull on demand; don't keep 500 idle streams hot).
- **Serve** the same stream as **WebRTC** (sub-second latency — preferred for live
  monitoring) and/or **HLS** (higher latency ~3–10s, but bulletproof across devices/NAT).
- **Snapshots** (JPEG frame grab) for tiles/thumbnails.
- Prefer **passthrough** (no re-encode) when the camera is already H.264/H.265 + browser
  supports it; only transcode when necessary (H.265 → H.264 for Safari/Chrome gaps), since
  transcode is CPU-expensive and limits density.

The gateway returns a per-camera playback URL. The CRM stores it on
`videoCamera.streamUrl` (and `snapshotUrl`). The `GET .../camera/:id/stream` endpoint
hands the frontend `{ type:'hls'|'webrtc'|'none', url, snapshotUrl }`.

### 2b. Reaching LAN DVRs (the connectivity layer)

Pick per tenant/site, roughly in order of preference:

1. **On-site bridge agent (recommended).** A small process (go2rtc/MediaMTX or a thin
   relay) runs on a mini-PC/NVR/RPi at the site. It pulls cameras locally and pushes
   streams **outbound** to the cloud gateway over a single authenticated connection
   (reverse tunnel / mTLS). No inbound firewall holes, works behind CGNAT. Best security
   and reliability.
2. **VPN (WireGuard/Tailscale)** from the site to the cloud gateway's network. Cloud
   gateway then pulls RTSP across the tunnel. Simple, secure, but adds a managed tunnel
   per site.
3. **Vendor cloud / P2P** (Hikvision Hik-Connect, Dahua P2P/DMSS, etc.). Use when the
   brand offers a relay; convenient but vendor-dependent and harder to standardize.
4. **Port-forward + static IP / DDNS** — last resort only. If used, restrict by source IP,
   require strong creds, and never expose the DVR admin UI. Discouraged.

`videoDevice.protocol` (`rtsp|onvif|hls|webrtc`) and `host`/`port`/`httpPort` describe how
the bridge/gateway reaches the device. ONVIF is used for discovery + channel enumeration.

---

## 3. How the CRM data model & API map onto this

| Model | Role in the architecture |
|-------|--------------------------|
| **videoDevice** | One physical DVR/NVR/camera/cloud account. Holds connection facts: `host`, `port` (RTSP, default 554), `httpPort`, `username`/`password`, `channels`, `protocol`, plus liveness (`status`, `lastSeenAt`) and operations links (`postSiteId`, `stationId`). |
| **videoCamera** | One channel/stream on a device. `rtspUrl` = internal source (never shown to browser); `streamUrl` = browser-playable URL from the gateway; `snapshotUrl` = thumbnail. `belongsTo videoDevice as 'device'`. |
| **videoEvent** | An operational signal (`motion|alarm|manual|offline|tamper`) with `severity` and lifecycle `status` (`new|ack|resolved`). Bridges video → operations: can link `incidentId`, `videoClipId`, `stationId`, `postSiteId`. |
| **videoClip** | A recorded/trimmed segment (`startAt`/`endAt`/`durationSec`, `url`, `thumbnailUrl`). Status `pending|ready|failed`. Carries `shareToken`/`shareExpiresAt` for customer share links and optional `incidentId`. |

API surface (all tenant-scoped under `/tenant/:tenantId/video/*`, except the public share
read; data is always scoped by `req.currentTenant.id`, never the URL param):

- **Devices** — list/CRUD; `POST .../device/:id/test` does a 3s TCP connect to `host:port`
  and sets `status`/`lastSeenAt` (cheap reachability check, not a full RTSP handshake);
  `POST .../device/:id/cameras` auto-creates `videoCamera` rows for channels `1..N`.
- **Cameras** — list (filter by device/post/station), get/update; `.../camera/:id/stream`
  returns the playback descriptor the player consumes.
- **Events** — list/create (manual); `PATCH` to ack/resolve; `.../event/:id/incident`
  spins up a linked incident.
- **Clips** — list/create (trim)/delete; `.../clip/:id/share` mints a tokened link;
  `.../clip/:id/incident` links a clip to a new incident. `GET /video/clip/shared/:token`
  is the public read.
- **Dispatch** — `POST .../video/dispatch` records a high-severity manual event and
  best-effort push-notifies supervisors.

**Device passwords are never returned in API responses** (mapped out of every device
payload). RTSP URLs stay server-side; the frontend only ever receives `streamUrl`/
`snapshotUrl`.

---

## 4. Operations flows

**Add device → sync cameras → monitor → trim → share → incident → dispatch:**

1. **Add device.** Operator enters DVR/NVR details (host, ports, creds, channels, protocol)
   and attaches it to a `postSite`/`station`. `POST .../video/device`.
2. **Test connection.** `POST .../device/:id/test` — TCP-connects to `host:port` (3s
   timeout via node `net`), updates `status`/`lastSeenAt`. Confirms the bridge/VPN path is
   live before going further.
3. **Sync cameras.** `POST .../device/:id/cameras` creates a `videoCamera` per channel.
   The gateway is pointed at each `rtspUrl` and fills in `streamUrl`/`snapshotUrl`.
4. **Live monitor.** `/video/monitoring` renders a grid of tiles. Each tile calls
   `.../camera/:id/stream` and plays WebRTC (low latency) or HLS. Snapshots back idle tiles
   to save gateway capacity.
5. **Trim a clip.** Operator marks `startAt`/`endAt` and `label`; `POST .../video/clip`
   creates a clip (`durationSec` computed; `ready` if the camera has a URL, else `pending`
   while the gateway renders the segment).
6. **Share to customer.** `POST .../clip/:id/share` returns a tokened, **expiring** link
   (`<FRONTEND>/video/shared/<token>`, default +7 days). The customer opens it with no
   login; backend serves it via `GET /video/clip/shared/:token` only while valid.
7. **Create incident.** From an event (`.../event/:id/incident`) or a clip
   (`.../clip/:id/incident`): creates a `db.incident` (`status 'abierto'`, title,
   description, priority, `stationId`/`postSiteId`) and back-links `incidentId` on the
   source row — video becomes evidence on the operations timeline.
8. **Dispatch a supervisor/patrol.** `POST .../video/dispatch` records a high-severity
   "Despacho solicitado" event and best-effort push-notifies the tenant's supervisors so a
   patrol responds.

---

## 5. Security & best practices

- **Encrypt device passwords at rest.** Today `password` is stored as-is (security TODO):
  move to envelope encryption (per-tenant KMS/DEK), and **never** include `password` in any
  API response. RTSP URLs with embedded creds stay server-side only.
- **Per-tenant isolation.** Every query scopes by `req.currentTenant.id` — never trust the
  URL `:tenantId` for data access. Extend isolation to the media layer: gateway streams,
  tunnels, and storage buckets must be namespaced per tenant so one tenant can never reach
  another's cameras or clips.
- **Signed / expiring share links.** Share tokens are random hex with a hard expiry
  (`shareExpiresAt`, +7d). Treat them as bearer secrets: long/high-entropy, single clip
  scope, revocable, and ideally one-time or rate-limited. The public read returns only
  `{label,url,thumbnailUrl,startAt,endAt}` — no device, no tenant, no creds.
- **RBAC.** Reads require `businessInfoRead`; create/update/delete require
  `businessInfoEdit` (via `PermissionChecker`). Gate live-view, clip-share, and dispatch
  behind appropriate permissions.
- **Audit.** `createdById`/`updatedById`/`acknowledgedById` + timestamps + `paranoid`
  soft-deletes give a trail. Log share-link creation and access, dispatches, and incident
  creation for accountability and customer disputes.
- **Retention.** Define per-tenant clip/event retention and storage lifecycle (auto-expire
  old clips, purge expired share tokens). Keep gateway connections on-demand to bound CPU
  and bandwidth; raw 24/7 archive belongs on the DVR/NVR, not the cloud.
- **Transport security.** mTLS/VPN between bridge and gateway; HTTPS/WSS for all
  browser playback; rotate gateway tokens; never expose DVR admin UIs.

---

*File: `/tmp/cguard-fe-video/docs/VIDEO_SURVEILLANCE.md`*
