import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Building2, Mail, Phone, MapPin, User, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { clinicFirebaseService } from '../../services/firebase/clinicService';
import { signUp } from '../../lib/firebase/auth';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

interface ClinicRegistrationForm {
  // Clinic Details
  clinicName: string;
  clinicEmail: string;
  clinicPhone: string;
  clinicAddress: string;
  
  // Admin User Details
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
}

export const ClinicRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setClinic } = useAuthStore();
  
  const [formData, setFormData] = useState<ClinicRegistrationForm>({
    clinicName: '',
    clinicEmail: '',
    clinicPhone: '',
    clinicAddress: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof ClinicRegistrationForm, string>>>({});
  const [step, setStep] = useState<1 | 2>(1);

  const validateStep1 = () => {
    const newErrors: Partial<Record<keyof ClinicRegistrationForm, string>> = {};
    
    if (!formData.clinicName.trim()) {
      newErrors.clinicName = 'Clinic name is required';
    }
    
    if (!formData.clinicEmail.trim()) {
      newErrors.clinicEmail = 'Clinic email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.clinicEmail)) {
      newErrors.clinicEmail = 'Invalid email format';
    }
    
    if (!formData.clinicPhone.trim()) {
      newErrors.clinicPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.clinicPhone.replace(/\D/g, ''))) {
      newErrors.clinicPhone = 'Phone number must be 10 digits';
    }
    
    if (!formData.clinicAddress.trim()) {
      newErrors.clinicAddress = 'Clinic address is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Partial<Record<keyof ClinicRegistrationForm, string>> = {};
    
    if (!formData.adminName.trim()) {
      newErrors.adminName = 'Admin name is required';
    }
    
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Admin email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Invalid email format';
    }
    
    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Password is required';
    } else if (formData.adminPassword.length < 6) {
      newErrors.adminPassword = 'Password must be at least 6 characters';
    }
    
    if (formData.adminPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const registrationMutation = useMutation({
    mutationFn: async (data: ClinicRegistrationForm) => {
      // Check if clinic email already exists
      const emailExists = await clinicFirebaseService.checkEmailExists(data.clinicEmail);
      if (emailExists) {
        throw new Error('A clinic with this email already exists');
      }

      // Step 1: Create the clinic
      const clinicId = await clinicFirebaseService.create({
        name: data.clinicName,
        email: data.clinicEmail,
        phone: data.clinicPhone,
        address: data.clinicAddress,
        subscriptionStatus: 'trial',
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      });

      // Step 2: Create admin user
      const authUser = await signUp(
        data.adminEmail,
        data.adminPassword,
        clinicId,
        'admin',
        data.adminName
      );

      // Step 3: Fetch clinic data
      const clinicData = await clinicFirebaseService.getById(clinicId);

      return { authUser, clinicData };
    },
    onSuccess: ({ authUser, clinicData }) => {
      // Set user and clinic in store
      setUser(authUser);
      if (clinicData) {
        setClinic(clinicData);
      }
      
      // Navigate to dashboard
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Registration failed. Please try again.';
      setErrors({ clinicEmail: errorMessage });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name as keyof ClinicRegistrationForm]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      registrationMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-emerald-600 p-3 rounded-xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Register Your Clinic
          </h1>
          <p className="text-gray-600">
            Start your 30-day free trial • No credit card required
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200'
              }`}>
                {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className="ml-2 font-medium">Clinic Details</span>
            </div>
            <div className="w-16 h-1 bg-gray-200">
              <div 
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: step >= 2 ? '100%' : '0%' }}
              />
            </div>
            <div className={`flex items-center ${step >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Admin Account</span>
            </div>
          </div>
        </div>

        <Card className="p-8">
          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    name="clinicName"
                    value={formData.clinicName}
                    onChange={handleInputChange}
                    placeholder="Enter your clinic name"
                    className="pl-10"
                  />
                </div>
                {errors.clinicName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.clinicName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="email"
                    name="clinicEmail"
                    value={formData.clinicEmail}
                    onChange={handleInputChange}
                    placeholder="clinic@example.com"
                    className="pl-10"
                  />
                </div>
                {errors.clinicEmail && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.clinicEmail}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="tel"
                    name="clinicPhone"
                    value={formData.clinicPhone}
                    onChange={handleInputChange}
                    placeholder="10-digit phone number"
                    className="pl-10"
                  />
                </div>
                {errors.clinicPhone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.clinicPhone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic Address *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <textarea
                    name="clinicAddress"
                    value={formData.clinicAddress}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Enter complete clinic address"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                {errors.clinicAddress && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.clinicAddress}
                  </p>
                )}
              </div>

              <Button type="submit" variant="primary" className="w-full">
                Continue to Admin Setup
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="pl-10"
                  />
                </div>
                {errors.adminName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.adminName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="email"
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleInputChange}
                    placeholder="admin@example.com"
                    className="pl-10"
                  />
                </div>
                {errors.adminEmail && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.adminEmail}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="password"
                    name="adminPassword"
                    value={formData.adminPassword}
                    onChange={handleInputChange}
                    placeholder="Minimum 6 characters"
                    className="pl-10"
                  />
                </div>
                {errors.adminPassword && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.adminPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Re-enter password"
                    className="pl-10"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={registrationMutation.isPending}
                  className="flex-1"
                >
                  {registrationMutation.isPending ? 'Creating Account...' : 'Complete Registration'}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <p className="text-center mt-6 text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Sign In
          </Link>
        </p>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">30-Day Free Trial Includes:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Unlimited patient records</li>
                <li>Complete OPD management</li>
                <li>Prescription templates</li>
                <li>Voice-enabled documentation</li>
                <li>Email & phone support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
