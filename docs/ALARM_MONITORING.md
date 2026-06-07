# Alarm Monitoring (Central Station) — Enterprise Integration Plan

**Goal:** turn CGuardPro into a true alarm‑monitoring platform: receive alarm signals
from many clients' panels, present them to operators in a prioritized queue, and run
the full response workflow — verify, dispatch, notify, resolve — **in sync with the
existing operations platform** (incidents, patrols/dispatch, video surveillance,
customers, push/email, analytics). Multi‑tenant, auditable, and aligned with
industry standards.

---

## 1. Industry context & standards we design to

A monitoring/central station receives **events** (signals) from panels and an operator
(or automation) executes a **response per a documented action plan**. We align with:

- **Signal formats:** Contact ID (Ademco DTMF), **SIA DC‑05**, and the modern IP/cellular
  standard **SIA DC‑09** (ANSI/SIA DC‑09, with AES‑128 encryption). DC‑09 is the primary
  ingest target.
- **Transport / receivers:** panels report over IP/cellular to a **receiver** (hardware
  Sur‑Gard/Bosch, or a software DC‑09 receiver). EN 50136 governs alarm transmission;
  we implement supervision (heartbeat/poll) so comms loss = a *trouble* event.
- **Compliance baselines:** UL 827 (central station), **UL 1981** (central‑station
  automation software), TMA/CSAA (The Monitoring Association) best practices,
  **ECV** (Enhanced Call Verification) and **video verification** to cut false dispatches,
  and **ASAP‑to‑PSAP** (Automated Secure Alarm Protocol) for police dispatch via
  Nlets/aggregators (RapidSOS, etc.).
- **Auditability:** every operator action and signal is immutably logged with time sync —
  a hard requirement for liability and UL/TMA.

---

## 2. System architecture (components)

```
 Panels (intrusion/fire/holdup/access/env)
   │  Contact ID / SIA DC-05 / SIA DC-09 over IP, cellular, dual-path
   ▼
[1] Signal Receiver  ── ACK/NAK per spec, AES decrypt, supervision/heartbeat
   │  (also: webhooks from panel clouds; panic from worker app; video-analytics events)
   ▼
[2] Event Pipeline   ── parse → normalize → classify → prioritize → dedup/runaway
   │
   ▼
[3] Alarm Case Engine ── group signals into a CASE, SLA timers, escalation, action plan
   │
   ▼
[4] Operator Console  ── real-time alarm QUEUE + case workspace (SSE/WebSocket)
   │        │ verify (call/video) · dispatch · notify · resolve · close (disposition)
   ▼        ▼
[5] Operations sync ── Incidents · Patrol/Dispatch · Video verification · Customer comms · Push/Email
   │
   ▼
[6] Audit + Analytics ── immutable action log · false-alarm tracking · SLA/response reporting
```

The **Receiver** is a long‑running Node service (TCP/UDP listener) run as its own pm2
process / microservice (it must persist a signal *before* ACK — never lose a signal).
Everything else lives in the existing Express/Sequelize backend + React CRM, reusing
the platform_events SSE bus already in the codebase for real‑time push to the console.

---

## 3. Data model (tenant‑scoped, paranoid, audited)

- **alarmPanel** — a monitored site/panel. `accountNumber` (CS account), `protocol`
  (sia-dc09|contactid|webhook|manual), `panelType` (intrusion|fire|holdup|access|environmental),
  make/model, comms (ip|cellular|dual), `dc09Key` (encrypted), `supervisionMins`,
  `testIntervalHrs`, `status` (online|offline|armed|disarmed), `lastSignalAt`,
  `postSiteId`/`stationId`/`customerId`. Links a CS account to a service site.
- **alarmZone** — a point on a panel: `zoneNumber`, `name`, `type` (entry|perimeter|motion|
  glassbreak|smoke|panic|tamper|supervisory), `partition`, `linkedCameraId` (→ video
  verification), `bypassed`.
