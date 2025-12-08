import { ApiService } from "@/services/api/apiService";

export type ProfilePayload = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  timezone?: string;
  skype?: string;
  twoFactorEnabled?: boolean;
  email?: string;
};

export type ChangeEmailPayload = {
  password: string;
  newEmail: string;
};

const AccountService = {
  async getMe() {
    return ApiService.get("/auth/me");
  },

  async updateProfile(payload: ProfilePayload) {
    return ApiService.put("/auth/profile", { data: payload });
  },

  async changePassword(oldPassword: string, newPassword: string) {
    return ApiService.put("/auth/change-password", { oldPassword, newPassword });
  },

  async sendVerifyEmail(email: string, tenantId?: string) {
    return ApiService.post("/auth/send-email-address-verification-email", { email, tenantId });
  },

  async changeEmail(payload: ChangeEmailPayload) {
    return ApiService.post("/auth/change-email", payload);
  },

  async sendPhoneVerificationCode(phoneNumber: string) {
    return ApiService.post("/auth/send-phone-verification", { phoneNumber });
  },

  async verifyPhone(code: string, phoneNumber: string) {
    return ApiService.post("/auth/verify-phone", { code, phoneNumber });
  },
};

export default AccountService;