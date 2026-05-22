import React from 'react';
import { KitchenMaterials, KitchenConfig } from '../../types/kitchen';
import { Card } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Package, Wrench, Hammer, Box } from 'lucide-react';

interface KitchenMaterialsListProps {
  materials: KitchenMaterials;
  config: KitchenConfig;
}

export function KitchenMaterialsList({ materials, config }: KitchenMaterialsListProps) {
  const formatPrice = (price: number | undefined) => {
    if (!price) return '-';
    return `$${price.toFixed(2)}`;
  };

  const calculateCategoryTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  const grandTotal = 
    calculateCategoryTotal(materials.cabinets) +
    calculateCategoryTotal(materials.countertops) +
    calculateCategoryTotal(materials.appliances) +
    calculateCategoryTotal(materials.hardware) +
    calculateCategoryTotal(materials.installation);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Kitchen Materials List</h2>
            <p className="text-sm text-muted-foreground">
              {config.roomWidth}' × {config.roomLength}' {config.layoutStyle} Kitchen
            </p>
          </div>
        </div>

        {/* Cabinets */}
        {materials.cabinets.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Box className="h-5 w-5 text-blue-600" />
              Cabinets ({materials.cabinets.length} items)
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Category</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.cabinets.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-center text-xs">{item.category}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">{item.unit}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-blue-50">
                  <TableCell colSpan={5} className="font-semibold">Cabinets Subtotal</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${calculateCategoryTotal(materials.cabinets).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Countertops */}
        {materials.countertops.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Box className="h-5 w-5 text-purple-600" />
              Countertops & Backsplash
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.countertops.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">{item.unit}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-purple-50">
                  <TableCell colSpan={4} className="font-semibold">Countertops Subtotal</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${calculateCategoryTotal(materials.countertops).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Appliances */}
        {materials.appliances.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-green-600" />
              Appliances
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.appliances.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">{item.unit}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-green-50">
                  <TableCell colSpan={4} className="font-semibold">Appliances Subtotal</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${calculateCategoryTotal(materials.appliances).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Hardware */}
        {materials.hardware.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Wrench className="h-5 w-5 text-orange-600" />
              Hardware
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.hardware.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">{item.unit}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-orange-50">
                  <TableCell colSpan={4} className="font-semibold">Hardware Subtotal</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${calculateCategoryTotal(materials.hardware).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Installation */}
        {materials.installation.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Hammer className="h-5 w-5 text-muted-foreground" />
              Installation
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.installation.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">{item.unit}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted">
                  <TableCell colSpan={4} className="font-semibold">Installation Subtotal</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${calculateCategoryTotal(materials.installation).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Grand Total */}
        <div className="mt-6 pt-6 border-t-2">
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold">Grand Total</span>
            <span className="text-2xl font-bold text-blue-600">
              ${grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
