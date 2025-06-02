import { TaskCard } from './TaskCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Search } from 'lucide-react';
import type { Task } from '@/types/task';

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
}

function TaskSkeleton() {
  return (
    <Card className="h-full">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="aspect-video w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Package className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">暂无袜子打样任务</h3>
      <p className="text-muted-foreground max-w-sm">
        当前没有找到任何袜子打样任务，请检查筛选条件或添加新任务。
      </p>
    </div>
  );
}

function NoResultsState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Search className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">未找到匹配的袜子任务</h3>
      <p className="text-muted-foreground max-w-sm">
        没有找到符合当前筛选条件的袜子任务，请尝试调整搜索条件。
      </p>
    </div>
  );
}

export function TaskList({ tasks, isLoading = false }: TaskListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <TaskSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="grid grid-cols-1">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
} 