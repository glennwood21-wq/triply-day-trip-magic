
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import TripPreferences from "./pages/TripPreferences";
import Auth from "./pages/Auth";
import UpdatePassword from "./pages/UpdatePassword";
import Dashboard from "./pages/Dashboard";
import TripSettings from "./pages/TripSettings";
import TripPreferencesSettings from "./pages/TripPreferencesSettings";
import TripAdditionalPreferences from "./pages/TripAdditionalPreferences";
import TripSummary from "./pages/TripSummary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/trip-setup" element={<Navigate to="/trip-settings" replace />} />
          <Route path="/trip-preferences" element={<TripPreferences />} />
          <Route path="/trip-preferences-settings" element={<TripPreferencesSettings />} />
          <Route path="/trip-additional-preferences" element={<TripAdditionalPreferences />} />
          <Route path="/trip-summary" element={<TripSummary />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trip-settings" element={<TripSettings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
