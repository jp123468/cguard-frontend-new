import { ApiService } from "@/services/api/apiService";

export interface CompleteOnboardingResponse {
  success: boolean;
  onboardingCompleted: boolean;
}

/**
 * Marks the tenant's first-login onboarding as completed.
 * Requires admin (Permissions.values.tenantEdit) on the backend.
 * POST /tenant/:tenantId/onboarding/complete -> { success, onboardingCompleted }
 */
export const onboardingService = {
  completeOnboarding(tenantId: string): Promise<CompleteOnboardingResponse> {
    return ApiService.post(`/tenant/${tenantId}/onboarding/complete`, {});
  },
};

export default onboardingService;
