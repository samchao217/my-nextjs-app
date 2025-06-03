'use client';

import { useEffect, useState } from 'react';
import { TaskList } from './TaskList';
import { TaskFilters } from './TaskFilters';
import { CreateTaskDialog } from './CreateTaskDialog';
import { WarningSettings } from './WarningSettings';
import { DatabaseConfig } from './DatabaseConfig';
import { DataDebugger } from './DataDebugger';
import { ExportButton } from './ExportButton';
import { useTaskStore } from '@/store/taskStore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Database,
  Plus,
  ChevronDown,
  ChevronRight,
  Settings,
  Server
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { getSupabaseConfig } from '@/lib/supabaseClient';
import { useDataRestore } from '@/hooks/useDataRestore';
// import { StorageIndicator } from './StorageIndicator';
import { NASConfig } from './NASConfig';

export function TaskBoard() {
  const { 
    filteredTasks, 
    isLoading, 
    lastSync, 
    getUpcomingDeadlineTasks, 
    resetToInitialData,
    loadFromDatabase,
    enableRealtimeSync,
    addTask
  } = useTaskStore();
  
  // 使用数据恢复hook
  const { hasRestored, isHydrated } = useDataRestore();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const tasks = isHydrated ? filteredTasks() : [];
  const upcomingTasks = isHydrated ? getUpcomingDeadlineTasks() : [];
  
  // 统计数据 - 只在水合完成后计算
  const stats = isHydrated ? {
    total: tasks.length,
    preparing: tasks.filter(t => t.status === 'preparing' && !t.hasBeenRevised).length,
    connecting: tasks.filter(t => t.status === 'connecting' && !t.hasBeenRevised).length,
    materialPrep: tasks.filter(t => t.status === 'material_prep' && !t.hasBeenRevised).length,
    sampling: tasks.filter(t => t.status === 'sampling' && !t.hasBeenRevised).length,
    postProcessing: tasks.filter(t => t.status === 'post_processing' && !t.hasBeenRevised).length,
    completed: tasks.filter(t => t.status === 'completed').length,
    revision: tasks.filter(t => t.status === 'revision' || (t.hasBeenRevised && t.status !== 'completed')).length,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
    high: tasks.filter(t => t.priority === 'high').length,
    normal: tasks.filter(t => t.priority === 'normal').length,
    low: tasks.filter(t => t.priority === 'low').length,
    overdue: tasks.filter(t => 
      new Date(t.deadline) < new Date() && t.status !== 'completed'
    ).length,
    upcoming: upcomingTasks.length
  } : {
    total: 0,
    preparing: 0,
    connecting: 0,
    materialPrep: 0,
    sampling: 0,
    postProcessing: 0,
    completed: 0,
    revision: 0,
    urgent: 0,
    high: 0,
    normal: 0,
    low: 0,
    overdue: 0,
    upcoming: 0
  };

  // 如果还没有水合完成，显示加载状态
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">正在同步数据，请稍候...</p>
          <p className="text-xs text-muted-foreground">初次加载可能需要几秒钟</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">苏琪针织-打样管理系统</h1>
            {isHydrated && (
              <>
                <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                  <Database className="h-3 w-3 mr-1" />
                  数据已同步
                </Badge>
                {/* <StorageIndicator /> */}
              </>
            )}
          </div>
          <p className="text-muted-foreground">
            管理和跟踪所有袜子打样制作任务的进度
            {isHydrated && lastSync && (
              <span className="ml-2 text-sm">
                • 最后同步: {format(new Date(lastSync), 'MM-dd HH:mm', { locale: zhCN })}
              </span>
            )}
          </p>
        </div>
        
        {/* 快速统计 */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <ClipboardList className="h-3 w-3" />
            总计 {stats.total}
          </Badge>
          <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            准备中 {stats.preparing}
          </Badge>
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            对接中 {stats.connecting}
          </Badge>
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            备料中 {stats.materialPrep}
          </Badge>
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            打样中 {stats.sampling}
          </Badge>
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            后道处理 {stats.postProcessing}
          </Badge>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            已完成 {stats.completed}
          </Badge>
        </div>
      </div>

      {/* 数据同步状态提示 */}
      {hasRestored && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">数据同步完成</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            所有任务数据已成功加载，包括图片和配置信息
          </p>
        </div>
      )}

      {/* 预警设置 */}
      <WarningSettings />

      {/* 重要指标统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              紧急任务
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">{stats.urgent}</div>
            <p className="text-sm text-red-600 mt-1">需要优先处理</p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-orange-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              返工
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600">{stats.revision}</div>
            <p className="text-sm text-orange-600 mt-1">不确认重新打</p>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-yellow-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              即将超期
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-yellow-600">{stats.upcoming}</div>
            <p className="text-sm text-yellow-600 mt-1">需要关注</p>
          </CardContent>
        </Card>
        
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-red-700 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              已超期
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-sm text-red-600 mt-1">超过截止时间</p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选器和创建任务 */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex-1">
          <TaskFilters />
        </div>
        <div className="flex items-center gap-2">          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // 创建一个测试任务用于验证图片功能
              const testTaskId = `IMG-TEST-${Date.now()}`;
              const testTask = {
                id: testTaskId,
                images: [],
                specs: {
                  size: '图片测试',
                  color: '测试专用',
                  other: '⚠️ 这是图片功能测试任务，请为此任务上传多张图片来验证功能'
                },
                status: 'preparing' as const,
                priority: 'normal' as const,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                notes: ['🧪 图片功能测试：', '1. 上传多张图片', '2. 刷新页面检查是否保存', '3. 在其他设备查看是否同步'],
                processNotes: [],
                hasBeenRevised: false,
              };
              
              addTask(testTask);
              toast.success('图片测试任务已创建！', {
                description: '请为此任务上传多张图片来测试功能'
              });
            }}
            className="text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            测试图片功能
          </Button>
          
          <DataDebugger />
          <ExportButton tasks={tasks} variant="batch" />
          <CreateTaskDialog />
        </div>
      </div>

      {/* 任务列表 */}
      <TaskList tasks={tasks} isLoading={isLoading} />

      {/* 高级设置 - 放在最底部 */}
      <Card className="border-gray-200">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        >
          <CardTitle className="text-base font-medium text-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              高级设置
            </div>
            {isAdvancedOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CardTitle>
        </CardHeader>
        {isAdvancedOpen && (
          <CardContent className="pt-0">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                以下设置用于配置数据存储和云端同步功能
              </p>
              
              {/* 数据库配置 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Database className="h-4 w-4 text-gray-600" />
                  <h4 className="font-medium text-gray-900">数据库同步</h4>
                  <span className="text-xs text-gray-500">Supabase云数据库</span>
                </div>
                <DatabaseConfig />
              </div>

              {/* 云存储配置 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Server className="h-4 w-4 text-gray-600" />
                  <h4 className="font-medium text-gray-900">云存储服务</h4>
                  <span className="text-xs text-gray-500">支持NAS、阿里云OSS</span>
                </div>
                <NASConfig />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
} 