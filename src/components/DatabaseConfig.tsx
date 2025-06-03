'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription 
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { 
  Database, 
  Cloud, 
  HardDrive, 
  Settings, 
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getSupabaseConfig, 
  setSupabaseConfig, 
  isSupabaseConfigured,
  getSupabaseClient,
  createTasksTable
} from '@/lib/supabaseClient';
import { useTaskStore } from '@/store/taskStore';

interface DatabaseConfigProps {
  onStorageTypeChange?: (useOnlineDb: boolean) => void;
}

export function DatabaseConfig({ onStorageTypeChange }: DatabaseConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [useOnlineDb, setUseOnlineDb] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const { 
    loadFromDatabase, 
    enableRealtimeSync, 
    disableRealtimeSync 
  } = useTaskStore();

  useEffect(() => {
    const config = getSupabaseConfig();
    setSupabaseUrl(config.url);
    setSupabaseKey(config.key);
    const isConfigured = isSupabaseConfigured();
    setUseOnlineDb(isConfigured);
    setIsConnected(isConfigured);
    
    // 如果已配置，自动启用实时同步
    if (isConfigured) {
      enableRealtimeSync();
    }
  }, [enableRealtimeSync]);

  const handleConnect = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      toast.error('请填写完整的Supabase配置信息');
      return;
    }

    setIsConnecting(true);
    
    try {
      // 临时设置配置进行测试
      setSupabaseConfig(supabaseUrl.trim(), supabaseKey.trim());
      
      // 测试连接
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('无法创建Supabase客户端');
      }
      
      // 尝试简单查询来测试连接
      console.log('🔍 测试Supabase连接...');
      const { data, error } = await supabase.from('tasks').select('count').limit(1);
      
      if (error) {
        // 如果是表不存在的错误，这也算连接成功
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log('📋 数据库连接成功，但需要创建tasks表');
          toast.success('Supabase连接成功！', {
            description: '请在数据库中创建tasks表（见控制台SQL命令）'
          });
          
          // 显示创建表的SQL命令
          console.error('📋 请在Supabase SQL编辑器中执行以下命令创建tasks表:');
          console.error(`
CREATE TABLE tasks (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
          `);
        } else {
          throw error;
        }
      } else {
        console.log('✅ Supabase连接和表检查成功');
        toast.success('Supabase连接成功！', {
          description: '实时同步已启用，数据将自动同步'
        });
      }
      
      setIsConnected(true);
      setUseOnlineDb(true);
      onStorageTypeChange?.(true);
      
      // 加载云端数据
      await loadFromDatabase();
      
      // 启用实时同步
      enableRealtimeSync();
      
      setIsOpen(false);
    } catch (error: any) {
      console.error('❌ Supabase连接失败:', error);
      
      let errorMessage = '连接失败，请检查配置信息';
      if (error.message?.includes('Invalid API key')) {
        errorMessage = 'API密钥无效，请检查anon key是否正确';
      } else if (error.message?.includes('Invalid URL')) {
        errorMessage = 'URL格式无效，请检查项目URL是否正确';
      } else if (error.message) {
        errorMessage = `连接失败: ${error.message}`;
      }
      
      toast.error(errorMessage);
      setIsConnected(false);
      setUseOnlineDb(false);
      
      // 回退配置
      setSupabaseConfig('', '');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    // 禁用实时同步
    disableRealtimeSync();
    
    setSupabaseConfig('', '');
    setSupabaseUrl('');
    setSupabaseKey('');
    setIsConnected(false);
    setUseOnlineDb(false);
    onStorageTypeChange?.(false);
    
    toast.success('已切换到本地存储模式');
  };

  const handleStorageToggle = (checked: boolean) => {
    if (checked && !isConnected) {
      setIsOpen(true);
    } else if (!checked) {
      setUseOnlineDb(false);
      onStorageTypeChange?.(false);
    } else {
      setUseOnlineDb(checked);
      onStorageTypeChange?.(checked);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-blue-700 flex items-center gap-2">
          <Database className="h-5 w-5" />
          数据存储设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm">本地存储</span>
            </div>
            <Switch
              checked={useOnlineDb}
              onCheckedChange={handleStorageToggle}
            />
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              <span className="text-sm">在线数据库</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                已连接·实时同步
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-600">
                <HardDrive className="h-3 w-3 mr-1" />
                本地模式
              </Badge>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {useOnlineDb ? (
            <div className="flex items-start gap-2">
              <Cloud className="h-4 w-4 mt-0.5 text-blue-500" />
              <div>
                <p className="font-medium text-blue-700">在线数据库模式·实时同步</p>
                <p>数据保存在Supabase云数据库，多设备实时同步更新</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <HardDrive className="h-4 w-4 mt-0.5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-700">本地存储模式</p>
                <p>数据保存在浏览器本地，仅限当前设备使用</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                配置在线数据库
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Supabase 数据库配置
                </DialogTitle>
                <DialogDescription>
                  配置Supabase连接以实现跨设备数据同步
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700 mb-2 font-medium">📝 使用说明：</p>
                  <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                    <li>访问 <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">supabase.com <ExternalLink className="h-3 w-3" /></a> 创建免费账户</li>
                    <li>创建新项目，获取项目URL和API Key</li>
                    <li>在下方填写配置信息</li>
                  </ol>
                </div>

                <div>
                  <Label htmlFor="supabase-url">项目 URL</Label>
                  <Input
                    id="supabase-url"
                    placeholder="https://你的项目.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="supabase-key">API Key (public)</Label>
                  <Input
                    id="supabase-key"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting || !supabaseUrl.trim() || !supabaseKey.trim()}
                    className="flex-1"
                  >
                    {isConnecting ? '连接中...' : '连接并测试'}
                  </Button>
                  
                  {isConnected && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          断开连接
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认断开连接？</AlertDialogTitle>
                          <AlertDialogDescription>
                            断开后将切换回本地存储模式，在线数据不会丢失。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDisconnect}>
                            确认断开
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {isConnected && (
            <Button
              variant="outline" 
              size="sm"
              onClick={async () => {
                try {
                  await loadFromDatabase();
                  toast.success('数据已从云端重新加载');
                } catch (error) {
                  toast.error('数据加载失败，请检查网络连接');
                }
              }}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              重新加载
            </Button>
          )}

          {!useOnlineDb && (
            <div className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              本地数据不支持跨设备同步
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 