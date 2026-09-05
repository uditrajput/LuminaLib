import apiClient from "./apiClient";

export const quizService = {
  list: (scope: "manage" | "assigned" = "assigned") =>
    apiClient.get(`/quizzes?scope=${scope}`).then(r => r.data as any[]),

  get: (id: number) =>
    apiClient.get(`/quizzes/${id}`).then(r => r.data),

  create: (payload: any) =>
    apiClient.post(`/quizzes`, payload).then(r => r.data),

  update: (id: number, payload: any) =>
    apiClient.put(`/quizzes/${id}`, payload).then(r => r.data),

  toggleStatus: (id: number) =>
    apiClient.post(`/quizzes/${id}/toggle-status`).then(r => r.data),

  delete: (id: number) =>
    apiClient.delete(`/quizzes/${id}`).then(r => r.data),

  assign: (id: number, group_ids: number[]) =>
    apiClient.post(`/quizzes/${id}/assign`, { group_ids }).then(r => r.data),

  unassign: (id: number, groupId: number) =>
    apiClient.delete(`/quizzes/${id}/assign/${groupId}`).then(r => r.data),

  generate: (payload: any) =>
    apiClient.post(`/quizzes/generate`, payload).then(r => r.data),

  addQuestion: (quizId: number, payload: any) =>
    apiClient.post(`/quizzes/${quizId}/questions`, payload).then(r => r.data),

  stats: (quizId: number) =>
    apiClient.get(`/quizzes/${quizId}/stats`).then(r => r.data),

  startAttempt: (quizId: number) =>
    apiClient.post(`/quizzes/${quizId}/attempts`).then(r => r.data),

  getAttempt: (attemptId: number) =>
    apiClient.get(`/quizzes/attempts/${attemptId}`).then(r => r.data),

  getTime: (attemptId: number) =>
    apiClient.get(`/quizzes/attempts/${attemptId}/time`).then(r => r.data),

  saveAnswers: (attemptId: number, answers: any[]) =>
    apiClient.patch(`/quizzes/attempts/${attemptId}/answers`, { answers }).then(r => r.data),

  submit: (attemptId: number) =>
    apiClient.post(`/quizzes/attempts/${attemptId}/submit`).then(r => r.data),

  result: (attemptId: number) =>
    apiClient.get(`/quizzes/attempts/${attemptId}/result`).then(r => r.data),

  myAttempts: (quizId: number) =>
    apiClient.get(`/quizzes/${quizId}/my-attempts`).then(r => r.data),

  listAttempts: (quizId: number, status?: string) =>
    apiClient.get(`/quizzes/${quizId}/attempts${status ? `?status_filter=${status}` : ""}`).then(r => r.data),

  grade: (attemptId: number, grades: any[]) =>
    apiClient.patch(`/quizzes/attempts/${attemptId}/grade`, { grades }).then(r => r.data),

  aiGrade: (attemptId: number, question_id: number) =>
    apiClient.post(`/quizzes/attempts/${attemptId}/ai-grade`, { question_id }).then(r => r.data),
};
