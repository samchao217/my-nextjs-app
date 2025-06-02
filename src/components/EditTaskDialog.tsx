import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Edit, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { useTaskStore } from '@/store/taskStore';
import { cn } from '@/lib/utils';
import type { Task } from '@/types/task';

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
}

export function EditTaskDialog({ open, onOpenChange, task }: EditTaskDialogProps) {
  const [formData, setFormData] = useState({
    id: '',
    size: '',
    color: '',
    other: '',
    status: 'preparing' as Task['status'],
    priority: 'normal' as Task['priority'],
    deadline: undefined as Date | undefined,
  });
  const { updateTask, tasks } = useTaskStore();

  // 当对话框打开时，初始化表单数据
  useEffect(() => {
    if (open && task) {
      setFormData({
        id: task.id,
        size: task.specs.size,
        color: task.specs.color,
        other: task.specs.other || '',
        status: task.status,
        priority: task.priority,
        deadline: new Date(task.deadline),
      });
    }
  }, [open, task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id || !formData.size || !formData.color || !formData.deadline) {
      toast.error('请填写所有必填字段');
      return;
    }

    // 检查任务编号是否已存在（排除当前任务）
    if (formData.id !== task.id && tasks.some(t => t.id === formData.id)) {
      toast.error('任务编号已存在，请使用其他编号');
      return;
    }

    const updates: Partial<Task> = {
      id: formData.id,
      specs: {
        size: formData.size,
        color: formData.color,
        other: formData.other || undefined,
      },
      status: formData.status,
      priority: formData.priority,
      deadline: formData.deadline.toISOString(),
    };

    updateTask(task.id, updates);
    toast.success('任务信息已更新');
    onOpenChange(false);
  };

  const statusOptions = [
    { value: 'preparing', label: '准备中' },
    { value: 'connecting', label: '对接中' },
    { value: 'material_prep', label: '备料中' },
    { value: 'sampling', label: '打样中' },
    { value: 'post_processing', label: '后道处理' },
    { value: 'completed', label: '已完成' },
    { value: 'revision', label: '返工' }
  ];

  const priorityOptions = [
    { value: 'urgent', label: '紧急' },
    { value: 'high', label: '优先' },
    { value: 'normal', label: '正常' },
    { value: 'low', label: '宽松' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            编辑打样任务
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 任务编号 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              任务编号 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="请输入任务编号"
              value={formData.id}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, id: e.target.value }))
              }
            />
          </div>

          {/* 尺码 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              尺码 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="请输入袜子尺码"
              value={formData.size}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, size: e.target.value }))
              }
            />
          </div>

          {/* 颜色 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              颜色 <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="请输入袜子颜色，每行一种颜色，如：&#10;深蓝色&#10;白色&#10;黑色"
              value={formData.color}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, color: e.target.value }))
              }
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              可以输入多种颜色，每行一种颜色
            </p>
          </div>

          {/* 任务状态 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">任务状态</label>
            <Select 
              value={formData.status} 
              onValueChange={(value: Task['status']) => 
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 优先级 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">优先级</label>
            <Select 
              value={formData.priority} 
              onValueChange={(value: Task['priority']) => 
                setFormData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 完成时间 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              完成时间 <span className="text-red-500">*</span>
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.deadline ? (
                    format(formData.deadline, "yyyy年MM月dd日", { locale: zhCN })
                  ) : (
                    "选择完成日期"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.deadline}
                  onSelect={(date) => 
                    setFormData(prev => ({ ...prev, deadline: date }))
                  }
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 详细要求 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">详细要求</label>
            <Textarea
              placeholder="请输入袜子的材质、款式、特殊要求等..."
              value={formData.other}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, other: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit">
              保存修改
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 