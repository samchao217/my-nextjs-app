'use client';

import { useState, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, Bell, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function WarningSettings() {
  const { warningDays, setWarningDays, getUpcomingDeadlineTasks } = useTaskStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // 等待客户端水合完成
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const upcomingTasks = isHydrated ? getUpcomingDeadlineTasks() : [];
  
  const handleWarningDaysChange = (value: string) => {
    const days = parseInt(value);
    setWarningDays(days);
    toast.success(`预警设置已更新为 ${days} 天`);
  };

  return (
    <div className="space-y-4">
      {/* 预警设置按钮 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          预警设置
        </Button>
        
        {upcomingTasks.length > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Bell className="h-3 w-3" />
            {upcomingTasks.length} 个任务即将超期
          </Badge>
        )}
      </div>

      {/* 设置面板 */}
      {isOpen && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-orange-700 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              超期预警设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-orange-700">
                提前预警天数：
              </label>
              <Select value={warningDays.toString()} onValueChange={handleWarningDaysChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 天</SelectItem>
                  <SelectItem value="2">2 天</SelectItem>
                  <SelectItem value="3">3 天</SelectItem>
                  <SelectItem value="4">4 天</SelectItem>
                  <SelectItem value="5">5 天</SelectItem>
                  <SelectItem value="7">7 天</SelectItem>
                  <SelectItem value="10">10 天</SelectItem>
                  <SelectItem value="15">15 天</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <p className="text-sm text-orange-600">
              系统将在任务截止时间前 {warningDays} 天开始显示预警提示
            </p>
          </CardContent>
        </Card>
      )}

      {/* 即将超期任务列表 */}
      {upcomingTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-red-700 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              即将超期任务 ({upcomingTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingTasks.map((task) => {
                const deadline = new Date(task.deadline);
                const now = new Date();
                const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                    <div>
                      <div className="font-medium text-red-800">任务 #{task.id}</div>
                      <div className="text-sm text-red-600">
                        {task.specs.color} - {task.specs.size}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={daysLeft <= 1 ? "destructive" : "secondary"}>
                        {daysLeft <= 0 ? '今天截止' : `${daysLeft} 天后截止`}
                      </Badge>
                      <div className="text-xs text-red-600 mt-1">
                        {deadline.toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 