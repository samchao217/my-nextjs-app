import { Badge } from '@/components/ui/badge';
import type { Task } from '@/types/task';

interface TaskStatusBadgeProps {
  status: Task['status'];
  task?: Task; // 添加可选的task参数以获取更多上下文
}

const statusConfig = {
  preparing: {
    label: '准备中',
    variant: 'secondary' as const,
    className: 'bg-slate-100 text-slate-800 hover:bg-slate-200'
  },
  connecting: {
    label: '对接中',
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  },
  material_prep: {
    label: '备料中',
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
  },
  sampling: {
    label: '打样中',
    variant: 'default' as const,
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-200'
  },
  post_processing: {
    label: '后道处理',
    variant: 'default' as const,
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-200'
  },
  completed: {
    label: '已完成',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 hover:bg-green-200'
  },
  revision: {
    label: '返工',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 hover:bg-red-200'
  }
};

// 返工状态下的标签映射
const revisionStatusLabels = {
  preparing: '重新准备中',
  connecting: '重新对接中',
  material_prep: '重新备料中',
  sampling: '重新打样中',
  post_processing: '重新后道处理',
  completed: '已完成',
  revision: '返工'
};

export function TaskStatusBadge({ status, task }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  
  // 如果任务曾经处于返工状态，且当前不是已完成或返工状态，则显示"重新"前缀
  const shouldShowRevisionPrefix = task?.hasBeenRevised && 
    status !== 'completed' && 
    status !== 'revision';
  
  const label = shouldShowRevisionPrefix ? revisionStatusLabels[status] : config.label;
  
  return (
    <Badge 
      variant={config.variant}
      className={config.className}
    >
      {label}
    </Badge>
  );
} 