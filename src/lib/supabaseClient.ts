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
