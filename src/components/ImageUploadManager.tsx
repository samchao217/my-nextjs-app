import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
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
import { 
  Plus, 
  X, 
  ImageIcon, 
  ChevronLeft, 
  ChevronRight,
  Trash2,
  Upload,
  Edit3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Server,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { useTaskStore } from '@/store/taskStore';
import { PasswordDialog } from './PasswordDialog';
import { uploadToNAS, type NASConfig } from './NASConfig';
import type { Task } from '@/types/task';

interface ImageUploadManagerProps {
  task: Task;
}

export function ImageUploadManager({ task }: ImageUploadManagerProps) {
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteImageIndex, setDeleteImageIndex] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState<number | null>(null);
  const [tempDescription, setTempDescription] = useState('');
  const [passwordAction, setPasswordAction] = useState<'deleteImage' | 'deleteDescription'>('deleteImage');
  const [deleteDescriptionIndex, setDeleteDescriptionIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [nasConfig, setNASConfig] = useState<NASConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addImage, removeImage, updateImageDescription } = useTaskStore();

  // 加载NAS配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('nas-config');
    if (savedConfig) {
      try {
        setNASConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('加载NAS配置失败:', error);
      }
    }
  }, []);

  // 图片压缩函数 - 适用于本地存储的压缩策略
  const compressImage = (file: File, maxWidth: number = 600, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        // 计算新的尺寸
        let { width, height } = img;
        
        // 如果图片太大，先按比例缩小
        const maxDimension = Math.max(width, height);
        if (maxDimension > maxWidth) {
          const ratio = maxWidth / maxDimension;
          width = width * ratio;
          height = height * ratio;
        }
        
        // 设置画布尺寸
        canvas.width = width;
        canvas.height = height;
        
        // 绘制压缩后的图片
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        // 导出为Base64
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // 检查存储空间的函数
  const checkStorageSpace = (): { available: boolean; usedSpace: number; totalSpace: number } => {
    try {
      let usedSpace = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          usedSpace += localStorage[key].length;
        }
      }
      const totalSpace = 5 * 1024 * 1024; // 5MB
      return { 
        available: usedSpace < totalSpace * 0.9, 
        usedSpace, 
        totalSpace 
      };
    } catch (error) {
      return { available: false, usedSpace: 0, totalSpace: 5 * 1024 * 1024 };
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    let successCount = 0;
    let errorCount = 0;
    let nasSuccessCount = 0;
    let localSuccessCount = 0;

    for (const file of fileArray) {
      try {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} 不是有效的图片文件`);
          errorCount++;
          continue;
        }

        // 验证文件大小（NAS模式下可以更大）
        const maxSize = nasConfig?.enabled ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // NAS: 50MB, 本地: 5MB
        if (file.size > maxSize) {
          toast.error(`${file.name} 文件大小超过 ${maxSize / 1024 / 1024}MB`);
          errorCount++;
          continue;
        }

        let imageUrl = '';
        let description = ''; // 留空，让用户手动添加备注
        let uploadMethod = '';

        // 优先尝试NAS上传
        if (nasConfig?.enabled) {
          console.log('🔄 尝试上传到NAS:', file.name);
          const nasResult = await uploadToNAS(file, nasConfig);
          
          if (nasResult.success && nasResult.url) {
            imageUrl = nasResult.url;
            // 阿里云OSS等NAS存储不需要压缩，也不需要自动说明
            uploadMethod = 'NAS';
            nasSuccessCount++;
            console.log('✅ NAS上传成功:', imageUrl);
          } else {
            console.log('❌ NAS上传失败，尝试本地存储:', nasResult.error);
            // NAS失败，回退到本地存储
            await uploadToLocal(file);
            uploadMethod = '本地(NAS失败)';
            localSuccessCount++;
          }
        } else {
          // 使用本地存储
          await uploadToLocal(file);
          uploadMethod = '本地';
          localSuccessCount++;
        }

        // 本地存储上传函数
        async function uploadToLocal(file: File) {
          // 检查本地存储空间
          const { available } = checkStorageSpace();
          if (!available) {
            throw new Error('本地存储空间不足');
          }

          // 压缩图片（仅本地存储需要压缩）
          let compressedDataUrl: string = '';
          let attempts = 0;
          const maxAttempts = 3;
          const targetSize = 300 * 1024; // 目标300KB
          
          while (attempts < maxAttempts) {
            attempts++;
            const maxWidth = attempts === 1 ? 600 : attempts === 2 ? 400 : 300;
            const quality = attempts === 1 ? 0.7 : attempts === 2 ? 0.5 : 0.3;
            
            compressedDataUrl = await compressImage(file, maxWidth, quality);
            const compressedSize = compressedDataUrl.length * 0.75;
            
            if (compressedSize <= targetSize || attempts === maxAttempts) {
              break;
            }
          }

          imageUrl = compressedDataUrl;
          const finalSize = compressedDataUrl.length * 0.75;
          // 本地存储生成简单的说明，用户可以自行修改
          description = '';
        }

        // 添加图片到任务
        await addImage(task.id, { 
          url: imageUrl, 
          description 
        });
        
        successCount++;
        toast.success(`${file.name} 上传成功`, {
          description: `存储方式: ${uploadMethod}`
        });
        
      } catch (error) {
        console.error('图片上传失败:', error);
        errorCount++;
        
        if (error instanceof Error) {
          toast.error(`${file.name} 上传失败`, {
            description: error.message
          });
        }
      }
    }

    // 总结上传结果
    if (successCount > 0) {
      let summaryMessage = `成功上传 ${successCount} 张图片`;
      let details = '';
      
      if (nasSuccessCount > 0) {
        details += `NAS存储: ${nasSuccessCount}张`;
      }
      if (localSuccessCount > 0) {
        details += details ? `, 本地存储: ${localSuccessCount}张` : `本地存储: ${localSuccessCount}张`;
      }
      
      toast.success(summaryMessage, {
        description: details
      });
      
      // 如果有本地存储，检查使用率
      if (localSuccessCount > 0) {
        const { usedSpace, totalSpace } = checkStorageSpace();
        const usagePercent = ((usedSpace / totalSpace) * 100).toFixed(1);
        
        if (parseFloat(usagePercent) > 70) {
          toast.warning(`本地存储使用率: ${usagePercent}%`, {
            description: '建议配置NAS存储以获得更大空间'
          });
        }
      }
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} 张图片上传失败`);
    }

    // 清空input值
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteClick = (index: number) => {
    setDeleteImageIndex(index);
    setPasswordAction('deleteImage');
    setPasswordDialogOpen(true);
  };

  const handleDeleteDescriptionClick = (index: number) => {
    setDeleteDescriptionIndex(index);
    setPasswordAction('deleteDescription');
    setPasswordDialogOpen(true);
  };

  const handlePasswordSuccess = () => {
    if (passwordAction === 'deleteImage' && deleteImageIndex !== null) {
      removeImage(task.id, deleteImageIndex);
      toast.success('图片已删除');
      setDeleteImageIndex(null);
    } else if (passwordAction === 'deleteDescription' && deleteDescriptionIndex !== null) {
      updateImageDescription(task.id, deleteDescriptionIndex, '');
      toast.success('图片说明已删除');
      setDeleteDescriptionIndex(null);
    }
  };

  const handleEditDescription = (index: number) => {
    setEditingDescription(index);
    setTempDescription(task.images[index]?.description || '');
  };

  const handleSaveDescription = () => {
    if (editingDescription !== null) {
      updateImageDescription(task.id, editingDescription, tempDescription);
      setEditingDescription(null);
      setTempDescription('');
      toast.success('图片说明已更新');
    }
  };

  const handleCancelEdit = () => {
    setEditingDescription(null);
    setTempDescription('');
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === task.images.length - 1 ? 0 : prev + 1
    );
    setZoomLevel(1); // 切换图片时重置缩放
    setDragOffset({ x: 0, y: 0 }); // 重置拖拽偏移
  };
  
  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? task.images.length - 1 : prev - 1
    );
    setZoomLevel(1); // 切换图片时重置缩放
    setDragOffset({ x: 0, y: 0 }); // 重置拖拽偏移
  };

  const openPreview = (index: number) => {
    setCurrentImageIndex(index);
    setZoomLevel(1); // 打开预览时重置缩放
    setDragOffset({ x: 0, y: 0 }); // 重置拖拽偏移
    setPreviewDialogOpen(true);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3)); // 最大3倍放大
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5)); // 最小0.5倍缩小
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setDragOffset({ x: 0, y: 0 }); // 重置拖拽偏移
  };

  // 拖拽相关事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setDragOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomLevel > 1 && e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      if (touch) {
        setDragStart({ x: touch.clientX - dragOffset.x, y: touch.clientY - dragOffset.y });
      }
      e.preventDefault();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoomLevel > 1 && e.touches.length === 1) {
      const touch = e.touches[0];
      if (touch) {
        setDragOffset({
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y
        });
      }
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          <span className="text-sm font-medium">袜子样品图片</span>
          <Badge variant="secondary" className="text-xs">
            {task.images.length}
          </Badge>
          {task.images.length === 0 && (
            <span className="text-xs text-muted-foreground">支持多张图片</span>
          )}
          {/* 存储方式指示器 */}
          {nasConfig?.enabled ? (
            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
              <Server className="h-3 w-3 mr-1" />
              NAS存储
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
              <HardDrive className="h-3 w-3 mr-1" />
              本地存储
            </Badge>
          )}
        </div>
        
        {/* 上传图片按钮 */}
        <div className="flex items-center gap-2">
          {/* 存储空间提示 */}
          {!nasConfig?.enabled && (
            <span className="text-xs text-muted-foreground">
              建议配置NAS获得更大存储空间
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1"
          >
            <Upload className="h-4 w-4" />
            {task.images.length === 0 ? '上传图片' : '添加更多'}
          </Button>
        </div>
      </div>

      {/* 图片网格 */}
      {task.images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {task.images.map((image, index) => (
            <div key={index} className="relative group">
              <div 
                className="relative aspect-square bg-muted rounded-md overflow-hidden cursor-pointer"
                onClick={() => openPreview(index)}
              >
                <Image
                  src={image.url}
                  alt={`袜子样品 ${index + 1}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
              
              {/* 删除按钮 */}
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeleteClick(index)}
              >
                <X className="h-3 w-3" />
              </Button>
              
              {/* 编辑说明按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 left-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
                onClick={() => handleEditDescription(index)}
              >
                <Edit3 className="h-3 w-3 text-white" />
              </Button>
              
              {/* 图片说明 */}
              <div className="mt-2">
                {editingDescription === index ? (
                  <div className="space-y-2">
                    <Input
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      placeholder="请输入图片说明..."
                      className="text-sm"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" className="px-4 py-2" onClick={handleSaveDescription}>
                        保存
                      </Button>
                      <Button size="sm" variant="outline" className="px-3 py-2" onClick={handleCancelEdit}>
                        取消
                      </Button>
                      {image.description && (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="px-3 py-2"
                          onClick={() => handleDeleteDescriptionClick(index)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {image.description ? (
                      <div 
                        className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                        onClick={() => handleEditDescription(index)}
                      >
                        {image.description}
                      </div>
                    ) : (
                      <div 
                        className="text-xs text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors p-1 rounded hover:bg-muted text-center"
                        onClick={() => handleEditDescription(index)}
                      >
                        +
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div 
          className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">暂无袜子样品图片</p>
          <p className="text-xs text-muted-foreground">点击此处上传图片</p>
        </div>
      )}

      {/* 图片预览对话框 */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              袜子样品图片预览 - {task.id} ({currentImageIndex + 1}/{task.images.length})
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <div 
              className="relative h-[70vh] overflow-hidden rounded-lg bg-muted"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{
                  transform: `scale(${zoomLevel}) translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-in-out'
                }}
              >
                <Image
                  src={task.images[currentImageIndex]?.url || ''}
                  alt={`袜子样品 ${currentImageIndex + 1}`}
                  width={800}
                  height={600}
                  className="object-contain max-w-full max-h-full"
                  draggable={false}
                />
              </div>
            </div>
            
            {/* 缩放控制按钮 */}
            <div className="absolute top-2 left-2 flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="bg-black/50 text-white hover:bg-black/70 border-white/20"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-black/50 text-white hover:bg-black/70 border-white/20"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-black/50 text-white hover:bg-black/70 border-white/20"
                onClick={handleResetZoom}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <div className="bg-black/50 text-white text-xs px-2 py-1 rounded border border-white/20 flex items-center">
                {Math.round(zoomLevel * 100)}%
              </div>
            </div>
            
            {/* 导航按钮 */}
            {task.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {/* 删除当前图片按钮 */}
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => {
                handleDeleteClick(currentImageIndex);
                if (task.images.length <= 1) {
                  setPreviewDialogOpen(false);
                } else if (currentImageIndex >= task.images.length - 1) {
                  setCurrentImageIndex(0);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              删除此图片
            </Button>

            {/* 添加更多图片按钮 */}
            <Button
              variant="outline"
              size="sm"
              className="absolute bottom-2 left-2 bg-black/50 text-white hover:bg-black/70 border-white/20"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加更多
            </Button>
          </div>
          
          {/* 图片描述显示 */}
          {task.images[currentImageIndex]?.description && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="text-sm font-medium text-muted-foreground mb-1">图片说明：</div>
              <div className="text-sm">{task.images[currentImageIndex].description}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 密码验证对话框 */}
      <PasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onSuccess={handlePasswordSuccess}
        title={passwordAction === 'deleteImage' ? "删除图片验证" : "删除说明验证"}
        description={passwordAction === 'deleteImage' ? "请输入管理密码以删除图片" : "请输入管理密码以删除图片说明"}
      />
    </div>
  );
} 