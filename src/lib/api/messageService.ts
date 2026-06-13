import api from "../api";

const getTenantId = (): string => {
  const t = localStorage.getItem("tenantId");
  if (!t) throw new Error("Tenant ID no configurado");
  return t;
};

export type MessageAttachment = { url: string; type: "image" | "video"; name?: string; sizeInBytes?: number };

const unwrap = (resp: any) => (resp && resp.data !== undefined ? resp.data : resp);
const newClientMsgId = () =>
  (globalThis.crypto && (globalThis.crypto as any).randomUUID
    ? (globalThis.crypto as any).randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`);

export const messageService = {
  async listConversations(params: { limit?: number; cursor?: string; recipientType?: string; q?: string } = {}) {
    const t = getTenantId();
    const qs = new URLSearchParams(
      Object.entries(params).reduce((a, [k, v]) => { if (v != null && v !== "") a[k] = String(v); return a; }, {} as Record<string, string>),
    ).toString();
    return unwrap(await api.get(`/tenant/${t}/message${qs ? `?${qs}` : ""}`));
  },

  async createConversation(input: { recipientType: "guard" | "client"; recipientId: string; subject?: string; isOneWay?: boolean; body: string }) {
    const t = getTenantId();
    return unwrap(await api.post(`/tenant/${t}/message`, { data: { ...input, clientMsgId: newClientMsgId() } }));
  },

  async getConversation(id: string) {
    const t = getTenantId();
    return unwrap(await api.get(`/tenant/${t}/message/${id}`));
  },

  async listMessages(id: string, params: { limit?: number; before?: string } = {}) {
    const t = getTenantId();
    const qs = new URLSearchParams(
      Object.entries(params).reduce((a, [k, v]) => { if (v != null && v !== "") a[k] = String(v); return a; }, {} as Record<string, string>),
    ).toString();
    return unwrap(await api.get(`/tenant/${t}/message/${id}/messages${qs ? `?${qs}` : ""}`));
  },

  async sendMessage(id: string, body: string, attachments?: MessageAttachment[]) {
    const t = getTenantId();
    return unwrap(await api.post(`/tenant/${t}/message/${id}/messages`, { data: { body, attachments: attachments && attachments.length ? attachments : undefined, clientMsgId: newClientMsgId() } }));
  },

  /** Upload an image/video and return its attachment descriptor (private url). */
  async uploadAttachment(file: File): Promise<MessageAttachment> {
    const t = getTenantId();
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const credsResp: any = await api.get(`/tenant/${t}/file/credentials?filename=${encodeURIComponent(filename)}&storageId=messageAttachments`);
    const creds = credsResp && credsResp.data ? credsResp.data : credsResp;
    const uploadUrl = creds?.uploadCredentials?.url ?? creds?.url;
    const fields = creds?.uploadCredentials?.fields;
    if (!uploadUrl) throw new Error("No se pudo obtener la URL de carga");
    const form = new FormData();
    if (fields) Object.keys(fields).forEach((k) => form.append(k, fields[k]));
    form.append("filename", filename);
    form.append("file", file);
    const resp = await fetch(uploadUrl, { method: "POST", body: form });
    if (!resp.ok) throw new Error(`Error al subir el archivo (${resp.status})`);
    return {
      url: creds?.privateUrl ?? "",
      type: file.type.startsWith("video") ? "video" : "image",
      name: file.name,
      sizeInBytes: file.size,
    };
  },

  async markRead(id: string) {
    const t = getTenantId();
    return unwrap(await api.post(`/tenant/${t}/message/${id}/read`, { data: {} }));
  },

  async patchConversation(id: string, patch: { isOneWay?: boolean; archived?: boolean }) {
    const t = getTenantId();
    return unwrap(await api.patch(`/tenant/${t}/message/${id}`, { data: patch }));
  },

  async deleteConversation(id: string) {
    const t = getTenantId();
    return unwrap(await api.delete(`/tenant/${t}/message/${id}`));
  },

  async unreadCount() {
    const t = getTenantId();
    return unwrap(await api.get(`/tenant/${t}/message-unread`));
  },
};

export default messageService;
