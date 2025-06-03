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
import { HardDrive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface StorageInfo {
  usedSpace: number;
  totalSpace: number;
  usagePercent: number;
  taskStoreSize: number;
}

export function StorageIndicator() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    usedSpace: 0,
    totalSpace: 5 * 1024 * 1024, // 5MB估算
    usagePercent: 0,
    taskStoreSize: 0
  });

  const checkStorageSpace = () => {
    try {
      let usedSpace = 0;
      let taskStoreSize = 0;
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const itemSize = localStorage[key].length;
          usedSpace += itemSize;
          
          if (key === 'task-store') {
            taskStoreSize = itemSize;
          }
        }
      }
      
      const totalSpace = 5 * 1024 * 1024; // 5MB估算
      const usagePercent = (usedSpace / totalSpace) * 100;
      
      setStorageInfo({
        usedSpace,
        totalSpace,
        usagePercent,
        taskStoreSize
      });
    } catch (error) {
      console.error('检查存储空间失败:', error);
    }
  };

  useEffect(() => {
    checkStorageSpace();
    
    // 定期更新存储信息
    const interval = setInterval(checkStorageSpace, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearOtherData = () => {
    try {
      const keysToKeep = ['task-store'];
      const keysToRemove: string[] = [];
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      checkStorageSpace();
      toast.success(`清理了 ${keysToRemove.length} 项其他数据`);
    } catch (error) {
      console.error('清理数据失败:', error);
      toast.error('清理数据失败');
    }
  };

  const getVariant = () => {
    if (storageInfo.usagePercent > 85) return 'destructive';
    if (storageInfo.usagePercent > 70) return 'secondary';
    return 'outline';
  };

  const getColor = () => {
    if (storageInfo.usagePercent > 85) return 'text-red-600';
    if (storageInfo.usagePercent > 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant={getVariant()} 
          className={`text-xs cursor-pointer hover:opacity-80 ${getColor()}`}
        >
          <HardDrive className="h-3 w-3 mr-1" />
          存储 {storageInfo.usagePercent.toFixed(1)}%
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">本地存储使用情况</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={checkStorageSpace}
                className="text-xs h-6 px-2"
              >
                刷新
              </Button>
            </div>
            
            <Progress 
              value={storageInfo.usagePercent} 
              className="h-2"
            />
            
            <div className="text-sm text-muted-foreground">
              {formatBytes(storageInfo.usedSpace)} / {formatBytes(storageInfo.totalSpace)} 已使用
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <div className="flex justify-between">
                <span>任务数据:</span>
                <span className="font-mono">{formatBytes(storageInfo.taskStoreSize)}</span>
              </div>
              <div className="flex justify-between">
                <span>其他数据:</span>
                <span className="font-mono">{formatBytes(storageInfo.usedSpace - storageInfo.taskStoreSize)}</span>
              </div>
            </div>
          </div>

          {storageInfo.usagePercent > 70 && (
            <div className="space-y-2">
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                存储空间使用率较高，建议清理数据
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    disabled={storageInfo.usedSpace - storageInfo.taskStoreSize === 0}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    清理其他应用数据
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>清理本地存储</AlertDialogTitle>
                    <AlertDialogDescription>
                      这将清理除任务数据外的所有本地存储数据，包括其他网站的设置和缓存。
                      <br /><br />
                      <strong>注意：此操作不可逆！</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={clearOtherData}>
                      确认清理
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            💡 建议：上传图片时选择小尺寸图片，系统会自动压缩
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 