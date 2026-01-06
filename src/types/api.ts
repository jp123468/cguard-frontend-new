export interface UserCreateData {
  emails?: string[];
  roles?: string[];
  clientIds?: string[];
  postSiteIds?: string[];
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  [k: string]: any;
}

export interface UserUpdateData {
  id: string;
  roles?: string[];
  clientIds?: string[];
  postSiteIds?: string[];
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  [k: string]: any;
}

export interface TenantUser {
  id?: string;
  userId?: string;
  roles?: string[];
  invitationToken?: string | null;
  status?: string;
  tenantId?: string;
  assignedClients?: string[];
  assignedPostSites?: string[];
  tenant?: any;
  [k: string]: any;
}

export interface UserCurrent {
  id?: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  tenants?: TenantUser[];
  [k: string]: any;
}

export type ApiUserResponse = {
  data?: any;
  [k: string]: any;
};

export default {} as const;
