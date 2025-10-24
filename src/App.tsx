import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TicketList from "./pages/tickets/TicketList";
import NewTicket from "./pages/tickets/NewTicket";
import MyTickets from "./pages/tickets/MyTickets";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { UsersPage } from "./pages/admin/Users";
import { HotelsPage } from "./pages/admin/Hotels";
import { InitialSetup } from "./pages/InitialSetup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { SupabaseSetup } from "./pages/SupabaseSetup";
import { Checklists } from "./pages/Checklists";
import React from "react";

const Calendar = React.lazy(() => import("./pages/Calendar"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<InitialSetup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/supabase-setup" element={<SupabaseSetup />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/tickets" element={
              <ProtectedRoute>
                <TicketList />
              </ProtectedRoute>
            } />
            
            <Route path="/tickets/new" element={
              <ProtectedRoute>
                <NewTicket />
              </ProtectedRoute>
            } />
            
            <Route path="/my-tickets" element={
              <ProtectedRoute>
                <MyTickets />
              </ProtectedRoute>
            } />
            
            <Route path="/calendar" element={
              <ProtectedRoute>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <Calendar />
                </React.Suspense>
              </ProtectedRoute>
            } />
            
            <Route path="/checklists" element={
              <ProtectedRoute>
                <Checklists />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/users" element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/hotels" element={
              <ProtectedRoute>
                <HotelsPage />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
