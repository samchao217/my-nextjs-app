import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TaskFilter, TaskStore, TaskImage } from '@/types/task';

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
      customerNumber: 'CUS001',
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
      customerNumber: 'CUS002',
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
      customerNumber: 'CUS003',
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
      customerNumber: 'CUS004',
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

// 深度合并函数，确保数据不会丢失 - 改进版多设备同步合并
const deepMerge = (target: any, source: any): any => {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return source;

  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else if (Array.isArray(source[key]) && key === 'tasks') {
      // 特殊处理任务数组 - 智能合并多设备数据
      result[key] = smartMergeTasks(target[key] || [], source[key]);
    } else if (Array.isArray(source[key])) {
      // 对于其他数组，如果源数组有数据就使用源数组，否则保持目标数组
      result[key] = source[key].length > 0 ? source[key] : (target[key] || []);
    } else {
      // 对于基本类型，优先使用非空的值
      result[key] = source[key] !== null && source[key] !== undefined ? source[key] : target[key];
    }
  }
  
  return result;
};

// 智能合并任务数组 - 处理多设备同步冲突
const smartMergeTasks = (localTasks: Task[], remoteTasks: Task[]): Task[] => {
  const merged = new Map<string, Task>();
  
  // 先添加本地任务
  localTasks.forEach(task => {
    merged.set(task.id, task);
  });
  
  // 然后处理远程任务
  remoteTasks.forEach(remoteTask => {
    const localTask = merged.get(remoteTask.id);
    
    if (!localTask) {
      // 如果本地没有这个任务，直接添加
      merged.set(remoteTask.id, remoteTask);
    } else {
      // 如果本地已有任务，比较更新时间决定使用哪个
      const localTime = new Date(localTask.updatedAt || localTask.createdAt);
      const remoteTime = new Date(remoteTask.updatedAt || remoteTask.createdAt);
      
      if (remoteTime > localTime) {
        // 远程任务更新，使用远程版本
        merged.set(remoteTask.id, remoteTask);
        console.log(`🔄 任务 ${remoteTask.id} 使用远程版本 (${remoteTime.toLocaleString()})`);
      } else {
        // 本地任务更新或相同，保持本地版本
        console.log(`📱 任务 ${localTask.id} 保持本地版本 (${localTime.toLocaleString()})`);
      }
    }
  });
  
  const result = Array.from(merged.values());
  console.log(`🔄 智能合并完成: 本地${localTasks.length}个，远程${remoteTasks.length}个，合并后${result.length}个任务`);
  
  return result;
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      // 初始化时设置测试数据，persist会自动处理本地存储
      tasks: createTestTasks(),
      filter: {},
      isLoading: false,
      lastSync: new Date().toISOString(),
      warningDays: 3, // 默认3天预警

      // 数据同步辅助函数
      syncToDatabase: async () => {
        console.log('🔄 尝试同步到数据库...');
        try {
          // 动态导入避免 SSR 问题
          const { saveTasksToSupabase, isSupabaseConfigured } = await import('@/lib/supabaseClient');
          if (isSupabaseConfigured()) {
            const { tasks } = get();
            const success = await saveTasksToSupabase(tasks);
            if (success) {
              console.log('✅ 数据已同步到云端');
            } else {
              console.log('❌ 云端同步失败，数据已保存到本地');
            }
          } else {
            console.log('📱 仅保存到本地存储');
          }
        } catch (error) {
          console.error('❌ 同步过程出错:', error);
        }
      },

      // 从数据库加载数据
      loadFromDatabase: async () => {
        console.log('🔍 从数据库加载数据...');
        try {
          set({ isLoading: true });
          const { loadTasksFromSupabase, isSupabaseConfigured } = await import('@/lib/supabaseClient');
          
          if (isSupabaseConfigured()) {
            const tasks = await loadTasksFromSupabase();
            if (tasks && tasks.length > 0) {
              set({ 
                tasks, 
                lastSync: new Date().toISOString(),
                isLoading: false 
              });
              console.log('✅ 从云端加载了', tasks.length, '个任务');
              return;
            }
          }
          
          set({ isLoading: false });
          console.log('📱 使用本地数据');
        } catch (error) {
          console.error('❌ 加载失败:', error);
          set({ isLoading: false });
        }
      },

      // 启用实时同步
      enableRealtimeSync: async () => {
        try {
          if (realtimeSubscription) {
            realtimeSubscription.unsubscribe();
          }

          const { subscribeToTaskChanges, isSupabaseConfigured } = await import('@/lib/supabaseClient');
          
          if (isSupabaseConfigured()) {
            realtimeSubscription = subscribeToTaskChanges((tasks) => {
              console.log('📡 收到实时更新，更新本地数据');
              set({ 
                tasks, 
                lastSync: new Date().toISOString() 
              });
            });
            console.log('🔄 实时同步已启用');
          }
        } catch (error) {
          console.error('❌ 启用实时同步失败:', error);
        }
      },

      // 禁用实时同步
      disableRealtimeSync: () => {
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe();
          realtimeSubscription = null;
          console.log('⏹️ 实时同步已禁用');
        }
      },

      setTasks: (tasks) => {
        set({ 
          tasks,
          lastSync: new Date().toISOString() 
        });
      },
      
      resetToInitialData: () => {
        const testTasks = createTestTasks();
        set({ 
          tasks: testTasks,
          lastSync: new Date().toISOString()
        });
        // 同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
      },
      
      setFilter: (filter) => set({ filter }),

      setLoading: (isLoading) => set({ isLoading }),

      addTask: async (taskData) => {
        const currentTasks = get().tasks;
        const newTask: Task = {
          ...taskData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set({ 
          tasks: [...currentTasks, newTask],
          lastSync: new Date().toISOString()
        });

        // 异步同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
      },

      updateTask: async (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, ...updates, updatedAt: new Date().toISOString() }
              : task
          ),
          lastSync: new Date().toISOString()
        }));

        // 异步同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
      },

      deleteTask: async (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          lastSync: new Date().toISOString()
        }));

        // 异步同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
      },

      // 预警系统相关
      setWarningDays: (days) => {
        set({ warningDays: days });
      },

      getUpcomingDeadlineTasks: () => {
        const { tasks, warningDays } = get();
        const now = new Date();
        const warningDate = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);
        
        return tasks.filter((task) => {
          const deadline = new Date(task.deadline);
          return deadline <= warningDate && deadline > now && task.status !== 'completed';
        });
      },

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

        // 异步同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
      },

      removeNote: async (taskId: string, noteIndex: number) => {
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

        // 异步同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
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

        // 异步同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
      },

      removeProcessNote: async (taskId: string, noteIndex: number) => {
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

        // 异步同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
      },

      // 图片管理功能
      addImage: async (taskId, image) => {
        console.log('📸 添加图片到任务:', taskId, '当前图片数量:', get().tasks.find(t => t.id === taskId)?.images.length || 0);
        
        try {
          set((state) => {
            const updatedTasks = state.tasks.map((task) =>
              task.id === taskId 
                ? { 
                    ...task, 
                    images: [...task.images, image],
                    updatedAt: new Date().toISOString() 
                  }
                : task
            );
            
            const updatedTask = updatedTasks.find(t => t.id === taskId);
            console.log('📸 更新后图片数量:', updatedTask?.images.length || 0);
            
            return {
              tasks: updatedTasks,
              lastSync: new Date().toISOString()
            };
          });

          // 异步同步到数据库
          setTimeout(() => {
            const { syncToDatabase } = get();
            syncToDatabase();
          }, 100);
        } catch (error) {
          console.error('❌ 图片保存失败:', error);
          
          // 检查是否是配额错误
          if (error instanceof Error) {
            if (error.message.includes('quota') || 
                error.message.includes('QuotaExceededError') ||
                error.name === 'QuotaExceededError' ||
                error.message.includes('存储空间不足')) {
              throw new Error('存储空间不足，请删除一些图片后再试');
            }
          }
          
          throw error;
        }
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

        // 异步同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
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

        // 异步同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
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

        // 异步同步到数据库
        setTimeout(() => {
          const { syncToDatabase } = get();
          syncToDatabase();
        }, 100);
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
      version: 2, // 增加版本号以触发重新水合
      // 持久化配置 - 明确指定要保存的字段
      partialize: (state) => ({
        tasks: state.tasks,
        lastSync: state.lastSync,
        warningDays: state.warningDays,
      }),
      
      // 添加自定义的合并逻辑，防止数据丢失
      merge: (persistedState, currentState) => {
        console.log('🔄 正在合并持久化状态...');
        
        if (!persistedState) {
          console.log('📝 没有持久化状态，使用当前状态');
          return currentState;
        }

        try {
          const persisted = persistedState as Partial<TaskStore>;
          
          // 深度合并状态，确保数据不丢失
          const mergedState = deepMerge(currentState, persisted);
          
          // 确保关键字段存在
          if (!mergedState.tasks || !Array.isArray(mergedState.tasks)) {
            console.log('⚠️ 任务数据异常，使用默认数据');
            mergedState.tasks = createTestTasks();
          }

          console.log('✅ 状态合并完成，任务数量:', mergedState.tasks.length);
          return mergedState;
          
        } catch (error) {
          console.error('❌ 状态合并失败:', error);
          return {
            ...currentState,
            tasks: createTestTasks(),
            lastSync: new Date().toISOString(),
          };
        }
      },

      // 水合完成后的回调
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('🎉 Store 水合完成，任务数量:', state.tasks?.length || 0);
          
          // 确保有数据
          if (!state.tasks || state.tasks.length === 0) {
            console.log('📝 初始化测试数据');
            state.tasks = createTestTasks();
            state.lastSync = new Date().toISOString();
          } else {
            // 如果有数据，显示数据恢复成功提示
            const taskCount = state.tasks.length;
            console.log(`✅ 已恢复 ${taskCount} 个任务数据`);
            
            // 延迟显示toast避免与其他toast冲突
            setTimeout(() => {
              if (typeof window !== 'undefined' && window.document) {
                // 动态导入toast以避免SSR问题
                import('sonner').then(({ toast }) => {
                  toast.success(`数据恢复成功，共 ${taskCount} 个任务`, {
                    description: '多设备数据已智能合并，最新更新优先'
                  });
                });
              }
            }, 1500);
          }
          
          // 触发一次数据验证
          setTimeout(() => {
            if (state.syncToDatabase) {
              state.syncToDatabase();
            }
          }, 2000);
        }
      },
    }
  )
); 