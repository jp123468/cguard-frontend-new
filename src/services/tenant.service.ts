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
  async acceptInvitation(token: string, force = false) {
    const response = await ApiService.post(`/tenant/invitation/${token}/accept`, {
      data: { forceAcceptOtherEmail: force },
    });
    
    // ✅ NUEVO: Si el backend devuelve un nuevo token + usuario, actualizarlos
    // Esto permite que el usuario tenga permisos inmediatamente sin cerrar sesión
    if (response && response.token) {
      try {
        // Guardar el nuevo token en localStorage
        localStorage.setItem('authToken', response.token);
        
        // Actualizar el usuario en el estado si está disponible
        if (response.user) {
          // El componente que llame a esto debería refrescar la app o redirigir
          // para que el AuthContext recargue automáticamente con el nuevo token
          console.log('✅ Nuevo token recibido. Usuario actualizado con permisos del tenant.');
        }
      } catch (e) {
        console.warn('Error actualizando token después de aceptar invitación:', e);
      }
    }
    
    return response;
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
