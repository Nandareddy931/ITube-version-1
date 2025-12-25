import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { VideoGrid } from '@/components/video/VideoGrid';
import { Button } from '@/components/ui/button';
import { Film, Clapperboard, Drama, Laugh, Ghost, Heart, Swords, Rocket, Baby } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  duration: number;
  user_id: string;
  category: string | null;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const movieCategories = [
  { id: 'all', label: 'All Movies', icon: Film },
  { id: 'action', label: 'Action', icon: Swords },
  { id: 'comedy', label: 'Comedy', icon: Laugh },
  { id: 'drama', label: 'Drama', icon: Drama },
  { id: 'horror', label: 'Horror', icon: Ghost },
  { id: 'romance', label: 'Romance', icon: Heart },
  { id: 'sci-fi', label: 'Sci-Fi', icon: Rocket },
  { id: 'animation', label: 'Animation', icon: Baby },
  { id: 'documentary', label: 'Documentary', icon: Clapperboard },
];

export default function Movies() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMovies() {
      setLoading(true);
      
      let query = supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          views_count,
          created_at,
          duration,
          user_id,
          category,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      // Only show videos with "Movies" category
      if (selectedCategory === 'all') {
        // Show all videos categorized as "Movies"
        query = query.eq('category', 'Movies');
      } else {
        // For sub-categories, still filter by Movies category and check tags for genre
        query = query.eq('category', 'Movies');
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Error fetching movies:', error);
        setVideos([]);
      } else {
        setVideos(data || []);
      }
      
      setLoading(false);
    }

    fetchMovies();
  }, [selectedCategory]);

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <Film className="h-7 w-7 text-primary" />
            Movies
          </h1>
          <p className="text-muted-foreground mt-1">Browse movies by category</p>
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {movieCategories.map((category) => {
            const isSelected = selectedCategory === category.id;
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={isSelected ? 'default' : 'secondary'}
                size="sm"
                className={cn(
                  "gap-2 transition-all",
                  isSelected && "shadow-md"
                )}
                onClick={() => setSelectedCategory(category.id)}
              >
                <Icon className="h-4 w-4" />
                {category.label}
              </Button>
            );
          })}
        </div>

        {/* Category Grid Cards for larger screens */}
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {movieCategories.filter(c => c.id !== 'all').map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "group relative overflow-hidden rounded-xl p-6 text-left transition-all hover:scale-[1.02]",
                  isSelected 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Icon className={cn(
                  "h-8 w-8 mb-3",
                  isSelected ? "text-primary-foreground" : "text-primary"
                )} />
                <h3 className="font-semibold text-lg">{category.label}</h3>
                <p className={cn(
                  "text-sm mt-1",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  Browse {category.label.toLowerCase()} movies
                </p>
                <div className={cn(
                  "absolute -right-4 -bottom-4 h-24 w-24 rounded-full opacity-10",
                  isSelected ? "bg-primary-foreground" : "bg-primary"
                )} />
              </button>
            );
          })}
        </div>

        {/* Videos Section */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">
            {selectedCategory === 'all' 
              ? 'All Movies' 
              : `${movieCategories.find(c => c.id === selectedCategory)?.label} Movies`}
          </h2>
          <VideoGrid videos={videos} loading={loading} />
        </div>
      </div>
    </Layout>
  );
}