import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
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
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { useTaskStore } from '@/store/taskStore';
import { cn } from '@/lib/utils';

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    customerNumber: '',
    size: '',
    color: '',
    other: '',
    priority: 'normal' as 'urgent' | 'high' | 'normal' | 'low',
    deadline: undefined as Date | undefined,
  });
  const { addTask, tasks } = useTaskStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id || !formData.customerNumber || !formData.size || !formData.color || !formData.deadline) {
      toast.error('请填写所有必填字段');
      return;
    }

    // 检查任务编号是否已存在
    if (tasks.some(task => task.id === formData.id)) {
      toast.error('任务编号已存在，请使用其他编号');
      return;
    }

    const newTask = {
      id: formData.id,
      customerNumber: formData.customerNumber,
      images: [],
      specs: {
        size: formData.size,
        color: formData.color,
        other: formData.other || undefined,
      },
      status: 'preparing' as const,
      priority: formData.priority,
      deadline: formData.deadline.toISOString(),
      notes: [],
      processNotes: [],
      hasBeenRevised: false,
    };

    addTask(newTask);
    toast.success('袜子打样任务创建成功！');
    
    // 重置表单
    setFormData({
      id: '',
      customerNumber: '',
      size: '',
      color: '',
      other: '',
      priority: 'normal' as 'urgent' | 'normal',
      deadline: undefined,
    });
    setOpen(false);
  };



  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新建打样任务
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>创建袜子打样任务</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 任务编号 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              任务编号 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="请输入任务编号，如：S001"
              value={formData.id}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, id: e.target.value }))
              }
            />
          </div>

          {/* 客户编号 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              客户编号 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="请输入客户编号"
              value={formData.customerNumber}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, customerNumber: e.target.value }))
              }
            />
          </div>

          {/* 尺码输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              尺码 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="请输入袜子尺码，如：39-42码"
              value={formData.size}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, size: e.target.value }))
              }
            />
          </div>

          {/* 颜色输入 */}
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

          {/* 优先级选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">优先级</label>
            <Select 
              value={formData.priority} 
              onValueChange={(value: 'urgent' | 'high' | 'normal' | 'low') => 
                setFormData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">紧急</SelectItem>
                <SelectItem value="high">优先</SelectItem>
                <SelectItem value="normal">正常</SelectItem>
                <SelectItem value="low">宽松</SelectItem>
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
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit">
              创建任务
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 