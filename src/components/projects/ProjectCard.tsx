import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Globe, Shield, Palette, Smartphone, Monitor } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    service_type: string;
    status: string;
    start_date: string | null;
    target_end_date: string | null;
    clients?: {
      company_name: string;
    } | null;
    clientName?: string;
  };
  milestones?: {
    total: number;
    completed: number;
  };
  linkPrefix: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { 
    label: 'Draft', 
    className: 'bg-muted text-muted-foreground border-muted' 
  },
  active: { 
    label: 'Active', 
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
  },
  on_hold: { 
    label: 'In Review', 
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
  },
  completed: { 
    label: 'Completed', 
    className: 'bg-primary/20 text-primary border-primary/30' 
  }
};

const serviceIconConfig: Record<string, { icon: typeof Globe; bgColor: string; iconColor: string }> = {
  website_pwa_build: { 
    icon: Monitor, 
    bgColor: 'bg-violet-500/20', 
    iconColor: 'text-violet-400' 
  },
  website_only: { 
    icon: Globe, 
    bgColor: 'bg-blue-500/20', 
    iconColor: 'text-blue-400' 
  },
  pwa_only: { 
    icon: Smartphone, 
    bgColor: 'bg-cyan-500/20', 
    iconColor: 'text-cyan-400' 
  },
  cybersecurity: { 
    icon: Shield, 
    bgColor: 'bg-rose-500/20', 
    iconColor: 'text-rose-400' 
  },
  graphic_design: { 
    icon: Palette, 
    bgColor: 'bg-orange-500/20', 
    iconColor: 'text-orange-400' 
  }
};

export const ProjectCard = ({ project, milestones, linkPrefix }: ProjectCardProps) => {
  const status = statusConfig[project.status] || statusConfig.draft;
  const serviceIcon = serviceIconConfig[project.service_type] || serviceIconConfig.website_only;
  const Icon = serviceIcon.icon;
  
  const clientName = project.clients?.company_name || project.clientName || 'No client';
  const progress = milestones ? Math.round((milestones.completed / milestones.total) * 100) : 0;

  return (
    <Link to={`${linkPrefix}/${project.id}`}>
      <Card className="bg-card/50 border-border/50 hover:bg-card/80 hover:border-border transition-all cursor-pointer">
        <CardContent className="p-4">
          {/* Header with icon, name, and status */}
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${serviceIcon.bgColor} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${serviceIcon.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{clientName}</p>
                </div>
                <Badge variant="outline" className={`${status.className} flex-shrink-0 text-xs`}>
                  {status.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {project.target_end_date 
                ? `Due ${format(new Date(project.target_end_date), 'MMM dd, yyyy')}`
                : 'No due date'}
            </span>
          </div>

          {/* Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">PROGRESS</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProjectCard;
