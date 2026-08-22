import apiClient from './apiClient';
import { Role } from '@/types/rbac';

export const roleService = {
  async getRoles(): Promise<Role[]> {
    const res = await apiClient.get('/roles');
    return res.data?.data || res.data || [];
  },

  async getPermissionsCatalog(): Promise<Record<string, string>> {
    const res = await apiClient.get('/roles/permissions');
    return res.data?.data || res.data || {};
  },

  async createRole(data: { name: string; description?: string; permissions: string[] }): Promise<Role> {
    const res = await apiClient.post('/roles', data);
    return res.data?.data || res.data;
  },

  async updateRole(id: number, data: { description?: string; permissions: string[] }): Promise<Role> {
    const res = await apiClient.put(`/roles/${id}`, data);
    return res.data?.data || res.data;
  },

  async deleteRole(id: number): Promise<void> {
    await apiClient.delete(`/roles/${id}`);
  },
};
