import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Copy, DollarSign, Percent, Calculator } from 'lucide-react';
import type { PricingItem } from '@/lib/templates/service-templates';

interface Props {
  items: PricingItem[];
  onChange: (items: PricingItem[]) => void;
  discount: { type: 'percentage' | 'fixed'; value: number };
  onDiscountChange: (discount: { type: 'percentage' | 'fixed'; value: number }) => void;
  totals: { subtotal: number; discountAmount: number; total: number };
}

const TAX_RATES = {
  hst: { label: 'HST (13%)', rate: 0.13 },
  gst: { label: 'GST (5%)', rate: 0.05 },
  none: { label: 'No Tax', rate: 0 },
};

export function StepPricing({ items, onChange, discount, onDiscountChange, totals }: Props) {
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

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      fixed: 'Fixed',
      hour: '/hr',
      month: '/mo',
      year: '/yr',
    };
    return labels[unit] || unit;
  };

  return (
    <div className="space-y-6">
      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Line Items
            </CardTitle>
            <CardDescription>Add services, products, or fees</CardDescription>
          </div>
          <Button onClick={addItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No pricing items yet</p>
              <Button variant="outline" className="mt-3" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Item
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[35%]">Description</TableHead>
                    <TableHead className="w-[12%]">Qty</TableHead>
                    <TableHead className="w-[15%]">Unit</TableHead>
                    <TableHead className="w-[18%]">Unit Price</TableHead>
                    <TableHead className="w-[15%] text-right">Total</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Service or product description"
                          className="border-transparent hover:border-input focus:border-input"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-16 border-transparent hover:border-input focus:border-input"
                        />
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </TableCell>
                      <TableCell>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateItem(item)} title="Duplicate">
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)} title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-medium">Subtotal</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(totals.subtotal)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Discount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={discount.type}
                onValueChange={(v) => onDiscountChange({ ...discount, type: v as 'percentage' | 'fixed' })}
              >
                <SelectTrigger className="w-44">
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
              <Label>Value</Label>
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
                  className={`w-32 ${discount.type === 'fixed' ? 'pl-7' : ''}`}
                />
                {discount.type === 'percentage' && (
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            {totals.discountAmount > 0 && (
              <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                Discount Applied: <span className="font-medium text-destructive">-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Total Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-destructive">-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
