import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';


const MultiSelectPills = ({ options, selectedString, onChange, disabled }: any) => {
  let selected = [];
  try { selected = JSON.parse(selectedString); if(!Array.isArray(selected)) selected = []; } catch(e) { selected = []; }
  
  if (options.length === 0) return <div className="text-xs text-slate-500 dark:text-slate-400 italic">No options available</div>;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt: any) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (isSelected) onChange(JSON.stringify(selected.filter((v: string) => v !== opt.value)));
              else onChange(JSON.stringify([...selected, opt.value]));
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              isSelected
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30'
                : 'bg-white dark:bg-[#151c2c]/50 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10 hover:border-slate-500'
            }`}
          >
            {opt.label}
          </button>
        );
      })}


    </div>
  );
};

export default function CouponsManager() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    percentageType: 'FLAT',
    minPurchaseValue: '',
    maxDiscountValue: '',
    expiryDate: '',
    usageLimit: '',
    clientId: '',
    planId: '',
    categoryId: '',
    isPublic: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resCoupons, resClients, resPlans, resCategories] = await Promise.all([
        api.getCoupons(),
        api.getAdminClients(),
        api.getAdminPlans(),
        api.getAdminCategories()
      ]);
      if (resCoupons.success) setCoupons(resCoupons.data);
      if (resClients.success) setClients(resClients.data);
      if (resPlans.success) setPlans(resPlans.data);
      if (resCategories.success) setCategories(resCategories.data);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (coupon: any = null) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue.toString(),
        percentageType: coupon.percentageType || 'FLAT',
        minPurchaseValue: coupon.minPurchaseValue?.toString() || '',
        maxDiscountValue: coupon.maxDiscountValue?.toString() || '',
        expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
        usageLimit: coupon.usageLimit?.toString() || '',
        clientId: coupon.clientId || '',
        planId: coupon.planId || '',
        categoryId: coupon.categoryId || '',
        isPublic: !!coupon.isPublic
      });
    } else {
      setEditingCoupon(null);
      setFormData({ 
        code: '', discountType: 'PERCENTAGE', discountValue: '', percentageType: 'FLAT', 
        minPurchaseValue: '', maxDiscountValue: '', expiryDate: '', usageLimit: '', 
        clientId: '', planId: '[]', categoryId: '[]', isPublic: false 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        percentageType: formData.discountType === 'PERCENTAGE' ? formData.percentageType : null,
        minPurchaseValue: formData.minPurchaseValue ? parseFloat(formData.minPurchaseValue) : null,
        maxDiscountValue: (formData.discountType === 'PERCENTAGE' && formData.percentageType === 'CAPPED' && formData.maxDiscountValue) ? parseFloat(formData.maxDiscountValue) : null,
        expiryDate: formData.expiryDate || null,
        usageLimit: formData.clientId ? 1 : (formData.usageLimit ? parseInt(formData.usageLimit) : null),
        clientId: formData.clientId || null,
        planId: formData.planId !== '[]' ? formData.planId : null,
        categoryId: formData.categoryId !== '[]' ? formData.categoryId : null,
        isPublic: formData.isPublic
      };

      if (editingCoupon) {
        await api.updateCoupon(editingCoupon.id, payload);
        alert('Coupon updated');
      } else {
        await api.createCoupon(payload);
        alert('Coupon created');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving coupon');
    }
  };

  
  const handleToggleVisibility = (id: string) => {
    const coupon = coupons.find(c => c.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Change Visibility',
      message: `Are you sure you want to ${coupon?.isPublic ? 'hide' : 'show'} coupon ${coupon?.code} from clients?`,
      onConfirm: async () => {
        try {
          await api.toggleCouponVisibility(id);
          fetchData();
        } catch (err: any) {
          alert(err.message || 'Error toggling visibility');
        }
      }
    });
  };
  
  const handleToggleStatus = (id: string) => {
    const coupon = coupons.find(c => c.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Change Status',
      message: `Are you sure you want to ${coupon?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} coupon ${coupon?.code}?`,
      onConfirm: async () => {
        try {
          await api.toggleCouponStatus(id);
          fetchData();
        } catch (err: any) {
          alert(err.message || 'Error toggling status');
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Coupon Management</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Create and manage discount codes for plans</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
        >
          <Plus className="h-4 w-4" />
          <span>Create Coupon</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#151c2c] rounded-xl border border-slate-300 dark:border-white/10 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-100 dark:bg-slate-700/50">
            <tr>
              <th className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">Code</th>
              <th className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">Details</th>
              <th className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">Restrictions</th>
              <th className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">Usage</th>
              <th className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">Expiry</th>
              <th className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">Client Visibility</th>
              <th className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
              <th className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {coupons.map((c) => {
              const isExpired = c.expiryDate && new Date(c.expiryDate).getTime() < Date.now();
              const displayStatus = isExpired ? 'EXPIRED' : c.status;
              
              return (
              <tr key={c.id} className="hover:bg-slate-100 dark:hover:bg-slate-700/30 transition">
                <td className="py-4 px-6 text-slate-900 dark:text-white font-medium">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-indigo-400" />
                    <span>{c.code}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-slate-700 dark:text-slate-300">
                  {c.discountType === 'PERCENTAGE' 
                    ? `${c.discountValue}% ${c.percentageType === 'CAPPED' ? `(Max ₹${c.maxDiscountValue || 0})` : '(Flat)'}` 
                    : `₹${c.discountValue} Flat`}
                </td>
                <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-xs space-y-1">
                  {c.minPurchaseValue && <div>Min Buy: ₹{c.minPurchaseValue}</div>}
                  {c.clientId && <div>Client Specific</div>}
                  {c.planId && <div>Plan Specific</div>}
                  {c.categoryId && <div>Category Specific</div>}
                  {(!c.minPurchaseValue && !c.clientId && !c.planId && !c.categoryId) && <span className="text-slate-500 dark:text-slate-400">None</span>}
                </td>
                <td className="py-4 px-6 text-slate-700 dark:text-slate-300">
                  {c.usedCount} {c.usageLimit ? `/ ${c.usageLimit}` : ' (Unlimited)'}
                </td>
                <td className="py-4 px-6 text-slate-700 dark:text-slate-300">
                  {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'Never'}
                </td>
                
                <td className="py-4 px-6 text-slate-700 dark:text-slate-300">
                  <button onClick={() => handleToggleVisibility(c.id)} className="flex items-center space-x-1 hover:text-indigo-400 transition" title="Toggle Client Visibility">
                    {c.isPublic ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
                    <span className="text-xs">{c.isPublic ? 'Visible' : 'Hidden'}</span>
                  </button>
                </td>
  
                <td className="py-4 px-6">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${displayStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : displayStatus === 'EXPIRED' ? 'bg-red-500/10 text-red-500' : 'bg-slate-500/10 text-slate-400'}`}>
                    {displayStatus}
                  </span>
                </td>
                <td className="py-4 px-6 text-right space-x-2">
                  {!isExpired && (
                    <>
                      <button onClick={() => handleToggleStatus(c.id)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white" title="Toggle Status">
                        {c.status === 'ACTIVE' ? <XCircle className="h-5 w-5 text-amber-500" /> : <CheckCircle className="h-5 w-5 text-emerald-500" />}
                      </button>
                      <button onClick={() => handleOpenModal(c)} className="text-slate-600 dark:text-slate-400 hover:text-indigo-400">
                        <Edit2 className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )})}
            {coupons.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-600 dark:text-slate-400">No coupons found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto pt-24 pb-12">
          <div className="bg-white dark:bg-[#151c2c] rounded-2xl w-full max-w-2xl border border-slate-300 dark:border-white/10 shadow-xl my-auto">
            <div className="p-6 border-b border-slate-300 dark:border-white/10">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Coupon Code</label>
                <input
                  required
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={!!editingCoupon}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white disabled:opacity-50"
                  placeholder="e.g. SUMMER50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Discount Value {formData.discountType === 'PERCENTAGE' ? '(%)' : '(₹)'}</label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.discountValue}
                    onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {formData.discountType === 'PERCENTAGE' && (
                <div className="grid grid-cols-2 gap-4 border border-slate-300 dark:border-white/10 p-4 rounded-lg bg-white dark:bg-[#151c2c]/50">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Percentage Type</label>
                    <select
                      value={formData.percentageType}
                      onChange={e => setFormData({ ...formData, percentageType: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                    >
                      <option value="FLAT">Flat Percentage</option>
                      <option value="CAPPED">Capped (Min/Max limits)</option>
                    </select>
                  </div>
                  {formData.percentageType === 'CAPPED' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Discount Value (₹)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={formData.maxDiscountValue}
                        onChange={e => setFormData({ ...formData, maxDiscountValue: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Min Purchase Value (₹) (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minPurchaseValue}
                    onChange={e => setFormData({ ...formData, minPurchaseValue: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Usage Limit {formData.clientId ? "(Fixed to 1 for specific user)" : "(Optional)"}</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={!!formData.clientId}
                    value={formData.clientId ? "1" : formData.usageLimit}
                    onChange={e => { if(!formData.clientId) setFormData({ ...formData, usageLimit: e.target.value }) }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="border-t border-slate-300 dark:border-white/10 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Restrictions (Optional)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Restrict to Client</label>
                    <select
                      value={formData.clientId}
                      onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Any Client --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Restrict to Segment (Multi-select)</label>
                      <MultiSelectPills
                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                        selectedString={formData.categoryId}
                        onChange={(val: string) => {
                          setFormData({ ...formData, categoryId: val, planId: '[]' }); // Reset plans when categories change
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Restrict to Plan (Filtered by Segment)</label>
                      {(() => {
                        let selectedCats = [];
                        try { selectedCats = JSON.parse(formData.categoryId); if(!Array.isArray(selectedCats)) selectedCats = []; } catch(e) { selectedCats = []; }
                        
                        const filteredPlans = selectedCats.length > 0 
                          ? plans.filter(p => selectedCats.includes(p.categoryId))
                          : plans;

                        return (
                          <MultiSelectPills
                            options={filteredPlans.map(p => ({ value: p.id || p._id, label: p.name }))}
                            selectedString={formData.planId}
                            onChange={(val: string) => setFormData({ ...formData, planId: val })}
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-300 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151c2c] rounded-2xl w-full max-w-sm border border-slate-300 dark:border-white/10 shadow-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">{confirmDialog.message}</p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}