import { ApiService } from './api/apiService';

export default {
  create(data: any) {
    return ApiService.post('/tenant', { data });
  },
  update(id: string, data: any) {
    return ApiService.put(`/tenant/${id}`, { data });
  },
  list(query = '') {
    return ApiService.get(`/tenant${query ? `?${query}` : ''}`);
  },
  findById(id: string) {
    return ApiService.get(`/tenant/${id}`);
  },
  findByUrl(url: string) {
    return ApiService.get(`/tenant/url?url=${encodeURIComponent(url)}`);
  },
  acceptInvitation(token: string, force = false) {
    return ApiService.post(`/tenant/invitation/${token}/accept`, {
      data: { forceAcceptOtherEmail: force },
    });
  },
  declineInvitation(token: string) {
    return ApiService.delete(`/tenant/invitation/${token}/decline`);
  },
  async uploadLogo(file: File, tenantId: string) {
    const filename = file.name;
    const creds: any = await ApiService.get(
      `/tenant/${tenantId}/file/credentials?filename=${encodeURIComponent(
        filename,
      )}&storageId=settingsLogos`,
    );

    const uploadUrl = creds.uploadCredentials?.url;
    if (!uploadUrl) throw new Error('Upload URL not available');

    const form = new FormData();
    form.append('filename', filename);
    form.append('file', file);

    const uploadResp = await fetch(uploadUrl, { method: 'POST', body: form });
    if (!uploadResp.ok) {
      const text = await uploadResp.text().catch(() => null);
      throw new Error(`Upload failed: ${uploadResp.status} ${text}`);
    }

    const fileObj = {
      new: true,
      name: filename,
      sizeInBytes: file.size,
      privateUrl: creds.privateUrl,
      publicUrl: creds.uploadCredentials?.publicUrl ?? null,
    };

    return ApiService.put(`/tenant/${tenantId}/settings`, { settings: { logos: [fileObj] } });
  },
  destroy(ids: string[] = []) {
    return ApiService.delete(`/tenant?ids=${ids.join(',')}`);
  },
};
