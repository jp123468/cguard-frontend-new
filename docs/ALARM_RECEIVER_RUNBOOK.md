# Alarm Receiver — Operational Runbook

Central-station signal ingest for cguard-pro. The receiver turns raw panel signals
into normalized `alarmSignal` → `alarmEvent` → `alarmCase` records via the shared
`ingestSignal()` pipeline. This runbook covers the two ingest paths, networking,
the pm2 process, the simulator, supervision, and security.

---

## 1. Architecture overview

```
                         ┌──────────────────────────────────────┐
 (A) Panel ──IP/cell──▶  │  alarmReceiver process                │
                         │  TCP :ALARM_TCP_PORT  UDP :ALARM_UDP_PORT
 (B) HW receiver ─────▶  │  detectFormat → parse → ingestSignal  │ ──▶ MySQL
     (Sur-Gard/Bosch)    │  → DC-09 ACK back to sender           │     (signals,
                         └──────────────────────────────────────┘      events, cases)
```

- Standalone entrypoint: `src/alarmReceiver.ts` (own pm2 process; boots the same
  Sequelize DB/models as `src/server.js`).
- Listener: `src/services/alarm/receiver.ts` → `startReceiver({tcpPort,udpPort,resolveDb})`
  binds `0.0.0.0` on both TCP (`net`) and UDP (`dgram`).
- Format detection / parsing: `src/services/alarm/protocols/` (`detect.ts`,
  `siaDc09.ts`, `contactId.ts`, `surgard.ts`).
- Normalization: `src/services/alarm/normalizer.ts` → `ingestSignal()`.

**Golden rule:** the signal is PERSISTED (`ingestSignal`) *before* the DC-09 ACK is
sent. If the DB write fails, do not ACK — the panel will retransmit.

---

## 2. Ingest paths

### Path A — Direct panel → our receiver (IP / cellular)

The alarm panel dials our central station directly over IP or a cellular module,
speaking **SIA DC-09** (or Contact ID over DC-09 `ADM-CID`).

Configure on the panel / communicator:

| Setting              | Value                                                   |
|----------------------|---------------------------------------------------------|
| Receiver IP / host   | Public IP (or FQDN) of the alarm server                 |
| Receiver port        | `ALARM_TCP_PORT` (default **6543**), TCP; UDP also OK    |
| Protocol             | SIA DC-09 (SIA-DCS) or Contact ID over DC-09 (ADM-CID)   |
| Account number       | The CS account = `alarmPanel.accountNumber` in our DB    |
| Receiver line / Lpfx | As provisioned (carried as `Lpfx` / `receiverLine`)      |
| Encryption (AES)     | Optional; key must match `alarmPanel.dc09Key` (AES hex)  |
| Supervision / test   | Set per `supervisionMins` / `testIntervalHrs`            |

The panel's **account number is the tenant routing key**: `ingestSignal` resolves
the `alarmPanel` by `accountNumber` across all tenants to obtain `tenantId`. The
panel must exist in cguard-pro first (Panels page) or the signal is rejected.

### Path B — Hardware receiver (Sur-Gard / Bosch) → our automation

A physical line-card receiver terminates POTS / cellular / IP from panels and
forwards to our automation IP/port. Two forwarding styles are supported:

1. **SIA DC-09 forward** — the receiver re-encapsulates events as DC-09 frames and
   sends them to `ALARM_TCP_PORT`. Handled identically to Path A.
2. **Sur-Gard automation format** — the receiver emits its serial/TCP automation
   line (MLR2-DG / SG-System). Parsed by `surgard.ts`.

> ⚠️ **TODO:** `surgard.ts` implements a reasonable Sur-Gard automation parser but
> MUST be tuned to the exact receiver model/firmware (field widths, heartbeat
> line, padding, handshake). Validate against a live receiver before go-live.

Point the receiver's automation output at the alarm server IP and
`ALARM_TCP_PORT`. Account numbers forwarded by the receiver must match
`alarmPanel.accountNumber`.

---

## 3. Networking / firewall

Open inbound on the alarm server, restricted to known panel/receiver source IPs
where possible:

| Direction | Proto    | Port              | Source                          |
|-----------|----------|-------------------|---------------------------------|
| Inbound   | TCP      | `ALARM_TCP_PORT` (6543) | Panels, cellular gateways, HW receivers |
| Inbound   | UDP      | `ALARM_UDP_PORT` (6543) | Panels that use UDP DC-09       |

```bash
# Example (ufw)
sudo ufw allow 6543/tcp
sudo ufw allow 6543/udp
# Tighten to known sources where the carrier/static IPs are known:
sudo ufw allow from <panel_or_receiver_ip> to any port 6543
```

- The listener binds `0.0.0.0`, so no app-side bind config is needed.
- If behind NAT/cloud LB, forward both TCP and UDP `6543` to the host and ensure
  the LB does **not** terminate/rewrite the raw stream (DC-09 is binary).
- Cellular panels often roam — source-IP allowlisting may be impractical for those;
  rely on AES + account validation instead.