- **alarmSignal** — the **immutable** raw inbound record: `panelId`/account, raw payload,
  format, `eventCode` (e.g. E130 burglary, E110 fire, E120 holdup, E401 open/close),
  qualifier (event/restore), partition, zone, `channel`, `receivedAt`, `receiverId`.
- **alarmEvent** — the normalized/classified event derived from a signal: `category`
  (burglary|fire|holdup|medical|panic|tamper|trouble|openclose|test|supervisory),
  `priority` (1=critical … 5=info), decoded description, zone.
- **alarmCase** — the **operator‑handled object**. Groups related events for a site within
  a window. `status` lifecycle: `queued → acknowledged → verifying → dispatched → resolved
  → closed`. `priority`, `assignedOperatorId`, SLA timestamps (ackBy/dispatchBy),
  `disposition` (real|false|test|runaway|cancelled), `incidentId`, `dispatchId`,
  verification clips, timeline. **This is what syncs to operations.**
- **actionPlan** — ordered response steps per account/zone/event‑type: verify (ECV/video),
  call contacts in order, dispatch guard, notify PSAP/police, notify customer. Configurable.
- **alarmContact** / call list — per account: people, call order, **verification passcode**,
  authority level, schedule.
- **alarmDispatch** — response record: `type` (guard|police|fire|medical), target, status,
  ETA, outcome; a `guard` dispatch reuses the existing patrol/dispatch + push.
- **openCloseSchedule** — expected arm/disarm windows → generate *late‑to‑close /
  early‑to‑open* exceptions automatically.
- **alarmAuditLog** — append‑only: every operator/system action (who, what, when, before/after).

Permissions: a new `monitoringOperator` role + `alarm.read` / `alarm.handle` /
`alarm.configure` permissions, layered on the existing RBAC; strict `tenantId` scoping
(as enforced everywhere).

---

## 4. Signal ingestion (how alarms get IN)

1. **SIA DC‑09 / Contact ID receiver** (primary): a Node `net` TCP + UDP listener that
   accepts panel reports (or forwards from a hardware receiver), validates CRC, **decrypts
   AES** (DC‑09), persists the `alarmSignal`, then sends the spec‑correct **ACK** (or NAK).
   Supervision: missed heartbeat/poll within `supervisionMins` ⇒ auto `trouble` event.
2. **Webhook / API** — `POST /tenant/:tid/alarm/ingest` for panel clouds (Alarm.com‑style),
   IoT sensors, or aggregators; HMAC‑signed.
3. **Manual** — operator logs a phoned‑in alarm.
4. **From the platform** — **panic/SOS** from the worker app (already exists) and
   **video‑analytics motion** (the video module) raise alarm cases directly. This is the
   tight loop with what we just built.

Normalization maps codes → category/priority (config‑driven), applies **runaway/swinger
suppression** (a zone re‑firing N times in a window is collapsed), and groups into a case.

---

## 5. Operator console & alarm lifecycle

The operator's primary screen is the **alarm queue** — highest priority first, with a live
**SLA countdown** and auto‑escalation if not acknowledged in time. Opening an alarm shows the
**case workspace**: site card + map, zones, the **action plan** steps, the **call list**,
**linked cameras** (live + an auto‑clip captured at alarm time for **video verification**),
the event timeline, and the response controls.

Lifecycle: **Queued → Acknowledge → Verify** (call w/ passcode, or video) **→ Dispatch**
(guard / police / fire) **→ Resolve → Close** with a **disposition** (real/false/test).
Every step is timestamped to the audit log; real‑time updates via SSE so multiple
operators see the same state.

---

## 6. Integration with the operations platform (the "in sync" the request asks for)

- **Incident** — a handled case can **create/attach an incident** (existing module) for the
  permanent record and customer/site reporting.
- **Dispatch a guard patrol** — "Dispatch guard" reuses the existing **dispatch + patrol**
  flow and **push** to supervisors/guards; the guard's arrival/findings flow back to the case.
