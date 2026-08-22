'use client';

import React, { useEffect, useState } from 'react';
import { roleService } from '@/services/roleService';
import { Role } from '@/types/rbac';
import { ShieldCheck, Plus, Check, Lock, Pencil, X, Save, Loader2 } from 'lucide-react';

const PERMISSION_LABELS: Record<string, { label: string; desc: string }> = {
  dashboard: { label: 'Dashboard & Analytics', desc: 'Access main metrics and telemetry dashboard' },
  books_read: { label: 'Book Library Access', desc: 'Browse and read public & assigned private books' },
  books_upload: { label: 'Book Upload & Ingestion', desc: 'Upload public/private books and manage files' },
  books_manage: { label: 'Book Management', desc: 'Edit metadata, covers, and delete titles' },
  groups_manage: { label: 'User Groups & Classes', desc: 'Manage cohorts, members, and book entitlements' },
  qa_rag: { label: 'AI Q&A & RAG Pipeline', desc: 'Query vector embeddings and topic practice' },
  voice_ai: { label: 'Voice AI Assistant', desc: 'Use real-time voice agent and voice actions' },
  settings_config: { label: 'App Settings & SMTP', desc: 'Configure system settings, SMTP, and OAuth' },
  users_rbac: { label: 'Users & Roles (RBAC)', desc: 'Full administrative access to manage users & roles' },
};

export default function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([
    'dashboard',
    'books_read',
    'qa_rag',
    'voice_ai',
  ]);
  const [errorMsg, setErrorMsg] = useState('');

  // Editing role state
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (err: any) {
      console.error('Failed to load roles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      setErrorMsg('');
      await roleService.createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
        permissions: selectedPerms,
      });
      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDesc('');
      fetchRoles();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error_message || err?.message || 'Failed to create role');
    }
  };

  const handleOpenEditModal = (role: Role) => {
    setEditingRole(role);
    setEditDesc(role.description || '');
    setEditError('');
    let currentPerms: string[] = [];
    const perms = role.permissions_json;
    if (Array.isArray(perms)) {
      currentPerms = [...perms];
    } else if (typeof perms === 'object' && perms !== null) {
      currentPerms = Object.keys(perms).filter((k) => Boolean(perms[k]));
    }
    setEditPerms(currentPerms);
  };

  const togglePermInEdit = (permKey: string) => {
    setEditPerms((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    try {
      setSavingEdit(true);
      setEditError('');
      await roleService.updateRole(editingRole.id, {
        description: editDesc.trim(),
        permissions: editPerms,
      });
      setEditingRole(null);
      fetchRoles();
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || err?.response?.data?.error_message || err?.message || 'Failed to update role');
    } finally {
      setSavingEdit(false);
    }
  };

  const togglePermInCreate = (permKey: string) => {
    setSelectedPerms((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const isPermChecked = (role: Role, permKey: string) => {
    if (role.name.toLowerCase() === 'admin') return true;
    const perms = role.permissions_json;
    if (Array.isArray(perms)) return perms.includes(permKey);
    if (typeof perms === 'object' && perms !== null) return Boolean(perms[permKey]);
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Access Roles Configuration
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customize feature sets that are assignable to users across the platform.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow"
        >
          <Plus className="w-4 h-4" />
          Create Custom Role
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading roles matrix...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roles.map((role) => {
            const roleNameLower = role.name.toLowerCase();
            const isProtected = ['admin', 'user'].includes(roleNameLower);
            const isEditable = !isProtected;

            return (
              <div
                key={role.id}
                className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm space-y-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                        {role.name}
                      </h3>
                      {role.is_system && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                          System Default
                        </span>
                      )}
                    </div>

                    {isEditable && (
                      <button
                        onClick={() => handleOpenEditModal(role)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs transition-all border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Permissions
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {role.description || 'Custom role permissions profile.'}
                  </p>

                  <div className="mt-5 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Permissions Matrix
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(PERMISSION_LABELS).map(([permKey, info]) => {
                        const checked = isPermChecked(role, permKey);
                        return (
                          <div
                            key={permKey}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-colors ${
                              checked
                                ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-800/40 text-slate-900 dark:text-white'
                                : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/40 dark:border-slate-800/40 text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                                checked
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div>
                              <div className="font-semibold">{info.label}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {isProtected && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-2 text-xs text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>System protection active: Core {role.name} role permissions are immutable.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Role Permissions Modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-500" />
                Edit Permissions — <span className="capitalize text-indigo-600 dark:text-indigo-400">{editingRole.name}</span>
              </h3>
              <button
                onClick={() => setEditingRole(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditRole} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Custom role permissions profile"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Permissions Matrix (Select active permissions)
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                  {Object.entries(PERMISSION_LABELS).map(([permKey, info]) => {
                    const checked = editPerms.includes(permKey);
                    return (
                      <button
                        type="button"
                        key={permKey}
                        onClick={() => togglePermInEdit(permKey)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-colors ${
                          checked
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                            checked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="font-semibold">{info.label}</div>
                          <div className="text-[11px] text-slate-400">{info.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-sm disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Custom Role</h3>

            {errorMsg && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateRole} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assistant Teacher"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Can manage student classes and assign private books"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Permissions Matrix
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                  {Object.entries(PERMISSION_LABELS).map(([permKey, info]) => {
                    const checked = selectedPerms.includes(permKey);
                    return (
                      <button
                        type="button"
                        key={permKey}
                        onClick={() => togglePermInCreate(permKey)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-colors ${
                          checked
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
                            checked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="font-semibold">{info.label}</div>
                          <div className="text-[11px] text-slate-400">{info.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-sm"
                >
                  Save Custom Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
