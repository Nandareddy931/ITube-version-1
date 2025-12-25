import { Link, useLocation } from 'react-router-dom';
import { Home, Film, Upload, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Film, label: 'Movies', href: '/movies' },
  { icon: Upload, label: 'Upload', href: '/upload', requiresAuth: true },
  { icon: Users, label: 'Subscriptions', href: '/subscriptions' },
  { icon: User, label: 'Account', href: '/auth' },
];

export function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          
          // Show different icon/link for account based on auth state
          const href = item.label === 'Account' && user ? '/channel' : item.href;
          
          // Skip upload for non-auth users (they'll be redirected anyway)
          if (item.requiresAuth && !user && item.label !== 'Upload') {
            return null;
          }

          return (
            <Link
              key={item.href}
              to={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-[60px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", item.label === 'Upload' && "text-primary")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
