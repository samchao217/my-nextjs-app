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

	useEffect(() => {
		setIsClient(true)
	}, [])

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
			{/* 主要内容 */}
			<TaskBoard />
		</main>
	)
}
