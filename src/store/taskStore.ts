import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TaskFilter, TaskStore, TaskImage } from '@/types/task';
import { 
  saveTasksToSupabase, 
  loadTasksFromSupabase, 
  subscribeToTaskChanges,
  isSupabaseConfigured 
} from '@/lib/supabaseClient';

// 创建一些测试任务，包括即将超期的任务
const createTestTasks = (): Task[] => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return [
    {
      id: 'TEST001',
      images: [],
      specs: {
        size: '39-42',
        color: '红色',
        other: '纯棉材质'
      },
      status: 'sampling',
      priority: 'urgent',
      deadline: tomorrow.toISOString(),
      notes: ['客户要求明天完成'],
      processNotes: ['注意颜色匹配'],
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
      hasBeenRevised: false
    },
    {
      id: 'TEST002',
      images: [],
      specs: {
        size: '35-38',
        color: '蓝色',
        other: '运动款'
      },
      status: 'material_prep',
      priority: 'high',
      deadline: dayAfterTomorrow.toISOString(),
      notes: ['需要特殊材料'],
      processNotes: [],
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
      hasBeenRevised: false
    },
    {
      id: 'TEST003',
      images: [],
      specs: {
        size: '40-43',
        color: '黑色',
        other: '商务款'
      },
      status: 'connecting',
      priority: 'normal',
      deadline: nextWeek.toISOString(),
      notes: [],
      processNotes: [],
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
      hasBeenRevised: false
    },
    {
      id: 'TEST004',
      images: [],
      specs: {
        size: '36-39',
        color: '白色',
        other: '休闲款'
      },
      status: 'sampling',
      priority: 'urgent',
      deadline: yesterday.toISOString(),
      notes: ['已超期，需要紧急处理'],
      processNotes: [],
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
      hasBeenRevised: false
    }
  ];
};

