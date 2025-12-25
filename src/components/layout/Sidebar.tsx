import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Clock, ThumbsUp, Film, Flame, Music, Gamepad2, Newspaper, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
}

const mainNavItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Users, label: 'Subscriptions', href: '/subscriptions' },
  { icon: Compass, label: 'Explore', href: '/explore' },
  { icon: Clock, label: 'History', href: '/history' },
  { icon: ThumbsUp, label: 'Liked Videos', href: '/liked' },
];

const categoryItems = [
  { icon: Flame, label: 'Trending', href: '/trending' },
  { icon: Music, label: 'Music', href: '/category/music' },
  { icon: Gamepad2, label: 'Gaming', href: '/category/gaming' },
  { icon: Film, label: 'Movies', href: '/category/movies' },
  { icon: Newspaper, label: 'News', href: '/category/news' },
  { icon: Trophy, label: 'Sports', href: '/category/sports' },
];

export function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-background border-r border-border transition-all duration-300 z-40 overflow-y-auto hidden md:block",
        isOpen ? "w-60" : "w-[72px]"
      )}
    >
      <nav className="py-3">
        {/* Main Navigation */}
        <div className="px-3 mb-4">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-6 px-3 py-2.5 rounded-lg transition-colors mb-1",
                  isActive 
                    ? "bg-secondary text-foreground" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {isOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        {isOpen && <div className="mx-3 mb-4 border-t border-border" />}

        {/* Categories */}
        {isOpen && (
          <div className="px-3">
            <h3 className="px-3 mb-2 text-sm font-semibold text-muted-foreground">Explore</h3>
            {categoryItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-6 px-3 py-2.5 rounded-lg transition-colors mb-1",
                    isActive 
                      ? "bg-secondary text-foreground" 
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
