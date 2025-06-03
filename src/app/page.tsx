'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCounterStore } from '@/store/counter'
import { Minus, Plus, RefreshCcw, Database, CheckCircle, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TaskBoard } from '@/components/TaskBoard'
import { Toaster } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTaskStore } from '@/store/taskStore'

/**
 * @description 这只是个示例页面，你可以随意修改这个页面或进行全面重构
 */
export default function HomePage() {
	const { tasks, lastSync, addTask, isLoading } = useTaskStore()
	const [isClient, setIsClient] = useState(false)
	const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('syncing')

	useEffect(() => {
		setIsClient(true)
		
		// 检查数据同步状态
		const checkSyncStatus = () => {
			if (tasks.length > 0 && lastSync) {
				setSyncStatus('synced')
			} else if (isLoading) {
				setSyncStatus('syncing')
			} else {
				setSyncStatus('error')
			}
		}

		checkSyncStatus()
		
		// 定期检查同步状态
		const interval = setInterval(checkSyncStatus, 1000)
		return () => clearInterval(interval)
	}, [tasks, lastSync, isLoading])

	const testDataSync = async () => {
		try {
			setSyncStatus('syncing')
			
			// 创建一个测试任务
			const testTask = {
				id: `SYNC-TEST-${Date.now()}`,
				images: [],
				specs: {
					size: '数据同步测试',
					color: '测试专用',
					other: `测试时间: ${new Date().toLocaleString()}`
				},
				status: 'preparing' as const,
				priority: 'normal' as const,
				deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				notes: [
					'🔧 数据同步功能测试',
					'✅ 创建任务成功',
					'💾 等待数据持久化...'
				],
				processNotes: [],
				hasBeenRevised: false,
			}
			
			await addTask(testTask)
			setSyncStatus('synced')
			
			toast.success('数据同步测试成功！', {
				description: '任务已创建并保存到本地存储'
			})
			
		} catch (error) {
			setSyncStatus('error')
			toast.error('数据同步测试失败', {
				description: error instanceof Error ? error.message : '未知错误'
			})
		}
	}

	if (!isClient) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="flex flex-col items-center space-y-4">
					<RefreshCcw className="h-8 w-8 animate-spin text-blue-500" />
					<p className="text-muted-foreground">正在初始化应用...</p>
				</div>
			</div>
		)
	}

	return (
		<main className="container mx-auto py-8 px-4">
			{/* 数据同步状态卡片 */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Database className="h-5 w-5" />
						数据同步状态
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								{syncStatus === 'syncing' && (
									<>
										<RefreshCcw className="h-4 w-4 animate-spin text-blue-500" />
										<Badge variant="outline" className="text-blue-700 border-blue-200">
											同步中...
										</Badge>
									</>
								)}
								{syncStatus === 'synced' && (
									<>
										<CheckCircle className="h-4 w-4 text-green-500" />
										<Badge variant="outline" className="text-green-700 border-green-200">
											已同步
										</Badge>
									</>
								)}
								{syncStatus === 'error' && (
									<>
										<AlertCircle className="h-4 w-4 text-red-500" />
										<Badge variant="outline" className="text-red-700 border-red-200">
											同步异常
										</Badge>
									</>
								)}
							</div>
							
							<div className="text-sm text-muted-foreground">
								任务数量: {tasks.length} | 
								最后同步: {lastSync ? new Date(lastSync).toLocaleString() : '未知'}
							</div>
						</div>
						
						<Button 
							variant="outline" 
							size="sm" 
							onClick={testDataSync}
							disabled={syncStatus === 'syncing'}
						>
							测试数据同步
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* 主要内容 */}
			<TaskBoard />
		</main>
	)
}
