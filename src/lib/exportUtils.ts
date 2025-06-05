import type { Task } from '@/types/task';

// 格式化任务状态为中文
const formatStatus = (status: Task['status']): string => {
  const statusMap = {
    preparing: '准备中',
    connecting: '对接中',
    material_prep: '备料中',
    sampling: '打样中',
    post_processing: '后道处理',
    completed: '已完成',
    revision: '返工'
  };
  return statusMap[status] || status;
};

// 格式化优先级为中文
const formatPriority = (priority: Task['priority']): string => {
  const priorityMap = {
    urgent: '紧急',
    high: '优先',
    normal: '正常',
    low: '宽松'
  };
  return priorityMap[priority] || priority;
};

// 下载图片到本地
const downloadImage = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('图片下载失败:', error);
  }
};

// 导出单个任务为JSON
export const exportTaskAsJSON = (task: Task): void => {
  const dataStr = JSON.stringify(task, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `任务_${task.id}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// 导出单个任务为文本格式（改进版）
export const exportTaskAsText = (task: Task): void => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const textContent = `
苏琪针织 - 打样任务详情
========================

任务编号: ${task.id}
任务状态: ${formatStatus(task.status)}
优先级: ${formatPriority(task.priority)}
截止时间: ${formatDate(task.deadline)}
创建时间: ${formatDate(task.createdAt)}
更新时间: ${formatDate(task.updatedAt)}
${task.hasBeenRevised ? '曾经返工: 是' : ''}

规格要求
--------
尺寸: ${task.specs.size}
颜色: ${task.specs.color}
${task.specs.other ? `其他要求: ${task.specs.other}` : ''}

备注信息
--------
${task.notes.length > 0 ? task.notes.map((note, index) => `${index + 1}. ${note}`).join('\n') : '无备注'}

工艺说明
--------
${task.processNotes.length > 0 ? task.processNotes.map((note, index) => `${index + 1}. ${note}`).join('\n') : '无工艺说明'}

图片信息
--------
${task.images.length > 0 ? 
  `共 ${task.images.length} 张图片，图片将单独下载到您的电脑中：\n` +
  task.images.map((img, index) => `图片${index + 1}: ${img.description || '无描述'}`).join('\n') : 
  '无图片'}

导出时间: ${new Date().toLocaleString('zh-CN')}

注意：如果任务包含图片，图片文件将单独下载到您的下载文件夹中。
  `.trim();

  const dataBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `任务_${task.id}_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// 导出任务包含图片（文本+图片分别下载）
export const exportTaskWithImages = async (task: Task): Promise<void> => {
  // 先导出文本文件
  exportTaskAsText(task);
  
  // 如果有图片，逐个下载
  if (task.images.length > 0) {
    const dateStr = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < task.images.length; i++) {
      const image = task.images[i];
      if (image) {
        const fileExtension = image.url.split('.').pop() || 'jpg';
        const filename = `任务_${task.id}_图片${i + 1}_${dateStr}.${fileExtension}`;
        
        // 延迟下载，避免浏览器阻止多个下载
        setTimeout(() => {
          downloadImage(image.url, filename);
        }, i * 500); // 每500ms下载一张图片
      }
    }
  }
};

// 创建HTML格式的任务报告（包含图片）
export const exportTaskAsHTML = (task: Task): void => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>任务详情 - ${task.id}</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #333;
            margin: 0;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #555;
            border-left: 4px solid #007bff;
            padding-left: 10px;
            margin-bottom: 15px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        .info-item {
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .info-label {
            font-weight: bold;
            color: #666;
        }
        .images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .image-item {
            text-align: center;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            background: #fafafa;
        }
        .image-item img {
            max-width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 4px;
        }
        .image-description {
            margin-top: 8px;
            font-size: 14px;
            color: #666;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            color: white;
            background: #007bff;
        }
        .priority-urgent { background: #dc3545; }
        .priority-high { background: #fd7e14; }
        .priority-normal { background: #28a745; }
        .priority-low { background: #6c757d; }
        .notes-list {
            list-style: none;
            padding: 0;
        }
        .notes-list li {
            padding: 8px 12px;
            margin-bottom: 8px;
            background: #f8f9fa;
            border-left: 3px solid #007bff;
            border-radius: 0 4px 4px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>苏琪针织 - 打样任务详情</h1>
            <p>任务编号: <strong>${task.id}</strong></p>
            <p>客户编号: <strong>${task.customerNumber}</strong></p>
        </div>

        <div class="section">
            <h2>基本信息</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">任务状态</div>
                    <span class="status-badge">${formatStatus(task.status)}</span>
                </div>
                <div class="info-item">
                    <div class="info-label">优先级</div>
                    <span class="status-badge priority-${task.priority}">${formatPriority(task.priority)}</span>
                </div>
                <div class="info-item">
                    <div class="info-label">截止时间</div>
                    ${formatDate(task.deadline)}
                </div>
                <div class="info-item">
                    <div class="info-label">创建时间</div>
                    ${formatDate(task.createdAt)}
                </div>
            </div>
        </div>

        <div class="section">
            <h2>规格要求</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">尺寸</div>
                    ${task.specs.size}
                </div>
                <div class="info-item">
                    <div class="info-label">颜色</div>
                    ${task.specs.color}
                </div>
            </div>
            ${task.specs.other ? `
            <div class="info-item">
                <div class="info-label">其他要求</div>
                ${task.specs.other}
            </div>
            ` : ''}
        </div>

        ${task.images.length > 0 ? `
        <div class="section">
            <h2>样品图片 (${task.images.length}张)</h2>
            <div class="images-grid">
                ${task.images.map((img, index) => `
                <div class="image-item">
                    <img src="${img.url}" alt="样品图片${index + 1}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+aXoOazleWKoOi9vTwvdGV4dD4KPC9zdmc+'" />
                    <div class="image-description">${img.description || '无描述'}</div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${task.notes.length > 0 ? `
        <div class="section">
            <h2>备注信息</h2>
            <ul class="notes-list">
                ${task.notes.map(note => `<li>${note}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${task.processNotes.length > 0 ? `
        <div class="section">
            <h2>工艺说明</h2>
            <ul class="notes-list">
                ${task.processNotes.map(note => `<li>${note}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <div class="footer">
            <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
            <p>苏琪针织打样管理系统</p>
        </div>
    </div>
</body>
</html>
  `.trim();

  const dataBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `任务_${task.id}_完整报告_${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// 导出多个任务为Excel格式（CSV）
export const exportTasksAsCSV = (tasks: Task[]): void => {
  const headers = [
    '任务编号',
    '客户编号',
    '状态',
    '优先级',
    '尺寸',
    '颜色',
    '其他规格',
    '截止时间',
    '创建时间',
    '更新时间',
    '是否返工',
    '备注',
    '工艺说明',
    '图片数量'
  ];

  const csvContent = [
    headers.join(','),
    ...tasks.map(task => [
      task.id,
      task.customerNumber,
      formatStatus(task.status),
      formatPriority(task.priority),
      `"${task.specs.size}"`,
      `"${task.specs.color}"`,
      `"${task.specs.other || ''}"`,
      new Date(task.deadline).toLocaleDateString('zh-CN'),
      new Date(task.createdAt).toLocaleDateString('zh-CN'),
      new Date(task.updatedAt).toLocaleDateString('zh-CN'),
      task.hasBeenRevised ? '是' : '否',
      `"${task.notes.join('; ')}"`,
      `"${task.processNotes.join('; ')}"`,
      task.images.length
    ].join(','))
  ].join('\n');

  // 添加BOM以支持中文
  const BOM = '\uFEFF';
  const dataBlob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `打样任务汇总_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// 导出所有任务为JSON
export const exportAllTasksAsJSON = (tasks: Task[]): void => {
  const exportData = {
    exportTime: new Date().toISOString(),
    totalTasks: tasks.length,
    tasks: tasks
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `苏琪针织_全部任务_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// 批量导出所有任务为HTML格式
export const exportAllTasksAsHTML = (tasks: Task[]): void => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getStatusColor = (status: Task['status']): string => {
    const statusColors = {
      preparing: '#6c757d',
      connecting: '#17a2b8',
      material_prep: '#007bff',
      sampling: '#ffc107',
      post_processing: '#6f42c1',
      completed: '#28a745',
      revision: '#dc3545'
    };
    return statusColors[status] || '#6c757d';
  };

  const getPriorityColor = (priority: Task['priority']): string => {
    const priorityColors = {
      urgent: '#dc3545',
      high: '#fd7e14', 
      normal: '#28a745',
      low: '#6c757d'
    };
    return priorityColors[priority] || '#6c757d';
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>苏琪针织 - 打样任务总览报告</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #333;
            margin: 0 0 10px 0;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .summary-item {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border-left: 4px solid #007bff;
        }
        .summary-number {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
        }
        .summary-label {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
        }
        .task-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .task-header {
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .task-id {
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }
        .badges {
            display: flex;
            gap: 8px;
        }
        .badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            color: white;
        }
        .task-body {
            padding: 20px;
        }
        .task-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
        }
        .info-item {
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .info-label {
            font-weight: bold;
            color: #666;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .info-value {
            color: #333;
        }
        .images-section {
            margin-top: 15px;
        }
        .images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        .image-thumb {
            width: 100%;
            height: 80px;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        .notes-section {
            margin-top: 15px;
        }
        .notes-list {
            list-style: none;
            padding: 0;
        }
        .notes-list li {
            padding: 8px 12px;
            margin-bottom: 6px;
            background: #f8f9fa;
            border-left: 3px solid #007bff;
            border-radius: 0 4px 4px 0;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>苏琪针织 - 打样任务总览报告</h1>
            <p>导出时间: ${new Date().toLocaleString('zh-CN')} | 总任务数: ${tasks.length}</p>
        </div>

        <div class="summary">
            <div class="summary-item">
                <div class="summary-number">${tasks.length}</div>
                <div class="summary-label">总任务数</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${tasks.filter(t => t.status === 'completed').length}</div>
                <div class="summary-label">已完成</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${tasks.filter(t => t.priority === 'urgent').length}</div>
                <div class="summary-label">紧急任务</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length}</div>
                <div class="summary-label">已超期</div>
            </div>
        </div>

        ${tasks.map(task => `
        <div class="task-card">
            <div class="task-header">
                <div class="task-id">任务 ${task.id}</div>
                <div class="badges">
                    <span class="badge" style="background-color: ${getStatusColor(task.status)}">${formatStatus(task.status)}</span>
                    <span class="badge" style="background-color: ${getPriorityColor(task.priority)}">${formatPriority(task.priority)}</span>
                    ${task.hasBeenRevised ? '<span class="badge" style="background-color: #dc3545">返工</span>' : ''}
                </div>
            </div>
            <div class="task-body">
                <div class="task-info">
                    <div class="info-item">
                        <div class="info-label">尺寸</div>
                        <div class="info-value">${task.specs.size}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">颜色</div>
                        <div class="info-value">${task.specs.color}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">截止时间</div>
                        <div class="info-value">${formatDate(task.deadline)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">创建时间</div>
                        <div class="info-value">${formatDate(task.createdAt)}</div>
                    </div>
                </div>
                
                ${task.specs.other ? `
                <div class="info-item">
                    <div class="info-label">其他要求</div>
                    <div class="info-value">${task.specs.other}</div>
                </div>
                ` : ''}

                ${task.images.length > 0 ? `
                <div class="images-section">
                    <div class="info-label">样品图片 (${task.images.length}张)</div>
                    <div class="images-grid">
                        ${task.images.map((img, index) => `
                        <img src="${img.url}" alt="样品图片${index + 1}" class="image-thumb" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTAwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOUNBM0FGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mH5peg5rOV5Yqg6L29PC90ZXh0Pgo8L3N2Zz4='" />
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                ${task.notes.length > 0 ? `
                <div class="notes-section">
                    <div class="info-label">备注信息</div>
                    <ul class="notes-list">
                        ${task.notes.map(note => `<li>${note}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                ${task.processNotes.length > 0 ? `
                <div class="notes-section">
                    <div class="info-label">工艺说明</div>
                    <ul class="notes-list">
                        ${task.processNotes.map(note => `<li>${note}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
        </div>
        `).join('')}

        <div class="footer">
            <p>苏琪针织打样管理系统 | 数据导出时间: ${new Date().toLocaleString('zh-CN')}</p>
            <p>此报告包含 ${tasks.length} 个任务的完整信息，可用于存档或分享</p>
        </div>
    </div>
</body>
</html>
  `.trim();

  const dataBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `苏琪针织_任务总览报告_${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}; 