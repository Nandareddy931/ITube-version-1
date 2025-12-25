import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
}

export function TagsInput({ tags, onChange, maxTags = 10, placeholder = "Add a tag and press Enter" }: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const tag = inputValue.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < maxTags) {
      onChange([...tags, tag]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border border-border rounded-md bg-secondary/50">
        {tags.map((tag, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="gap-1 pl-2 pr-1 py-1 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 hover:bg-background/50 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {tags.length < maxTags && (
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {tags.length}/{maxTags} tags • Press Enter or comma to add
      </p>
    </div>
  );
}
