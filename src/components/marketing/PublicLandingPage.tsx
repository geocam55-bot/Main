import { useState, useEffect } from 'react';
import { publicAnonKey } from '../../utils/supabase/info';
import { buildServerFunctionUrl } from '../../utils/server-function-url';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Package } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PageElement {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'video' | 'button' | 'form' | 'product' | 'hero' | 'gallery' | 'navigation' | 'columns' | 'testimonial' | 'faq' | 'divider' | 'spacer' | 'social' | 'footer';
  content: string;
  styles?: {
    alignment?: 'left' | 'center' | 'right';
    size?: string;
  };
  products?: Array<{
    id: string;
    name: string;
    sku?: string;
    price: number;
    image?: string;
    description?: string;
    additionalText?: string;
  }>;
  productData?: {
    id: string;
    name: string;
    sku?: string;
    price: number;
    image?: string;
    description?: string;
    additionalText?: string;
  };
}

interface PublicLandingPageProps {
  slug: string;
}

export function PublicLandingPage({ slug }: PublicLandingPageProps) {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  // Track page visit
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get('campaign');
    const utmSource = urlParams.get('utm_source');
    const utmMedium = urlParams.get('utm_medium');
    const utmCampaign = urlParams.get('utm_campaign');

    const trackVisit = async () => {
      try {
        const response = await fetch(buildServerFunctionUrl('/analytics/landing-page/visit'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug,
            campaignId,
            utmSource,
            utmMedium,
            utmCampaign,
            referrer: document.referrer,
          }),
        });
        
        if (!response.ok) {
          return;
        }

        const result = await response.json();
      } catch (err) {
      }
    };

    if (slug && page) {
      trackVisit();
    }
  }, [slug, page]);

  // Track conversion
  const trackConversion = async (conversionType: string, conversionData?: any) => {
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get('campaign');

    try {
      await fetch(buildServerFunctionUrl('/analytics/landing-page/conversion'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          campaignId,
          conversionType,
          conversionData,
        }),
      });
    } catch (err) {
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    
    await trackConversion('form_submission', { email });
    toast.success('Thank you for subscribing!');
    setEmail('');
  };

  const handleButtonClick = async (buttonText: string) => {
    await trackConversion('button_click', { buttonText });
  };

  const handleProductClick = async (productData: any) => {
    await trackConversion('product_click', { productId: productData.id, productName: productData.name });
    toast.success(`${productData.name} added to cart!`);
  };

  useEffect(() => {
    const fetchPage = async () => {
      try {
        // Get campaign parameter for tracking
        const urlParams = new URLSearchParams(window.location.search);
        const campaignId = urlParams.get('campaign');
        
        const url = buildServerFunctionUrl(`/public/landing-page/${slug}`);
        
        // Use the public anon key for public endpoint access
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        
        if (!response.ok) {
          const text = await response.text();
          if (response.status === 404) throw new Error('Page not found');
          throw new Error('Failed to load page');
        }
        const data = await response.json();
        setPage(data.page);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    } else {
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || "The landing page you're looking for doesn't exist."}</p>
          <a href="/" className="text-blue-600 hover:underline">Return to Home</a>
        </div>
      </div>
    );
  }

  const elements: PageElement[] = page.content?.elements || [];
  const pageSettings = page.content?.settings || {};
  const accentColor = pageSettings.accentColor || '#2563eb';
  const textColor = pageSettings.textColor || '#172033';

  const renderElement = (element: PageElement) => {
    const alignment = element.styles?.alignment || 'center';
    
    const alignmentClass = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    }[alignment];

    switch (element.type) {
      case 'heading':
        return (
          <div className={`${alignmentClass} py-4`}>
            <h1 className="text-4xl font-bold leading-tight" style={{ color: textColor }}>{element.content}</h1>
          </div>
        );
      
      case 'paragraph':
        return (
          <div className={`${alignmentClass} py-4`}>
            <p className="text-lg leading-relaxed max-w-3xl mx-auto" style={{ color: textColor }}>{element.content}</p>
          </div>
        );
      
      case 'image':
        return (
          <div className={`${alignmentClass} py-6`}>
            {element.content && (
              <img 
                src={element.content} 
                alt="Content" 
                className="w-full max-w-4xl mx-auto rounded-lg shadow-sm"
                loading="lazy"
              />
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className={`${alignmentClass} py-6`}>
            {element.content && (
              <iframe
                src={element.content}
                className="w-full max-w-4xl mx-auto aspect-video rounded-lg shadow-sm"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        );
      
      case 'button':
        return (
          <div className={`${alignmentClass} py-6`}>
            <Button size="lg" className="text-lg px-8 py-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5" style={{ backgroundColor: accentColor }} onClick={() => handleButtonClick(element.content)}>
              {element.content}
            </Button>
          </div>
        );
      
      case 'form':
        return (
          <div className={`${alignmentClass} py-8`}>
            <div className="max-w-md mx-auto space-y-4 p-8 bg-muted rounded-xl border border-border shadow-sm">
              <h3 className="text-xl font-semibold" style={{ color: textColor }}>{element.content}</h3>
              <div className="space-y-3">
                <Input placeholder="Enter your email" type="email" className="h-12 bg-background" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button className="w-full h-12 text-base font-medium" style={{ backgroundColor: accentColor }} onClick={handleFormSubmit}>Submit</Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">We respect your privacy.</p>
            </div>
          </div>
        );

      case 'hero': {
        const [title, description, action] = element.content.split('|');
        return (
          <section className="rounded-lg bg-slate-950 px-8 py-16 text-center text-white sm:px-14 sm:py-24">
            <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{description}</p>
            <Button size="lg" className="mt-8" style={{ backgroundColor: accentColor }} onClick={() => handleButtonClick(action || 'Learn more')}>{action || 'Learn more'}</Button>
          </section>
        );
      }

      case 'navigation': {
        const [brand, ...links] = element.content.split('|').map((item) => item.trim());
        return (
          <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-2 py-4" aria-label="Page navigation">
            <span className="text-lg font-semibold">{brand || 'Brand'}</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">{links.map((link, index) => <span key={`${link}-${index}`}>{link}</span>)}</div>
          </nav>
        );
      }

      case 'columns': {
        const columns = element.content.split('|').map((item) => item.trim()).filter(Boolean);
        return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{columns.map((column, index) => <div key={`${column}-${index}`} className="min-h-32 border-t-2 border-slate-200 px-4 py-5 text-lg font-medium">{column}</div>)}</div>;
      }

      case 'gallery': {
        const images = element.content.split(',').map((item) => item.trim()).filter(Boolean);
        return <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Gallery image ${index + 1}`} className="aspect-[4/3] w-full rounded-md object-cover" loading="lazy" />)}</div>;
      }

      case 'testimonial': {
        const [quote, author] = element.content.split('|');
        return <figure className="mx-auto max-w-3xl py-8 text-center"><blockquote className="text-2xl font-medium leading-relaxed">“{quote}”</blockquote><figcaption className="mt-4 text-sm text-muted-foreground">{author}</figcaption></figure>;
      }

      case 'faq': {
        const [question, answer] = element.content.split('|');
        return <details className="group border-b border-slate-200 py-4"><summary className="cursor-pointer list-none font-medium">{question}<span className="float-right text-slate-400">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{answer}</p></details>;
      }

      case 'divider':
        return <hr className="my-6 border-0 border-t border-slate-200" />;

      case 'spacer': {
        const height = Math.min(Math.max(Number.parseInt(element.content, 10) || 48, 8), 240);
        return <div aria-hidden="true" style={{ height }} />;
      }

      case 'social': {
        const socialUrls: Record<string, string> = { instagram: 'https://instagram.com', facebook: 'https://facebook.com', linkedin: 'https://linkedin.com', youtube: 'https://youtube.com', x: 'https://x.com', twitter: 'https://x.com' };
        const networks = element.content.split('|').map((item) => item.trim()).filter(Boolean);
        return <div className="flex flex-wrap justify-center gap-3">{networks.map((network, index) => <a key={`${network}-${index}`} href={socialUrls[network.toLowerCase()] || '#'} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-muted">{network}</a>)}</div>;
      }

      case 'footer':
        return <footer className="border-t border-slate-200 py-6 text-center text-sm text-muted-foreground">{element.content}</footer>;

      case 'product':
        const products = element.products || (element.productData ? [element.productData] : []);
        if (!products || products.length === 0) return null;
        
        return (
          <div className={`${alignmentClass} py-12`}>
            <div className={`grid grid-cols-1 ${products.length > 1 ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-8 max-w-7xl mx-auto px-4`}>
              {products.map((productData, index) => (
                <div key={index} className="bg-background rounded-xl shadow-md overflow-hidden border border-border text-left hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                  {productData.image ? (
                    <div className="h-64 w-full bg-muted relative flex items-center justify-center p-4">
                       <img className="max-h-full max-w-full object-contain mix-blend-multiply" src={productData.image} alt={productData.name} />
                    </div>
                  ) : (
                    <div className="h-64 w-full bg-muted flex items-center justify-center">
                      <Package className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-lg font-bold text-foreground leading-tight">{productData.name}</h3>
                      {productData.sku && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono whitespace-nowrap">
                          {productData.sku}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">
                      {productData.description}
                    </p>
                    
                    {productData.additionalText && (
                      <div className="mb-6 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm font-medium">
                        {productData.additionalText}
                      </div>
                    )}
                    
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Price</span>
                        <span className="text-2xl font-bold text-foreground">${productData.price.toFixed(2)}</span>
                      </div>
                      <Button size="lg" className="shadow-sm px-6" style={{ backgroundColor: accentColor }} onClick={() => handleProductClick(productData)}>
                        Buy Now
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: pageSettings.backgroundColor || '#ffffff', color: textColor, fontFamily: pageSettings.fontFamily || 'Inter, sans-serif' }}>
      {/* Optional: Header/Nav could go here if configured in page settings */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8" style={{ maxWidth: pageSettings.contentWidth || '1200px' }}>
        {elements.map((element) => (
          <div key={element.id}>
            {renderElement(element)}
          </div>
        ))}
      </div>
      {/* Footer could go here */}
      <div className="border-t mt-12 py-8 bg-muted">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} {page.settings?.title || 'ProSpaces CRM'}. All rights reserved.
        </div>
      </div>
    </div>
  );
}