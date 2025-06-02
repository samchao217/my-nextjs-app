export interface TaskImage {
  url: string;         // 图片URL
  description?: string; // 图片说明
}

export interface Task {
  id: string;          // 任务编号
  images: TaskImage[]; // 样品图片数组
  specs: {
    size: string;      // 尺寸要求
    color: string;     // 颜色要求
    other?: string;    // 其他规格说明
  };
  status: 'preparing' | 'connecting' | 'material_prep' | 'sampling' | 'post_processing' | 'completed' | 'revision'; // 任务状态
  priority: 'urgent' | 'high' | 'normal' | 'low';  // 优先级：紧急、优先、正常、宽松
  deadline: string;    // 完成时间
  notes: string[];     // 备注
  processNotes: string[]; // 工艺说明
  createdAt: string;   // 创建时间
  updatedAt: string;   // 最后更新时间
  hasBeenRevised?: boolean; // 是否曾经处于返工状态
}

export interface TaskFilter {
  status?: Task['status'];
  priority?: Task['priority'];
  timeRange?: 'week' | 'month' | 'quarter' | 'year' | 'all';
  search?: string;
}

export interface TaskStore {
  tasks: Task[];
  filter: TaskFilter;
  isLoading: boolean;
  lastSync: string | null;
  warningDays: number; // 预警天数设置
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setFilter: (filter: TaskFilter) => void;
  setLoading: (loading: boolean) => void;
  setWarningDays: (days: number) => void; // 设置预警天数
  addNote: (taskId: string, note: string) => void;
  removeNote: (taskId: string, noteIndex: number) => void;
  addProcessNote: (taskId: string, note: string) => void;
  removeProcessNote: (taskId: string, noteIndex: number) => void;
  
  // Image management
  addImage: (taskId: string, image: TaskImage) => void;
  removeImage: (taskId: string, imageIndex: number) => void;
  updateImages: (taskId: string, images: TaskImage[]) => void;
  updateImageDescription: (taskId: string, imageIndex: number, description: string) => void;
  
  // Computed
  filteredTasks: () => Task[];
  getUpcomingDeadlineTasks: () => Task[]; // 获取即将超期的任务
  
  // 数据管理
  resetToInitialData: () => void; // 添加重置数据方法
} 