import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Layouts
import AdminLayout from "@/components/layouts/AdminLayout";
import StaffLayout from "@/components/layouts/StaffLayout";
import ClientLayout from "@/components/layouts/ClientLayout";

// Auth pages
import Auth from "@/pages/Auth";
import Pending from "@/pages/Pending";

// Admin pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminClients from "@/pages/admin/Clients";
import AdminClientForm from "@/pages/admin/ClientForm";
import AdminProjects from "@/pages/admin/Projects";
import AdminDocuments from "@/pages/admin/Documents";
import AdminSubscriptions from "@/pages/admin/Subscriptions";
import AdminUsers from "@/pages/admin/Users";
import AdminSettings from "@/pages/admin/Settings";

// Staff pages
import StaffDashboard from "@/pages/staff/Dashboard";

// Portal pages
import PortalDashboard from "@/pages/portal/Dashboard";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending" element={<Pending />} />

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="clients/new" element={<AdminClientForm />} />
              <Route path="clients/:id/edit" element={<AdminClientForm />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="documents" element={<AdminDocuments />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Staff routes */}
            <Route path="/staff" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffLayout />
              </ProtectedRoute>
            }>
              <Route index element={<StaffDashboard />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="documents" element={<AdminDocuments />} />
            </Route>

            {/* Client Portal routes */}
            <Route path="/portal" element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientLayout />
              </ProtectedRoute>
            }>
              <Route index element={<PortalDashboard />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="documents" element={<AdminDocuments />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
