import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CalendarIcon, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  isRequired: boolean;
}

interface Client {
  id: string;
  company_name: string;
}

interface Props {
  signers: Signer[];
  onChange: (signers: Signer[]) => void;
  client: Client | null;
  expiresAt: Date | null;
  onExpiresAtChange: (date: Date | null) => void;
}

export function StepSignatures({ signers, onChange, client, expiresAt, onExpiresAtChange }: Props) {
  const addSigner = (role: 'cipherx' | 'client') => {
    const newSigner: Signer = {
      id: Date.now().toString(),
      name: role === 'cipherx' ? 'Diego Camacho' : '',
      email: role === 'cipherx' ? 'diego@cipherxsolutions.com' : '',
      role: role === 'cipherx' ? 'CipherX Representative' : 'Client Representative',
      isRequired: true,
    };
    onChange([...signers, newSigner]);
  };

  const updateSigner = (id: string, field: keyof Signer, value: string | boolean) => {
    onChange(signers.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSigner = (id: string) => {
    onChange(signers.filter(s => s.id !== id));
  };

  const cipherxSigners = signers.filter(s => s.role === 'CipherX Representative');
  const clientSigners = signers.filter(s => s.role === 'Client Representative');

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CipherX Signers</CardTitle>
            <CardDescription>Representatives from CipherX Solutions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cipherxSigners.map((signer) => (
              <div key={signer.id} className="flex items-start gap-2 p-3 border rounded-lg">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                <div className="flex-1 space-y-2">
                  <Input
                    value={signer.name}
                    onChange={(e) => updateSigner(signer.id, 'name', e.target.value)}
                    placeholder="Full name"
                  />
                  <Input
                    type="email"
                    value={signer.email}
                    onChange={(e) => updateSigner(signer.id, 'email', e.target.value)}
                    placeholder="Email address"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={signer.isRequired}
                        onCheckedChange={(v) => updateSigner(signer.id, 'isRequired', v)}
                      />
                      <Label className="text-sm">Required</Label>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeSigner(signer.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => addSigner('cipherx')}>
              <Plus className="h-4 w-4 mr-2" />
              Add CipherX Signer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Signers</CardTitle>
            <CardDescription>
              Representatives from {client?.company_name || 'the client'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientSigners.map((signer) => (
              <div key={signer.id} className="flex items-start gap-2 p-3 border rounded-lg">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                <div className="flex-1 space-y-2">
                  <Input
                    value={signer.name}
                    onChange={(e) => updateSigner(signer.id, 'name', e.target.value)}
                    placeholder="Full name"
                  />
                  <Input
                    type="email"
                    value={signer.email}
                    onChange={(e) => updateSigner(signer.id, 'email', e.target.value)}
                    placeholder="Email address"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={signer.isRequired}
                        onCheckedChange={(v) => updateSigner(signer.id, 'isRequired', v)}
                      />
                      <Label className="text-sm">Required</Label>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeSigner(signer.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => addSigner('client')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client Signer
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Expiration</CardTitle>
          <CardDescription>Set when this document expires if not signed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-[280px] justify-start text-left font-normal', !expiresAt && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, 'PPP') : 'Select expiration date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expiresAt || undefined}
                  onSelect={(date) => onExpiresAtChange(date || null)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {expiresAt && (
              <Button variant="ghost" onClick={() => onExpiresAtChange(null)}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
