import { useEffect, useRef, useState } from 'react';
import { useTaskStore } from '@/store/taskStore';

export function useDataRestore() {
  const hasRestoredRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const { loadFromDatabase, enableRealtimeSync } = useTaskStore();

  useEffect(() => {
    // 防止重复恢复
    if (hasRestoredRef.current) return;

    const restoreData = async () => {
      console.log('🔄 开始数据恢复检查...');
      
      try {
        // 等待 Zustand persist 水合完成
        await new Promise(resolve => {
          const checkHydration = () => {
            // 检查 persist 是否已经水合
            const persistState = useTaskStore.persist?.getOptions?.();
            if (persistState || typeof window !== 'undefined') {
              resolve(true);
            } else {
              setTimeout(checkHydration, 100);
            }
          };
          checkHydration();
        });

        // 确保客户端已完全水合
        setIsHydrated(true);
        console.log('✅ 客户端水合完成');

        // 动态导入避免SSR问题
        const { isSupabaseConfigured } = await import('@/lib/supabaseClient');
        
        // 检查是否配置了Supabase
        if (isSupabaseConfigured()) {
          console.log('✅ 检测到Supabase配置，尝试加载云端数据...');
          
          // 从数据库加载数据
          await loadFromDatabase();
          
          // 启用实时同步
          await enableRealtimeSync();
          
          console.log('🎉 云端数据同步已启用');
        } else {
          console.log('📱 使用本地存储模式');
        }
      } catch (error) {
        console.error('❌ 数据恢复过程失败:', error);
        // 如果云端同步失败，确保本地数据仍然可用
        setIsHydrated(true);
      }
      
      hasRestoredRef.current = true;
    };

    // 延迟执行，确保store已完全初始化
    const timer = setTimeout(restoreData, 1000);
    
    return () => clearTimeout(timer);
  }, [loadFromDatabase, enableRealtimeSync]);

  return { 
    hasRestored: hasRestoredRef.current,
    isHydrated 
  };
} 