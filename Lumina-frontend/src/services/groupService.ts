import apiClient from './apiClient';
import { UserGroup } from '@/types/rbac';

export interface GroupMemberDetail {
  user_id: number;
  full_name: string;
  email: string;
  role_in_group: string;
  joined_at?: string;
}

export interface GroupBookDetail {
  book_id: number;
  title: string;
  author: string;
  access_level: string;
}

export const groupService = {
  async list(): Promise<UserGroup[]> {
    return groupService.getGroups();
  },
  async getGroups(): Promise<UserGroup[]> {
    const res = await apiClient.get('/groups');
    return Array.isArray(res.data) ? res.data : (res.data?.data || res.data || []);
  },

  async createGroup(data: { name: string; description?: string }): Promise<UserGroup> {
    const res = await apiClient.post('/groups', data);
    return res.data?.data || res.data;
  },

  async deleteGroup(groupId: number): Promise<void> {
    await apiClient.delete(`/groups/${groupId}`);
  },

  async getGroupMembers(groupId: number): Promise<GroupMemberDetail[]> {
    const res = await apiClient.get(`/groups/${groupId}/members`);
    return res.data?.data || res.data || [];
  },

  async addMember(groupId: number, data: { user_id: number; role_in_group: string }): Promise<void> {
    await apiClient.post(`/groups/${groupId}/members`, data);
  },

  async removeMember(groupId: number, userId: number): Promise<void> {
    await apiClient.delete(`/groups/${groupId}/members/${userId}`);
  },

  async getGroupBooks(groupId: number): Promise<GroupBookDetail[]> {
    const res = await apiClient.get(`/groups/${groupId}/books`);
    return res.data?.data || res.data || [];
  },

  async assignBook(groupId: number, data: { book_id: number }): Promise<void> {
    await apiClient.post(`/groups/${groupId}/books`, data);
  },

  async unassignBook(groupId: number, bookId: number): Promise<void> {
    await apiClient.delete(`/groups/${groupId}/books/${bookId}`);
  },
};
