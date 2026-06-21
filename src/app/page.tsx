"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useCanvasStore } from '@/store/canvasStore';

// Modular Section Components
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import CanvasListSection from '@/components/landing/CanvasListSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import WhoUsesSection from '@/components/landing/WhoUsesSection';
import HowToUseSection from '@/components/landing/HowToUseSection';
import FAQSection from '@/components/landing/FAQSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

// Helper to build auth headers
async function authHeaders(getToken: () => Promise<string | null>) {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export default function LandingPage() {
  const router = useRouter();
  const { getToken, userId, isLoaded } = useAuth();
  const { theme, toggleTheme } = useCanvasStore();

  const [canvases, setCanvases] = useState([]);
  const [loadingCanvases, setLoadingCanvases] = useState(false);
  const [creating, setCreating] = useState(false);

  // Sync theme class with HTML element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Fetch canvases if user is authenticated
  const fetchCanvases = useCallback(async () => {
    if (!userId) return;
    setLoadingCanvases(true);
    try {
      const headers = await authHeaders(getToken);
      const response = await fetch('/api/canvas/list', { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setCanvases(data.canvases ?? []);
    } catch (e) {
      console.error('Failed to load canvases:', e);
    } finally {
      setLoadingCanvases(false);
    }
  }, [getToken, userId]);

  useEffect(() => {
    if (userId) {
      fetchCanvases();
    }
  }, [userId, fetchCanvases]);

  // Create canvas trigger
  const handleCreateCanvas = async () => {
    if (!userId) {
      router.push('/sign-in');
      return;
    }

    setCreating(true);
    try {
      const headers = await authHeaders(getToken);
      const response = await fetch('/api/canvas/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Untitled Canvas' })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.canvas?.id) {
        router.push(`/board/${data.canvas.id}`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to create canvas.');
    } finally {
      setCreating(false);
    }
  };

  const handleSignIn = () => {
    router.push('/sign-in');
  };

  const handleGoDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="h-screen w-full overflow-y-auto no-canvas-wheel bg-[#f8f5f0] dark:bg-[#121110] text-[#1c1b18] dark:text-[#f3f0ea] selection:bg-[#7c4dff]/20 scroll-smooth transition-colors duration-200">
      
      {/* 1. Sticky Navigation Header */}
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        isLoaded={isLoaded}
        userId={userId}
        creating={creating}
        handleCreateCanvas={handleCreateCanvas}
        handleSignIn={handleSignIn}
        handleGoDashboard={handleGoDashboard}
      />

      {/* Main content wrapper */}
      <div className="pt-[72px]">
        
        {/* 2. Hero Section */}
        <HeroSection
          creating={creating}
          handleCreateCanvas={handleCreateCanvas}
        />

        {/* 3. Creative Workspace Canvases Section */}
        <CanvasListSection
          isLoaded={isLoaded}
          userId={userId}
          canvases={canvases}
          loadingCanvases={loadingCanvases}
          creating={creating}
          handleCreateCanvas={handleCreateCanvas}
          handleSignIn={handleSignIn}
          handleGoDashboard={handleGoDashboard}
        />

        {/* 5. How It Works Timeline Section */}
        <HowItWorksSection />

        {/* 6. Alternating Features Section */}
        <FeaturesSection />

        {/* 7. Who Uses Cards Section */}
        <WhoUsesSection />

        {/* 8. 60-Second Simple Tutorial Section */}
        <HowToUseSection />

        {/* 9. Accessible FAQ Accordion Section */}
        <FAQSection />

        {/* 10. Final Call To Action Banner */}
        <CTASection
          creating={creating}
          handleCreateCanvas={handleCreateCanvas}
        />

        {/* 11. Footer and Trademark Details */}
        <Footer />

      </div>
    </div>
  );
}
