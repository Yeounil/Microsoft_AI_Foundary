'use client';

import { Subscription } from '../types';
import { SubscriptionCard } from './SubscriptionCard';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  onUpdate: () => void;
}

export function SubscriptionList({ subscriptions, onUpdate }: SubscriptionListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
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
