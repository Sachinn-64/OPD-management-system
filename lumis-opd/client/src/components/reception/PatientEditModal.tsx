import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, User, Phone, MapPin, Heart, Edit } from 'lucide-react';
import { patientService } from '../../services/patientService';

interface PatientEditModalProps {
  patient: any;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

export const PatientEditModal: React.FC<PatientEditModalProps> = ({ patient, onClose, onSuccess, onError }) => {
  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const [formData, setFormData] = useState({
    firstName: patient.firstName || '',
    middleName: patient.middleName || '',
    lastName: patient.lastName || '',
    age: patient.dateOfBirth ? calculateAge(patient.dateOfBirth).toString() : '',
    gender: patient.gender?.toLowerCase() || 'male',
    aadharNumber: patient.aadharNumber || '',
    mobile: patient.mobile || '',
    alternateMobile: patient.alternateMobile || '',
    email: patient.email || '',
    addressLine1: patient.addressLine1 || '',
    addressLine2: patient.addressLine2 || '',
    city: patient.city || '',
    state: patient.state || '',
    pincode: patient.pincode || '',
    country: patient.country || 'India',
    bloodGroup: patient.bloodGroup || '',
    maritalStatus: patient.maritalStatus || '',
    patientCategory: patient.patientCategory || '',
    referredByName: patient.referredByName || '',
    referredByOrganization: patient.referredByOrganization || '',
    emergencyContactName: patient.emergencyContactName || '',
    emergencyContactPhone: patient.emergencyContactPhone || '',
  });

  // Helper function to calculate date of birth from age
  const calculateDateOfBirth = (age: number): string => {
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    const birthDate = new Date(birthYear, today.getMonth(), today.getDate());
    return birthDate.toISOString().split('T')[0];
  };

  const updatePatientMutation = useMutation({
    mutationFn: async (data: any) => {
      const transformedData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: calculateDateOfBirth(parseInt(data.age, 10)),
        gender: data.gender.toUpperCase(),
      };

      if (data.middleName?.trim()) transformedData.middleName = data.middleName.trim();
      if (data.aadharNumber?.trim()) transformedData.aadharNumber = data.aadharNumber.trim();
      if (data.mobile?.trim()) transformedData.mobile = data.mobile.trim();
      if (data.alternateMobile?.trim()) transformedData.alternateMobile = data.alternateMobile.trim();
      if (data.email?.trim()) transformedData.email = data.email.trim();
      if (data.addressLine1?.trim()) transformedData.addressLine1 = data.addressLine1.trim();
      if (data.addressLine2?.trim()) transformedData.addressLine2 = data.addressLine2.trim();
      if (data.city?.trim()) transformedData.city = data.city.trim();
      if (data.state?.trim()) transformedData.state = data.state.trim();
      if (data.pincode?.trim()) transformedData.pincode = data.pincode.trim();
      if (data.country?.trim()) transformedData.country = data.country.trim();
      if (data.bloodGroup?.trim()) transformedData.bloodGroup = data.bloodGroup.trim();
      if (data.maritalStatus?.trim()) transformedData.maritalStatus = data.maritalStatus.trim();
      if (data.patientCategory?.trim()) transformedData.patientCategory = data.patientCategory.trim();
      if (data.referredByName?.trim()) transformedData.referredByName = data.referredByName.trim();
      if (data.referredByOrganization?.trim()) transformedData.referredByOrganization = data.referredByOrganization.trim();
      if (data.emergencyContactName?.trim()) transformedData.emergencyContactName = data.emergencyContactName.trim();
      if (data.emergencyContactPhone?.trim()) transformedData.emergencyContactPhone = data.emergencyContactPhone.trim();

      await patientService.update(patient.id, transformedData);
      return patient;
    },
    onSuccess: () => {
      onSuccess(`Patient updated successfully! UHID: ${patient.uhid}`);
    },
    onError: (err: any) => {
      onError(err.response?.data?.message || 'Failed to update patient');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePatientMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-emerald-100 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-blue-100 p-2 sm:p-2.5 rounded-xl">
              <Edit className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit Patient</h3>
              <p className="text-xs sm:text-sm text-gray-500">UHID: {patient.uhid}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(95vh-180px)] sm:max-h-[calc(90vh-180px)]">
          {/* Personal Information */}
          <div className="bg-emerald-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <User className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-emerald-800">Personal Information</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                  placeholder="William"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Age (Years) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  min="0"
                  max="150"
                  placeholder="Enter age"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Marital Status</label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                >
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Aadhar Number</label>
                <input
                  type="text"
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleChange}
                  pattern="[0-9]{12}"
                  placeholder="12-digit Aadhar"
                  maxLength={12}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Patient Category</label>
                <select
                  name="patientCategory"
                  value={formData.patientCategory}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                >
                  <option value="">Select</option>
                  <option value="General">General</option>
                  <option value="Senior Citizen">Senior Citizen</option>
                  <option value="Pediatric">Pediatric</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-blue-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Phone className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-blue-800">Contact Information</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mobile Number</label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  pattern="[6-9][0-9]{9}"
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Alternate Mobile</label>
                <input
                  type="tel"
                  name="alternateMobile"
                  value={formData.alternateMobile}
                  onChange={handleChange}
                  pattern="[6-9][0-9]{9}"
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="patient@email.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-amber-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <MapPin className="w-4 h-4 text-amber-600" />
              <h4 className="text-sm font-bold text-amber-800">Address Information</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address Line 1</label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="House/Flat No., Street"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address Line 2</label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  placeholder="Landmark, Area"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Mumbai"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Maharashtra"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  pattern="[0-9]{6}"
                  placeholder="400001"
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Referral & Emergency Contact */}
          <div className="bg-rose-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-rose-100">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Heart className="w-4 h-4 text-rose-600" />
              <h4 className="text-sm font-bold text-rose-800">Emergency & Referral</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Referred By (Name)</label>
                <input
                  type="text"
                  name="referredByName"
                  value={formData.referredByName}
                  onChange={handleChange}
                  placeholder="Dr. Smith"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Referred By (Organization)</label>
                <input
                  type="text"
                  name="referredByOrganization"
                  value={formData.referredByOrganization}
                  onChange={handleChange}
                  placeholder="City Hospital"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Emergency Contact Name</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Emergency Contact Phone</label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  pattern="[6-9][0-9]{9}"
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={updatePatientMutation.isPending}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updatePatientMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Updating...
              </span>
            ) : 'Update Patient'}
          </button>
        </div>
      </div>
    </div>
  );
};
