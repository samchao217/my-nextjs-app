'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Cloud, Database, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface SupabaseStorageInfo {
  used: number;
  total: number;
  usagePercent: number;
  isConnected: boolean;
  error?: string;
}

export function SupabaseStorageIndicator() {
  const [storageInfo, setStorageInfo] = useState<SupabaseStorageInfo>({
    used: 0,
    total: 500 * 1024 * 1024, // Supabase免费版500MB
    usagePercent: 0,
    isConnected: false
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkSupabaseStorage = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        setStorageInfo(prev => ({
          ...prev,
          isConnected: false,
          error: '未配置Supabase连接'
        }));
        return;
      }

      // 检查是否可以连接到数据库
      const { data, error } = await supabase
        .from('tasks')
        .select('data', { count: 'exact' })
        .limit(1);

      if (error && !error.message.includes('does not exist')) {
        throw error;
      }

      // 估算数据使用量（通过任务数据大小）
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('data');

      let estimatedUsage = 0;
      if (allTasks) {
        // 估算JSON数据大小
        const jsonString = JSON.stringify(allTasks);
        estimatedUsage = new Blob([jsonString]).size;
      }

      const total = 500 * 1024 * 1024; // 500MB
      const usagePercent = (estimatedUsage / total) * 100;

      setStorageInfo({
        used: estimatedUsage,
        total,
        usagePercent,
        isConnected: true
      });

    } catch (error) {
      console.error('检查Supabase存储失败:', error);
      setStorageInfo(prev => ({
        ...prev,
        isConnected: false,
        error: error instanceof Error ? error.message : '连接失败'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSupabaseStorage();
    
    // 定期更新存储信息
    const interval = setInterval(checkSupabaseStorage, 30000); // 30秒检查一次
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVariant = () => {
    if (!storageInfo.isConnected) return 'secondary';
    if (storageInfo.usagePercent > 85) return 'destructive';
    if (storageInfo.usagePercent > 70) return 'secondary';
    return 'outline';
  };

  const getColor = () => {
    if (!storageInfo.isConnected) return 'text-gray-500';
    if (storageInfo.usagePercent > 85) return 'text-red-600';
    if (storageInfo.usagePercent > 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!storageInfo.isConnected) {
    return (
      <Badge variant="secondary" className="text-xs text-gray-500">
        <Database className="h-3 w-3 mr-1" />
        Supabase未连接
      </Badge>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant={getVariant()} 
          className={`text-xs cursor-pointer hover:opacity-80 ${getColor()}`}
        >
          <Cloud className="h-3 w-3 mr-1" />
          云存储 {storageInfo.usagePercent.toFixed(1)}%
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Supabase存储使用情况
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={checkSupabaseStorage}
                disabled={isLoading}
                className="text-xs h-6 px-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  '刷新'
                )}
              </Button>
            </div>
            
            <Progress 
              value={storageInfo.usagePercent} 
              className="h-2"
            />
            
            <div className="text-sm text-muted-foreground">
              {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.total)} 已使用
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <div className="flex justify-between">
                <span>剩余空间:</span>
                <span className="font-mono text-green-600">
                  {formatBytes(storageInfo.total - storageInfo.used)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>数据库类型:</span>
                <span className="text-blue-600">PostgreSQL</span>
              </div>
            </div>
          </div>

          {storageInfo.usagePercent > 80 && (
            <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border">
              <p className="font-medium">⚠️ 存储空间接近限制</p>
              <p className="text-xs mt-1">
                建议清理旧数据或升级到Supabase付费版本
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Supabase免费版限制:</strong></p>
            <ul className="list-disc list-inside pl-2 space-y-0.5">
              <li>数据库存储: 500MB</li>
              <li>API请求: 50,000/月</li>
              <li>实时连接: 2个并发</li>
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 