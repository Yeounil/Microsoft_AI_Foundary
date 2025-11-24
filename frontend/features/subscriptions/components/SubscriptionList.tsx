'use client';

import { Subscription } from '../types';
import { SubscriptionCard } from './SubscriptionCard';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  onUpdate: () => void;
}

export function SubscriptionList({ subscriptions, onUpdate }: SubscriptionListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
      {subscriptions.map((subscription) => (
        <SubscriptionCard
          key={subscription.id}
          subscription={subscription}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
