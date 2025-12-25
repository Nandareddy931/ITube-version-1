import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { VideoGrid } from '@/components/video/VideoGrid';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Flame, Clock, Music, Gamepad2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const categories = [
  { id: 'all', label: 'All', icon: null },
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'recent', label: 'Recently Uploaded', icon: Clock },
];

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  duration: number;
  category: string | null;
  user_id: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function Index() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    async function fetchVideos() {
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
          category,
          user_id,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (activeCategory === 'trending') {
        query = query.order('views_count', { ascending: false });
      } else if (activeCategory !== 'all' && activeCategory !== 'recent') {
        query = query.ilike('category', activeCategory);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.error('Error fetching videos:', error);
      } else {
        setVideos(data || []);
      }
      setLoading(false);
    }

    fetchVideos();
  }, [activeCategory]);

  return (
    <Layout>
      {/* Category Filter */}
      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'secondary'}
                size="sm"
                className="shrink-0 gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
                onClick={() => setActiveCategory(category.id)}
              >
                {category.icon && <category.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                {category.label}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      {/* Video Grid */}
      <VideoGrid videos={videos} loading={loading} />
    </Layout>
  );
}
