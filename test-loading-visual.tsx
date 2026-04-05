"use client";
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LoginFormSkeleton } from './app/components/ui/skeleton';

// Test the loading skeletons visually
function LoadingStatesDemo() {
  return (
    <div className="min-h-screen bg-[#030712] p-8" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 className="text-white text-2xl font-bold mb-8">Loading States Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Loading Skeleton */}
        <div className="bg-[#0F172A] p-6 rounded-xl">
          <h2 className="text-white text-xl font-semibold mb-4">Login Form Loading</h2>
          <LoginFormSkeleton />
        </div>
        
        {/* Redirecting State */}
        <div className="bg-[#0F172A] p-6 rounded-xl">
          <h2 className="text-white text-xl font-semibold mb-4">Redirecting State</h2>
          <div className="w-full max-w-sm mx-auto">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10 mb-4">
              <div className="h-full w-1/3 animate-[loading-bar_1.2s_ease-in-out_infinite] rounded-full bg-emerald-500" />
            </div>
            <LoginFormSkeleton />
            <div className="mt-8 text-center">
              <div className="w-8 h-8 mx-auto text-emerald-400 animate-spin">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4V2A10 10 0 0 0 2 12H4a8 8 0 0 1 8-8z" />
                </svg>
              </div>
              <p className="mt-3 text-sm text-slate-400">Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Render the demo
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<LoadingStatesDemo />);
} else {
  console.error('Root container not found');
}