import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Users, MoreVertical, Loader2, Mail, Calendar, Edit, UserPlus, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { MobileCardItem } from '@/components/MobileCardView';
import { UserEditSheet } from '@/components/users/UserEditSheet';
import { ClientOnboardingSheet } from '@/components/users/ClientOnboardingSheet';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'staff' | 'client';
  is_approved: boolean;
}


const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  staff: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  client: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
};

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Map<string, UserRole>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit sheet state
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  
  // Onboarding sheet state
  const [onboardingSheetOpen, setOnboardingSheetOpen] = useState(false);
  const [onboardingUser, setOnboardingUser] = useState<Profile | null>(null);
  
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role, is_approved')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setProfiles(profilesRes.data || []);
      
      const rolesMap = new Map<string, UserRole>();
      (rolesRes.data || []).forEach((r: UserRole) => {
        rolesMap.set(r.user_id, r);
      });
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load users'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProfiles = profiles.filter(profile =>
    profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditSheet = (user: Profile) => {
    setSelectedUser(user);
    setEditSheetOpen(true);
  };

  const openOnboardingSheet = (user: Profile) => {
    setOnboardingUser(user);
    setOnboardingSheetOpen(true);
  };

  const getUserStatus = (userId: string) => {
    const userRole = userRoles.get(userId);
    if (!userRole) return { status: 'pending', label: 'Pending Role' };
    if (!userRole.is_approved) return { status: 'awaiting', label: 'Awaiting Approval' };
    return { status: 'active', label: userRole.role };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage user accounts and role assignments
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">All Users</CardTitle>
              <CardDescription>{profiles.length} registered users</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No users match your search' : 'No users yet'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredProfiles.map((profile) => {
                  const userRole = userRoles.get(profile.id);
                  const { status } = getUserStatus(profile.id);
                  return (
                    <MobileCardItem key={profile.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {profile.full_name || 'No name'}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{profile.email}</span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>Joined {format(new Date(profile.created_at), 'MMM d, yyyy')}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end gap-1">
                            {userRole ? (
                              <>
                                <Badge className={`text-xs ${roleColors[userRole.role] || ''}`}>
                                  {userRole.role}
                                </Badge>
                                {!userRole.is_approved && (
                                  <Badge variant="outline" className="text-xs text-amber-600">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-xs text-amber-600">
                                No Role
                              </Badge>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditSheet(profile)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openOnboardingSheet(profile)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Client Onboarding
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </MobileCardItem>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => {
                      const userRole = userRoles.get(profile.id);
                      return (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">
                            {profile.full_name || 'No name'}
                          </TableCell>
                          <TableCell>{profile.email}</TableCell>
                          <TableCell>
                            {userRole ? (
                              <Badge className={roleColors[userRole.role] || ''}>
                                {userRole.role}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600">
                                No Role
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {userRole?.is_approved ? (
                              <span className="flex items-center gap-1 text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Approved
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-sm text-amber-600">
                                <Clock className="h-4 w-4" />
                                Pending
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(profile.created_at), 'MMM d, yyyy')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditSheet(profile)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openOnboardingSheet(profile)}>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Client Onboarding
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Sheet */}
      <UserEditSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        user={selectedUser}
        currentRole={selectedUser ? userRoles.get(selectedUser.id)?.role || null : null}
        onSave={fetchData}
      />

      {/* Client Onboarding Sheet */}
      <ClientOnboardingSheet
        open={onboardingSheetOpen}
        onOpenChange={setOnboardingSheetOpen}
        user={onboardingUser}
        onComplete={fetchData}
      />
    </div>
  );
};

export default AdminUsers;
