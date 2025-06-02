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
  
  // 数据管理
  setTasks: (tasks: Task[]) => void;
  resetToInitialData: () => void; // 添加重置数据方法
  
  // 实时同步方法
  syncToDatabase: () => Promise<void>;
  loadFromDatabase: () => Promise<void>;
  enableRealtimeSync: () => void;
  disableRealtimeSync: () => void;
  
  // Actions
  addTask: (task: Omit<Task, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setFilter: (filter: TaskFilter) => void;
  setLoading: (loading: boolean) => void;
  setWarningDays: (days: number) => void; // 设置预警天数
  addNote: (taskId: string, note: string) => Promise<void>;
  removeNote: (taskId: string, noteIndex: number) => Promise<void>;
  addProcessNote: (taskId: string, note: string) => Promise<void>;
  removeProcessNote: (taskId: string, noteIndex: number) => Promise<void>;
  
  // Image management
  addImage: (taskId: string, image: TaskImage) => Promise<void>;
  removeImage: (taskId: string, imageIndex: number) => Promise<void>;
  updateImages: (taskId: string, images: TaskImage[]) => Promise<void>;
  updateImageDescription: (taskId: string, imageIndex: number, description: string) => Promise<void>;
  
  // Computed
  filteredTasks: () => Task[];
  getUpcomingDeadlineTasks: () => Task[]; // 获取即将超期的任务
} 