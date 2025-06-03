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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Database,
  Plus
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

      {/* 数据存储设置 */}
      <DatabaseConfig />

      {/* NAS配置 */}
      <NASConfig />

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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs gap-1"
              >
                <Database className="h-3 w-3" />
                数据管理
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  数据管理
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>您可以重置所有数据到初始状态。</p>
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    <p className="font-medium mb-1">当前数据状态：</p>
                    <p>• 任务总数：{stats.total}</p>
                    <p>• 最后更新：{isHydrated && lastSync ? format(new Date(lastSync), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) : '暂无'}</p>
                  </div>
                  <p className="text-amber-600 font-medium">⚠️ 注意：重置操作将清除所有当前数据，包括您添加或修改的任务！</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    resetToInitialData();
                    toast.success('数据已重置为初始状态', {
                      description: '系统已恢复到默认的示例数据'
                    });
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  确认重置
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
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
    </div>
  );
} 