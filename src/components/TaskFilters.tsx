import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Search, Filter, X, RefreshCw, Calendar, Flag } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import type { Task } from '@/types/task';

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'preparing', label: '准备中' },
  { value: 'connecting', label: '对接中' },
  { value: 'material_prep', label: '备料中' },
  { value: 'sampling', label: '打样中' },
  { value: 'post_processing', label: '后道处理' },
  { value: 'completed', label: '已完成' },
  { value: 'revision', label: '返工' }
];

const priorityOptions = [
  { value: 'all', label: '全部优先级' },
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '优先' },
  { value: 'normal', label: '正常' },
  { value: 'low', label: '宽松' }
];

const timeRangeOptions = [
  { value: 'all', label: '全部时间' },
  { value: 'week', label: '近一周' },
  { value: 'month', label: '近一月' },
  { value: 'quarter', label: '近一季度' },
  { value: 'year', label: '近一年' }
];

export function TaskFilters() {
  const { filter, setFilter, tasks, isLoading, setLoading } = useTaskStore();
  const [searchInput, setSearchInput] = useState(filter.search || '');
  const [isHydrated, setIsHydrated] = useState(false);

  // 等待客户端水合完成
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleStatusChange = (value: string) => {
    const status = value === 'all' ? undefined : value as Task['status'];
    setFilter({ ...filter, status });
  };

  const handlePriorityChange = (value: string) => {
    const priority = value === 'all' ? undefined : value as Task['priority'];
    setFilter({ ...filter, priority });
  };

  const handleTimeRangeChange = (value: string) => {
    const timeRange = value === 'all' ? undefined : value as 'week' | 'month' | 'quarter' | 'year';
    setFilter({ ...filter, timeRange });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter({ ...filter, search: searchInput.trim() || undefined });
  };

  const clearFilters = () => {
    setFilter({});
    setSearchInput('');
  };

  const handleRefresh = async () => {
    setLoading(true);
    // 模拟数据同步
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const getStatusCount = (status?: Task['status']) => {
    if (!isHydrated) return 0;
    if (!status) return tasks.length;
    
    if (status === 'revision') {
      // 返工状态包含当前是返工状态或曾经返工过但未完成的任务
      return tasks.filter(task => task.status === 'revision' || (task.hasBeenRevised && task.status !== 'completed')).length;
    } else if (status === 'completed') {
      // 已完成状态包含所有已完成的任务（无论是否曾经返工）
      return tasks.filter(task => task.status === 'completed').length;
    } else {
      // 其他状态排除曾经返工过的任务
      return tasks.filter(task => task.status === status && !task.hasBeenRevised).length;
    }
  };

  const getPriorityCount = (priority?: Task['priority']) => {
    if (!isHydrated) return 0;
    if (!priority) return tasks.length;
    return tasks.filter(task => task.priority === priority).length;
  };

  const hasActiveFilters = filter.status || filter.priority || filter.timeRange || filter.search;

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <form onSubmit={handleSearchSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索袜子任务编号、颜色、尺码..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
      </form>

      {/* 筛选器 */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 状态筛选 */}
        <Select 
          value={filter.status || 'all'} 
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {getStatusCount(option.value === 'all' ? undefined : option.value as Task['status'])}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 优先级筛选 */}
        <Select 
          value={filter.priority || 'all'} 
          onValueChange={handlePriorityChange}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Flag className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {getPriorityCount(option.value === 'all' ? undefined : option.value as Task['priority'])}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 时间范围筛选 */}
        <Select 
          value={filter.timeRange || 'all'} 
          onValueChange={handleTimeRangeChange}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 刷新按钮 */}
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 活动筛选条件显示 */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">当前筛选:</span>
          
          {filter.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              状态: {statusOptions.find(opt => opt.value === filter.status)?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => setFilter({ ...filter, status: undefined })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filter.priority && (
            <Badge variant="secondary" className="flex items-center gap-1">
              优先级: {priorityOptions.find(opt => opt.value === filter.priority)?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => setFilter({ ...filter, priority: undefined })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filter.timeRange && (
            <Badge variant="secondary" className="flex items-center gap-1">
              时间: {timeRangeOptions.find(opt => opt.value === filter.timeRange)?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => setFilter({ ...filter, timeRange: undefined })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filter.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              搜索: {filter.search}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => {
                  setFilter({ ...filter, search: undefined });
                  setSearchInput('');
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            清除全部
          </Button>
        </div>
      )}
    </div>
  );
} 