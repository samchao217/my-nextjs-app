'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCounterStore } from '@/store/counter'
import { Minus, Plus, RefreshCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TaskBoard } from '@/components/TaskBoard'
import { Toaster } from 'sonner'

/**
 * @description 这只是个示例页面，你可以随意修改这个页面或进行全面重构
 */
export default function HomePage() {
	return (
		<main className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				<TaskBoard />
			</div>
			<Toaster position="top-right" />
		</main>
	)
}
