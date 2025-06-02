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
    }

    return true;
  } catch (error) {
    console.error('保存到Supabase失败:', error);
    return false;
  }
};

export const loadTasksFromSupabase = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return data?.map(row => row.data) || [];
  } catch (error) {
    console.error('从Supabase加载失败:', error);
    return null;
  }
};

// 实时订阅功能
export const subscribeToTaskChanges = (callback: (tasks: any[]) => void) => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const subscription = supabase
    .channel('tasks_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks'
      },
      async () => {
        // 当数据发生变化时，重新加载所有任务
        const tasks = await loadTasksFromSupabase();
        if (tasks) {
          callback(tasks);
        }
      }
    )
    .subscribe();

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
