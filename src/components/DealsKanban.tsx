import { useState, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar, DollarSign, User, MoreVertical, Eye, FileText, AlertCircle, Send, Clock, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';

// Duplicate interface to avoid circular dependency
export interface LineItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  discount: number;
  total: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  priceTier: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'completed';
  validUntil: string;
  lineItems: LineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxPercent2?: number;
  taxAmount: number;
  taxAmount2?: number;
  total: number;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  organizationId?: string;
  readAt?: string;
}

interface DealsKanbanProps {
  quotes: Quote[];
  onStatusChange: (quote: Quote, newStatus: Quote['status']) => void;
  onEdit: (quote: Quote) => void;
  onPreview: (quote: Quote) => void;
  onDelete: (id: string, quote?: Quote) => void;
  onEmail: (quote: Quote) => void;
  onViewAgreement?: (quote: Quote) => void;
}

const ItemTypes = {
  DEAL: 'deal',
};

interface DragItem {
  id: string;
  type: string;
  status: string;
}

const DealCard = ({ 
  quote, 
  onEdit, 
  onPreview, 
  onDelete,
  onEmail,
  onViewAgreement
}: { 
  quote: Quote; 
  onEdit: (q: Quote) => void; 
  onPreview: (q: Quote) => void; 
  onDelete: (id: string, quote?: Quote) => void;
  onEmail: (q: Quote) => void;
  onViewAgreement?: (q: Quote) => void;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.DEAL,
    item: { id: quote.id, type: ItemTypes.DEAL, status: quote.status },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [quote.id, quote.status]);

  const isViewed = quote.status === 'viewed' || (quote.status === 'sent' && !!quote.readAt);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate Probability
  const getProbability = (status: string) => {
    switch (status) {
      case 'draft': return 10;
      case 'sent': return 40;
      case 'viewed': return 60;
      case 'accepted': return 100;
      case 'completed': return 100;
      case 'rejected': return 0;
      case 'expired': return 0;
      default: return 0;
    }
  };
  const probability = getProbability(quote.status);

  // Calculate Urgency & Staleness
  const validUntilDate = quote.validUntil ? new Date(quote.validUntil) : null;
  const daysUntilExpiration = validUntilDate && !isNaN(validUntilDate.getTime()) 
    ? Math.ceil((validUntilDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isUrgent = daysUntilExpiration > 0 && daysUntilExpiration <= 3;
  const isExpired = daysUntilExpiration <= 0 && validUntilDate !== null;
  
  const updatedDate = quote.updatedAt ? new Date(quote.updatedAt) : new Date();
  const daysSinceUpdate = !isNaN(updatedDate.getTime()) 
    ? Math.floor((new Date().getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isStale = daysSinceUpdate > 7 && ['draft', 'sent', 'viewed'].includes(quote.status);

  return (
    <div
      ref={drag}
      className={`mb-3 touch-none ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <Card className="bg-background shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-l-[3px] group relative overflow-hidden" 
        style={{ 
          borderLeftColor: 
            quote.status === 'accepted' ? '#22c55e' : 
            quote.status === 'completed' ? '#14b8a6' :
            quote.status === 'rejected' ? '#ef4444' : 
            quote.status === 'viewed' ? '#6366f1' :
            quote.status === 'sent' ? (isViewed ? '#6366f1' : '#3b82f6') : 
            quote.status === 'expired' ? '#f97316' : 
            '#9ca3af' 
        }}
      >
        <CardContent className="p-3 space-y-2.5">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                {quote.title}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {isUrgent && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-orange-200 text-orange-600 bg-orange-50 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    Expiring
                  </Badge>
                )}
                {isStale && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-border text-muted-foreground bg-muted">
                    Stale ({daysSinceUpdate}d)
                  </Badge>
                )}
                {quote.total > 5000 && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-200 text-green-600 bg-green-50">
                    High Value
                  </Badge>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-2 text-muted-foreground hover:text-muted-foreground">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background">
                {onViewAgreement && (
                  <>
                    <DropdownMenuItem onClick={() => onViewAgreement(quote)}>
                      <FileText className="h-3 w-3 mr-2" />
                      View Agreement
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => onEdit(quote)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPreview(quote)}>
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEmail(quote)}>
                  <Send className="h-3 w-3 mr-2" />
                  {quote.status === 'sent' ? 'Resend' : 'Send Quote'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(quote.id, quote)} className="text-red-600">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <span className="text-base">{formatCurrency(quote.total)}</span>
            </div>
            {['draft', 'sent', 'viewed'].includes(quote.status) && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Win Probability">
                <TrendingUp className={`h-3 w-3 ${probability > 50 ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span>{probability}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[140px]">{quote.contactName || 'No Contact'}</span>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="font-mono">{quote.quoteNumber}</span>
              <span>•</span>
              <span>{quote.createdAt && !isNaN(new Date(quote.createdAt).getTime()) ? new Date(quote.createdAt).toLocaleDateString() : ''}</span>
            </div>
            
            {isViewed ? (
              <div className="flex items-center gap-1 text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-full">
                <Eye className="h-2.5 w-2.5" /> Viewed
              </div>
            ) : quote.status === 'sent' ? (
              <div className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded-full">
                <Send className="h-2.5 w-2.5" /> Sent
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const KanbanColumn = ({ 
  title, 
  status, 
  quotes, 
  onDrop, 
  onEdit, 
  onPreview, 
  onDelete,
  onEmail,
  onViewAgreement
}: { 
  title: string; 
  status: string; 
  quotes: Quote[]; 
  onDrop: (item: DragItem, newStatus: string) => void;
  onEdit: (q: Quote) => void;
  onPreview: (q: Quote) => void;
  onDelete: (id: string, quote?: Quote) => void;
  onEmail: (q: Quote) => void;
  onViewAgreement?: (q: Quote) => void;
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.DEAL,
    drop: (item: DragItem) => onDrop(item, status),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [onDrop, status]);

  const totalValue = quotes.reduce((sum, q) => sum + q.total, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'accepted': return 'bg-green-50 border-green-200 text-green-700';
      case 'completed': return 'bg-teal-50 border-teal-200 text-teal-700';
      case 'rejected': return 'bg-red-50 border-red-200 text-red-700';
      case 'viewed': return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      case 'sent': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'expired': return 'bg-orange-50 border-orange-200 text-orange-700';
      default: return 'bg-muted border-border text-foreground';
    }
  };

  return (
    <div 
      ref={drop}
      className={`flex-shrink-0 w-64 md:w-72 flex flex-col h-full rounded-lg transition-colors ${
        isOver ? 'bg-muted ring-2 ring-blue-400 ring-inset' : 'bg-muted'
      }`}
    >
      {/* Column Header */}
      <div className={`p-3 border-b-2 rounded-t-lg flex flex-col gap-1 sticky top-0 bg-inherit z-10 ${getStatusColor(status).replace('bg-', 'border-').split(' ')[2]}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider">{title}</h3>
          <Badge variant="secondary" className="text-xs bg-background text-foreground">{quotes.length}</Badge>
        </div>
        <div className="text-xs font-medium opacity-80">
          {formatCurrency(totalValue)}
        </div>
      </div>

      {/* Column Content */}
      <div className="p-2 flex-1 overflow-y-auto min-h-[100px] scrollbar-thin scrollbar-thumb-gray-200">
        {quotes.map(quote => (
          <DealCard 
            key={quote.id} 
            quote={quote} 
            onEdit={onEdit} 
            onPreview={onPreview} 
            onDelete={onDelete}
            onEmail={onEmail}
            onViewAgreement={onViewAgreement}
          />
        ))}
        {quotes.length === 0 && (
          <div className="h-24 flex flex-col items-center justify-center text-muted-foreground text-xs border-2 border-dashed border-border rounded-lg m-1">
            <span className="mb-1">No deals</span>
            <span className="opacity-50">Drop here</span>
          </div>
        )}
      </div>
    </div>
  );
};

export function DealsKanban({ quotes, onStatusChange, onEdit, onPreview, onDelete, onEmail, onViewAgreement }: DealsKanbanProps) {
  const columns = [
    { id: 'draft', title: 'Draft' },
    { id: 'sent', title: 'Sent' },
    { id: 'viewed', title: 'Viewed' },
    { id: 'accepted', title: 'Accepted' },
    { id: 'completed', title: 'Completed' },
    { id: 'rejected', title: 'Rejected' },
    { id: 'expired', title: 'Expired' },
  ];

  const handleDrop = (item: DragItem, newStatus: string) => {
    // Determine effective current status (handling the implicit "viewed" state)
    const quote = quotes.find(q => q.id === item.id);
    if (!quote) return;

    const currentEffectiveStatus = (quote.status === 'sent' && quote.readAt) ? 'viewed' : quote.status;

    if (currentEffectiveStatus !== newStatus) {
        onStatusChange(quote, newStatus as Quote['status']);
    }
  };

  // Detect touch device and choose appropriate DnD backend
  const isTouchDevice = useMemo(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const backend = isTouchDevice ? TouchBackend : HTML5Backend;
  const backendOptions = isTouchDevice ? { enableMouseEvents: true, delayTouchStart: 200 } : undefined;

  return (
    <DndProvider backend={backend} options={backendOptions}>
      <div className="flex h-full overflow-x-auto gap-4 pb-4 items-start">
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            title={col.title}
            status={col.id}
            quotes={quotes.filter(q => {
              if (col.id === 'viewed') return q.status === 'viewed' || (q.status === 'sent' && !!q.readAt);
              if (col.id === 'sent') return q.status === 'sent' && !q.readAt;
              return q.status === col.id;
            })}
            onDrop={handleDrop}
            onEdit={onEdit}
            onPreview={onPreview}
            onDelete={onDelete}
            onEmail={onEmail}
            onViewAgreement={onViewAgreement}
          />
        ))}
      </div>
    </DndProvider>
  );
}