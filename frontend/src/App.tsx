import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as SonnerToaster } from "sonner"; 
import { TooltipProvider } from "./components/ui/tooltip";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import ThemeToggle from "./components/ThemeToggle";

// Create React Query client
const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Tooltip context for all app */}
      <TooltipProvider>
        {/* Theme Toggle Button */}
        <ThemeToggle />
        
        {/* Sonner toast - theme-aware for light/dark mode */}
        <SonnerToaster 
          position="bottom-right"
          theme="system"
          visibleToasts={3}
          richColors
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
        
        {/* React Router */}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;