import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';
import type {
  SlacklineListResponse, SlacklineDetail, CrossingListResponse,
  ChangeHistoryResponse, StatisticsResponse, CrossingItem, DiaryResponse, DiaryStatsResponse,
  SlacklinerListResponse, SlacklinerLinesResponse, SlacklinerUserInfo,
} from '../types';
export function useSlacklines(params: Record<string, any>) {
  return useQuery<SlacklineListResponse>({
    queryKey: ['slacklines', params],
    queryFn: () => api.get('/slacklines', { params }).then(r => r.data),
  });
}

export function useFilterOptions(state?: string, region?: string) {
  return useQuery<{ states: string[]; regions: string[]; sectors: string[] }>({
    queryKey: ['filterOptions', state ?? '', region ?? ''],
    queryFn: () =>
      api.get('/slacklines/filter-options', { params: { state, region } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
export function useSlacklineDetail(id: number) {
  return useQuery<SlacklineDetail>({
    queryKey: ['slackline', id],
    queryFn: () => api.get(`/slacklines/${id}`).then(r => r.data),
    enabled: !!id,
  });
}
export function useCrossings(slacklineId: number, params: Record<string, any> = {}) {
  return useQuery<CrossingListResponse>({
    queryKey: ['crossings', slacklineId, params],
    queryFn: () => api.get(`/slacklines/${slacklineId}/crossings`, { params }).then(r => r.data),
    enabled: !!slacklineId,
  });
}
export function useHistory(slacklineId: number, params: Record<string, any> = {}) {
  return useQuery<ChangeHistoryResponse>({
    queryKey: ['history', slacklineId, params],
    queryFn: () => api.get(`/slacklines/${slacklineId}/history`, { params }).then(r => r.data),
    enabled: !!slacklineId,
  });
}
export function useStatistics(slacklineId: number) {
  return useQuery<StatisticsResponse>({
    queryKey: ['statistics', slacklineId],
    queryFn: () => api.get(`/slacklines/${slacklineId}/statistics`).then(r => r.data),
    enabled: !!slacklineId,
  });
}
export function useCreateSlackline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/slacklines', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slacklines'] }),
  });
}
export function useUpdateSlackline(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.patch(`/slacklines/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slackline', id] });
      qc.invalidateQueries({ queryKey: ['slacklines'] });
    },
  });
}
export function useCreateCrossing(slacklineId: number) {
  const qc = useQueryClient();
  return useMutation<CrossingItem, Error, FormData>({
    mutationFn: (formData) =>
      api.post(`/slacklines/${slacklineId}/crossings`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crossings', slacklineId] });
      qc.invalidateQueries({ queryKey: ['statistics', slacklineId] });
      qc.invalidateQueries({ queryKey: ['diary'] });
    },
  });
}

export function useDeleteCrossing(slacklineId: number) {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (crossingId) =>
      api.delete(`/slacklines/${slacklineId}/crossings/${crossingId}`).then(() => {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crossings', slacklineId] });
      qc.invalidateQueries({ queryKey: ['statistics', slacklineId] });
      qc.invalidateQueries({ queryKey: ['diary'] });
    },
  });
}

export function useDiary(params: Record<string, any>, enabled: boolean = true) {
  return useQuery<DiaryResponse>({
    queryKey: ['diary', params],
    queryFn: () => api.get('/diary', { params }).then(r => r.data),
    enabled,
  });
}

export function useDiaryStats(enabled: boolean = true) {
  return useQuery<DiaryStatsResponse>({
    queryKey: ['diary-stats'],
    queryFn: () => api.get('/diary/stats').then(r => r.data),
    enabled,
  });
}

export function useSlackliners() {
  return useQuery<SlacklinerListResponse>({
    queryKey: ['slackliners'],
    queryFn: () => api.get('/slackliners').then(r => r.data),
  });
}

export function useSlacklinerStats(userId: string, enabled: boolean = true) {
  return useQuery<DiaryStatsResponse>({
    queryKey: ['slackliner-stats', userId],
    queryFn: () => api.get(`/slackliners/${userId}/stats`).then(r => r.data),
    enabled: enabled && !!userId,
  });
}

export function useSlacklinerLines(userId: string, params: Record<string, any>, enabled: boolean = true) {
  return useQuery<SlacklinerLinesResponse>({
    queryKey: ['slackliner-lines', userId, params],
    queryFn: () => api.get(`/slackliners/${userId}/lines`, { params }).then(r => r.data),
    enabled: enabled && !!userId,
  });
}

export function useSlacklinerInfo(userId: string, enabled: boolean = true) {
  return useQuery<SlacklinerUserInfo>({
    queryKey: ['slackliner-info', userId],
    queryFn: () => api.get(`/slackliners/${userId}/info`).then(r => r.data),
    enabled: enabled && !!userId,
  });
}

