import { useState } from 'react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tag, X } from 'lucide-react';

interface TagSelectorProps {
  label: string;
  tags: string[];
  availableTags: string[];
  onTagsChange: (tags: string[]) => void;
  htmlFor?: string;
}

export function TagSelector({ label, tags, availableTags, onTagsChange, htmlFor = 'tags' }: TagSelectorProps) {
  const [customTagInput, setCustomTagInput] = useState('');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const newTag = customTagInput.trim();
      if (!tags.includes(newTag)) {
        onTagsChange([...tags, newTag]);
      }
      setCustomTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSelectTag = (value: string) => {
    if (value === 'custom') {
      // Focus on custom input
      document.getElementById(htmlFor)?.focus();
    } else if (value && !tags.includes(value)) {
      onTagsChange([...tags, value]);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="flex gap-2">
        <Select value="" onValueChange={handleSelectTag}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a tag or type custom..." />
          </SelectTrigger>
          <SelectContent>
            {availableTags.map((segment) => (
              <SelectItem key={segment} value={segment}>
                {segment}
              </SelectItem>
            ))}
            <SelectItem value="custom">+ Custom Tag...</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input
        id={htmlFor}
        value={customTagInput}
        onChange={(e) => setCustomTagInput(e.target.value)}
        onKeyDown={handleAddTag}
        placeholder="Or type a custom tag and press Enter"
        className="mt-2"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
