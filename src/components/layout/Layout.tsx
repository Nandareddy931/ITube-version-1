import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} />
      <main
        className={cn(
          "pt-14 pb-16 md:pb-0 min-h-screen transition-all duration-300",
          sidebarOpen ? "md:ml-60" : "md:ml-[72px]"
        )}
      >
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
