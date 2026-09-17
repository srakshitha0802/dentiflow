"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Eye,
  Edit2,
  Trash2,
  Plus,
  CheckCircle,
  AlertTriangle,
  FileText,
  Activity,
  X,
  Stethoscope
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, calculateAge, cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Patient {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  status: string;
  createdAt: string;
  outstandingBalance?: number;
  nextAppointment?: { date: string; startTime: string } | null;
  _count?: { appointments: number };
  medicalHistory?: {
    diabetes?: boolean;
    hypertension?: boolean;
    allergies?: string;
    conditions?: string;
    medications?: string;
  };
  dentalInfo?: {
    smokingStatus?: string;
    dentalConcerns?: string;
  };
}

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "new" || searchParams.get("new") === "true") {
      setIsRegisterModalOpen(true);
    }
  }, [searchParams]);

  // Fetch Patients
  const { data: responseData, isLoading } = useQuery({
    queryKey: ["patients", searchQuery, statusFilter, genderFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      if (genderFilter) params.append("gender", genderFilter);
      params.append("page", String(page));
      params.append("limit", "15");

      const res = await fetch(`/api/patients?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    },
  });

  const patients: Patient[] = responseData?.data || [];
  const pagination = responseData?.pagination || { total: 0, totalPages: 1 };

  // Form state for registration
  const [regForm, setRegForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "1995-01-01",
    gender: "MALE",
    bloodGroup: "O+",
    phone: "",
    email: "",
    address: "",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    diabetes: false,
    hypertension: false,
    allergies: "",
    conditions: "",
    medications: "",
    smokingStatus: "NON_SMOKER",
    dentalConcerns: "",
  });

  const registerPatientMutation = useMutation({
    mutationFn: async (data: typeof regForm) => {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to register patient");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Patient registered successfully!");
      setIsRegisterModalOpen(false);
      setRegForm({
        firstName: "",
        lastName: "",
        dateOfBirth: "1995-01-01",
        gender: "MALE",
        bloodGroup: "O+",
        phone: "",
        email: "",
        address: "",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        emergencyName: "",
        emergencyRelationship: "",
        emergencyPhone: "",
        diabetes: false,
        hypertension: false,
        allergies: "",
        conditions: "",
        medications: "",
        smokingStatus: "NON_SMOKER",
        dentalConcerns: "",
      });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.firstName || !regForm.lastName) return toast.error("Please enter first & last name");
    if (!regForm.phone) return toast.error("Please enter phone number");
    registerPatientMutation.mutate(regForm);
  };

  // Adult teeth 1 to 32
  const upperTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const lowerTeeth = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patients Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage patient medical records, dental charting, and case histories.</p>
        </div>
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Register Patient
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, patient ID, phone, email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading patient records...</div>
        ) : patients.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-800">No patients found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search criteria or register a new patient.</p>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition cursor-pointer"
            >
              Register New Patient
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Age / Gender</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Medical Flags</th>
                  <th className="px-6 py-4">Outstanding</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {patients.map((patient) => {
                  const age = calculateAge(new Date(patient.dateOfBirth));
                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center flex-shrink-0">
                            {patient.firstName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 hover:text-teal-600 cursor-pointer" onClick={() => { setSelectedPatient(patient); setIsChartModalOpen(true); }}>
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">{patient.patientId}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {age} yrs · <span className="capitalize">{patient.gender.toLowerCase()}</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-900 font-medium">{patient.phone}</div>
                        {patient.city && <div className="text-xs text-slate-400">{patient.city}</div>}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {patient.medicalHistory?.diabetes && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-semibold">
                              Diabetes
                            </span>
                          )}
                          {patient.medicalHistory?.hypertension && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[11px] font-semibold">
                              Hypertension
                            </span>
                          )}
                          {patient.medicalHistory?.allergies && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[11px] font-semibold">
                              Allergy
                            </span>
                          )}
                          {!patient.medicalHistory?.diabetes && !patient.medicalHistory?.hypertension && !patient.medicalHistory?.allergies && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {(patient.outstandingBalance ?? 0) > 0 ? (
                          <span className="text-red-600 font-bold">
                            {formatCurrency(patient.outstandingBalance ?? 0)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Clear</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                            patient.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          )}
                        >
                          {patient.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPatient(patient);
                              setIsChartModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Dental Chart & Clinical History"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            Chart
                          </button>

                          <Link
                            href={`/appointments?action=new&patientId=${patient.id}`}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Book Appointment"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Book
                          </Link>

                          <Link
                            href={`/invoices?action=new&patientId=${patient.id}`}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Create Invoice"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Bill
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} patients)</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Register Patient */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Patient Registration</h3>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-4">
              <div className="text-xs font-bold uppercase text-teal-700 tracking-wider">1. Basic Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh"
                    value={regForm.firstName}
                    onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rao"
                    value={regForm.lastName}
                    onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={regForm.dateOfBirth}
                    onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gender</label>
                    <select
                      value={regForm.gender}
                      onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Blood Group</label>
                    <select
                      value={regForm.bloodGroup}
                      onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    >
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold uppercase text-teal-700 tracking-wider pt-2">2. Contact Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Address & City</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={regForm.address}
                      onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={regForm.city}
                      onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold uppercase text-teal-700 tracking-wider pt-2">3. Medical & Dental History</div>
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regForm.diabetes}
                      onChange={(e) => setRegForm({ ...regForm, diabetes: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    Diabetic
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regForm.hypertension}
                      onChange={(e) => setRegForm({ ...regForm, hypertension: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    Hypertension (BP)
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Known Allergies (e.g. Penicillin)"
                    value={regForm.allergies}
                    onChange={(e) => setRegForm({ ...regForm, allergies: e.target.value })}
                    className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Current Medications"
                    value={regForm.medications}
                    onChange={(e) => setRegForm({ ...regForm, medications: e.target.value })}
                    className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerPatientMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {registerPatientMutation.isPending ? "Registering..." : "Register Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Dental Chart & Patient Record */}
      {isChartModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 font-mono">ID: {selectedPatient.patientId}</span>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h3>
              </div>
              <button
                onClick={() => setIsChartModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 py-4">
              {/* Medical Summary Banner */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Age & Gender</span>
                  <span className="font-bold text-slate-800">{calculateAge(new Date(selectedPatient.dateOfBirth))} yrs, {selectedPatient.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone</span>
                  <span className="font-bold text-slate-800">{selectedPatient.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Blood Group</span>
                  <span className="font-bold text-slate-800">{selectedPatient.bloodGroup || "O+"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Balance</span>
                  <span className="font-bold text-red-600">{formatCurrency(selectedPatient.outstandingBalance || 0)}</span>
                </div>
              </div>

              {/* 32-Tooth Visual Dental Chart */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-teal-600" />
                    Interactive Dental Chart (Adult 32 Teeth)
                  </h4>
                  <span className="text-xs text-slate-400">Click a tooth to view details</span>
                </div>

                <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-4">
                  {/* Upper Jaw */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1 text-center">Upper Maxilla (1-16)</div>
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
                      {upperTeeth.map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setSelectedTooth(num);
                            toast.info(`Selected Tooth #${num} (Maxillary)`);
                          }}
                          className={cn(
                            "w-8 h-10 rounded-lg text-xs font-bold flex flex-col items-center justify-between p-1 transition cursor-pointer border",
                            selectedTooth === num
                              ? "bg-teal-500 text-white border-teal-300 scale-110 shadow-lg shadow-teal-500/50"
                              : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                          )}
                        >
                          <div className="w-2.5 h-3.5 bg-slate-300/40 rounded-t-xs" />
                          <span>#{num}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lower Jaw */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1 text-center">Lower Mandible (17-32)</div>
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
                      {lowerTeeth.map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setSelectedTooth(num);
                            toast.info(`Selected Tooth #${num} (Mandibular)`);
                          }}
                          className={cn(
                            "w-8 h-10 rounded-lg text-xs font-bold flex flex-col items-center justify-between p-1 transition cursor-pointer border",
                            selectedTooth === num
                              ? "bg-teal-500 text-white border-teal-300 scale-110 shadow-lg shadow-teal-500/50"
                              : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                          )}
                        >
                          <span>#{num}</span>
                          <div className="w-2.5 h-3.5 bg-slate-300/40 rounded-b-xs" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedTooth && (
                  <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-teal-900">Tooth #{selectedTooth} Condition: </span>
                      <span className="text-teal-800">Healthy / Restored</span>
                    </div>
                    <button
                      onClick={() => toast.success(`Tooth #${selectedTooth} marked for cleaning & restoration.`)}
                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                    >
                      Add Treatment Note
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/appointments?action=new&patientId=${selectedPatient.id}`}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    + Book Appointment
                  </Link>
                  <Link
                    href={`/treatment-plans?action=new&patientId=${selectedPatient.id}`}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    + Treatment Plan
                  </Link>
                  <Link
                    href={`/prescriptions?action=new&patientId=${selectedPatient.id}`}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    + Prescribe
                  </Link>
                </div>

                <button
                  onClick={() => setIsChartModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
