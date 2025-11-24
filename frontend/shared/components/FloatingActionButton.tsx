'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  className?: string;
}

export function FloatingActionButton({ actions, className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("fixed bottom-20 right-4 z-40 md:hidden", className)}>
      {/* Action buttons */}
      <div className={cn(
        "flex flex-col-reverse gap-3 mb-3 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onClick();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 bg-background shadow-lg rounded-full pl-4 pr-2 py-2 border animate-scale-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {action.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform duration-300 active:scale-95",
          isOpen && "rotate-45"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
