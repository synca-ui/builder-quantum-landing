import React, { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MenuItem {
  id?: string;
  name: string;
  description?: string;
  price?: string | number;
  category?: string;
  image?: string;
}

interface MenuItemsCardProps {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
}

export function MenuItemsCard({ items = [], onChange }: MenuItemsCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<MenuItem>({ name: '' });

  const addItem = () => {
    if (!newItem.name.trim()) return;
    const items_list = Array.isArray(items) ? items : [];
    const item = {
      ...newItem,
      id: `item-${Date.now()}`
    };
    onChange([...items_list, item]);
    setNewItem({ name: '' });
  };

  const updateItem = (id: string, updated: MenuItem) => {
    const items_list = Array.isArray(items) ? items : [];
    onChange(items_list.map(item => item.id === id ? updated : item));
  };

  const deleteItem = (id: string | undefined) => {
    if (!id) return;
    const items_list = Array.isArray(items) ? items : [];
    onChange(items_list.filter(item => item.id !== id));
  };

  const items_list = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-4">
      {/* Items List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {items_list.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No menu items yet</p>
        ) : (
          items_list.map(item => (
            <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                {item.description && (
                  <p className="text-xs text-gray-600 truncate">{item.description}</p>
                )}
                {item.price && (
                  <p className="text-sm font-semibold text-gray-700 mt-1">€{item.price}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditingId(item.id || null)}
                  className="p-1 hover:bg-gray-200 rounded text-gray-600"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Item Form */}
      <div className="border-t pt-4 space-y-3">
        <h4 className="font-medium text-gray-900">Add Menu Item</h4>
        
        <div>
          <label className="block text-xs font-medium text-gray-700">Name *</label>
          <input
            type="text"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            placeholder="e.g., Cappuccino"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Description</label>
          <input
            type="text"
            value={newItem.description || ''}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="e.g., Espresso with steamed milk"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Price (€)</label>
            <input
              type="number"
              step="0.01"
              value={newItem.price || ''}
              onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              placeholder="3.50"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Category</label>
            <input
              type="text"
              value={newItem.category || ''}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              placeholder="e.g., Coffee"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <Button
          onClick={addItem}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>
    </div>
  );
}

export default MenuItemsCard;
