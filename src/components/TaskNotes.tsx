import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import type { Task } from '@/types/task';

interface TaskNotesProps {
  notes: Task['notes'];
}

export function TaskNotes({ notes }: TaskNotesProps) {
  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <MessageSquare className="h-4 w-4 mr-2" />
        暂无编织备注
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        <span className="text-sm font-medium">编织备注</span>
        <Badge variant="secondary" className="text-xs">
          {notes.length}
        </Badge>
      </div>
      <ScrollArea className="h-24">
        <div className="space-y-2">
          {notes.map((note, index) => (
            <div
              key={index}
              className="text-sm p-2 bg-muted rounded-md border-l-2 border-primary/20"
            >
              {note}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 