// 实时同步状态
let realtimeSubscription: any = null;

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      // 初始化时不设置默认数据，由 persist 中间件处理
      tasks: [],
      filter: {},
      isLoading: false,
      lastSync: null,
      warningDays: 3, // 默认3天预警

      // 数据同步辅助函数
      syncToDatabase: async () => {
        if (isSupabaseConfigured()) {
          const { tasks } = get();
          await saveTasksToSupabase(tasks);
        }
      },

      // 从数据库加载数据
      loadFromDatabase: async () => {
        if (isSupabaseConfigured()) {
          set({ isLoading: true });
          const tasks = await loadTasksFromSupabase();
          if (tasks) {
            set({ 
              tasks, 
              lastSync: new Date().toISOString(),
              isLoading: false 
            });
          } else {
            set({ isLoading: false });
          }
        }
      },

      // 启用实时同步
      enableRealtimeSync: () => {
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe();
        }

        if (isSupabaseConfigured()) {
          realtimeSubscription = subscribeToTaskChanges((tasks) => {
            set({ 
              tasks, 
              lastSync: new Date().toISOString() 
            });
          });
        }
      },

      // 禁用实时同步
      disableRealtimeSync: () => {
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe();
          realtimeSubscription = null;
        }
      },

      setTasks: (tasks) => set({ tasks }),
      
      resetToInitialData: () => {
        set({ 
          tasks: createTestTasks(),
          lastSync: new Date().toISOString()
        });
      },
      
      setWarningDays: (days) => set({ warningDays: days }),
      
      // 获取即将超期的任务
      getUpcomingDeadlineTasks: () => {
        const { tasks, warningDays } = get();
        const now = new Date();
        const warningDate = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);
        
        return tasks.filter(task => {
          if (task.status === 'completed') return false;
          const deadline = new Date(task.deadline);
          return deadline <= warningDate && deadline >= now;
        });
      },

      addTask: async (taskData) => {
        const newTask: Task = {
          ...taskData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set((state) => ({ 
          tasks: [...state.tasks, newTask],
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      updateTask: async (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id 
              ? { 
                  ...task, 
                  ...updates, 
                  // 如果状态更新为返工，设置hasBeenRevised标志
                  hasBeenRevised: updates.status === 'revision' ? true : task.hasBeenRevised,
                  updatedAt: new Date().toISOString() 
                }
              : task
          ),
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      deleteTask: async (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      setFilter: (filter) => set({ filter }),
      
      setLoading: (isLoading) => set({ isLoading }),

      addNote: async (taskId, note) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { 
                  ...task, 
                  notes: [...task.notes, note],
                  updatedAt: new Date().toISOString()
                }
              : task
          ),
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      removeNote: async (taskId, noteIndex) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { 
                  ...task, 
                  notes: task.notes.filter((_, index) => index !== noteIndex),
                  updatedAt: new Date().toISOString()
                }
              : task
          ),
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      addProcessNote: async (taskId, note) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { 
                  ...task, 
                  processNotes: [...task.processNotes, note],
                  updatedAt: new Date().toISOString()
                }
              : task
          ),
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      removeProcessNote: async (taskId, noteIndex) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { 
                  ...task, 
                  processNotes: task.processNotes.filter((_, index) => index !== noteIndex),
                  updatedAt: new Date().toISOString()
                }
              : task
          ),
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      addImage: async (taskId, image) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { 
                  ...task, 
                  images: [...task.images, image],
                  updatedAt: new Date().toISOString()
                }
              : task
          ),
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      removeImage: async (taskId, imageIndex) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { 
                  ...task, 
                  images: task.images.filter((_, index) => index !== imageIndex),
                  updatedAt: new Date().toISOString()
                }
              : task
          ),
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      updateImages: async (taskId, images) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { 
                  ...task, 
                  images,
                  updatedAt: new Date().toISOString()
                }
              : task
          ),
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      updateImageDescription: async (taskId, imageIndex, description) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { 
                  ...task, 
                  images: task.images.map((img, index) =>
                    index === imageIndex
                      ? { ...img, description }
                      : img
                  ),
                  updatedAt: new Date().toISOString()
                }
              : task
          ),
          lastSync: new Date().toISOString()
        }));

        // 同步到数据库
        const { syncToDatabase } = get();
        await syncToDatabase();
      },

      filteredTasks: () => {
        const { tasks, filter } = get();
        return tasks.filter((task) => {
          // 状态筛选
          if (filter.status) {
            if (filter.status === 'revision') {
              // 如果筛选返工状态，包含当前是返工状态或曾经返工过但未完成的任务
              return task.status === 'revision' || (task.hasBeenRevised && task.status !== 'completed');
            } else if (filter.status === 'completed') {
              // 如果筛选已完成状态，包含所有已完成的任务（无论是否曾经返工）
              return task.status === 'completed';
            } else {
              // 其他状态的筛选，排除曾经返工过的任务（除非当前就是该状态）
              if (task.hasBeenRevised && task.status !== filter.status && task.status !== 'completed') {
                return false;
              }
              return task.status === filter.status;
            }
          }
          
          // 优先级筛选
          if (filter.priority && task.priority !== filter.priority) {
            return false;
          }
          
          // 时间范围筛选
          if (filter.timeRange && filter.timeRange !== 'all') {
            const now = new Date();
            const taskDeadline = new Date(task.deadline);
            let startDate: Date;
            
            switch (filter.timeRange) {
              case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
              case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
              case 'quarter':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
              case 'year':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
              default:
                startDate = new Date(0);
            }
            
            if (taskDeadline < startDate || taskDeadline > now) {
              return false;
            }
          }
          
          // 搜索筛选
          if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            return (
              task.id.toLowerCase().includes(searchLower) ||
              task.specs.color.toLowerCase().includes(searchLower) ||
              task.specs.size.toLowerCase().includes(searchLower) ||
              (task.specs.other?.toLowerCase().includes(searchLower) ?? false)
            );
          }
          
          return true;
        });
      },
    }),
    {
      name: 'task-store',
      version: 1, // 添加版本号，便于将来数据迁移
      // 持久化配置
      partialize: (state) => ({
        tasks: state.tasks,
        lastSync: state.lastSync,
        warningDays: state.warningDays,
      }),
      // 数据恢复时的处理
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 如果没有配置Supabase，使用测试数据
          if (!isSupabaseConfigured()) {
            if (!state.tasks || state.tasks.length === 0) {
              state.tasks = createTestTasks();
              state.lastSync = new Date().toISOString();
            }
          } else {
            // 如果配置了Supabase，从数据库加载数据
            const loadDataFromSupabase = async () => {
              console.log('🔄 页面恢复：正在从Supabase加载数据...');
              try {
                const cloudTasks = await loadTasksFromSupabase();
                if (cloudTasks && cloudTasks.length > 0) {
                  console.log('✅ 从Supabase加载了', cloudTasks.length, '个任务');
                  // 直接更新store，不使用set以避免触发持久化
                  state.tasks = cloudTasks;
                  state.lastSync = new Date().toISOString();
                } else if (!state.tasks || state.tasks.length === 0) {
                  console.log('⚠️ 云端无数据，使用本地数据或测试数据');
                  state.tasks = createTestTasks();
                  state.lastSync = new Date().toISOString();
                }
              } catch (error) {
                console.error('❌ 从Supabase加载数据失败:', error);
                if (!state.tasks || state.tasks.length === 0) {
                  state.tasks = createTestTasks();
                  state.lastSync = new Date().toISOString();
                }
              }
            };
            
            // 异步加载数据
            setTimeout(loadDataFromSupabase, 100);
          }
        }
      },
    }
  )
); 