import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VideoGrid } from '@/components/video/VideoGrid';
import { supabase } from '@/integrations/supabase/client';
import { Search as SearchIcon, Filter, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  duration: number;
  category: string | null;
  user_id: string;
  tags: string[] | null;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const categories = [
  'All',
  'Entertainment',
  'Music',
  'Gaming',
  'Education',
  'Sports',
  'News',
  'Technology',
  'Comedy',
  'Film',
  'Travel',
];

const dateFilters = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
];

const durationFilters = [
  { value: 'all', label: 'Any duration' },
  { value: 'short', label: 'Under 4 minutes' },
  { value: 'medium', label: '4-20 minutes' },
  { value: 'long', label: 'Over 20 minutes' },
];

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Upload date' },
  { value: 'views', label: 'View count' },
];

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [category, setCategory] = useState('All');
  const [dateFilter, setDateFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  // Search scope: all / videos / channels / tags
  const [searchScope, setSearchScope] = useState<'all' | 'videos' | 'channels' | 'tags'>('all');

  const activeFiltersCount = [
    category !== 'All',
    dateFilter !== 'all',
    durationFilter !== 'all',
  ].filter(Boolean).length;

  useEffect(() => {
    async function searchVideos() {
      if (!query.trim()) {
        setVideos([]);
        setFilteredVideos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const searchTerm = query.toLowerCase().trim();

      const tokens = searchTerm.split(/\s+/).filter(Boolean);

      let videoMatches: any[] = [];
      // If searching videos or all, fetch video candidates
      if (searchScope !== 'channels') {
        const { data: titleMatches, error: titleError } = await supabase
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
            tags,
            profiles (
              display_name,
              avatar_url
            )
          `)
          .eq('is_public', true)
          .ilike('title', `%${searchTerm}%`)
          .limit(50);

        if (titleError) {
          console.error('Search error:', titleError);
          setLoading(false);
          return;
        }

        // Also search more loosely by tokens in title or tags
        const { data: allVideos } = await supabase
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
            tags,
            profiles (
              display_name,
              avatar_url
            )
          `)
          .eq('is_public', true)
          .limit(200);

        const looserMatches = (allVideos || []).filter(video => {
          const title = (video.title || '').toLowerCase();
          const tags: string[] = video.tags || [];
          // token match in title or tags
          return tokens.some(t => title.includes(t) || tags.some(tag => tag.toLowerCase().includes(t)));
        });

        // Merge titleMatches and looserMatches
        const combined = [...(titleMatches || [])];
        looserMatches.forEach((video: any) => {
          if (!combined.find(v => v.id === video.id)) combined.push(video);
        });

        videoMatches = combined;
      }

      // Channels search
      let channelMatches: any[] = [];
      if (searchScope !== 'videos') {
        // direct ilike match
        const { data: profilesMatches } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, description')
          .ilike('display_name', `%${searchTerm}%`)
          .limit(50);

        // looser token-based matching across profiles
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, description')
          .limit(200);

        const looserProfiles = (allProfiles || []).filter((p: any) => {
          const name = (p.display_name || '').toLowerCase();
          return tokens.some(t => name.includes(t));
        });

        const combinedProfiles = [...(profilesMatches || [])];
        looserProfiles.forEach((p: any) => {
          if (!combinedProfiles.find((c: any) => c.id === p.id)) combinedProfiles.push(p);
        });

        channelMatches = combinedProfiles;
      }

      // Combine results depending on scope
      setChannels(channelMatches);
      setVideos(videoMatches);

      // Apply current filters to the freshly fetched videoMatches immediately
      let immediateResult = [...videoMatches];
      if (category !== 'All') {
        immediateResult = immediateResult.filter((v: any) => v.category?.toLowerCase() === category.toLowerCase());
      }
      if (dateFilter !== 'all') {
        const now = new Date();
        immediateResult = immediateResult.filter((v: any) => {
          const videoDate = new Date(v.created_at);
          switch (dateFilter) {
            case 'today':
              return videoDate.toDateString() === now.toDateString();
            case 'week':
              return videoDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case 'month':
              return videoDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case 'year':
              return videoDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            default:
              return true;
          }
        });
      }
      if (durationFilter !== 'all') {
        immediateResult = immediateResult.filter((v: any) => {
          const duration = v.duration || 0;
          switch (durationFilter) {
            case 'short':
              return duration < 240;
            case 'medium':
              return duration >= 240 && duration <= 1200;
            case 'long':
              return duration > 1200;
            default:
              return true;
          }
        });
      }

      // Sort
      switch (sortBy) {
        case 'date':
          immediateResult.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'views':
          immediateResult.sort((a: any, b: any) => (b.views_count || 0) - (a.views_count || 0));
          break;
        default:
          break;
      }

      setFilteredVideos(immediateResult);
      setLoading(false);
    }

    searchVideos();
  }, [query, searchScope, category, dateFilter, durationFilter, sortBy]);

  // Apply filters
  useEffect(() => {
    let result = [...videos];

    // Category filter
    if (category !== 'All') {
      result = result.filter(v => v.category?.toLowerCase() === category.toLowerCase());
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter(v => {
        const videoDate = new Date(v.created_at);
        switch (dateFilter) {
          case 'today':
            return videoDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return videoDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return videoDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            return videoDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Duration filter
    if (durationFilter !== 'all') {
      result = result.filter(v => {
        const duration = v.duration || 0;
        switch (durationFilter) {
          case 'short':
            return duration < 240; // Under 4 minutes
          case 'medium':
            return duration >= 240 && duration <= 1200; // 4-20 minutes
          case 'long':
            return duration > 1200; // Over 20 minutes
          default:
            return true;
        }
      });
    }

    // Sort
    switch (sortBy) {
      case 'date':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'views':
        result.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      default:
        // Relevance - keep original order (title matches first)
        break;
    }

    setFilteredVideos(result);
  }, [videos, category, dateFilter, durationFilter, sortBy]);

  const clearFilters = () => {
    setCategory('All');
    setDateFilter('all');
    setDurationFilter('all');
    setSortBy('relevance');
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {query ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <SearchIcon className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-xl sm:text-2xl font-semibold">
                  Search results for "{query}"
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
                <div className="ml-2">
                  <label className="text-xs text-muted-foreground mr-2">Search in</label>
                  <Select value={searchScope} onValueChange={(v) => setSearchScope(v as any)}>
                    <SelectTrigger className="w-[160px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="videos">Videos</SelectItem>
                      <SelectItem value="channels">Channels</SelectItem>
                      <SelectItem value="tags">Tags</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-secondary/50 rounded-lg p-4 mb-6 space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="w-[160px] bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Upload date</label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-[160px] bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {dateFilters.map((filter) => (
                          <SelectItem key={filter.value} value={filter.value}>
                            {filter.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Duration</label>
                    <Select value={durationFilter} onValueChange={setDurationFilter}>
                      <SelectTrigger className="w-[160px] bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {durationFilters.map((filter) => (
                          <SelectItem key={filter.value} value={filter.value}>
                            {filter.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Sort by</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[160px] bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {sortOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-3 w-3" />
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            <p className="text-sm text-muted-foreground mb-4">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'result' : 'results'}
              {activeFiltersCount > 0 && ' (filtered)'}
            </p>

            {/* Channel results */}
            {channels.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Channels</h2>
                <div className="space-y-3">
                  {channels.map((ch) => (
                    <div key={ch.id} className="flex items-center gap-3">
                      <Link to={`/channel/${ch.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={ch.avatar_url || ch.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {(ch.display_name || 'U').charAt(0).toUpperCase()
                          }
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{ch.display_name}</p>
                          {ch.description && <p className="text-xs text-muted-foreground truncate">{ch.description}</p>}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {!loading && filteredVideos.length === 0 && channels.length === 0 ? (
              <div className="text-center py-16">
                <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-medium mb-2">No results found</h2>
                <p className="text-muted-foreground">
                  {activeFiltersCount > 0 
                    ? 'Try adjusting your filters or search for something else'
                    : 'Try different keywords or check your spelling'}
                </p>
                {activeFiltersCount > 0 && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              // Only render VideoGrid when there are videos or while loading to avoid an empty placeholder overlay
              (filteredVideos.length > 0 || loading) ? (
                <VideoGrid videos={filteredVideos} loading={loading} />
              ) : null
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-medium mb-2">Search for videos</h2>
            <p className="text-muted-foreground">
              Enter a search term to find videos
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
