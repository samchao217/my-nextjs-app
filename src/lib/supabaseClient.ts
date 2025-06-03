// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// Supabase 配置 - 用户可以在前端设置
let supabaseUrl = '';
let supabaseKey = '';

export const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error('Supabase连接失败:', error);
    return null;
  }
};

export const setSupabaseConfig = (url: string, key: string) => {
  supabaseUrl = url;
  supabaseKey = key;
  
  // 保存到localStorage以便下次使用
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
  }
};

export const getSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    const url = localStorage.getItem('supabase_url') || '';
    const key = localStorage.getItem('supabase_key') || '';
    
    if (url && key) {
      supabaseUrl = url;
      supabaseKey = key;
    }
    
    return { url, key };
  }
  
  return { url: '', key: '' };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
};

// 数据库表结构
export interface TaskRow {
  id: string;
  data: any; // 存储完整的任务数据
  created_at?: string;
  updated_at?: string;
}

export const createTasksTable = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    // 检查表是否存在，如果不存在则提示用户手动创建
    const { data, error } = await supabase.from('tasks').select('*').limit(1);
    
    if (error) {
      console.warn('请在Supabase中创建tasks表，SQL语句:', `
        CREATE TABLE tasks (
          id text PRIMARY KEY,
          data jsonb NOT NULL,
          created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('检查数据库表失败:', error);
    return false;
  }
};

// 数据同步功能
export const saveTasksToSupabase = async (tasks: any[]) => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    console.log('💾 正在保存数据到Supabase，任务数量:', tasks.length);
    
    // 获取当前所有任务
    const { data: existingTasks } = await supabase.from('tasks').select('id');
    const existingIds = existingTasks?.map(t => t.id) || [];

    // 准备数据
    const tasksToUpsert = tasks.map(task => ({
      id: task.id,
      data: task,
      updated_at: new Date().toISOString()
    }));

    // 批量更新/插入
    const { error } = await supabase
      .from('tasks')
      .upsert(tasksToUpsert, { onConflict: 'id' });

    if (error) throw error;

    // 删除本地不存在的任务
    const currentIds = tasks.map(t => t.id);
    const idsToDelete = existingIds.filter(id => !currentIds.includes(id));
    
    if (idsToDelete.length > 0) {
      await supabase.from('tasks').delete().in('id', idsToDelete);
      console.log('🗑️ 删除了', idsToDelete.length, '个任务');
    }

    console.log('✅ 数据保存成功');
    return true;
  } catch (error) {
    console.error('❌ 保存到Supabase失败:', error);
    return false;
  }
};

export const loadTasksFromSupabase = async () => {
  console.log('🔍 开始从Supabase加载数据...');
  
  // 首先检查配置
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    console.log('⚠️ Supabase未配置，跳过云端数据加载');
    return null;
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase客户端创建失败');
    return null;
  }

  try {
    console.log('📡 正在查询tasks表...');
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase查询错误:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // 如果是表不存在的错误，给出提示
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.error('📋 请先在Supabase中创建tasks表，SQL命令:');
        console.error(`
CREATE TABLE tasks (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
        `);
      }
      
      throw error;
    }

    const tasks = data?.map(row => row.data) || [];
    console.log('✅ 成功从Supabase加载', tasks.length, '个任务');
    return tasks;
  } catch (error) {
    console.error('❌ 从Supabase加载失败:', {
      error: error,
      message: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
};

// 实时订阅功能
export const subscribeToTaskChanges = (callback: (tasks: any[]) => void) => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  console.log('🔄 正在启动实时订阅...');

  const subscription = supabase
    .channel('tasks_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks'
      },
      async (payload) => {
        console.log('📡 收到实时更新:', payload);
        
        // 添加延迟，避免在用户正在编辑时立即更新
        setTimeout(async () => {
          console.log('📡 处理实时更新，事件类型:', payload.eventType);
          
          // 只有在非本地操作时才更新
          // 如果是 INSERT 或 UPDATE，检查是否是来自其他设备
          const tasks = await loadTasksFromSupabase();
          if (tasks) {
            console.log('✅ 实时同步：更新了', tasks.length, '个任务');
            callback(tasks);
          }
        }, 1000); // 延迟1秒，给用户操作留出时间
      }
    )
    .subscribe((status) => {
      console.log('📊 订阅状态:', status);
      if (status === 'SUBSCRIBED') {
        console.log('🎉 实时订阅已成功启动！');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ 实时订阅失败，请检查Supabase配置');
      }
    });

  return subscription;
};

// 获取最后更新时间
export const getLastSyncTime = async (): Promise<string | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    return data?.[0]?.updated_at || null;
  } catch (error) {
    console.error('获取最后同步时间失败:', error);
    return null;
  }
};
