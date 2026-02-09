import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import cipherxLogo from '@/assets/cipherx-logo.png';

const sidebarLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/clients', icon: Building2, label: 'Clients' },
  { to: '/admin/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/admin/documents', icon: FileText, label: 'Documents' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/admin/users', icon: UserCog, label: 'User Management' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userInitials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1.5">
                <img src={cipherxLogo} alt="CipherX Logo" className="h-5 w-5 object-contain" />
                <span className="font-semibold text-sm">CipherX</span>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={cn(
            "fixed lg:sticky top-0 left-0 z-50 h-screen border-r bg-sidebar transition-all duration-300 lg:translate-x-0",
            collapsed ? "lg:w-16" : "lg:w-64",
            sidebarOpen ? "translate-x-0 w-[280px]" : "-translate-x-full"
          )}>
            <div className="flex h-14 items-center justify-between px-4 border-b">
              <div className={cn("flex items-center gap-2", collapsed && "lg:justify-center lg:w-full")}>
                <img src={cipherxLogo} alt="CipherX Logo" className="h-6 w-6 object-contain flex-shrink-0" />
                <span className={cn("font-semibold text-sidebar-foreground transition-opacity", collapsed && "lg:hidden")}>
                  CipherX Admin
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden h-8 w-8"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-3.5rem)]">
              {/* Collapse toggle - desktop only */}
              <div className="hidden lg:flex p-2 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </div>

              <nav className={cn("p-3 space-y-1", collapsed && "lg:px-2")}>
                {sidebarLinks.map((link) => {
                  const linkContent = (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        collapsed && "lg:justify-center lg:px-0",
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <link.icon className="h-4 w-4 flex-shrink-0" />
                      <span className={cn("truncate", collapsed && "lg:hidden")}>{link.label}</span>
                    </NavLink>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={link.to}>
                        <TooltipTrigger asChild>
                          {linkContent}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="hidden lg:block">
                          {link.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </nav>

              <Separator className="my-3" />

              <div className={cn("p-3", collapsed && "lg:px-2")}>
                {collapsed ? (
                  <div className="hidden lg:flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
                <div className={cn(collapsed && "lg:hidden")}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between h-auto py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                          </Avatar>
                          <div className="text-left min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user?.user_metadata?.full_name || 'Admin User'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user?.email}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </ScrollArea>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)] w-full">
            <div className="p-3 sm:p-4 lg:p-6 max-w-full overflow-x-hidden">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AdminLayout;
