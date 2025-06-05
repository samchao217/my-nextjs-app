import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  MoreHorizontal, 
  Play, 
  CheckCircle, 
  RotateCcw, 
  Edit,
  Trash2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Flag
} from 'lucide-react';
import { ExportButton } from './ExportButton';
import { toast } from 'sonner';
import type { Task } from '@/types/task';
import { useTaskStore } from '@/store/taskStore';
import { PasswordDialog } from './PasswordDialog';
import { EditTaskDialog } from './EditTaskDialog';

interface TaskActionsProps {
  task: Task;
}

const statusTransitions = {
  preparing: [
    { status: 'connecting' as const, label: '开始对接', icon: Play }
  ],
  connecting: [
    { status: 'material_prep' as const, label: '对接完成，开始备料', icon: Play }
  ],
  material_prep: [
    { status: 'sampling' as const, label: '开始打样', icon: Play }
  ],
  sampling: [
    { status: 'post_processing' as const, label: '进入后道', icon: Play },
    { status: 'revision' as const, label: '需要返工', icon: RotateCcw }
  ],
  post_processing: [
    { status: 'completed' as const, label: '完成制作', icon: CheckCircle },
    { status: 'revision' as const, label: '需要返工', icon: RotateCcw }
  ],
  completed: [
    { status: 'revision' as const, label: '需要返工', icon: RotateCcw }
  ],
  revision: [
    { status: 'preparing' as const, label: '重新准备', icon: Play },
    { status: 'connecting' as const, label: '重新对接', icon: Play },
    { status: 'material_prep' as const, label: '重新备料', icon: Play },
    { status: 'sampling' as const, label: '重新打样', icon: Play },
    { status: 'post_processing' as const, label: '重新后道', icon: Play }
  ]
};

export function TaskActions({ task }: TaskActionsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordAction, setPasswordAction] = useState<'edit' | 'delete' | 'priority'>('edit');
  const [pendingPriority, setPendingPriority] = useState<Task['priority'] | null>(null);
  const { updateTask, deleteTask } = useTaskStore();

  const handleStatusChange = (newStatus: Task['status']) => {
    updateTask(task.id, { status: newStatus });
    toast.success(`任务 ${task.id} 状态已更新为：${getStatusLabel(newStatus)}`);
  };

  const getStatusLabel = (status: Task['status']) => {
    const labels = {
      preparing: '准备中',
      connecting: '对接中',
      material_prep: '备料中',
      sampling: '打样中',
      post_processing: '后道处理',
      completed: '已完成',
      revision: '返工'
    };
    return labels[status];
  };

  const handleEditClick = () => {
    setPasswordAction('edit');
    setPasswordDialogOpen(true);
  };

  const handleDeleteClick = () => {
    setPasswordAction('delete');
    setPasswordDialogOpen(true);
  };

  const handlePriorityClick = (newPriority: Task['priority']) => {
    setPendingPriority(newPriority);
    setPasswordAction('priority');
    setPasswordDialogOpen(true);
  };

  const handlePasswordSuccess = () => {
    if (passwordAction === 'edit') {
      setEditDialogOpen(true);
    } else if (passwordAction === 'delete') {
      setDeleteDialogOpen(true);
    } else if (passwordAction === 'priority' && pendingPriority) {
      const priorityLabels = {
        urgent: '紧急',
        high: '优先', 
        normal: '正常',
        low: '宽松'
      };
      
      updateTask(task.id, { priority: pendingPriority });
      toast.success(`优先级已更新为：${priorityLabels[pendingPriority]}`);
      setPendingPriority(null);
    }
  };

  const handleDeleteConfirm = () => {
    deleteTask(task.id);
    toast.success(`任务 ${task.id} 已删除`);
    setDeleteDialogOpen(false);
  };

  const availableTransitions = statusTransitions[task.status] || [];

  return (
    <div className="flex items-center gap-2">
      {/* 状态更新按钮 */}
      {availableTransitions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              更新状态
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {availableTransitions.map(({ status, label, icon: Icon }) => (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusChange(status)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 优先级切换按钮 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Flag className="h-4 w-4 mr-1" />
            优先级
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handlePriorityClick('urgent')}>
            <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
            紧急
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePriorityClick('high')}>
            <ArrowUp className="h-4 w-4 mr-2 text-orange-600" />
            优先
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePriorityClick('normal')}>
            <Clock className="h-4 w-4 mr-2 text-blue-600" />
            正常
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePriorityClick('low')}>
            <ArrowDown className="h-4 w-4 mr-2 text-green-600" />
            宽松
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 导出任务按钮 */}
      <ExportButton task={task} variant="single" size="sm" />

      {/* 更多操作 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleEditClick}>
            <Edit className="h-4 w-4 mr-2" />
            编辑任务
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleDeleteClick}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除任务
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 密码验证对话框 */}
      <PasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onSuccess={handlePasswordSuccess}
        title={
          passwordAction === 'edit' ? '编辑任务验证' : 
          passwordAction === 'delete' ? '删除任务验证' : 
          '优先级修改验证'
        }
        description={
          passwordAction === 'edit' ? `请输入管理密码以编辑任务 ${task.id}` :
          passwordAction === 'delete' ? `请输入管理密码以删除任务 ${task.id}` :
          `请输入管理密码以修改任务 ${task.id} 的优先级`
        }
      />

      {/* 编辑任务对话框 */}
      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={task}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除任务</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除任务 <strong>{task.id}</strong> 吗？
              <br />
              此操作无法撤销，将永久删除该任务的所有数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 