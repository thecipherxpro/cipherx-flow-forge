import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Building2,
  FolderKanban,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  UserCog,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import cipherxLogo from '@/assets/cipherx-logo.png';

const navLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/admin/clients', icon: Building2, label: 'Clients' },
  { to: '/admin/users', icon: UserCog, label: 'Users' },
  { to: '/admin/documents', icon: FileText, label: 'Documents' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Invoices' },
];

const MOBILE_VISIBLE = 4;

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userInitials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  const mobileVisible = navLinks.slice(0, MOBILE_VISIBLE);
  const mobileOverflow = navLinks.slice(MOBILE_VISIBLE);

  const isOverflowActive = mobileOverflow.some((l) =>
    l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Desktop Top Header Dock ─── */}
      <header className="sticky top-0 z-40 hidden md:block">
        <div className="mx-4 lg:mx-6 mt-3">
          <div className="flex h-12 items-center gap-1 rounded-full border bg-background px-4 shadow-sm">
            {/* Logo */}
            <NavLink to="/admin" className="flex items-center gap-2 shrink-0 mr-2">
              <img src={cipherxLogo} alt="CipherX Logo" className="h-5 w-5 object-contain" />
              <span className="font-semibold text-foreground text-sm">CipherX</span>
            </NavLink>

            <div className="h-5 w-px bg-border mx-1" />

            {/* Nav Links */}
            <nav className="flex items-center gap-0.5 flex-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{link.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Settings + User */}
            <NavLink
              to="/admin/settings"
              className={({ isActive }) => cn(
                "rounded-full p-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
            </NavLink>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-1.5 px-1.5 rounded-full">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="pb-20 md:pb-0 w-full">
        <div className="p-3 sm:p-4 lg:p-6 max-w-full overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      {/* ─── Mobile Bottom Dock ─── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-stretch justify-around h-16 px-1">
          {mobileVisible.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-medium transition-colors duration-200 relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-primary animate-scale-in" />
                  )}
                  <link.icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
                  <span>{link.label}</span>
                </>
              )}
            </NavLink>
          ))}

          <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-medium transition-colors duration-200 relative outline-none",
                  isOverflowActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isOverflowActive && (
                  <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-primary" />
                )}
                <MoreHorizontal className={cn("h-5 w-5", isOverflowActive && "scale-110")} />
                <span>More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-48 mb-2">
              {mobileOverflow.map((link) => {
                const isActive = link.end
                  ? location.pathname === link.to
                  : location.pathname.startsWith(link.to);
                return (
                  <DropdownMenuItem
                    key={link.to}
                    onClick={() => { navigate(link.to); setMoreOpen(false); }}
                    className={cn(isActive && "bg-primary/10 text-primary")}
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.label}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
