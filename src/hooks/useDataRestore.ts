import { useEffect, useRef } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { 
  isSupabaseConfigured, 
  loadTasksFromSupabase,
  getSupabaseConfig 
} from '@/lib/supabaseClient';

export function useDataRestore() {
  const hasRestoredRef = useRef(false);
  const { tasks, setTasks, enableRealtimeSync } = useTaskStore();

  useEffect(() => {
    // 防止重复恢复
    if (hasRestoredRef.current) return;

    const restoreData = async () => {
      console.log('🔄 开始数据恢复检查...');
      
      // 检查是否配置了Supabase
      if (isSupabaseConfigured()) {
        console.log('✅ 检测到Supabase配置，尝试加载云端数据...');
        
        try {
          const cloudTasks = await loadTasksFromSupabase();
          
          if (cloudTasks && cloudTasks.length > 0) {
            console.log(`🎉 成功从云端恢复 ${cloudTasks.length} 个任务`);
            setTasks(cloudTasks);
            
            // 启用实时同步
            enableRealtimeSync();
          } else {
            console.log('⚠️ 云端暂无数据');
          }
        } catch (error) {
          console.error('❌ 云端数据加载失败:', error);
        }
      } else {
        console.log('📱 使用本地存储模式');
      }
      
      hasRestoredRef.current = true;
    };

    // 延迟执行，确保store已完全初始化
    const timer = setTimeout(restoreData, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return { hasRestored: hasRestoredRef.current };
} 