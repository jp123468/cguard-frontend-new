import { ApiService } from './api/apiService';

function getTenantId(): string {
  const t = localStorage.getItem('tenantId');
  if (!t) throw new Error('Tenant not available');
  return t;
}

/**
 * Performance score + capture endpoints (8-factor guard/supervisor score,
 * uniform inspections, quiz bank, backup events). Mirrors the backend
 * api/performance + securityGuardPerformance routes.
 */
const PerformanceService = {
  // --- Scores ---
  async getGuard(securityGuardId: string, period = 30) {
    const tenantId = getTenantId();
    return ApiService.get(
      `/tenant/${tenantId}/security-guard/${securityGuardId}/performance?period=${period}&_=${Date.now()}`,
      { headers: { 'Cache-Control': 'no-cache' } },
    );
  },
  async getSupervisor(userId: string, period = 30) {
    const tenantId = getTenantId();
    return ApiService.get(
      `/tenant/${tenantId}/supervisor/${userId}/performance?period=${period}&_=${Date.now()}`,
      { headers: { 'Cache-Control': 'no-cache' } },
    );
  },

  // --- Uniform inspections ---
  async uniformHistory(securityGuardId: string) {
    const tenantId = getTenantId();
    return ApiService.get(
      `/tenant/${tenantId}/security-guard/${securityGuardId}/uniform-inspections`,
    );
  },
  async createUniform(payload: {
    subjectUserId?: string;
    securityGuardId?: string;
    rating: number;
    stars?: number;
    notes?: string;
    photos?: any[];
    stationId?: string;
    inspectionDate?: string;
  }) {
    const tenantId = getTenantId();
    return ApiService.post(`/tenant/${tenantId}/uniform-inspection`, payload);
  },

  // --- Quiz bank (station-scoped) ---
  async getQuizBank(stationId: string) {
    const tenantId = getTenantId();
    return ApiService.get(`/tenant/${tenantId}/station/${stationId}/quiz-bank`);
  },
  async saveQuizBank(stationId: string, payload: any) {
    const tenantId = getTenantId();
    return ApiService.put(
      `/tenant/${tenantId}/station/${stationId}/quiz-bank`,
      payload,
    );
  },
  async createQuestion(bankId: string, payload: any) {
    const tenantId = getTenantId();
    return ApiService.post(
      `/tenant/${tenantId}/quiz-bank/${bankId}/questions`,
      payload,
    );
  },
  async updateQuestion(bankId: string, questionId: string, payload: any) {
    const tenantId = getTenantId();
    return ApiService.put(
      `/tenant/${tenantId}/quiz-bank/${bankId}/questions/${questionId}`,
      payload,
    );
  },
  async deleteQuestion(bankId: string, questionId: string) {
    const tenantId = getTenantId();
    return ApiService.delete(
      `/tenant/${tenantId}/quiz-bank/${bankId}/questions/${questionId}`,
    );
  },

  // --- Backup events ---
  async backupEvents(status = 'offered') {
    const tenantId = getTenantId();
    return ApiService.get(
      `/tenant/${tenantId}/backup-event?status=${encodeURIComponent(status)}`,
    );
  },
  async confirmBackup(id: string) {
    const tenantId = getTenantId();
    return ApiService.post(`/tenant/${tenantId}/backup-event/${id}/confirm`, {});
  },
  async rejectBackup(id: string) {
    const tenantId = getTenantId();
    return ApiService.post(`/tenant/${tenantId}/backup-event/${id}/reject`, {});
  },
};

export default PerformanceService;
