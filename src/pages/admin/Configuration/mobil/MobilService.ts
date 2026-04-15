import api from '@/lib/api';
import { securityGuardService } from '@/lib/api/securityGuardService';

const getTenantId = (): string => {
  if (typeof window !== 'undefined') {
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      return tenantId;
    }
  }
  throw new Error('TenantId not found. Please log in first.');
};

const uploadFile = async (file: File | null, storageId: string) => {
  if (!file) {
    return undefined;
  }
  const uploaded = await securityGuardService.uploadFileToStorage(file, storageId);
  return uploaded;
};

const resourceUrl = (resource: string) => {
  const tenantId = getTenantId();
  return `/tenant/${tenantId}/${resource}`;
};

export async function listBanners() {
  const { data } = await api.get(resourceUrl('banner-superior-app'));
  return data?.rows ?? [];
}

export async function createBanner(data: any) {
  const { data: response } = await api.post(resourceUrl('banner-superior-app'), { data });
  return response;
}

export async function updateBanner(id: string, data: any) {
  const { data: response } = await api.put(resourceUrl(`banner-superior-app/${id}`), { data });
  return response;
}

export async function deleteBanner(id: string) {
  await api.delete(resourceUrl('banner-superior-app'), {
    params: { ids: [id] },
  });
}

export async function listCertifications() {
  const { data } = await api.get(resourceUrl('certification'));
  return data?.rows ?? [];
}

export async function createCertification(data: any) {
  const { data: response } = await api.post(resourceUrl('certification'), { data });
  return response;
}

export async function updateCertification(id: string, data: any) {
  const { data: response } = await api.put(resourceUrl(`certification/${id}`), { data });
  return response;
}

export async function deleteCertification(id: string) {
  await api.delete(resourceUrl('certification'), {
    params: { ids: [id] },
  });
}

export async function uploadBannerImage(file: File | null) {
  return uploadFile(file, 'bannerSuperiorAppImageUrl');
}

export async function uploadCertificationImage(file: File | null) {
  return uploadFile(file, 'certificationImage');
}

export async function uploadCertificationIcon(file: File | null) {
  return uploadFile(file, 'certificationIcon');
}
