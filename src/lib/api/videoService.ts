import { ApiService } from "@/services/api/apiService";

const tid = (): string => localStorage.getItem("tenantId") || "";

export type DeviceType = "dvr" | "nvr" | "camera" | "cloud";
export type DeviceProtocol = "rtsp" | "onvif" | "hls" | "webrtc";
export type DeviceStatus = "online" | "offline" | "unknown";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  brand?: string | null;
  model?: string | null;
  host?: string | null;
  port?: number | null;
  httpPort?: number | null;
  username?: string | null;
  // NOTE: password is never returned by the API (omitted server-side).
  channels?: number | null;
  protocol?: DeviceProtocol;
  status?: DeviceStatus;
  lastSeenAt?: string | null;
  postSiteId?: string | null;
  stationId?: string | null;
  notes?: string | null;
  active?: boolean;
  streamGatewayBase?: string | null;
  streamFormat?: "hls" | "webrtc";
  tenantId?: string;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CameraStatus = "online" | "offline" | "unknown";

export interface Camera {
  id: string;
  videoDeviceId?: string | null;
  channel?: number | null;
  name?: string | null;
  rtspUrl?: string | null;
  streamUrl?: string | null;
  snapshotUrl?: string | null;
  postSiteId?: string | null;
  stationId?: string | null;
  enabled?: boolean;
  status?: CameraStatus;
  tenantId?: string;
  device?: Device | null;
  createdAt?: string;
  updatedAt?: string;
}

export type VideoEventType = "motion" | "alarm" | "manual" | "offline" | "tamper";
export type VideoEventSeverity = "low" | "medium" | "high" | "critical";
export type VideoEventStatus = "new" | "ack" | "resolved";

export interface VideoEvent {
  id: string;
  videoCameraId?: string | null;
  videoDeviceId?: string | null;
  type?: VideoEventType;
  severity?: VideoEventSeverity;
  at: string;
  title?: string | null;
  description?: string | null;
  status?: VideoEventStatus;
  acknowledgedById?: string | null;
  incidentId?: string | null;
  videoClipId?: string | null;
  stationId?: string | null;
  postSiteId?: string | null;
  tenantId?: string;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ClipStatus = "pending" | "ready" | "failed";

export interface Clip {
  id: string;
  videoCameraId?: string | null;
  videoDeviceId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  durationSec?: number | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  label?: string | null;
  status?: ClipStatus;
  incidentId?: string | null;
  shareToken?: string | null;
  shareExpiresAt?: string | null;
  createdById?: string | null;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StreamInfo {
  type: "hls" | "webrtc" | "none";
  url: string | null;
  snapshotUrl?: string;
}

export interface ShareResult {
  token: string;
  url: string;
  expiresAt: string;
}

const qstr = (params?: Record<string, string | undefined>): string => {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
};

export const videoService = {
  // --- Devices ---
  devices(): Promise<Device[]> {
    return ApiService.get(`/tenant/${tid()}/video/devices`);
  },
  device(id: string): Promise<Device> {
    return ApiService.get(`/tenant/${tid()}/video/device/${id}`);
  },
  createDevice(body: Partial<Device> & { password?: string }): Promise<Device> {
    return ApiService.post(`/tenant/${tid()}/video/device`, body);
  },
  updateDevice(id: string, body: Partial<Device> & { password?: string }): Promise<Device> {
    return ApiService.put(`/tenant/${tid()}/video/device/${id}`, body);
  },
  deleteDevice(id: string): Promise<any> {
    return ApiService.delete(`/tenant/${tid()}/video/device/${id}`);
  },
  testDevice(id: string): Promise<{ status: string }> {
    return ApiService.post(`/tenant/${tid()}/video/device/${id}/test`);
  },
  syncCameras(id: string): Promise<Camera[]> {
    return ApiService.post(`/tenant/${tid()}/video/device/${id}/cameras`);
  },
  setGateway(id: string, body: { streamGatewayBase: string; streamFormat?: "hls" | "webrtc" }): Promise<any> {
    return ApiService.put(`/tenant/${tid()}/video/device/${id}/gateway`, body);
  },
  gatewayConfig(id: string): Promise<{ deviceName: string; cameraCount: number; gatewayBase: string | null; format: string; yaml: string }> {
    return ApiService.get(`/tenant/${tid()}/video/device/${id}/gateway-config`);
  },

  // --- Cameras ---
  cameras(params?: { deviceId?: string; postSiteId?: string; stationId?: string }): Promise<Camera[]> {
    return ApiService.get(`/tenant/${tid()}/video/cameras${qstr(params)}`);
  },
  camera(id: string): Promise<Camera> {
    return ApiService.get(`/tenant/${tid()}/video/camera/${id}`);
  },
  updateCamera(id: string, body: Partial<Camera>): Promise<Camera> {
    return ApiService.put(`/tenant/${tid()}/video/camera/${id}`, body);
  },
  stream(cameraId: string): Promise<StreamInfo> {
    return ApiService.get(`/tenant/${tid()}/video/camera/${cameraId}/stream`);
  },

  // --- Events ---
  events(params?: { status?: string; cameraId?: string }): Promise<VideoEvent[]> {
    return ApiService.get(`/tenant/${tid()}/video/events${qstr(params)}`);
  },
  createEvent(body: Partial<VideoEvent>): Promise<VideoEvent> {
    return ApiService.post(`/tenant/${tid()}/video/event`, body);
  },
  updateEvent(id: string, body: Partial<VideoEvent>): Promise<VideoEvent> {
    return ApiService.patch(`/tenant/${tid()}/video/event/${id}`, body);
  },
  eventToIncident(id: string, body: any): Promise<any> {
    return ApiService.post(`/tenant/${tid()}/video/event/${id}/incident`, body);
  },

  // --- Clips ---
  clips(params?: { cameraId?: string }): Promise<Clip[]> {
    return ApiService.get(`/tenant/${tid()}/video/clips${qstr(params)}`);
  },
  createClip(body: { videoCameraId: string; startAt: string; endAt: string; label?: string }): Promise<Clip> {
    return ApiService.post(`/tenant/${tid()}/video/clip`, body);
  },
  deleteClip(id: string): Promise<any> {
    return ApiService.delete(`/tenant/${tid()}/video/clip/${id}`);
  },
  shareClip(id: string): Promise<ShareResult> {
    return ApiService.post(`/tenant/${tid()}/video/clip/${id}/share`);
  },
  clipToIncident(id: string, body: any): Promise<any> {
    return ApiService.post(`/tenant/${tid()}/video/clip/${id}/incident`, body);
  },

  // --- Dispatch ---
  dispatch(body: { cameraId?: string; eventId?: string; note?: string }): Promise<any> {
    return ApiService.post(`/tenant/${tid()}/video/dispatch`, body);
  },
};
