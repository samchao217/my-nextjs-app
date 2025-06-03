'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileJson, FileSpreadsheet, Globe, Image, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/types/task';
import { 
  exportTaskAsJSON, 
  exportTaskAsText, 
  exportTaskWithImages,
  exportTaskAsHTML,
  exportTasksAsCSV, 
  exportAllTasksAsJSON,
  exportAllTasksAsHTML
} from '@/lib/exportUtils';

interface ExportButtonProps {
  task?: Task;
  tasks?: Task[];
  variant?: 'single' | 'batch';
  size?: 'sm' | 'default';
}

export function ExportButton({ task, tasks, variant = 'single', size = 'default' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: string) => {
    console.log('开始导出，格式:', format);
    setIsExporting(true);
    
    try {
      switch (format) {
        case 'json':
          console.log('导出JSON格式');
          if (variant === 'single' && task) {
            console.log('导出单个任务JSON:', task.id);
            exportTaskAsJSON(task);
            toast.success(`任务 ${task.id} 已导出为 JSON 格式`);
          } else if (variant === 'batch' && tasks) {
            console.log('批量导出JSON:', tasks.length);
            exportAllTasksAsJSON(tasks);
            toast.success(`${tasks.length} 个任务已导出为 JSON 格式`);
          }
          break;
          
        case 'text':
          if (variant === 'single' && task) {
            exportTaskAsText(task);
            toast.success(`任务 ${task.id} 已导出为文本格式`);
          }
          break;
          
        case 'text-with-images':
          if (variant === 'single' && task) {
            await exportTaskWithImages(task);
            toast.success(`任务 ${task.id} 已导出（包含图片文件）`);
          }
          break;
          
        case 'html':
          if (variant === 'single' && task) {
            exportTaskAsHTML(task);
            toast.success(`任务 ${task.id} 已导出为网页格式`);
          } else if (variant === 'batch' && tasks) {
            exportAllTasksAsHTML(tasks);
            toast.success(`${tasks.length} 个任务已导出为网页总览报告`);
          }
          break;
          
        case 'csv':
          if (variant === 'batch' && tasks) {
            exportTasksAsCSV(tasks);
            toast.success(`${tasks.length} 个任务已导出为 Excel 格式`);
          }
          break;
          
        default:
          toast.error('不支持的导出格式');
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (variant === 'single' && !task) {
    return null;
  }

  if (variant === 'batch' && (!tasks || tasks.length === 0)) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size={size}
          disabled={isExporting}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {variant === 'single' ? '导出任务' : '批量导出'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {variant === 'single' && (
          <>
            <DropdownMenuItem onClick={() => handleExport('html')}>
              <Globe className="mr-2 h-4 w-4" />
              网页报告 (.html)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport('text-with-images')}>
              <Image className="mr-2 h-4 w-4" />
              文本+图片文件
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('text')}>
              <FileText className="mr-2 h-4 w-4" />
              仅文本 (.txt)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>
              <FileJson className="mr-2 h-4 w-4" />
              数据备份 (.json)
            </DropdownMenuItem>
          </>
        )}
        
        {variant === 'batch' && (
          <>
            <DropdownMenuItem onClick={() => handleExport('html')}>
              <Globe className="mr-2 h-4 w-4" />
              网页总览报告 (.html)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel表格 (.csv)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>
              <FileJson className="mr-2 h-4 w-4" />
              数据备份 (.json)
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 