- **Video verification** — `alarmZone.linkedCameraId` → on alarm we pull the **live camera**
  (go2rtc gateway just deployed) and **auto‑trim a clip**; verified‑video alarms get priority
  response and the clip can be **shared to the customer** via the existing tokened link.
- **Customer communication** — notify the account contacts via the existing email/push.
- **Worker‑app panic / SOS** → raises an alarm case automatically.
- **Analytics** — feed the existing dashboards: alarms by site, **false‑alarm rate**,
  **time‑to‑acknowledge / time‑to‑dispatch**, operator performance, open/close compliance.
- All **tenant‑isolated** and RBAC‑gated, consistent with the platform.

---

## 7. False‑alarm reduction, verification & response best practices

- **ECV** (call ≥2 numbers before police dispatch) and **video verification** (priority
  dispatch for verified intrusions) — the two biggest false‑dispatch reducers.
- **Runaway/swinger** auto‑suppression; **false‑alarm tracking** per account (permits,
  municipal fine exposure) surfaced in analytics.
- **ASAP‑to‑PSAP** path for automated, error‑free police dispatch (via an aggregator) as a
  later phase; manual PSAP call list until then.
- **Supervision** so a panel going silent becomes a trouble alarm (no silent failures).

---

## 8. Reliability, security, audit (enterprise)

- **No signal loss:** persist before ACK; redundant receiver instances; queue + retry.
- **HA:** receiver runs as supervised pm2/systemd processes; DB‑backed state so a restart
  loses nothing; health/heartbeat monitoring.
- **Security:** AES‑encrypted DC‑09; encrypted‑at‑rest panel keys/passcodes; per‑tenant
  isolation; least‑privilege operator RBAC; signed webhooks; time sync (NTP).
- **Audit:** append‑only `alarmAuditLog` with full operator action history and signal
  provenance; exportable for UL/TMA/insurer review; configurable retention.

---

## 9. Phased roadmap

| Phase | Deliverable | Notes |
|---|---|---|
| **0 — Foundations** | Models + migrations (panel/zone/signal/event/case/actionPlan/contact/dispatch/audit), RBAC (`monitoringOperator`, alarm.* perms), tenant scoping | Core schema + config CRUD |
| **1 — Ingestion** | SIA DC‑09 + Contact ID **receiver service**, webhook + manual ingest, panic/video bridge, normalization + runaway suppression, supervision/heartbeat | The receiver as its own pm2 process |
| **2 — Operator console** | Real‑time **alarm queue** + case workspace, lifecycle, SLA timers + escalation, action plans, call lists, audit log | The operator product |
| **3 — Operations sync** | Dispatch→patrol, create incident, **video verification** (live + auto‑clip), customer notify, two‑way logging | Reuses what we built |
| **4 — Verification & response** | ECV, video‑verified priority, false‑alarm/runaway handling, PSAP/ASAP path | Cuts false dispatch |
| **5 — Analytics & compliance** | Alarm/response/operator/false‑alarm reporting into the analytics; audit export; SLA dashboards | UL/TMA‑aligned |

---

## 10. Tech mapping to the stack

- **Receiver:** standalone Node service (TCP/UDP) under pm2, sharing the Sequelize models;
  ACKs the panel, writes `alarmSignal`, emits to the event pipeline.
- **Backend:** Express/Sequelize/MySQL modules under `/tenant/:tid/alarm/*` (config CRUD,
  cases, dispatch, audit) + the public/secured ingest endpoints. Reuse incidents, patrols,
  push/email, video, platform_events SSE.
- **Frontend:** a new CRM section **"Central de Monitoreo"** — the alarm queue, the case
  console, and configuration (panels/zones/action‑plans/contacts/schedules), all inside the
  app layout, Spanish UI, gold accent, RBAC‑gated.
- **Multi‑tenant + audit + RBAC** enforced exactly as the rest of the platform.

---

*This document is the architecture/roadmap reference. Implementation proceeds phase by
phase; each phase is independently shippable and verified before the next.*
