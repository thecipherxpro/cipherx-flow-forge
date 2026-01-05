import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  MoreVertical, 
  Clock, 
  Calendar, 
  Building2, 
  User, 
  CheckCircle2, 
  Circle,
  Plus,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  service_type: string;
  status: string;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  created_at: string;
  clients?: {
    id: string;
    company_name: string;
  } | null;
  assigned_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
}

interface ProjectViewContentProps {
  project: ProjectData;
  milestones: Milestone[];
  onBack: () => void;
  showEditButton?: boolean;
  showAddTask?: boolean;
  editPath?: string;
  clientLinkPath?: string;
  onToggleMilestone?: (milestone: Milestone) => void;
  onAddTaskClick?: () => void;
}

const serviceTypeLabels: Record<string, string> = {
  website_pwa_build: 'Website + PWA Build',
  website_only: 'Website Only',
  pwa_only: 'PWA Only',
  cybersecurity: 'Cybersecurity Services',
  graphic_design: 'Graphic Design'
};

const statusConfig: Record<string, { label: string; dotColor: string; bgColor: string }> = {
  draft: { label: 'Draft', dotColor: 'bg-muted-foreground', bgColor: 'bg-muted' },
  active: { label: 'Active', dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
  on_hold: { label: 'On Hold', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  completed: { label: 'Completed', dotColor: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' }
};

const ProjectViewContent = ({
  project,
  milestones,
  onBack,
  showEditButton = false,
  showAddTask = false,
  editPath,
  clientLinkPath,
  onToggleMilestone,
  onAddTaskClick
}: ProjectViewContentProps) => {
  const isMobile = useIsMobile();
  
  const completedMilestones = milestones.filter(m => m.completed_at).length;
  const progressPercentage = milestones.length > 0 
    ? Math.round((completedMilestones / milestones.length) * 100) 
    : 0;

  const statusInfo = statusConfig[project.status] || statusConfig.draft;
  const getInitials = (name: string | null | undefined, fallback: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return fallback.slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative min-h-full pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onBack}
          className="rounded-full h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          {showEditButton && editPath && !isMobile && (
            <Button asChild variant="default" className="bg-violet-600 hover:bg-violet-700">
              <Link to={editPath}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showEditButton && editPath && (
                <DropdownMenuItem asChild>
                  <Link to={editPath}>Edit Project</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>Share Project</DropdownMenuItem>
              <DropdownMenuItem>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title & Progress Badge */}
      <div className="mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Project Details</h1>
          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-100">
            {progressPercentage}% Progress
          </Badge>
        </div>
      </div>

      {/* Project Name */}
      <h2 className="text-xl font-semibold text-foreground mb-2">{project.name}</h2>

      {/* Description */}
      {project.description && (
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Service Type & Status Boxes */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Service Type</p>
          <p className="font-medium text-sm text-foreground">
            {serviceTypeLabels[project.service_type] || project.service_type}
          </p>
        </div>
        <div className="border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusInfo.dotColor}`} />
            <span className="font-medium text-sm text-foreground capitalize">
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Client & Assignment Section */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground mb-3">Client & Assignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <Avatar className="h-10 w-10 bg-violet-100 dark:bg-violet-900/30">
              <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                <Building2 className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Client</p>
              {project.clients ? (
                clientLinkPath ? (
                  <Link 
                    to={`${clientLinkPath}/${project.clients.id}`}
                    className="font-medium text-sm text-primary hover:underline truncate block"
                  >
                    {project.clients.company_name}
                  </Link>
                ) : (
                  <p className="font-medium text-sm text-foreground truncate">
                    {project.clients.company_name}
                  </p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">No client assigned</p>
              )}
            </div>
          </div>

          {/* Assigned To */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <Avatar className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {project.assigned_profile 
                  ? getInitials(project.assigned_profile.full_name, project.assigned_profile.email)
                  : <User className="h-5 w-5" />
                }
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Assigned To</p>
              {project.assigned_profile ? (
                <p className="font-medium text-sm text-foreground truncate">
                  {project.assigned_profile.full_name || project.assigned_profile.email}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground mb-3">Timeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium text-sm text-foreground">
                {project.start_date 
                  ? format(new Date(project.start_date), 'MMM d, yyyy')
                  : 'Not set'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Target End Date</p>
              <p className="font-medium text-sm text-foreground">
                {project.target_end_date 
                  ? format(new Date(project.target_end_date), 'MMM d, yyyy')
                  : 'Not set'
                }
              </p>
            </div>
          </div>
        </div>

        {project.actual_end_date && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed On</p>
              <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
                {format(new Date(project.actual_end_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Task List Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">Task List</h3>
          {showAddTask && onAddTaskClick && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
              onClick={onAddTaskClick}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        {milestones.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{progressPercentage}% Done</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Tasks/Milestones */}
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No tasks defined yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {milestones.map((milestone) => (
              <div 
                key={milestone.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  milestone.completed_at 
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30' 
                    : 'bg-card border-border hover:bg-muted/30'
                }`}
              >
                {onToggleMilestone ? (
                  <button
                    onClick={() => onToggleMilestone(milestone)}
                    className="mt-0.5 transition-transform hover:scale-110 active:scale-95"
                  >
                    {milestone.completed_at ? (
                      <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      </div>
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                ) : (
                  <div className="mt-0.5">
                    {milestone.completed_at ? (
                      <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      </div>
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${
                    milestone.completed_at 
                      ? 'text-emerald-700 dark:text-emerald-400' 
                      : 'text-foreground'
                  }`}>
                    {milestone.name}
                  </p>
                  {milestone.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {milestone.description}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {milestone.completed_at ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {format(new Date(milestone.completed_at), 'MMM d')}
                    </p>
                  ) : milestone.due_date ? (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(milestone.due_date), 'MMM d')}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Edit Button (Mobile) */}
      {showEditButton && editPath && isMobile && (
        <div className="fixed bottom-6 left-4 right-4 md:hidden">
          <Button asChild className="w-full bg-violet-600 hover:bg-violet-700 h-12 text-base font-medium rounded-xl shadow-lg">
            <Link to={editPath}>
              <Edit className="h-5 w-5 mr-2" />
              Edit Project
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProjectViewContent;
