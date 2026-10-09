import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { normalizeInventorySearchQuery } from '../../utils/inventory-keywords';

interface AIChatSearchBarProps {
  moduleName: 'inventory' | 'shopping-list' | 'competitive-pricing';
  onApplyFilters: (filters: any) => void;
  placeholder?: string;
}

export function AIChatSearchBar({
  moduleName,
  onApplyFilters,
  placeholder = "Ask AI (e.g. 'Show me all products that have Spruce and 2x4 in description')..."
}: AIChatSearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; filters?: any }>>([
    {
      role: 'assistant',
      text: `Hello! I'm your ProSpaces AI Assistant for ${moduleName.replace('-', ' ')}. Ask me anything in natural language (e.g. "Show me all products that have Spruce and 2x4 in the description" or "Find items under $50").`
    }
  ]);

  const quickPrompts = [
    "Show me all products that have Spruce and 2x4 in the description",
    "Show low stock lumber items",
    "Find electrical supplies under $50",
    "Show items with competitive price variances"
  ];

  const handleSearch = async (textToSend?: string) => {
    const text = textToSend || query;
    if (!text.trim() || loading) return;

    const userMsg = text.trim();
    if (!textToSend) setQuery('');

    const newMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    setIsOpen(true);

    try {
      const res = await fetch('/api/ai/chat-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, module: moduleName })
      });

      if (res.ok) {
        const data = await res.json();
        const aiReply = data.reply || `Here are the results for "${userMsg}".`;
        const filters = data.filters || { search: userMsg };
        if (moduleName === 'inventory') {
          const normalizedSearch = normalizeInventorySearchQuery(filters.search || userMsg);
          const priceTerms = [
            filters.priceMin != null ? `over $${filters.priceMin}` : '',
            filters.priceMax != null ? `under $${filters.priceMax}` : ''
          ].filter(Boolean);
          filters.search = [normalizedSearch, ...priceTerms].filter(Boolean).join(' ');
        }

        setMessages([...newMessages, { role: 'assistant', text: aiReply, filters }]);
        onApplyFilters(filters);
      } else {
        throw new Error('AI search failed');
      }
    } catch (err) {
      // Fallback local keyword extraction
      const fallbackFilters = {
        search: moduleName === 'inventory' ? normalizeInventorySearchQuery(userMsg) : userMsg,
        category: 'all'
      };
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: `I've applied your filter for "${userMsg}".`,
          filters: fallbackFilters
        }
      ]);
      onApplyFilters(fallbackFilters);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3 bg-gradient-to-r from-purple-950/20 via-indigo-950/10 to-background border border-purple-500/30 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 shrink-0">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={placeholder}
              className="pr-12 bg-background/80 border-purple-500/30 focus-visible:ring-purple-500 text-foreground"
            />
            <Button
              size="sm"
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? <span className="animate-spin text-xs">⏳</span> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="border-purple-500/30 text-purple-300 hover:bg-purple-950/30 shrink-0"
        >
          <MessageSquare className="h-4 w-4 mr-1.5" />
          {isOpen ? 'Hide AI Chat' : 'AI Chat Assistant'}
          {isOpen ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
        </Button>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs text-muted-foreground font-medium">Try asking:</span>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSearch(prompt)}
            className="text-xs px-2.5 py-1 rounded-full bg-purple-950/40 border border-purple-500/20 text-purple-200 hover:bg-purple-900/50 transition-all text-left"
          >
            ✨ {prompt}
          </button>
        ))}
      </div>

      {/* Expandable Chat Drawer */}
      {isOpen && (
        <Card className="bg-background/90 border-purple-500/30 shadow-md mt-3">
          <CardContent className="p-4 space-y-3 max-h-72 overflow-y-auto">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="p-1.5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/30 shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                    m.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-muted text-foreground border border-border'
                  }`}
                >
                  <p>{m.text}</p>
                  {m.filters && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.filters.search && (
                        <Badge variant="outline" className="text-xs bg-purple-950/30 text-purple-300 border-purple-500/30">
                          Search: {m.filters.search}
                        </Badge>
                      )}
                      {m.filters.category && m.filters.category !== 'all' && (
                        <Badge variant="outline" className="text-xs bg-purple-950/30 text-purple-300 border-purple-500/30">
                          Category: {m.filters.category}
                        </Badge>
                      )}
                      {m.filters.varianceFilter && m.filters.varianceFilter !== 'all' && (
                        <Badge variant="outline" className="text-xs bg-purple-950/30 text-purple-300 border-purple-500/30">
                          Variance: {m.filters.varianceFilter}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="p-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse pl-7">
                <Bot className="h-3.5 w-3.5" /> AI assistant is searching catalogs and analyzing filters...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
