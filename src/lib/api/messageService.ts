import api from "../api";

const getTenantId = (): string => {
  const t = localStorage.getItem("tenantId");
  if (!t) throw new Error("Tenant ID no configurado");
  return t;
};

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

  async sendMessage(id: string, body: string) {
    const t = getTenantId();
    return unwrap(await api.post(`/tenant/${t}/message/${id}/messages`, { data: { body, clientMsgId: newClientMsgId() } }));
  },

  async markRead(id: string) {
    const t = getTenantId();
    return unwrap(await api.post(`/tenant/${t}/message/${id}/read`, { data: {} }));
  },

  async patchConversation(id: string, patch: { isOneWay?: boolean; archived?: boolean }) {
    const t = getTenantId();
    return unwrap(await api.patch(`/tenant/${t}/message/${id}`, { data: patch }));
  },

  async unreadCount() {
    const t = getTenantId();
    return unwrap(await api.get(`/tenant/${t}/message-unread`));
  },
};

export default messageService;
