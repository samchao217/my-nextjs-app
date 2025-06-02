import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { TaskActions } from './TaskActions';
import { NotesManager } from './NotesManager';
import { ImageUploadManager } from './ImageUploadManager';
import { 
  Calendar, 
  Ruler, 
  Palette, 
  FileText, 
  Clock
} from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Task } from '@/types/task';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const isOverdue = isAfter(new Date(), new Date(task.deadline)) && task.status !== 'completed';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{task.id}</CardTitle>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} task={task} />
          </div>
        </div>
        
        {/* 完成时间 */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          <span className="font-medium">完成时间:</span>
          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
            {format(new Date(task.deadline), 'yyyy年MM月dd日', { locale: zhCN })}
          </span>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              已超期
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* 袜子样品图片管理 */}
        <ImageUploadManager task={task} />

        {/* 袜子规格要求 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Ruler className="h-4 w-4" />
            <span className="font-medium">尺码:</span>
            <span>{task.specs.size}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Palette className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium">颜色:</span>
              <div className="mt-1 whitespace-pre-line text-muted-foreground">
                {task.specs.color}
              </div>
            </div>
          </div>
          {task.specs.other && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span className="font-medium">详细要求:</span>
              <span className="text-muted-foreground">{task.specs.other}</span>
            </div>
          )}
        </div>

        {/* 备注和工艺说明 */}
        <NotesManager task={task} />

        {/* 时间信息 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>创建: {format(new Date(task.createdAt), 'MM-dd HH:mm')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>更新: {format(new Date(task.updatedAt), 'MM-dd HH:mm')}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="pt-2 border-t">
          <TaskActions task={task} />
        </div>
      </CardContent>
    </Card>
  );
} 