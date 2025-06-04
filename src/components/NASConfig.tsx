'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Server, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Settings, 
  HardDrive,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export interface NASConfig {
  enabled: boolean;
  type: 'webdav' | 'http' | 'ftp' | 'aliyun-oss';
  server: string;
  username: string;
  password: string;
  path: string;
  uploadEndpoint?: string;
  testImageUrl?: string;
  // 阿里云OSS专用配置
  accessKeyId?: string;
  accessKeySecret?: string;
  region?: string;
  bucket?: string;
  // 新增：连接状态跟踪
  connectionStatus?: 'untested' | 'success' | 'error';
}

interface NASConfigProps {
  onConfigChange?: (config: NASConfig) => void;
}

export function NASConfig({ onConfigChange }: NASConfigProps) {
  const [config, setConfig] = useState<NASConfig>({
    enabled: false,
    type: 'webdav',
    server: '',
    username: '',
    password: '',
    path: '/images',
    uploadEndpoint: '',
    testImageUrl: '',
    accessKeyId: '',
    accessKeySecret: '',
    region: '',
    bucket: '',
    connectionStatus: 'untested'
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // 从localStorage加载配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('nas-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        onConfigChange?.(parsed);
      } catch (error) {
        console.error('加载NAS配置失败:', error);
      }
    }
  }, [onConfigChange]);

  // 检测配置是否发生了影响连接的关键变化
  const hasConnectionRelatedChanges = (oldConfig: NASConfig, newConfig: NASConfig): boolean => {
    if (oldConfig.type !== newConfig.type) return true;
    if (oldConfig.enabled !== newConfig.enabled) return true;
    
    if (newConfig.type === 'aliyun-oss') {
      return (
        oldConfig.accessKeyId !== newConfig.accessKeyId ||
        oldConfig.accessKeySecret !== newConfig.accessKeySecret ||
        oldConfig.region !== newConfig.region ||
        oldConfig.bucket !== newConfig.bucket ||
        oldConfig.path !== newConfig.path
      );
    } else {
      return (
        oldConfig.server !== newConfig.server ||
        oldConfig.username !== newConfig.username ||
        oldConfig.password !== newConfig.password ||
        oldConfig.path !== newConfig.path ||
        oldConfig.uploadEndpoint !== newConfig.uploadEndpoint
      );
    }
  };

  // 保存配置到localStorage
  const saveConfig = (newConfig: NASConfig) => {
    // 检查是否有影响连接的关键配置变化
    const shouldResetStatus = hasConnectionRelatedChanges(config, newConfig);
    
    const configWithStatus = { ...newConfig };
    // 如果有关键变化，重置连接状态；否则保持现有状态
    if (shouldResetStatus || !configWithStatus.connectionStatus) {
      configWithStatus.connectionStatus = 'untested';
    }
    
    setConfig(configWithStatus);
    localStorage.setItem('nas-config', JSON.stringify(configWithStatus));
    onConfigChange?.(configWithStatus);
    toast.success('NAS配置已保存');
  };

  // 测试连接
  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // 创建一个小的测试图片
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TEST', 50, 55);
      }

      // 转换为Blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      const testFile = new File([blob], `test-${Date.now()}.png`, { type: 'image/png' });
      
      // 调用上传测试
      const result = await uploadToNAS(testFile, config);
      
      if (result.success) {
        setTestResult('success');
        const updatedConfig = { ...config, testImageUrl: result.url, connectionStatus: 'success' as const };
        setConfig(updatedConfig);
        localStorage.setItem('nas-config', JSON.stringify(updatedConfig));
        onConfigChange?.(updatedConfig);
        toast.success('NAS连接测试成功！');
      } else {
        setTestResult('error');
        const updatedConfig = { ...config, connectionStatus: 'error' as const };
        setConfig(updatedConfig);
        localStorage.setItem('nas-config', JSON.stringify(updatedConfig));
        onConfigChange?.(updatedConfig);
        toast.error(`连接测试失败: ${result.error}`);
      }
    } catch (error) {
      setTestResult('error');
      const updatedConfig = { ...config, connectionStatus: 'error' as const };
      setConfig(updatedConfig);
      localStorage.setItem('nas-config', JSON.stringify(updatedConfig));
      onConfigChange?.(updatedConfig);
      toast.error(`连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Server className="h-4 w-4" />
          云存储配置
          {config.enabled && (
            <Badge variant={config.connectionStatus === 'success' ? "default" : config.connectionStatus === 'error' ? "destructive" : "secondary"} className="text-xs">
              {config.connectionStatus === 'success' ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  连接成功
                </>
              ) : config.connectionStatus === 'error' ? (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  连接失败
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  未测试
                </>
              )}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            云存储配置 (支持NAS、阿里云OSS)
          </DialogTitle>
          <DialogDescription>
            配置云存储服务用于存储图片，支持NAS服务器和阿里云OSS，解决本地存储空间限制问题
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基础配置</TabsTrigger>
            <TabsTrigger value="advanced">高级配置</TabsTrigger>
            <TabsTrigger value="test">连接测试</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => 
                  setConfig(prev => ({ ...prev, enabled }))
                }
              />
              <Label>启用NAS存储</Label>
            </div>

            <div className="space-y-2">
              <Label>存储类型</Label>
              <Select
                value={config.type}
                onValueChange={(type: 'webdav' | 'http' | 'ftp' | 'aliyun-oss') =>
                  setConfig(prev => ({ ...prev, type }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aliyun-oss">阿里云OSS (推荐)</SelectItem>
                  <SelectItem value="webdav">WebDAV</SelectItem>
                  <SelectItem value="http">HTTP上传</SelectItem>
                  <SelectItem value="ftp">FTP over HTTP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.type !== 'aliyun-oss' && (
              <div className="space-y-2">
                <Label>服务器地址</Label>
                <Input
                  placeholder="例如: http://192.168.1.100:5000 或 https://your-nas.com"
                  value={config.server}
                  onChange={(e) => setConfig(prev => ({ ...prev, server: e.target.value }))}
                />
              </div>
            )}

            {config.type === 'aliyun-oss' ? (
              // 阿里云OSS专用配置
              <>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>阿里云OSS存储</strong> - 可靠的云端对象存储服务，支持海量数据存储，按需付费。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Access Key ID</Label>
                    <Input
                      placeholder="您的阿里云AccessKey ID"
                      value={config.accessKeyId || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, accessKeyId: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Key Secret</Label>
                    <Input
                      type="password"
                      placeholder="您的阿里云AccessKey Secret"
                      value={config.accessKeySecret || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, accessKeySecret: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>地域 (Region)</Label>
                    <Input
                      placeholder="例如: oss-cn-hangzhou"
                      value={config.region || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, region: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>存储桶 (Bucket)</Label>
                    <Input
                      placeholder="您的OSS存储桶名称"
                      value={config.bucket || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, bucket: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>存储路径</Label>
                  <Input
                    placeholder="images/ 或 upload/photos/"
                    value={config.path}
                    onChange={(e) => setConfig(prev => ({ ...prev, path: e.target.value }))}
                  />
                  <p className="text-sm text-muted-foreground">
                    文件在OSS中的存储路径前缀，以/结尾
                  </p>
                </div>
              </>
            ) : (
              // 传统NAS配置
              <>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-sm text-gray-700">
                    <strong>本地NAS存储</strong> - 连接您的私有网络存储设备，适合内网环境使用。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>用户名</Label>
                    <Input
                      placeholder="NAS用户名"
                      value={config.username}
                      onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>密码</Label>
                    <Input
                      type="password"
                      placeholder="NAS密码"
                      value={config.password}
                      onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>存储路径</Label>
                  <Input
                    placeholder="/images 或 /shared/upload"
                    value={config.path}
                    onChange={(e) => setConfig(prev => ({ ...prev, path: e.target.value }))}
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {config.type === 'http' && (
              <div className="space-y-2">
                <Label>自定义上传端点</Label>
                <Input
                  placeholder="例如: /api/upload 或完整URL"
                  value={config.uploadEndpoint}
                  onChange={(e) => setConfig(prev => ({ ...prev, uploadEndpoint: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  留空使用默认路径，或指定自定义的上传API端点
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>配置说明</Label>
              <Textarea
                readOnly
                value={getNASConfigGuide(config.type)}
                className="h-32 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>常见NAS配置示例</Label>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-muted rounded-md">
                  <strong>群晖 Synology:</strong><br />
                  类型: WebDAV<br />
                  地址: http://your-synology-ip:5000<br />
                  路径: /upload
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <strong>威联通 QNAP:</strong><br />
                  类型: WebDAV<br />
                  地址: http://your-qnap-ip:8080<br />
                  路径: /multimedia
                </div>
                {config.type === 'aliyun-oss' && (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <strong>阿里云OSS示例:</strong><br />
                    地域: oss-cn-hangzhou (华东1杭州)<br />
                    存储桶: my-image-bucket<br />
                    路径: images/<br />
                    <br />
                    <strong>常用地域代码:</strong><br />
                    • oss-cn-hangzhou (华东1杭州)<br />
                    • oss-cn-shanghai (华东2上海)<br />
                    • oss-cn-beijing (华北2北京)<br />
                    • oss-cn-shenzhen (华南1深圳)<br />
                    • oss-cn-hongkong (香港)
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <div className="text-center space-y-4">
              <Button
                onClick={testConnection}
                disabled={
                  config.type === 'aliyun-oss' 
                    ? (!config.accessKeyId || !config.accessKeySecret || !config.region || !config.bucket || isTesting)
                    : (!config.server || !config.username || isTesting)
                }
                className="gap-2"
              >
                <TestTube className="h-4 w-4" />
                {isTesting ? '测试中...' : '测试连接'}
              </Button>

              {testResult && (
                <div className={`flex items-center justify-center gap-2 p-4 rounded-md ${
                  testResult === 'success' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {testResult === 'success' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <span>
                    {testResult === 'success' ? '连接成功！' : '连接失败，请检查配置'}
                  </span>
                </div>
              )}

              {config.testImageUrl && testResult === 'success' && (
                <div className="space-y-2">
                  <Label>测试图片预览</Label>
                  <img 
                    src={config.testImageUrl} 
                    alt="测试图片" 
                    className="mx-auto max-w-32 max-h-32 rounded border"
                  />
                  <p className="text-sm text-muted-foreground">
                    测试图片已成功上传到NAS
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>故障排除</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                {config.type === 'aliyun-oss' ? (
                  <>
                    <p>• 确保AccessKey ID和Secret正确</p>
                    <p>• 检查存储桶名称和地域代码</p>
                    <p>• 确认RAM用户有OSS操作权限</p>
                    <p>• 检查存储桶的访问权限设置</p>
                    <p>• 确保网络连接正常，可访问阿里云</p>
                    <p>• 注意：此为简化实现，生产环境建议后端签名</p>
                  </>
                ) : (
                  <>
                    <p>• 确保NAS服务器地址可访问</p>
                    <p>• 检查用户名和密码是否正确</p>
                    <p>• 确认目标路径存在且有写入权限</p>
                    <p>• 检查防火墙和网络设置</p>
                    <p>• 某些NAS需要启用WebDAV或HTTP服务</p>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            取消
          </Button>
          <Button onClick={() => {
            saveConfig(config);
            setIsOpen(false);
          }}>
            保存配置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 获取NAS配置指南
function getNASConfigGuide(type: string): string {
  switch (type) {
    case 'aliyun-oss':
      return `阿里云OSS配置说明：
1. 登录阿里云控制台，开通OSS服务
2. 创建存储桶(Bucket)，设置合适的访问权限
3. 创建RAM用户，获取AccessKey ID和Secret
4. 为RAM用户分配OSS操作权限

配置步骤：
- 地域：选择离您最近的地域(如 oss-cn-hangzhou)
- 存储桶：创建专用于图片存储的bucket
- Access Key：使用RAM用户的key，避免使用主账号
- 路径：建议使用 images/ 等有意义的前缀

⚠️ 重要权限设置：
1. RAM用户权限（推荐方式）：
   - 添加权限：AliyunOSSFullAccess 或自定义权限
   - 必需权限：oss:PutObject, oss:GetObject, oss:PutObjectAcl

2. 存储桶权限：
   - 读写权限：私有（推荐）或公共读
   - 注意：不建议设置为公共读写

3. ⭐ CORS规则配置（解决XHR错误的关键）：
   必须在OSS控制台配置以下CORS规则：
   
   🔧 方法一：OSS控制台配置CORS
   - 登录阿里云OSS控制台
   - 选择对应的Bucket
   - 在左侧菜单选择"权限管理" > "跨域设置(CORS)"
   - 点击"设置"按钮，添加规则：
   
   来源(AllowedOrigin): *
   方法(AllowedMethod): GET, POST, PUT, DELETE, HEAD, OPTIONS
   允许Headers(AllowedHeader): *
   暴露Headers(ExposeHeader): ETag, x-oss-request-id
   缓存时间(MaxAgeSeconds): 3600
   
   🔧 方法二：通过阿里云CLI配置：
   下载ossutil工具，执行：
   ossutil cors --method put oss://your-bucket-name cors-rules.json

🔧 常见问题解决：
- XHR error: 99%是CORS配置问题，按上述方法配置跨域规则
- AccessDenied：检查RAM用户权限和bucket访问权限
- InvalidAccessKeyId：确认AccessKey ID正确
- SignatureDoesNotMatch：确认AccessKey Secret正确
- NoSuchBucket：检查bucket名称和地域代码
- 连接超时：检查网络连接和地域endpoint

🚨 特别注意：
如果仍然出现CORS错误，请确保：
1. CORS规则中的"来源"设置为 * 或包含您的域名
2. "方法"必须包含 PUT, OPTIONS
3. "允许Headers"设置为 *
4. 配置保存后等待1-2分钟生效`;

    case 'webdav':
      return `WebDAV配置说明：
1. 在NAS上启用WebDAV服务
2. 创建专用用户账号（推荐）
3. 设置目标文件夹权限
4. 服务器地址格式：http://ip:port 或 https://domain
5. 路径示例：/upload、/shared/images

常见端口：
- 群晖：5005(HTTP) / 5006(HTTPS)
- 威联通：8080 / 443
- 自建：通常80 / 443`;

    case 'http':
      return `HTTP上传配置说明：
1. 需要自定义上传API端点
2. 支持标准的multipart/form-data上传
3. 服务器需要返回图片访问URL
4. 建议配置CORS和认证

API要求：
- 方法：POST
- 格式：multipart/form-data
- 字段名：file
- 返回：JSON包含url字段`;

    case 'ftp':
      return `FTP配置说明：
1. 需要FTP服务器支持HTTP网关
2. 或使用FTP-to-HTTP转换服务
3. 配置被动模式和端口范围
4. 确保文件权限正确

注意事项：
- FTP over HTTP需要额外配置
- 建议使用SFTP增强安全性
- 检查防火墙端口设置`;

    default:
      return '';
  }
}

// NAS上传函数
export async function uploadToNAS(file: File, config: NASConfig): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  if (!config.enabled) {
    return { success: false, error: 'NAS配置未启用' };
  }

  // 阿里云OSS上传
  if (config.type === 'aliyun-oss') {
    if (!config.accessKeyId || !config.accessKeySecret || !config.region || !config.bucket) {
      return { success: false, error: '阿里云OSS配置信息不完整' };
    }

    // 检查是否在浏览器环境中
    if (typeof window === 'undefined') {
      return { success: false, error: 'OSS上传只能在浏览器环境中使用' };
    }

    try {
      // 动态导入OSS SDK
      const { default: OSS } = await import('ali-oss');
      
      // 创建OSS客户端
      const client = new OSS({
        region: config.region,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        bucket: config.bucket,
        secure: true,
        timeout: 60000, // 60秒超时
      });

      // 构建文件路径
      const fileName = `${config.path || 'images/'}${Date.now()}-${file.name}`;
      
      console.log('🔄 正在上传到阿里云OSS:', fileName);
      
      // 使用OSS SDK上传文件
      const result = await client.put(fileName, file, {
        mime: file.type,
        headers: {
          'x-oss-acl': 'public-read', // 设置文件为公共可读
        },
      });

      console.log('✅ OSS上传成功:', result);
      
      if (result.name && result.url) {
        return { success: true, url: result.url };
      } else {
        throw new Error('OSS上传返回结果异常');
      }

    } catch (error: any) {
      console.error('❌ 阿里云OSS上传失败:', error);
      
      // 详细的错误解析
      let errorMessage = '阿里云OSS上传失败';
      
      if (error.code) {
        switch (error.code) {
          case 'AccessDenied':
            errorMessage = '访问被拒绝。请检查：1) AccessKey权限 2) Bucket访问权限';
            break;
          case 'InvalidAccessKeyId':
            errorMessage = 'AccessKey ID无效，请检查AccessKey配置';
            break;
          case 'SignatureDoesNotMatch':
            errorMessage = 'AccessKey Secret错误，请检查配置';
            break;
          case 'NoSuchBucket':
            errorMessage = `存储桶 "${config.bucket}" 不存在，请检查bucket名称和地域`;
            break;
          case 'RequestTimeTooSkewed':
            errorMessage = '请求时间偏差过大，请检查系统时间';
            break;
          case 'Forbidden':
            errorMessage = '权限不足。请确保：1) RAM用户有OSS操作权限 2) Bucket允许该操作';
            break;
          case 'NoSuchKey':
            errorMessage = '对象不存在';
            break;
          default:
            errorMessage = `OSS错误 ${error.code}: ${error.message || '未知错误'}`;
        }
      } else if (error.message) {
        if (error.message.includes('Network Error') || error.message.includes('timeout')) {
          errorMessage = '网络连接超时，请检查网络连接和endpoint配置';
        } else if (error.message.includes('CORS')) {
          errorMessage = 'CORS错误，请在OSS控制台配置跨域规则';
        } else {
          errorMessage = `连接失败: ${error.message}`;
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  // 传统NAS上传逻辑
  if (!config.server) {
    return { success: false, error: 'NAS服务器地址为空' };
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    let uploadUrl = config.server;
    
    // 构建上传URL
    if (config.type === 'webdav') {
      uploadUrl = `${config.server}${config.path}/${file.name}`;
    } else if (config.type === 'http') {
      uploadUrl = config.uploadEndpoint 
        ? (config.uploadEndpoint.startsWith('http') 
            ? config.uploadEndpoint 
            : `${config.server}${config.uploadEndpoint}`)
        : `${config.server}${config.path}/upload`;
    }

    // 准备认证头
    const headers: HeadersInit = {};
    if (config.username && config.password) {
      headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
    }

    let response: Response;

    if (config.type === 'webdav') {
      // WebDAV PUT上传
      response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': file.type,
        },
        body: file,
      });
    } else {
      // HTTP POST上传
      response = await fetch(uploadUrl, {
        method: 'POST',
        headers: headers,
        body: formData,
      });
    }

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status} ${response.statusText}`);
    }

    // 处理响应
    let imageUrl: string;
    
    if (config.type === 'webdav') {
      // WebDAV直接返回文件URL
      imageUrl = uploadUrl;
    } else {
      // HTTP上传期望返回JSON
      const result = await response.json();
      imageUrl = result.url || result.path || uploadUrl;
    }

    return { success: true, url: imageUrl };
  } catch (error) {
    console.error('NAS上传失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    };
  }
} 