---

## 4. pm2 process

The receiver runs as its own long-lived pm2 process (wired by the orchestrator in
`ecosystem.config.js`), separate from the API server.

```bash
pm2 status                       # confirm alarm-receiver is online
pm2 logs alarm-receiver          # tail parse/ingest/ACK logs
pm2 restart alarm-receiver       # after deploy
pm2 describe alarm-receiver      # show env (ALARM_TCP_PORT/UDP_PORT, DB)
```

Required env (same DB vars as the API, plus):

```
ALARM_TCP_PORT=6543
ALARM_UDP_PORT=6543
```

On boot it logs the bound TCP/UDP ports. If you see `EADDRINUSE`, another process
holds the port (often a stale receiver) — `pm2 delete` the stale one and restart.

---

## 5. Simulator (verify without hardware)

`src/scripts/alarmSimulator.ts` opens a TCP socket to the receiver and sends a
SIA-DCS frame, an ADM-CID (Contact ID) frame, and a Sur-Gard line, printing each
ACK.

```bash
# from the backend worktree / deployed dir
npx ts-node src/scripts/alarmSimulator.ts <host> <port>
# e.g.
npx ts-node src/scripts/alarmSimulator.ts 127.0.0.1 6543
```

Expected: a DC-09 `"ACK"` frame for the DC-09 messages, and a new/updated
`alarmCase` for the simulated account. Use an `accountNumber` that maps to a real
`alarmPanel` in a test tenant, otherwise the signal is stored but no case routes.

Smoke checklist after deploy:
1. `pm2 status` → `alarm-receiver` online.
2. Run the simulator → confirm ACK printed.
3. Check the Signals page (`/alarm/signals`) for the new rows.
4. Check the Queue (`/alarm/queue`) for the resulting case.

---

## 6. Supervision / heartbeat

- **Panel supervision** (`alarmPanel.supervisionMins`): the panel/receiver sends
  periodic link tests. DC-09 link tests use the `NULL` token; Contact ID test =
  event `602`; SIA test = `RP`. These are ingested as `category: test` and update
  `panel.lastSignalAt` / `panel.status`.
- **Missing-signal detection:** if `now - lastSignalAt > supervisionMins` (or
  `testIntervalHrs` for slower test timers), the panel is overdue — surface as a
  `supervisory`/`trouble` condition and set `panel.status = 'offline'`.
- **Receiver heartbeat (Path B):** Sur-Gard/Bosch receivers emit their own
  automation heartbeat line; loss of heartbeat means the *receiver link* is down
  (a higher-severity, station-wide alert) vs. a single panel going quiet.
- Operationally: watch `pm2 logs alarm-receiver` for ingest gaps and monitor
  `lastSignalAt` freshness per panel on the Panels page.

---

## 7. Security

- **AES (DC-09):** encrypted frames use the `*`-prefixed token; decrypt with
  `aesDecrypt(data, keyHex)` using `alarmPanel.dc09Key`. The key is AES hex stored
  per panel.
- **`dc09Key` and `passcode` are NEVER returned by the API** — strip them from all
  responses. Operators never see the raw key.
- **TODO — encrypt `dc09Key` at rest:** it is currently stored as AES hex in the
  column; add column-level encryption (KMS / app-level envelope) before handling
  real customer keys. Track this as a hardening item prior to production.
- **Per-tenant isolation by account:** routing is by `accountNumber → alarmPanel →
  tenantId`. Account numbers must be unique enough across tenants to avoid
  cross-tenant collisions; validate uniqueness at panel creation. All downstream
  queries scope by `tenantId = req.currentTenant.id`, never a URL param.
- **Source restriction:** allowlist panel/receiver source IPs on the firewall
  where carriers provide static IPs; for roaming cellular, rely on AES + account
  validation.
- **Replay / integrity:** honor DC-09 CRC (`crc16`) and Contact ID checksum;
  reject frames that fail `crcOk` / `checksumOk`. Sequence numbers (`seq`) help
  detect replays.
- **Fail-closed on persist error:** never ACK a signal we failed to store.

---

## 8. Troubleshooting quick reference

| Symptom                                  | Likely cause / action                                   |
|------------------------------------------|---------------------------------------------------------|
| Panel reports "FTC" / no ACK             | Port closed (firewall), receiver down (`pm2 status`), or persist failed (see logs). |
| Signal stored but no case                | `accountNumber` doesn't match any `alarmPanel`; create/fix the panel. |
| `EADDRINUSE` on boot                     | Stale receiver process holding `6543`; `pm2 delete` it. |
| Garbled/unparsed frames                  | Wrong format from HW receiver; tune `surgard.ts`; verify DC-09 vs automation output. |
| Encrypted frames not decoding            | `dc09Key` mismatch between panel and `alarmPanel.dc09Key`. |
| Panel shows offline but is fine          | Supervision window too tight vs. `testIntervalHrs`; adjust `supervisionMins`. |

---

_Last updated: 2026-06-07_
