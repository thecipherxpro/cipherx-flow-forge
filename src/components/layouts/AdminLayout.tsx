import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  UserCog,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import cipherxLogo from '@/assets/cipherx-logo.png';

const navLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/clients', icon: Building2, label: 'Clients' },
  { to: '/admin/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/admin/documents', icon: FileText, label: 'Documents' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/admin/users', icon: UserCog, label: 'Users' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        {/* Top Header Dock */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
            {/* Logo */}
            <NavLink to="/admin" className="flex items-center gap-2 shrink-0">
              <img src={cipherxLogo} alt="CipherX Logo" className="h-6 w-6 object-contain" />
              <span className="font-semibold text-foreground hidden sm:inline">CipherX</span>
            </NavLink>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1 flex-1">
              {navLinks.map((link) => (
                <Tooltip key={link.to}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) => cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      <span className="hidden xl:inline">{link.label}</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="xl:hidden">
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </nav>

            {/* Spacer for mobile */}
            <div className="flex-1 lg:hidden" />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{user?.user_metadata?.full_name || 'Admin User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="pt-12">
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <link.icon className="h-5 w-5" />
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-[calc(100vh-3.5rem)] w-full">
          <div className="p-3 sm:p-4 lg:p-6 max-w-full overflow-x-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default AdminLayout;
