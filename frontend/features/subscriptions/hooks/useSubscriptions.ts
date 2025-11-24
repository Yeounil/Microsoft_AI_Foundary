import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Subscription, CreateSubscriptionRequest, UpdateSubscriptionRequest, SubscriptionStatistics } from '../types';
import { toast } from 'sonner';

// 모든 구독 조회
export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const response = await apiClient.get<Subscription[]>('/api/v2/subscriptions');
      return response.data;
    },
  });
}

// 특정 구독 조회
export function useSubscription(subscriptionId: number) {
  return useQuery({
    queryKey: ['subscriptions', subscriptionId],
    queryFn: async () => {
      const response = await apiClient.get<Subscription>(`/api/v2/subscriptions/${subscriptionId}`);
      return response.data;
    },
    enabled: !!subscriptionId,
  });
}

// 구독 통계 조회
export function useSubscriptionStatistics() {
  return useQuery({
    queryKey: ['subscriptions', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get<SubscriptionStatistics>('/api/v2/subscriptions/statistics/summary');
      return response.data;
    },
  });
}

// 구독 생성
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubscriptionRequest) => {
      console.log('Sending subscription data:', data);
      const response = await apiClient.post<Subscription>('/api/v2/subscriptions', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('구독이 생성되었습니다');
    },
    onError: (error: any) => {
      console.error('Subscription creation error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.detail || '구독 생성에 실패했습니다';
      toast.error(errorMessage);
    },
  });
}

// 구독 업데이트
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateSubscriptionRequest }) => {
      const response = await apiClient.put<Subscription>(`/api/v2/subscriptions/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('구독이 업데이트되었습니다');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || '구독 업데이트에 실패했습니다';
      toast.error(errorMessage);
    },
  });
}

// 구독 삭제
export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: number) => {
      await apiClient.delete(`/api/v2/subscriptions/${subscriptionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('구독이 삭제되었습니다');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || '구독 삭제에 실패했습니다';
      toast.error(errorMessage);
    },
  });
}

// 구독 토글 (활성화/비활성화)
export function useToggleSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: number) => {
      const response = await apiClient.post<Subscription>(`/api/v2/subscriptions/${subscriptionId}/toggle`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      const status = data.is_active ? '활성화' : '비활성화';
      toast.success(`구독이 ${status}되었습니다`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || '구독 상태 변경에 실패했습니다';
      toast.error(errorMessage);
    },
  });
}

// 테스트 이메일 발송
export function useSendTestEmail() {
  return useMutation({
    mutationFn: async (subscriptionId: number) => {
      const response = await apiClient.post(`/api/v2/subscriptions/${subscriptionId}/test-email`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('테스트 이메일이 발송되었습니다');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || '테스트 이메일 발송에 실패했습니다';
      toast.error(errorMessage);
    },
  });
}
