import { useState, useRef } from 'react';
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
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { useTaskStore } from '@/store/taskStore';
import { PasswordDialog } from './PasswordDialog';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addImage, removeImage, updateImageDescription } = useTaskStore();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} 不是有效的图片文件`);
        return;
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} 文件大小超过5MB`);
        return;
      }

      // 创建本地预览URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        addImage(task.id, { url: result, description: '' });
        toast.success(`${file.name} 上传成功`);
      };
      reader.readAsDataURL(file);
    });

    // 清空input值，允许重复选择同一文件
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
        </div>
        
        {/* 上传图片按钮 */}
        <div>
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
          >
            <Upload className="h-4 w-4 mr-1" />
            上传图片
          </Button>
        </div>
      </div>

      {/* 图片网格 */}
      {task.images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
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