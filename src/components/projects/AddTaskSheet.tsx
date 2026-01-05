import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddTaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (task: { name: string; description: string; due_date: string | null }) => Promise<void>;
  isLoading?: boolean;
}

const AddTaskSheet = ({ open, onOpenChange, onAddTask, isLoading = false }: AddTaskSheetProps) => {
  const isMobile = useIsMobile();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    await onAddTask({
      name: name.trim(),
      description: description.trim(),
      due_date: dueDate ? dueDate.toISOString() : null
    });

    // Reset form
    setName('');
    setDescription('');
    setDueDate(undefined);
  };

  const formContent = (
    <div className="space-y-5 px-1">
      <div className="space-y-2">
        <Label htmlFor="task-name" className="text-sm font-medium">
          Task Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="task-name"
          placeholder="Enter task name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="task-description"
          placeholder="Add a description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Due Date</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-11",
                !dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, "PPP") : "Select a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={(date) => {
                setDueDate(date);
                setCalendarOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  const footerContent = (
    <div className="flex gap-3 w-full">
      {isMobile ? (
        <DrawerClose asChild>
          <Button variant="outline" className="flex-1 h-12">
            Cancel
          </Button>
        </DrawerClose>
      ) : (
        <SheetClose asChild>
          <Button variant="outline" className="flex-1 h-11">
            Cancel
          </Button>
        </SheetClose>
      )}
      <Button 
        onClick={handleSubmit} 
        disabled={!name.trim() || isLoading}
        className="flex-1 bg-violet-600 hover:bg-violet-700 h-11 md:h-11"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : (
          'Add Task'
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-xl font-semibold">Add New Task</DrawerTitle>
          </DrawerHeader>
          {formContent}
          <DrawerFooter className="px-0 pt-6">
            {footerContent}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Add New Task</SheetTitle>
        </SheetHeader>
        <div className="py-6">
          {formContent}
        </div>
        <SheetFooter>
          {footerContent}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AddTaskSheet;
