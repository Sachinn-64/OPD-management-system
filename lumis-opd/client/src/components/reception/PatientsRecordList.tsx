import React, { useState, useEffect } from 'react';
import { Users, Search, Edit, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';

interface PatientsRecordListProps {
  patients: any[];
  onEdit: (patient: any) => void;
}

export const PatientsRecordList: React.FC<PatientsRecordListProps> = ({ patients, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter patients based on search term
  const filteredPatients = patients?.filter((patient) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.firstName?.toLowerCase().includes(searchLower) ||
      patient.lastName?.toLowerCase().includes(searchLower) ||
      patient.uhid?.toLowerCase().includes(searchLower) ||
      patient.mobile?.toLowerCase().includes(searchLower) ||
      patient.email?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of the table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (!patients || patients.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-emerald-50 p-4 rounded-full w-fit mx-auto mb-4">
          <Users className="w-12 h-12 text-emerald-300" />
        </div>
        <p className="text-gray-500 font-medium">No patients found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, UHID, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
        />
      </div>

      {/* Patient Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <span className="font-bold text-emerald-700">{startIndex + 1}-{Math.min(endIndex, filteredPatients.length)}</span> of{' '}
          <span className="font-bold">{filteredPatients.length}</span> patients
          {searchTerm && <span className="text-gray-400 ml-1">(filtered from {patients.length})</span>}
        </p>
      </div>

      {/* Patients Table */}
      <div className="overflow-x-auto rounded-xl border-2 border-emerald-100">
        <table className="w-full">
          <thead className="bg-emerald-50/50 border-b-2 border-emerald-100">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">UHID</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Name</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Age/Gender</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Blood Group</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Category</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-emerald-50">
            {paginatedPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-emerald-50/30 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-mono font-bold">
                  {patient.uhid}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-700 font-semibold text-sm">
                        {patient.firstName?.charAt(0).toUpperCase()}
                        {patient.lastName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {patient.firstName} {patient.middleName} {patient.lastName}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div className="flex flex-col">
                    <span className="font-medium">{calculateAge(patient.dateOfBirth)} years</span>
                    <span className="text-xs text-gray-500 capitalize">{patient.gender?.toLowerCase()}</span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {patient.mobile && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{patient.mobile}</span>
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span className="truncate max-w-[150px]">{patient.email}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {patient.bloodGroup ? (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                      {patient.bloodGroup}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {patient.patientCategory ? (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {patient.patientCategory}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onEdit(patient)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-blue-200"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPatients.length === 0 && searchTerm && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500 font-medium">No patients match your search</p>
          <p className="text-sm text-gray-400 mt-1">Try different keywords</p>
        </div>
      )}

      {/* Pagination */}
      {filteredPatients.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border-t border-emerald-100 px-6 py-4">
          <div className="text-sm text-gray-600">
            Page <span className="font-bold text-emerald-700">{currentPage}</span> of{' '}
            <span className="font-bold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      currentPage === page
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 transition-all"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
