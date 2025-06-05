import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, FileJson, FileText, AlertTriangle, FileSpreadsheet, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useTaskStore } from '@/store/taskStore';
import type { Task } from '@/types/task';

interface ImportButtonProps {
  variant?: 'replace' | 'merge';
  size?: 'default' | 'sm' | 'lg';
}

export function ImportButton({ variant = 'merge', size = 'default' }: ImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [importData, setImportData] = useState<{tasks: Task[], mode: 'replace' | 'merge'} | null>(null);
  const { setTasks, addTask, tasks } = useTaskStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (mode: 'replace' | 'merge', format: 'json' | 'csv' | 'html') => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.mode = mode;
      fileInputRef.current.dataset.format = format;
      
      // 设置文件类型过滤
      switch (format) {
        case 'json':
          fileInputRef.current.accept = '.json';
          break;
        case 'csv':
          fileInputRef.current.accept = '.csv,.xlsx,.xls';
          break;
        case 'html':
          fileInputRef.current.accept = '.html,.htm';
          break;
        default:
          fileInputRef.current.accept = '*';
      }
      
      fileInputRef.current.click();
    }
  };

  const parseCSVData = (text: string): Task[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV文件格式不正确，需要包含标题行和数据行');
    }

    const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];
    const tasks: Task[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;
      
      const values = currentLine.split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < headers.length) continue;

      try {
        // 安全获取列索引的函数
        const getColumnValue = (columnName: string): string => {
          const index = headers.indexOf(columnName);
          return index >= 0 && values[index] ? values[index] : '';
        };

        const notes = getColumnValue('备注');
        const processNotes = getColumnValue('工艺说明');
        const isRevised = getColumnValue('是否返工');

        const task: Task = {
          id: getColumnValue('任务编号') || `IMPORT_${Date.now()}_${i}`,
          specs: {
            size: getColumnValue('尺寸') || '',
            color: getColumnValue('颜色') || '',
            other: getColumnValue('其他规格') || undefined
          },
          status: parseStatus(getColumnValue('状态')) || 'preparing',
          priority: parsePriority(getColumnValue('优先级')) || 'normal',
          deadline: parseDate(getColumnValue('截止时间')) || new Date().toISOString(),
          notes: notes ? notes.split(';').filter(n => n.trim()) : [],
          processNotes: processNotes ? processNotes.split(';').filter(n => n.trim()) : [],
          images: [],
          createdAt: parseDate(getColumnValue('创建时间')) || new Date().toISOString(),
          updatedAt: parseDate(getColumnValue('更新时间')) || new Date().toISOString(),
          hasBeenRevised: isRevised === '是'
        };

        tasks.push(task);
      } catch (error) {
        console.warn(`跳过第${i+1}行数据，解析失败:`, error);
      }
    }

    return tasks;
  };

  const parseStatus = (statusText: string): Task['status'] | null => {
    const statusMap: Record<string, Task['status']> = {
      '准备中': 'preparing',
      '对接中': 'connecting',
      '备料中': 'material_prep',
      '打样中': 'sampling',
      '后道处理': 'post_processing',
      '已完成': 'completed',
      '返工': 'revision'
    };
    return statusMap[statusText] || null;
  };

  const parsePriority = (priorityText: string): Task['priority'] | null => {
    const priorityMap: Record<string, Task['priority']> = {
      '紧急': 'urgent',
      '优先': 'high',
      '正常': 'normal',
      '宽松': 'low'
    };
    return priorityMap[priorityText] || null;
  };

  const parseDate = (dateText: string): string | null => {
    if (!dateText) return null;
    try {
      const date = new Date(dateText);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  };

  const parseHTMLData = (html: string): Task[] => {
    console.log('开始解析HTML数据...');
    console.log('HTML内容长度:', html.length);
    
    // 创建一个临时DOM来解析HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 尝试从HTML中提取任务数据
    const tasks: Task[] = [];
    
    // 查找所有表格
    const tables = doc.querySelectorAll('table');
    console.log(`找到 ${tables.length} 个表格`);
    
    if (tables.length === 0) {
      throw new Error('HTML文件中没有找到表格数据。请确保文件包含 <table> 标签。');
    }

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex];
      if (!table) continue;
      
      const rows = table.querySelectorAll('tr');
      console.log(`表格 ${tableIndex + 1} 包含 ${rows.length} 行`);
      
      if (rows.length < 2) {
        console.log(`跳过表格 ${tableIndex + 1}：行数不足`);
        continue;
      }
      
      // 获取标题行
      const headerRow = rows[0];
      if (!headerRow) continue;
      
      const headerCells = headerRow.querySelectorAll('th, td');
      const headers = Array.from(headerCells).map(cell => {
        const text = cell.textContent?.trim() || '';
        return text;
      });

      console.log(`表格 ${tableIndex + 1} 的列标题:`, headers);

      if (headers.length === 0) {
        console.log(`跳过表格 ${tableIndex + 1}：没有列标题`);
        continue;
      }

      // 简化列名匹配逻辑
      const findColumnIndex = (possibleNames: string[]): number => {
        for (const name of possibleNames) {
          const index = headers.findIndex(header => 
            header.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(header.toLowerCase())
          );
          if (index >= 0) return index;
        }
        return -1;
      };

      // 查找重要列的索引
      const idIndex = findColumnIndex(['任务编号', 'ID', '编号', '任务ID', 'id']);
      const sizeIndex = findColumnIndex(['尺寸', '规格', '大小', 'size']);
      const colorIndex = findColumnIndex(['颜色', '色彩', 'color']);
      const statusIndex = findColumnIndex(['状态', '进度', 'status', '阶段']);
      const priorityIndex = findColumnIndex(['优先级', '重要性', 'priority', '等级']);

      console.log('列索引:', { idIndex, sizeIndex, colorIndex, statusIndex, priorityIndex });

      // 检查是否找到了必要的列
      if (idIndex === -1 && sizeIndex === -1 && colorIndex === -1) {
        console.log(`跳过表格 ${tableIndex + 1}：没有找到必要的列（任务编号、尺寸或颜色）`);
        continue;
      }

      // 处理数据行
      let validRowCount = 0;
      for (let i = 1; i < rows.length; i++) {
        const currentRow = rows[i];
        if (!currentRow) continue;
        
        const dataCells = currentRow.querySelectorAll('td, th');
        const cells = Array.from(dataCells).map(cell => {
          const text = cell.textContent?.trim() || '';
          return text;
        });

        if (cells.length === 0) continue;

        try {
          // 安全获取列值
          const getValue = (columnIndex: number): string => {
            return columnIndex >= 0 && cells[columnIndex] ? cells[columnIndex] : '';
          };

          const taskId = getValue(idIndex) || `HTML_${Date.now()}_${tableIndex}_${i}`;
          const size = getValue(sizeIndex);
          const color = getValue(colorIndex);

          // 确保至少有ID或者尺寸+颜色
          if (!taskId && !size && !color) {
            console.log(`跳过第${i+1}行：缺少基本数据`);
            continue;
          }

          const task: Task = {
            id: taskId,
            specs: {
              size: size || '',
              color: color || '',
              other: undefined
            },
            status: parseStatus(getValue(statusIndex)) || 'preparing',
            priority: parsePriority(getValue(priorityIndex)) || 'normal',
            deadline: new Date().toISOString(),
            notes: [],
            processNotes: [],
            images: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            hasBeenRevised: false
          };
          
          tasks.push(task);
          validRowCount++;
          console.log(`成功解析第${i+1}行:`, { id: task.id, size: task.specs.size, color: task.specs.color });
        } catch (error) {
          console.warn(`跳过第${i+1}行数据:`, error);
        }
      }
      
      console.log(`表格 ${tableIndex + 1} 成功解析 ${validRowCount} 个任务`);
    }

    if (tasks.length === 0) {
      const firstTable = tables[0];
      const firstRow = firstTable?.querySelector('tr');
      const firstRowHeaders = firstRow ? Array.from(firstRow.querySelectorAll('th, td')).map(cell => cell.textContent?.trim()).join(', ') : '无';
      
      throw new Error(`无法从HTML文件中提取任务数据。

请确保：
1. 文件包含 <table> 标签
2. 表格有标题行，包含以下列名之一：
   - 任务编号/ID/编号
   - 尺寸/规格/大小
   - 颜色/色彩
3. 表格至少有一行有效数据

当前找到的列标题: ${firstRowHeaders}`);
    }

    console.log(`HTML解析完成，总共解析出 ${tasks.length} 个任务`);
    return tasks;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const mode = event.target.dataset.mode as 'replace' | 'merge';
    const format = event.target.dataset.format as 'json' | 'csv' | 'html';
    
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      let tasksToImport: Task[] = [];

      switch (format) {
        case 'json':
          try {
            const importedData = JSON.parse(text);
            
            if (Array.isArray(importedData)) {
              tasksToImport = importedData;
            } else if (importedData.tasks && Array.isArray(importedData.tasks)) {
              tasksToImport = importedData.tasks;
            } else if (importedData.id && importedData.specs) {
              tasksToImport = [importedData];
            } else {
              throw new Error('无法识别的JSON数据格式');
            }
          } catch (error) {
            toast.error('JSON文件格式错误，请确保是有效的JSON文件');
            return;
          }
          break;

        case 'csv':
          try {
            tasksToImport = parseCSVData(text);
          } catch (error) {
            toast.error(`CSV文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
            return;
          }
          break;

        case 'html':
          try {
            tasksToImport = parseHTMLData(text);
          } catch (error) {
            toast.error(`HTML文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
            return;
          }
          break;

        default:
          toast.error('不支持的文件格式');
          return;
      }

      // 验证任务数据结构
      const validTasks = tasksToImport.filter((task: any) => {
        return task.id && 
               task.specs && 
               task.status && 
               task.priority && 
               task.deadline;
      });

      if (validTasks.length === 0) {
        toast.error('文件中没有找到有效的任务数据');
        return;
      }

      if (validTasks.length !== tasksToImport.length) {
        toast.warning(`找到 ${tasksToImport.length} 个任务，其中 ${validTasks.length} 个有效`);
      }

      // 检查ID冲突
      const existingIds = tasks.map(t => t.id);
      const conflictIds = validTasks.filter((task: Task) => existingIds.includes(task.id));

      if (mode === 'merge' && conflictIds.length > 0) {
        setImportData({ tasks: validTasks, mode });
        setConfirmDialogOpen(true);
        return;
      }

      // 执行导入
      await executeImport(validTasks, mode);

    } catch (error) {
      console.error('导入失败:', error);
      toast.error('导入失败，请检查文件格式');
    } finally {
      setIsImporting(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const executeImport = async (tasksToImport: Task[], mode: 'replace' | 'merge') => {
    try {
      if (mode === 'replace') {
        // 替换所有数据
        setTasks(tasksToImport);
        toast.success(`成功替换了 ${tasksToImport.length} 个任务`);
      } else {
        // 合并数据 - 处理ID冲突
        const existingIds = tasks.map(t => t.id);
        let importedCount = 0;
        let skippedCount = 0;

        for (const task of tasksToImport) {
          if (existingIds.includes(task.id)) {
            skippedCount++;
          } else {
            await addTask(task);
            importedCount++;
          }
        }

        const message = `导入完成：新增 ${importedCount} 个任务` + 
                       (skippedCount > 0 ? `，跳过 ${skippedCount} 个重复ID的任务` : '');
        
        toast.success(message);
      }
    } catch (error) {
      console.error('执行导入失败:', error);
      toast.error('导入过程中发生错误');
    }
  };

  const handleConfirmImport = async () => {
    if (importData) {
      await executeImport(importData.tasks, importData.mode);
      setImportData(null);
      setConfirmDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size={size}
            disabled={isImporting}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            导入数据
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
            合并导入（保留现有数据）
          </div>
          <DropdownMenuItem onClick={() => handleFileSelect('merge', 'json')}>
            <FileJson className="mr-2 h-4 w-4" />
            JSON数据备份 (.json)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFileSelect('merge', 'csv')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel表格 (.csv)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFileSelect('merge', 'html')}>
            <Globe className="mr-2 h-4 w-4" />
            网页报告 (.html)
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <div className="px-2 py-1.5 text-sm font-semibold text-orange-600">
            替换导入（清空现有数据）
          </div>
          <DropdownMenuItem onClick={() => handleFileSelect('replace', 'json')}>
            <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
            JSON完整替换 (.json)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFileSelect('replace', 'csv')}>
            <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
            CSV完整替换 (.csv)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFileSelect('replace', 'html')}>
            <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
            HTML完整替换 (.html)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 隐藏的文件选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* 冲突确认对话框 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              ID冲突确认
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              检测到 {importData?.tasks.filter(t => tasks.some(existing => existing.id === t.id)).length} 个任务的ID与现有数据冲突。
            </p>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">
                <strong>合并导入</strong>将跳过冲突的任务，只导入新的任务。
              </p>
            </div>
            <p className="text-sm">
              是否继续导入？如需覆盖现有数据，请选择"替换导入"模式。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmImport}>
              继续导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}