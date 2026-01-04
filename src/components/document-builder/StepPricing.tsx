import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Copy, DollarSign, Percent, Calculator } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { PricingItem } from '@/lib/templates/service-templates';

interface Props {
  items: PricingItem[];
  onChange: (items: PricingItem[]) => void;
  discount: { type: 'percentage' | 'fixed'; value: number };
  onDiscountChange: (discount: { type: 'percentage' | 'fixed'; value: number }) => void;
  totals: { subtotal: number; discountAmount: number; total: number };
}

export function StepPricing({ items, onChange, discount, onDiscountChange, totals }: Props) {
  const isMobile = useIsMobile();

  const addItem = () => {
    const newItem: PricingItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      unit: 'fixed',
    };
    onChange([...items, newItem]);
  };

  const duplicateItem = (item: PricingItem) => {
    const newItem: PricingItem = {
      ...item,
      id: Date.now().toString(),
      description: `${item.description} (Copy)`,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof PricingItem, value: string | number) => {
    onChange(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 pb-3 sm:pb-4">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
              Line Items
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Add services, products, or fees</CardDescription>
          </div>
          <Button onClick={addItem} size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-20" />
              <p className="text-sm">No pricing items yet</p>
              <Button variant="outline" className="mt-3" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Item
              </Button>
            </div>
          ) : isMobile ? (
            // Mobile Card Layout
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="p-3 border rounded-lg space-y-3 bg-muted/20">
                  <div className="flex items-start justify-between gap-2">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="flex-1 text-sm"
                    />
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateItem(item)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Unit</Label>
                      <Select value={item.unit} onValueChange={(v) => updateItem(item.id, 'unit', v)}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="hour">Per Hour</SelectItem>
                          <SelectItem value="month">Per Month</SelectItem>
                          <SelectItem value="year">Per Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Price</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="pl-6 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Item Total</span>
                    <span className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">Subtotal</span>
                <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
              </div>
            </div>
          ) : (
            // Desktop Table Layout
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 text-left text-sm">
                    <th className="p-3 font-medium w-[35%]">Description</th>
                    <th className="p-3 font-medium w-[10%]">Qty</th>
                    <th className="p-3 font-medium w-[15%]">Unit</th>
                    <th className="p-3 font-medium w-[18%]">Unit Price</th>
                    <th className="p-3 font-medium w-[15%] text-right">Total</th>
                    <th className="p-3 w-[7%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t group">
                      <td className="p-2">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Service or product description"
                          className="border-transparent hover:border-input focus:border-input"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-16 border-transparent hover:border-input focus:border-input"
                        />
                      </td>
                      <td className="p-2">
                        <Select value={item.unit} onValueChange={(v) => updateItem(item.id, 'unit', v)}>
                          <SelectTrigger className="w-24 border-transparent hover:border-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="hour">Per Hour</SelectItem>
                            <SelectItem value="month">Per Month</SelectItem>
                            <SelectItem value="year">Per Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="pl-7 w-28 border-transparent hover:border-input focus:border-input"
                          />
                        </div>
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                      <td className="p-2">
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateItem(item)} title="Duplicate">
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)} title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={4} className="p-3 text-right font-medium">Subtotal</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(totals.subtotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Percent className="h-4 w-4 sm:h-5 sm:w-5" />
            Discount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label className="text-sm">Discount Type</Label>
              <Select
                value={discount.type}
                onValueChange={(v) => onDiscountChange({ ...discount, type: v as 'percentage' | 'fixed' })}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <span className="flex items-center gap-2">
                      <Percent className="h-3 w-3" /> Percentage
                    </span>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3" /> Fixed Amount
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Value</Label>
              <div className="relative">
                {discount.type === 'fixed' && (
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  type="number"
                  min="0"
                  step={discount.type === 'percentage' ? '1' : '0.01'}
                  max={discount.type === 'percentage' ? '100' : undefined}
                  value={discount.value}
                  onChange={(e) => onDiscountChange({ ...discount, value: parseFloat(e.target.value) || 0 })}
                  className={`w-full sm:w-32 ${discount.type === 'fixed' ? 'pl-7' : ''}`}
                />
                {discount.type === 'percentage' && (
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            {totals.discountAmount > 0 && (
              <div className="text-xs sm:text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg w-full sm:w-auto">
                Discount Applied: <span className="font-medium text-destructive">-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Total Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 sm:pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-destructive">-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <span className="text-base sm:text-lg font-bold">Total</span>
              <span className="text-xl sm:text-2xl font-bold text-primary">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
