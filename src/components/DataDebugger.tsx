'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Bug, 
  Database, 
  HardDrive, 
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { 
  getSupabaseConfig, 
  isSupabaseConfigured,
  loadTasksFromSupabase,
  saveTasksToSupabase
} from '@/lib/supabaseClient';

export function DataDebugger() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  
  const { tasks } = useTaskStore();

  const runDiagnostics = async () => {
    setIsChecking(true);
    const info: any = {
      timestamp: new Date().toLocaleString(),
      localTasks: tasks.length,
      supabaseConfigured: isSupabaseConfigured(),
      supabaseConfig: getSupabaseConfig(),
      localStorageSize: 0,
      cloudTasks: 0,
      errors: []
    };

    try {
      // 检查localStorage大小
      const taskStore = localStorage.getItem('task-store');
      info.localStorageSize = taskStore ? taskStore.length : 0;
      info.hasLocalData = !!taskStore;

      // 检查云端数据
      if (info.supabaseConfigured) {
        try {
          const cloudTasks = await loadTasksFromSupabase();
          info.cloudTasks = cloudTasks ? cloudTasks.length : 0;
          info.cloudDataExists = !!cloudTasks;
        } catch (error) {
          info.errors.push(`云端数据加载失败: ${error}`);
        }
      }

      // 检查数据一致性
      if (info.supabaseConfigured && info.localTasks !== info.cloudTasks) {
        info.errors.push(`数据不一致：本地${info.localTasks}个任务，云端${info.cloudTasks}个任务`);
      }

    } catch (error) {
      info.errors.push(`诊断过程出错: ${error}`);
    }

    setDebugInfo(info);
    setIsChecking(false);
  };

  const syncToCloud = async () => {
    if (isSupabaseConfigured()) {
      const success = await saveTasksToSupabase(tasks);
      if (success) {
        await runDiagnostics();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1">
          <Bug className="h-3 w-3" />
          数据诊断
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            数据存储诊断
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runDiagnostics} disabled={isChecking} className="flex-1">
              {isChecking ? '检查中...' : '开始诊断'}
            </Button>
            {isSupabaseConfigured() && (
              <Button variant="outline" onClick={syncToCloud}>
                强制同步
              </Button>
            )}
          </div>

          {debugInfo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">诊断结果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>存储模式:</span>
                  <Badge variant={debugInfo.supabaseConfigured ? "default" : "outline"}>
                    {debugInfo.supabaseConfigured ? "在线数据库" : "本地存储"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>本地任务数:</span>
                  <span className="font-mono">{debugInfo.localTasks}</span>
                </div>
                
                {debugInfo.supabaseConfigured && (
                  <div className="flex items-center justify-between">
                    <span>云端任务数:</span>
                    <span className="font-mono">{debugInfo.cloudTasks}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span>本地存储大小:</span>
                  <span className="font-mono">{debugInfo.localStorageSize} 字符</span>
                </div>

                {debugInfo.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">发现问题:</span>
                    </div>
                    {debugInfo.errors.map((error: string, index: number) => (
                      <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                )}

                {debugInfo.errors.length === 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">数据存储正常</span>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 pt-2 border-t">
                  检查时间: {debugInfo.timestamp}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700 mb-2 font-medium flex items-center gap-1">
              <Info className="h-4 w-4" />
              数据丢失问题排查：
            </p>
            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
              <li>如果使用本地模式，数据可能因浏览器清理而丢失</li>
              <li>如果使用在线模式，检查网络连接和Supabase配置</li>
              <li>如果本地和云端数据不一致，点击"强制同步"</li>
              <li>如果问题持续，请切换到在线数据库模式</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 