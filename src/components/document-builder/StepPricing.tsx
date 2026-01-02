import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import type { PricingItem } from '@/lib/templates/service-templates';

interface Props {
  items: PricingItem[];
  onChange: (items: PricingItem[]) => void;
  discount: { type: 'percentage' | 'fixed'; value: number };
  onDiscountChange: (discount: { type: 'percentage' | 'fixed'; value: number }) => void;
  totals: { subtotal: number; discountAmount: number; total: number };
}

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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Service description"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={item.unit} onValueChange={(v) => updateItem(item.id, 'unit', v)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="hour">Hour</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-28"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-right">Subtotal</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(totals.subtotal)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={discount.type}
                onValueChange={(v) => onDiscountChange({ ...discount, type: v as 'percentage' | 'fixed' })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                min="0"
                step={discount.type === 'percentage' ? '1' : '0.01'}
                max={discount.type === 'percentage' ? '100' : undefined}
                value={discount.value}
                onChange={(e) => onDiscountChange({ ...discount, value: parseFloat(e.target.value) || 0 })}
                className="w-32"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Discount: -{formatCurrency(totals.discountAmount)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
