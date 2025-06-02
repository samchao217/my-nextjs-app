import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  MessageSquare, 
  Settings, 
  Plus, 
  X,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { useTaskStore } from '@/store/taskStore';
import { PasswordDialog } from './PasswordDialog';
import type { Task } from '@/types/task';

interface NotesManagerProps {
  task: Task;
}

export function NotesManager({ task }: NotesManagerProps) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [processNoteDialogOpen, setProcessNoteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState<{
    type: 'note' | 'processNote';
    index: number;
  } | null>(null);
  const [newNote, setNewNote] = useState('');
  const [newProcessNote, setNewProcessNote] = useState('');
  
  const { addNote, removeNote, addProcessNote, removeProcessNote } = useTaskStore();

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNote(task.id, newNote.trim());
      setNewNote('');
      setNoteDialogOpen(false);
      toast.success('备注已添加');
    }
  };

  const handleAddProcessNote = () => {
    if (newProcessNote.trim()) {
      addProcessNote(task.id, newProcessNote.trim());
      setNewProcessNote('');
      setProcessNoteDialogOpen(false);
      toast.success('工艺说明已添加');
    }
  };

  const handleDeleteClick = (type: 'note' | 'processNote', index: number) => {
    setDeleteAction({ type, index });
    setPasswordDialogOpen(true);
  };

  const handlePasswordSuccess = () => {
    if (deleteAction) {
      if (deleteAction.type === 'note') {
        removeNote(task.id, deleteAction.index);
        toast.success('备注已删除');
      } else {
        removeProcessNote(task.id, deleteAction.index);
        toast.success('工艺说明已删除');
      }
      setDeleteAction(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 备注部分 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">备注</span>
            <Badge variant="secondary" className="text-xs">
              {task.notes.length}
            </Badge>
          </div>
          <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                添加备注
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加备注 - {task.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="请输入备注内容..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setNoteDialogOpen(false)}
                  >
                    取消
                  </Button>
                  <Button onClick={handleAddNote}>
                    添加备注
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {task.notes.length > 0 ? (
          <div className="space-y-2">
            {task.notes.map((note, index) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-md">
                <div className="flex-1 text-sm">{note}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteClick('note', index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无备注</p>
        )}
      </div>

      {/* 工艺说明部分 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">工艺说明</span>
            <Badge variant="secondary" className="text-xs">
              {task.processNotes.length}
            </Badge>
          </div>
          <Dialog open={processNoteDialogOpen} onOpenChange={setProcessNoteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                添加工艺说明
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加工艺说明 - {task.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="请输入工艺说明内容..."
                  value={newProcessNote}
                  onChange={(e) => setNewProcessNote(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setProcessNoteDialogOpen(false)}
                  >
                    取消
                  </Button>
                  <Button onClick={handleAddProcessNote}>
                    添加工艺说明
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {task.processNotes.length > 0 ? (
          <div className="space-y-2">
            {task.processNotes.map((note, index) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded-md">
                <div className="flex-1 text-sm">{note}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteClick('processNote', index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无工艺说明</p>
        )}
      </div>

      {/* 密码验证对话框 */}
      <PasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onSuccess={handlePasswordSuccess}
        title="删除验证"
        description={`请输入管理密码以删除${deleteAction?.type === 'note' ? '备注' : '工艺说明'}`}
      />
    </div>
  );
} 