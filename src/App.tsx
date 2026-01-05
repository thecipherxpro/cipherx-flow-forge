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
import AdminClientView from "@/pages/admin/ClientView";
import AdminProjects from "@/pages/admin/Projects";
import AdminProjectView from "@/pages/admin/ProjectView";
import AdminProjectForm from "@/pages/admin/ProjectForm";
import AdminDocuments from "@/pages/admin/Documents";
import AdminDocumentBuilder from "@/pages/admin/DocumentBuilder";
import AdminDocumentView from "@/pages/admin/DocumentView";
import AdminDocumentEdit from "@/pages/admin/DocumentEdit";
import AdminSubscriptions from "@/pages/admin/Subscriptions";
import AdminSubscriptionView from "@/pages/admin/SubscriptionView";
import AdminSubscriptionForm from "@/pages/admin/SubscriptionForm";
import AdminUsers from "@/pages/admin/Users";
import AdminSettings from "@/pages/admin/Settings";

// Staff pages
import StaffDashboard from "@/pages/staff/Dashboard";

// Portal pages
import PortalDashboard from "@/pages/portal/Dashboard";
import PortalProfile from "@/pages/portal/Profile";
import PortalProjects from "@/pages/portal/Projects";
import PortalProjectView from "@/pages/portal/ProjectView";
import PortalDocuments from "@/pages/portal/Documents";
import PortalDocumentView from "@/pages/portal/DocumentView";
import PortalSubscriptions from "@/pages/portal/Subscriptions";
import PortalSubscriptionView from "@/pages/portal/SubscriptionView";

// Public pages

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
              <Route path="clients/:id" element={<AdminClientView />} />
              <Route path="clients/:id/edit" element={<AdminClientForm />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="projects/new" element={<AdminProjectForm />} />
              <Route path="projects/:id" element={<AdminProjectView />} />
              <Route path="projects/:id/edit" element={<AdminProjectForm />} />
              <Route path="documents" element={<AdminDocuments />} />
              <Route path="documents/new" element={<AdminDocumentBuilder />} />
              <Route path="documents/:id" element={<AdminDocumentView />} />
              <Route path="documents/:id/edit" element={<AdminDocumentEdit />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="subscriptions/new" element={<AdminSubscriptionForm />} />
              <Route path="subscriptions/:id" element={<AdminSubscriptionView />} />
              <Route path="subscriptions/:id/edit" element={<AdminSubscriptionForm />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
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
              <Route path="profile" element={<PortalProfile />} />
              <Route path="projects" element={<PortalProjects />} />
              <Route path="projects/:id" element={<PortalProjectView />} />
              <Route path="documents" element={<PortalDocuments />} />
              <Route path="documents/:id" element={<PortalDocumentView />} />
              <Route path="subscriptions" element={<PortalSubscriptions />} />
              <Route path="subscriptions/:id" element={<PortalSubscriptionView />} />
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
