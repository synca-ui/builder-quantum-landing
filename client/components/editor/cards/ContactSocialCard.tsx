import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

export interface ContactMethod {
  type: 'phone' | 'email' | 'whatsapp' | 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube' | 'website' | 'linkedin';
  value: string;
  label?: string;
}

interface ContactSocialCardProps {
  contacts?: ContactMethod[];
  onChange?: (contacts: ContactMethod[]) => void;
}

const CONTACT_TYPES = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'website', label: 'Website' },
  { value: 'linkedin', label: 'LinkedIn' }
];

export function ContactSocialCard({ contacts = [], onChange }: ContactSocialCardProps) {
  const [items, setItems] = useState<ContactMethod[]>(contacts || []);
  const [newContact, setNewContact] = useState<ContactMethod>({
    type: 'phone',
    value: '',
    label: ''
  });

  const addContact = () => {
    if (!newContact.value.trim()) return;

    const updated = [...items, newContact];
    setItems(updated);
    onChange?.(updated);
    setNewContact({ type: 'phone', value: '', label: '' });
  };

  const removeContact = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    onChange?.(updated);
  };

  const updateContact = (index: number, updates: Partial<ContactMethod>) => {
    const updated = [...items];
    updated[index] = { ...updated[index], ...updates };
    setItems(updated);
    onChange?.(updated);
  };

  const getDisplayLabel = (contact: ContactMethod) => {
    return contact.label || CONTACT_TYPES.find(t => t.value === contact.type)?.label || contact.type;
  };

  return (
    <div className="space-y-4">
      {/* Existing Contacts */}
      <div className="space-y-2">
        {items.map((contact, index) => (
          <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{getDisplayLabel(contact)}</p>
              <p className="text-sm text-gray-600">{contact.value}</p>
            </div>
            <button
              onClick={() => removeContact(index)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Remove contact"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Contact Form */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900">Add Contact Method</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={newContact.type}
            onChange={(e) => setNewContact({ ...newContact, type: e.target.value as ContactMethod['type'] })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {CONTACT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Value</label>
          <input
            type="text"
            value={newContact.value}
            onChange={(e) => setNewContact({ ...newContact, value: e.target.value })}
            placeholder={newContact.type === 'email' ? 'hello@example.com' : newContact.type === 'phone' ? '+1 (555) 123-4567' : 'Enter value'}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Custom Label (optional)</label>
          <input
            type="text"
            value={newContact.label || ''}
            onChange={(e) => setNewContact({ ...newContact, label: e.target.value })}
            placeholder="e.g., Main Office, Personal"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <Button
          onClick={addContact}
          disabled={!newContact.value.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </div>

      {items.length > 0 && (
        <p className="text-xs text-gray-500">
          {items.length} contact method{items.length !== 1 ? 's' : ''} added
        </p>
      )}
    </div>
  );
}

export default ContactSocialCard;
