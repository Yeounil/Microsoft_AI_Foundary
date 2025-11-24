export interface Subscription {
  id: number;
  user_id: string;
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  symbols: string[];
  report_types: ('news' | 'technical' | 'comprehensive')[];
  is_active: boolean;
  send_time: string;
  timezone: string;
  next_send_time: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionRequest {
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  symbols: string[];
  report_types: ('news' | 'technical' | 'comprehensive')[];
  send_time?: string;
  timezone?: string;
}

export interface UpdateSubscriptionRequest {
  email?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  symbols?: string[];
  report_types?: ('news' | 'technical' | 'comprehensive')[];
  send_time?: string;
  timezone?: string;
  is_active?: boolean;
}

export interface SubscriptionStatistics {
  total_subscriptions: number;
  active_subscriptions: number;
  inactive_subscriptions: number;
  by_frequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface EmailHistory {
  id: number;
  subscription_id: number;
  sent_at: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  retry_count: number;
}
