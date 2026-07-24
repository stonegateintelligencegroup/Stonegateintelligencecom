import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex-1 flex flex-col relative z-0">
        {children}
      </main>
      <Footer />
    </div>
  );
}