import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CreditCard, Check, X, AlertCircle } from 'lucide-react';
import { superAdminService } from '../../services/firebase/superAdminService';
import { Clinic } from '../../lib/firebase/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface SubscriptionManagerProps {
  clinic: Clinic;
  onClose?: () => void;
}

type SubscriptionStatus = 'trial' | 'active' | 'inactive';

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ clinic, onClose }) => {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<SubscriptionStatus>(clinic.subscriptionStatus);
  const [endDate, setEndDate] = useState(
    clinic.subscriptionEndDate
      ? new Date(clinic.subscriptionEndDate).toISOString().split('T')[0]
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Calculate subscription details
  const daysRemaining = clinic.subscriptionEndDate
    ? Math.ceil((new Date(clinic.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  // Update subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: () =>
      superAdminService.updateSubscription({
        clinicId: clinic.id!,
        status: newStatus,
        endDate: new Date(endDate),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clinics'] });
      queryClient.invalidateQueries({ queryKey: ['platform-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-stats', clinic.id] });
      if (onClose) onClose();
    },
  });

  // Activate clinic mutation (convert trial to active)
  const activateClinicMutation = useMutation({
    mutationFn: () => superAdminService.activateClinic(clinic.id!, 12, 10000), // 12 months, ₹10,000
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clinics'] });
      queryClient.invalidateQueries({ queryKey: ['platform-analytics'] });
      setNewStatus('active');
    },
  });

  const handleUpdateSubscription = () => {
    updateSubscriptionMutation.mutate();
  };

  const handleQuickActivate = () => {
    activateClinicMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
          Current Subscription Status
        </h3>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Status:</span>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${clinic.subscriptionStatus === 'active'
                ? 'bg-green-100 text-green-800'
                : clinic.subscriptionStatus === 'trial'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
                }`}
            >
              {clinic.subscriptionStatus.toUpperCase()}
            </span>
          </div>

          {/* End Date */}
          {clinic.subscriptionEndDate && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">End Date:</span>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium text-gray-900">
                  {new Date(clinic.subscriptionEndDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Days Remaining */}
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Days Remaining:</span>
            <span
              className={`font-semibold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-green-600'
                }`}
            >
              {isExpired ? 'EXPIRED' : isExpiringSoon ? `${daysRemaining} days (expiring soon)` : `${daysRemaining} days`}
            </span>
          </div>

          {/* Alert Messages */}
          {isExpired && (
            <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">Subscription Expired</p>
                <p>This clinic has read-only access. Activate subscription to restore full access.</p>
              </div>
            </div>
          )}

          {isExpiringSoon && !isExpired && (
            <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold">Subscription Expiring Soon</p>
                <p>Renew before {clinic.subscriptionEndDate ? new Date(clinic.subscriptionEndDate).toLocaleDateString() : 'soon'} to avoid interruption.</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Activate (Trial to Active) */}
      {clinic.subscriptionStatus === 'trial' && (
        <Card className="p-6 bg-blue-50 border-2 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Activate Subscription</h3>
          <p className="text-sm text-blue-700 mb-4">
            Convert this trial to an active subscription with 1 year validity.
          </p>
          <Button
            variant="primary"
            onClick={handleQuickActivate}
            disabled={activateClinicMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {activateClinicMutation.isPending ? 'Activating...' : 'Activate for 1 Year'}
          </Button>
        </Card>
      )}

      {/* Manual Update Form */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Subscription</h3>

        <div className="space-y-4">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setNewStatus('trial')}
                className={`p-3 text-center rounded-lg border-2 transition-colors ${newStatus === 'trial'
                  ? 'border-yellow-500 bg-yellow-50 text-yellow-900'
                  : 'border-gray-200 hover:border-yellow-300'
                  }`}
              >
                <div className="font-semibold">Trial</div>
                <div className="text-xs text-gray-500">30 days</div>
              </button>

              <button
                onClick={() => setNewStatus('active')}
                className={`p-3 text-center rounded-lg border-2 transition-colors ${newStatus === 'active'
                  ? 'border-green-500 bg-green-50 text-green-900'
                  : 'border-gray-200 hover:border-green-300'
                  }`}
              >
                <div className="font-semibold">Active</div>
                <div className="text-xs text-gray-500">Paid</div>
              </button>

              <button
                onClick={() => setNewStatus('inactive')}
                className={`p-3 text-center rounded-lg border-2 transition-colors ${newStatus === 'inactive'
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-gray-200 hover:border-red-300'
                  }`}
              >
                <div className="font-semibold">Inactive</div>
                <div className="text-xs text-gray-500">Suspended</div>
              </button>
            </div>
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              Subscription End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Selected date: {new Date(endDate).toLocaleDateString()}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this subscription update..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              variant="primary"
              onClick={handleUpdateSubscription}
              disabled={updateSubscriptionMutation.isPending}
              className="flex-1"
            >
              {updateSubscriptionMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Check className="w-4 h-4 mr-2" />
                  Update Subscription
                </span>
              )}
            </Button>

            {onClose && (
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Pricing Information */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing Reference</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Installation Fee:</span>
            <span className="font-semibold text-gray-900">₹10,000 - ₹20,000 (one-time)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Annual Maintenance (AMC):</span>
            <span className="font-semibold text-gray-900">₹10,000 per doctor per year</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Trial Period:</span>
            <span className="font-semibold text-gray-900">30 days (free)</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
