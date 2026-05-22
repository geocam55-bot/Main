import React, { useEffect, useMemo, useState } from 'react';
import { Search, User, X } from 'lucide-react';
import { contactsAPI } from '../../utils/api';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  price_level: string;
}

interface CustomerSelectorProps {
  organizationId: string;
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  userId?: string;
  showLabel?: boolean;
  label?: string;
}

export function CustomerSelector({ 
  organizationId, 
  selectedCustomer, 
  onCustomerSelect,
  userId: _userId,
  showLabel = true,
  label = 'Customer (Optional)'
}: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load customers using the same shared contacts API as the main CRM
  useEffect(() => {
    if (organizationId) {
      void loadCustomers();
    } else {
      setCustomers([]);
    }
  }, [organizationId]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return customers
      .filter((customer) => {
        if (!normalizedSearch) return true;

        return [customer.name, customer.email, customer.company]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .slice(0, 50);
  }, [customers, searchQuery]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const { contacts } = await contactsAPI.getAll('personal');

      const normalizedCustomers = (contacts || [])
        .filter((contact: any) => {
          const contactOrgId = contact.organizationId || contact.organization_id;
          return !organizationId || !contactOrgId || contactOrgId === organizationId;
        })
        .map((contact: any) => ({
          id: contact.id,
          name: contact.name || '',
          email: contact.email || '',
          phone: contact.phone || '',
          company: contact.company || '',
          price_level: contact.priceLevel || contact.price_level || 't1',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setCustomers(normalizedCustomers);
    } catch (error) {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onCustomerSelect(customer);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const handleClearCustomer = () => {
    onCustomerSelect(null);
    setSearchQuery('');
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <label className="block text-sm text-foreground">
          {label}
        </label>
      )}
      
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm text-foreground">{selectedCustomer.name}</div>
              {selectedCustomer.company && (
                <div className="text-xs text-muted-foreground">{selectedCustomer.company}</div>
              )}
              <div className="text-xs text-green-600 mt-1">
                Price Tier: {selectedCustomer.price_level}
              </div>
            </div>
          </div>
          <button
            onClick={handleClearCustomer}
            className="p-1 text-muted-foreground hover:text-muted-foreground rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative" style={{ zIndex: 50 }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search customers by name, email, or company..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0"
                style={{ zIndex: 40 }}
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ zIndex: 51 }}>
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading customers...
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No customers found
                  </div>
                ) : (
                  <div className="py-1">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full px-4 py-3 text-left hover:bg-muted flex items-start gap-3 border-b border-border last:border-b-0"
                      >
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground truncate">
                            {customer.name}
                          </div>
                          {customer.company && (
                            <div className="text-xs text-muted-foreground truncate">
                              {customer.company}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {customer.email && (
                              <div className="text-xs text-muted-foreground truncate">
                                {customer.email}
                              </div>
                            )}
                            <div className="text-xs text-green-600">
                              {customer.price_level}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      {selectedCustomer && (
        <div className="text-xs text-muted-foreground">
          Materials will be priced at <span className="text-green-600">{selectedCustomer.price_level.toUpperCase()}</span> tier
        </div>
      )}
    </div>
  );
}