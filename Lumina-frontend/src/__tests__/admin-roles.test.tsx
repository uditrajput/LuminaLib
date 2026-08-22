import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RolesManagement from '@/components/admin/RolesManagement';
import { roleService } from '@/services/roleService';

jest.mock('@/services/roleService');

const mockRoles = [
  { id: 1, name: 'admin', description: 'Core System Admin', is_system: true, permissions_json: ['dashboard', 'users_rbac'] },
  { id: 2, name: 'teacher', description: 'Faculty Educator', is_system: true, permissions_json: ['dashboard', 'books_read', 'groups_manage'] },
  { id: 3, name: 'user', description: 'Standard Reader', is_system: true, permissions_json: ['dashboard', 'books_read'] },
];

describe('RolesManagement Component', () => {
  beforeEach(() => {
    (roleService.getRoles as jest.Mock).mockResolvedValue(mockRoles);
  });

  it('renders roles matrix and system default badges', async () => {
    render(<RolesManagement />);

    await waitFor(() => {
      expect(screen.getByText('Access Roles Configuration')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('teacher')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
    });
  });

  it('opens custom role creation modal when clicked', async () => {
    render(<RolesManagement />);

    await waitFor(() => {
      const btn = screen.getByText('Create Custom Role');
      fireEvent.click(btn);
    });

    expect(screen.getByText('Role Name')).toBeInTheDocument();
  });
});
