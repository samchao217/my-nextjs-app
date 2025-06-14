'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bug, Copy, RefreshCw, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useTaskStore } from '@/store/taskStore';
import { 
  isSupabaseConfigured, 
  getSupabaseConfig,
  loadTasksFromSupabase,
  saveTasksToSupabase
} from '@/lib/supabaseClient';

export function DataDebugger() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string>('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPasswordConfig, setShowPasswordConfig] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const { tasks, lastSync, deleteTask } = useTaskStore();
  
  const supabaseConfig = getSupabaseConfig();
  const isConfigured = isSupabaseConfigured();

  // 管理密码 - 从localStorage获取，如果没有则使用默认值
  const getAdminPassword = () => {
    if (!isClient) return '123567890';
    return localStorage.getItem('admin_password') || '123567890';
  };

  const setAdminPassword = (password: string) => {
    if (isClient) {
      localStorage.setItem('admin_password', password);
    }
  };

  const ADMIN_PASSWORD = getAdminPassword();

  // 确保只在客户端运行
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCopyDebugInfo = () => {
    const debugInfo = {
      tasks: tasks.length,
      lastSync,
      isConfigured,
      supabaseConfig: isConfigured ? {
        url: supabaseConfig.url,
        hasKey: !!supabaseConfig.key
      } : null,
      localStorageInfo: getLocalStorageInfo(),
      timestamp: new Date().toISOString()
    };
    
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    toast.success('调试信息已复制到剪贴板');
  };

  const handleDeleteTask = (taskId: string) => {
    setDeleteTaskId(taskId);
    setDeletePassword('');
    setShowDeleteDialog(true);
  };

  const confirmDeleteTask = async () => {
    if (deletePassword !== getAdminPassword()) {
      toast.error('密码错误，无法删除任务');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTask(deleteTaskId);
      toast.success(`任务 ${deleteTaskId} 已删除`);
      setShowDeleteDialog(false);
      setDeleteTaskId('');
      setDeletePassword('');
    } catch (error) {
      console.error('删除任务失败:', error);
      toast.error('删除任务失败');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetAdminPassword = () => {
    if (newAdminPassword !== confirmNewPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    if (newAdminPassword.length < 4) {
      toast.error('密码长度至少4位');
      return;
    }

    setAdminPassword(newAdminPassword);
    setShowPasswordConfig(false);
    setNewAdminPassword('');
    setConfirmNewPassword('');
    toast.success('管理密码已更新');
  };

  // 获取localStorage信息（仅在客户端）
  const getLocalStorageInfo = () => {
    if (!isClient) {
      return {
        taskStoreSize: 0,
        hasSupabaseUrl: false,
        hasSupabaseKey: false
      };
    }
    
    return {
      taskStoreSize: localStorage.getItem('task-store')?.length || 0,
      hasSupabaseUrl: !!localStorage.getItem('supabase_url'),
      hasSupabaseKey: !!localStorage.getItem('supabase_key')
    };
  };

  const localStorageInfo = getLocalStorageInfo();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs gap-1">
            <Bug className="h-3 w-3" />
            数据诊断
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              数据诊断 & 调试
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">📊 基本信息</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>任务总数: <Badge variant="secondary">{tasks.length}</Badge></div>
                  <div>最后同步: <Badge variant="outline">{lastSync ? new Date(lastSync).toLocaleString() : '无'}</Badge></div>
                  <div>Supabase: <Badge className={isConfigured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{isConfigured ? '已配置' : '未配置'}</Badge></div>
                  <div>存储模式: <Badge variant="secondary">{isConfigured ? '在线数据库' : '本地存储'}</Badge></div>
                </div>
              </div>

              {/* 任务详情 */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">📋 任务详情</h3>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无任务数据</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task, index) => (
                      <div key={task.id} className="text-xs bg-background p-2 rounded border">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.id}</span>
                            <Badge variant="outline" className="text-xs">
                              {task.images.length} 张图片
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="删除任务"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-muted-foreground">
                          <div>状态: {task.status} | 优先级: {task.priority}</div>
                          <div>创建: {new Date(task.createdAt).toLocaleString()}</div>
                          <div>更新: {new Date(task.updatedAt).toLocaleString()}</div>
                          {task.images.length > 0 && (
                            <div className="mt-1">
                              图片信息: {task.images.map((img, i) => 
                                `图片${i+1}(${img.url.substring(0, 20)}...)`
                              ).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Supabase 配置信息 */}
              {isConfigured && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">🔗 Supabase 配置</h3>
                  <div className="text-sm space-y-1">
                    <div>URL: <code className="text-xs bg-background px-1 rounded">{supabaseConfig.url}</code></div>
                    <div>API Key: <code className="text-xs bg-background px-1 rounded">{supabaseConfig.key ? supabaseConfig.key.substring(0, 20) + '...' : 'Not set'}</code></div>
                  </div>
                </div>
              )}

              {/* 本地存储信息 */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">💾 本地存储</h3>
                <div className="text-xs space-y-1">
                  <div>localStorage大小: {localStorageInfo.taskStoreSize} 字符</div>
                  <div>Supabase URL: {localStorageInfo.hasSupabaseUrl ? '已保存' : '未保存'}</div>
                  <div>Supabase Key: {localStorageInfo.hasSupabaseKey ? '已保存' : '未保存'}</div>
                  
                  {/* 存储空间警告 */}
                  {localStorageInfo.taskStoreSize > 4 * 1024 * 1024 && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-700">
                      <p className="font-medium">⚠️ 存储空间即将用尽</p>
                      <p className="text-xs mt-1">建议删除一些图片或开启在线数据库存储</p>
                    </div>
                  )}
                  
                  {/* 图片统计 */}
                  <div className="mt-2 text-xs">
                    <div>总图片数: {tasks.reduce((sum, task) => sum + task.images.length, 0)}</div>
                    <div>平均每张图片: {tasks.reduce((sum, task) => sum + task.images.length, 0) > 0 
                      ? Math.round(localStorageInfo.taskStoreSize / tasks.reduce((sum, task) => sum + task.images.length, 0) / 1024) 
                      : 0} KB</div>
                  </div>
                </div>
              </div>

              {/* 存储空间管理 */}
              {localStorageInfo.taskStoreSize > 2 * 1024 * 1024 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold mb-2 text-red-800">🗂️ 存储空间管理</h3>
                  <p className="text-sm text-red-700 mb-3">
                    本地存储空间使用较多，建议清理或使用在线数据库
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // 找出包含大量图片的任务
                        const tasksWithManyImages = tasks
                          .filter(task => task.images.length > 3)
                          .sort((a, b) => b.images.length - a.images.length);
                        
                        if (tasksWithManyImages.length > 0) {
                          const taskList = tasksWithManyImages
                            .slice(0, 3)
                            .map(task => `${task.id} (${task.images.length}张图片)`)
                            .join('\n');
                          alert(`建议清理这些任务的图片:\n${taskList}`);
                        } else {
                          alert('未找到包含大量图片的任务');
                        }
                      }}
                      className="text-xs"
                    >
                      找出大图片任务
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const confirmed = confirm('确定要清除所有本地数据吗？这将删除所有任务和图片！');
                        if (confirmed && isClient) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                      className="text-xs text-red-600 border-red-300"
                    >
                      清空本地存储
                    </Button>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDebugInfo}
                  className="flex-1"
                  disabled={!isClient}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  复制调试信息
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const { recoverData } = useTaskStore.getState();
                    recoverData();
                  }}
                  disabled={isLoading || !isClient}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {isLoading ? '恢复中...' : '数据恢复'}
                </Button>
              </div>

              {/* 管理设置 */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold mb-2 text-blue-800">🔐 管理设置</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordConfig(true)}
                    className="text-xs"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    设置管理密码
                  </Button>
                  <div className="text-xs text-blue-600 flex items-center">
                    当前密码: {getAdminPassword() === '123567890' ? '默认密码' : '已自定义'}
                  </div>
                </div>
              </div>

              {/* 故障排除建议 */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-semibold mb-2 text-amber-800">🔧 故障排除建议</h3>
                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                  <li>如果图片只能保存一张，请检查浏览器控制台是否有错误</li>
                  <li>如果设备间不同步，请确保所有设备都配置了相同的Supabase信息</li>
                  <li>尝试刷新页面或清除浏览器缓存</li>
                  <li>检查网络连接是否正常</li>
                  <li>确保Supabase项目中的tasks表已正确创建</li>
                </ul>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-500" />
              删除任务确认
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                您即将删除任务 <strong>{deleteTaskId}</strong>，此操作不可撤销。
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delete-password">管理密码</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="请输入管理密码"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmDeleteTask();
                  }
                }}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteTaskId('');
                  setDeletePassword('');
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteTask}
                disabled={isDeleting || !deletePassword}
                className="flex-1"
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 密码配置对话框 */}
      <Dialog open={showPasswordConfig} onOpenChange={setShowPasswordConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-500" />
              设置管理密码
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                管理密码用于删除任务等敏感操作，请设置一个安全的密码。
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="请输入新密码（至少4位）"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认密码</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="请再次输入新密码"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSetAdminPassword();
                  }
                }}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordConfig(false);
                  setNewAdminPassword('');
                  setConfirmNewPassword('');
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleSetAdminPassword}
                disabled={!newAdminPassword || !confirmNewPassword}
                className="flex-1"
              >
                保存密码
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 