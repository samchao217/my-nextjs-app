import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import type { Task } from '@/types/task';

interface PriorityBadgeProps {
  priority: Task['priority'];
}

const priorityConfig = {
  urgent: {
    label: '紧急',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 hover:bg-red-200',
    icon: AlertTriangle
  },
  high: {
    label: '优先',
    variant: 'default' as const,
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
    icon: ArrowUp
  },
  normal: {
    label: '正常',
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    icon: Clock
  },
  low: {
    label: '宽松',
    variant: 'outline' as const,
    className: 'bg-green-100 text-green-800 hover:bg-green-200',
    icon: ArrowDown
  }
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} flex items-center gap-1`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
} 