"use client";

import React, { useEffect, useState, useCallback } from "react";
import { UserGroup } from "@/types/rbac";
import { groupService, GroupMemberDetail, GroupBookDetail } from "@/services/groupService";
import { useUserList } from "@/hooks/useAdminUsers";
import { useBooks } from "@/hooks/useBooks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Users, Plus, Trash2, UserPlus, BookOpen, GraduationCap,
  X, CheckCircle2, Shield, AlertCircle, RefreshCw
} from "lucide-react";

export function UserGroupsManagement() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{id: number, name: string} | null>(null);

  // Members Modal state
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<UserGroup | null>(null);
  const [members, setMembers] = useState<GroupMemberDetail[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [selectedRoleInGroup, setSelectedRoleInGroup] = useState<string>("student");
  const [addingMember, setAddingMember] = useState(false);

  // Books Modal state
  const [selectedGroupForBooks, setSelectedGroupForBooks] = useState<UserGroup | null>(null);
  const [assignedBooks, setAssignedBooks] = useState<GroupBookDetail[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const [assigningBook, setAssigningBook] = useState(false);

  const { data: usersData } = useUserList({ page: 1, size: 100 });
  const { data: booksData } = useBooks({ limit: 100, catalog: 'private' });

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.getGroups();
      setGroups(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load user groups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      await groupService.createGroup({ name: newGroupName.trim(), description: newGroupDesc.trim() || undefined });
      setNewGroupName("");
      setNewGroupDesc("");
      setShowCreateModal(false);
      fetchGroups();
    } catch (err: any) {
      alert(err?.message || "Failed to create group.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = (groupId: number, name: string) => {
    setGroupToDelete({ id: groupId, name });
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await groupService.deleteGroup(groupToDelete.id);
      fetchGroups();
    } catch (err: any) {
      alert(err?.message || "Failed to delete group.");
    } finally {
      setGroupToDelete(null);
    }
  };

  // Member management
  const openMembersModal = async (group: UserGroup) => {
    setSelectedGroupForMembers(group);
    setLoadingMembers(true);
    setUserSearchQuery("");
    try {
      const data = await groupService.getGroupMembers(group.id);
      setMembers(data);
    } catch (err: any) {
      console.error("Failed to load members", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupForMembers || !selectedUserId) return;
    setAddingMember(true);
    try {
      await groupService.addMember(selectedGroupForMembers.id, {
        user_id: parseInt(selectedUserId),
        role_in_group: selectedRoleInGroup,
      });
      const data = await groupService.getGroupMembers(selectedGroupForMembers.id);
      setMembers(data);
      setSelectedUserId("");
      setUserSearchQuery("");
    } catch (err: any) {
      alert(err?.message || "Failed to add member to group.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedGroupForMembers) return;
    try {
      await groupService.removeMember(selectedGroupForMembers.id, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err: any) {
      alert(err?.message || "Failed to remove member.");
    }
  };

  // Books management
  const openBooksModal = async (group: UserGroup) => {
    setSelectedGroupForBooks(group);
    setLoadingBooks(true);
    setBookSearchQuery("");
    try {
      const data = await groupService.getGroupBooks(group.id);
      setAssignedBooks(data);
    } catch (err: any) {
      console.error("Failed to load group books", err);
    } finally {
      setLoadingBooks(false);
    }
  };

  const handleAssignBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupForBooks || !selectedBookId) return;
    setAssigningBook(true);
    try {
      await groupService.assignBook(selectedGroupForBooks.id, { book_id: parseInt(selectedBookId) });
      const data = await groupService.getGroupBooks(selectedGroupForBooks.id);
      setAssignedBooks(data);
      setSelectedBookId("");
      setBookSearchQuery("");
    } catch (err: any) {
      alert(err?.message || "Failed to assign book.");
    } finally {
      setAssigningBook(false);
    }
  };

  const handleUnassignBook = async (bookId: number) => {
    if (!selectedGroupForBooks) return;
    try {
      await groupService.unassignBook(selectedGroupForBooks.id, bookId);
      setAssignedBooks((prev) => prev.filter((b) => b.book_id !== bookId));
    } catch (err: any) {
      alert(err?.message || "Failed to unassign book.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" /> User Groups & Class Cohorts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Group teachers and students into cohorts to assign private curriculum books and restricted courseware.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2 rounded-xl px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4" /> Create User Group
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" /> Loading user groups...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 rounded-2xl flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" /> {error}
        </div>
      ) : groups.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300">No User Groups Created Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Create groups for classes, departments, or reading clubs to control access to private library books.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <button
                    onClick={() => handleDeleteGroup(group.id, group.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{group.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {group.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <Button
                  onClick={() => openMembersModal(group)}
                  variant="outline"
                  className="flex-1 h-9 text-xs gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <UserPlus className="h-3.5 w-3.5 text-indigo-500" /> Members
                </Button>
                <Button
                  onClick={() => openBooksModal(group)}
                  variant="outline"
                  className="flex-1 h-9 text-xs gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <BookOpen className="h-3.5 w-3.5 text-indigo-500" /> Private Books
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Create User Group / Class</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-slate-500">Group Name</label>
                <Input
                  required
                  placeholder="e.g. Computer Science 101"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-slate-500">Description</label>
                <Input
                  placeholder="e.g. Fall Semester Class Cohort"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1 rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="flex-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
                  {creating ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {selectedGroupForMembers && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-700 p-6 space-y-5 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Manage Members — {selectedGroupForMembers.name}
                </h3>
                <p className="text-xs text-slate-400">Add or remove teachers and students in this cohort.</p>
              </div>
              <button onClick={() => setSelectedGroupForMembers(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add member form */}
            <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 space-y-1 relative">
                <label className="text-[10px] font-bold uppercase text-slate-400">Search & Select User</label>
                <div 
                  className="w-full relative"
                  onFocus={() => setIsUserDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsUserDropdownOpen(false), 200)}
                >
                  <Input
                    required
                    type="text"
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setSelectedUserId(""); // Reset if they type manually
                      setIsUserDropdownOpen(true);
                    }}
                    className="w-full h-9 rounded-xl text-xs"
                  />
                  {isUserDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                      {usersData?.items?.filter(u => 
                        `${u.full_name} ${u.email}`.toLowerCase().includes(userSearchQuery.toLowerCase())
                      ).length === 0 ? (
                        <div className="p-2 text-xs text-slate-500 text-center">No users found</div>
                      ) : (
                        usersData?.items?.filter(u => 
                          `${u.full_name} ${u.email}`.toLowerCase().includes(userSearchQuery.toLowerCase())
                        ).map((u) => (
                          <div
                            key={u.id}
                            className="p-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 cursor-pointer"
                            onClick={() => {
                              setSelectedUserId(u.id.toString());
                              setUserSearchQuery(`${u.full_name} (${u.email})`);
                              setIsUserDropdownOpen(false);
                            }}
                          >
                            {u.full_name} ({u.email}) — [{u.role.toUpperCase()}]
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="w-28 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Role in Group</label>
                <select
                  value={selectedRoleInGroup}
                  onChange={(e) => setSelectedRoleInGroup(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <Button type="submit" disabled={addingMember} className="h-9 px-4 rounded-xl text-xs bg-indigo-600 text-white shrink-0">
                {addingMember ? "Adding..." : "Add"}
              </Button>
            </form>

            {/* Member list */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 border border-slate-100 dark:border-slate-700 rounded-xl">
              {loadingMembers ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading members...</div>
              ) : members.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No members in this group yet.</div>
              ) : (
                members.map((m) => (
                  <div key={m.user_id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <div>
                      <p className="font-semibold text-xs text-slate-900 dark:text-white">{m.full_name}</p>
                      <p className="text-[11px] text-slate-400">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        m.role_in_group === 'teacher' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600'
                      }`}>
                        {m.role_in_group}
                      </span>
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Remove member"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Private Books Modal */}
      {selectedGroupForBooks && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-700 p-6 space-y-5 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Assign Private Books — {selectedGroupForBooks.name}
                </h3>
                <p className="text-xs text-slate-400">Control private book access for members of this group.</p>
              </div>
              <button onClick={() => setSelectedGroupForBooks(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Assign book form */}
            <form onSubmit={handleAssignBook} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1 relative">
                <label className="text-[10px] font-bold uppercase text-slate-400">Search & Select Book</label>
                <div 
                  className="w-full relative"
                  onFocus={() => setIsBookDropdownOpen(true)}
                  onBlur={(e) => {
                    // Slight delay to allow click on options to register
                    setTimeout(() => setIsBookDropdownOpen(false), 200);
                  }}
                >
                  <Input
                    required
                    type="text"
                    placeholder="Search books..."
                    value={bookSearchQuery}
                    onChange={(e) => {
                      setBookSearchQuery(e.target.value);
                      setSelectedBookId(""); // Reset if they type manually
                      setIsBookDropdownOpen(true);
                    }}
                    className="w-full h-9 rounded-xl text-xs"
                  />
                  {isBookDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                      {booksData?.items?.filter(b => 
                        b.access_level?.toLowerCase() === 'private' &&
                        `${b.title} by ${b.author}`.toLowerCase().includes(bookSearchQuery.toLowerCase())
                      ).length === 0 ? (
                        <div className="p-2 text-xs text-slate-500 text-center">No private books found</div>
                      ) : (
                        booksData?.items?.filter(b => 
                          b.access_level?.toLowerCase() === 'private' &&
                          `${b.title} by ${b.author}`.toLowerCase().includes(bookSearchQuery.toLowerCase())
                        ).map((b) => (
                          <div
                            key={b.id}
                            className="p-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 cursor-pointer"
                            onClick={() => {
                              setSelectedBookId(b.id.toString());
                              setBookSearchQuery(`${b.title} by ${b.author} [PRIVATE]`);
                              setIsBookDropdownOpen(false);
                            }}
                          >
                            {b.title} by {b.author} [PRIVATE]
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={assigningBook || !selectedBookId} className="h-9 px-4 rounded-xl text-xs bg-indigo-600 text-white shrink-0">
                {assigningBook ? "Assigning..." : "Assign"}
              </Button>
            </form>

            {/* Assigned books list */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 border border-slate-100 dark:border-slate-700 rounded-xl">
              {loadingBooks ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading assigned books...</div>
              ) : assignedBooks.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No private books assigned to this group yet.</div>
              ) : (
                assignedBooks.map((b) => (
                  <div key={b.book_id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <div>
                      <p className="font-semibold text-xs text-slate-900 dark:text-white">{b.title}</p>
                      <p className="text-[11px] text-slate-400">{b.author}</p>
                    </div>
                    <button
                      onClick={() => handleUnassignBook(b.book_id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                      title="Unassign book"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-700 p-6 space-y-5 animate-fade-in text-center">
            <div className="mx-auto w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Delete Cohort?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Are you sure you want to delete the group <strong>"{groupToDelete.name}"</strong>? This action cannot be undone and will remove all members and book assignments.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setGroupToDelete(null)} variant="outline" className="flex-1 rounded-xl h-10">
                Cancel
              </Button>
              <Button onClick={confirmDeleteGroup} className="flex-1 rounded-xl h-10 bg-rose-500 text-white hover:bg-rose-600 border-0">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
