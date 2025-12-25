import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Tag, Film } from 'lucide-react';

interface VideoSuggestion {
  id: string;
  title: string;
  thumbnail_url: string | null;
  tags: string[] | null;
}

interface SearchSuggestionsProps {
  query: string;
  onSelect: (query: string) => void;
  visible: boolean;
  className?: string;
}

export function SearchSuggestions({ query, onSelect, visible, className }: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<VideoSuggestion[]>([]);
  const [matchedTags, setMatchedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setMatchedTags([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      const searchTerm = query.toLowerCase().trim();

      // Fetch videos that match by title or have matching tags
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, tags')
        .eq('is_public', true)
        .or(`title.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
        .limit(8);

      if (error) {
        console.error('Search suggestions error:', error);
        setLoading(false);
        return;
      }

      // Also find videos where any tag contains the search term
      const { data: tagMatchData } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, tags')
        .eq('is_public', true)
        .limit(20);

      // Filter videos where any tag partially matches
      const tagMatches = (tagMatchData || []).filter(video => {
        if (!video.tags) return false;
        return video.tags.some((tag: string) => 
          tag.toLowerCase().includes(searchTerm)
        );
      });

      // Combine and deduplicate results
      const combinedResults = [...(data || [])];
      tagMatches.forEach(video => {
        if (!combinedResults.find(v => v.id === video.id)) {
          combinedResults.push(video);
        }
      });

      // Extract unique matching tags
      const tags = new Set<string>();
      combinedResults.forEach(video => {
        if (video.tags) {
          video.tags.forEach((tag: string) => {
            if (tag.toLowerCase().includes(searchTerm)) {
              tags.add(tag);
            }
          });
        }
      });

      setMatchedTags(Array.from(tags).slice(0, 5));
      setSuggestions(combinedResults.slice(0, 6));
      setLoading(false);
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  if (!visible || (!suggestions.length && !matchedTags.length && !loading)) {
    return null;
  }

  return (
    <div className={`bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-96 overflow-y-auto ${className || 'absolute top-full left-0 right-0 mt-1 z-50'}`}>
      {loading && (
        <div className="px-4 py-3 text-sm text-muted-foreground">
          Searching...
        </div>
      )}

      {/* Tag suggestions */}
      {matchedTags.length > 0 && (
        <div className="border-b border-border">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
            Matching Tags
          </div>
          {matchedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelect(tag)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
            >
              <Tag className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm">{tag}</span>
            </button>
          ))}
        </div>
      )}

      {/* Video suggestions */}
      {suggestions.length > 0 && (
        <div>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
            Videos
          </div>
          {suggestions.map((video) => (
            <Link
              key={video.id}
              to={`/watch/${video.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors"
            >
              <div className="w-16 h-9 rounded overflow-hidden bg-secondary shrink-0">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{video.title}</p>
                {video.tags && video.tags.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    {video.tags.slice(0, 3).join(', ')}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Search action */}
      {query.trim() && (
        <button
          onClick={() => onSelect(query)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors border-t border-border"
        >
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm">Search for "{query}"</span>
        </button>
      )}
    </div>
  );
}
