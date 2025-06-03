"use client"

import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CollapsibleContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = createContext<CollapsibleContextType | undefined>(undefined);

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function Collapsible({ 
  open: controlledOpen, 
  onOpenChange, 
  children, 
  className 
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleOpenChange = onOpenChange || setInternalOpen;

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div className={cn('', className)}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps {
  children: ReactNode;
  className?: string;
}

export function CollapsibleTrigger({ children, className }: CollapsibleTriggerProps) {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error('CollapsibleTrigger must be used within a Collapsible');
  }

  const { open, onOpenChange } = context;

  return (
    <button
      onClick={() => onOpenChange(!open)}
      className={cn('', className)}
    >
      {children}
    </button>
  );
}

interface CollapsibleContentProps {
  children: ReactNode;
  className?: string;
}

export function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error('CollapsibleContent must be used within a Collapsible');
  }

  const { open } = context;

  if (!open) {
    return null;
  }

  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
} 