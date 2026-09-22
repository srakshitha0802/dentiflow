"use client";

import { useState, useEffect, Suspense } from "react";
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
  Stethoscope,
  Upload,
  FileUp,
  Download,
  ExternalLink,
  ImageIcon,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, calculateAge, cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PatientsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-64 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-white rounded-2xl border border-slate-200 p-6" />
        </div>
      }
    >
      <PatientsContent />
    </Suspense>
  );
}

interface Patient {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  address?: string;
  city?: string;
  state?: string;
  status: string;
  createdAt: string;
  outstandingBalance?: number;
  nextAppointment?: { date: string; startTime: string } | null;
  _count?: { appointments: number };
  medicalHistory?: {
    diabetes: boolean;
    hypertension: boolean;
    allergies?: string;
    conditions?: string;
    medications?: string;
  };
  dentalInfo?: {
    smokingStatus?: string;
    dentalConcerns?: string;
  };
}

function PatientsContent() {
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

  // Patient Document & Case History States
  const [activeDetailTab, setActiveDetailTab] = useState<"chart" | "documents" | "reports">("chart");
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [docUploadName, setDocUploadName] = useState("");
  const [docUploadType, setDocUploadType] = useState("X_RAY");
  const [isUploadingStaffDoc, setIsUploadingStaffDoc] = useState(false);
  const [previewDocModal, setPreviewDocModal] = useState<any | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "new" || searchParams.get("new") === "true") {
      setIsRegisterModalOpen(true);
    }
  }, [searchParams]);

  // Fetch Documents for Selected Patient
  const {
    data: patientDocsData,
    isLoading: isDocsLoading,
    refetch: refetchPatientDocs,
  } = useQuery({
    queryKey: ["patient-documents", selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient?.id) return { documents: [] };
      const res = await fetch(`/api/patients/${selectedPatient.id}/documents`);
      if (!res.ok) return { documents: [] };
      return res.json();
    },
    enabled: Boolean(selectedPatient?.id && isChartModalOpen),
  });

  const patientDocuments = patientDocsData?.documents || [];

  // Fetch Full Case Dossier & Previous Reports for Selected Patient
  const {
    data: patientDossierData,
    isLoading: isDossierLoading,
  } = useQuery({
    queryKey: ["patient-case-dossier", selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient?.id) return null;
      const res = await fetch(`/api/reports?type=patient-cases&patientId=${selectedPatient.id}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data?.patient || null;
    },
    enabled: Boolean(selectedPatient?.id && isChartModalOpen && activeDetailTab === "reports"),
  });

  // Upload Clinical Document Mutation
  const uploadStaffDocMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient?.id) throw new Error("No patient selected");
      if (!docUploadFile) throw new Error("Please choose a file to upload");

      setIsUploadingStaffDoc(true);
      const formData = new FormData();
      formData.append("file", docUploadFile);
      formData.append("name", docUploadName.trim() || docUploadFile.name);
      formData.append("type", docUploadType);

      const res = await fetch(`/api/patients/${selectedPatient.id}/documents`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to upload document");
      return json;
    },
    onSuccess: () => {
      setIsUploadingStaffDoc(false);
      setDocUploadFile(null);
      setDocUploadName("");
      toast.success("Document attached to patient record successfully!");
      refetchPatientDocs();
      queryClient.invalidateQueries({ queryKey: ["patient-portal"] });
    },
    onError: (err: Error) => {
      setIsUploadingStaffDoc(false);
      toast.error(err.message);
    },
  });

  // Delete Document Mutation
  const deleteStaffDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      if (!selectedPatient?.id) throw new Error("No patient selected");
      const res = await fetch(`/api/patients/${selectedPatient.id}/documents?documentId=${docId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete document");
      return json;
    },
    onSuccess: () => {
      toast.success("Document removed from patient record.");
      refetchPatientDocs();
      queryClient.invalidateQueries({ queryKey: ["patient-portal"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

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

              {/* Tabs Switcher: Chart vs Documents */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveDetailTab("chart")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer",
                    activeDetailTab === "chart"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Interactive Dental Chart</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailTab("documents")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer",
                    activeDetailTab === "documents"
                      ? "bg-teal-700 text-white shadow-xs"
                      : "bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Patient Files & Documents</span>
                  {patientDocuments.length > 0 && (
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                        activeDetailTab === "documents"
                          ? "bg-white text-teal-800"
                          : "bg-teal-200 text-teal-900"
                      )}
                    >
                      {patientDocuments.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailTab("reports")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer",
                    activeDetailTab === "reports"
                      ? "bg-indigo-700 text-white shadow-xs"
                      : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200"
                  )}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Clinical Notes & Previous Reports</span>
                </button>
              </div>

              {/* TAB 1: 32-Tooth Visual Dental Chart */}
              {activeDetailTab === "chart" && (
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
              )}

              {/* TAB 2: Patient Uploaded Files & Clinical Documents */}
              {activeDetailTab === "documents" && (
                <div className="space-y-4">
                  {/* Upload box for doctor / staff */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <FileUp className="w-4 h-4 text-teal-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase">
                        Attach Clinical File or View Patient Uploads
                      </h4>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        uploadStaffDocMutation.mutate();
                      }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Document Name / Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Post-Op OPG X-Ray or CBCT 3D Scan"
                            value={docUploadName}
                            onChange={(e) => setDocUploadName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Document Type
                          </label>
                          <select
                            value={docUploadType}
                            onChange={(e) => setDocUploadType(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                          >
                            <option value="X_RAY">Dental X-Ray / Radiograph</option>
                            <option value="PREVIOUS_RECORD">Previous Dental History / Record</option>
                            <option value="PRESCRIPTION">Prescription / Medication Chart</option>
                            <option value="LAB_REPORT">Pathology / Blood Test Report</option>
                            <option value="CLINICAL_SCAN">3D Intraoral / CBCT Scan</option>
                            <option value="INSURANCE">Insurance / Patient ID</option>
                            <option value="OTHER">Other Clinical Document</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <input
                          type="file"
                          required
                          accept=".pdf,image/*,.doc,.docx"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              const file = e.target.files[0];
                              setDocUploadFile(file);
                              if (!docUploadName.trim()) {
                                setDocUploadName(file.name.replace(/\.[^/.]+$/, ""));
                              }
                            }
                          }}
                          className="text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100 cursor-pointer"
                        />

                        <button
                          type="submit"
                          disabled={!docUploadFile || isUploadingStaffDoc || uploadStaffDocMutation.isPending}
                          className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {isUploadingStaffDoc ? (
                            <span>Uploading...</span>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload File</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Document List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800">
                      All Attached Documents & Files ({patientDocuments.length})
                    </h4>

                    {isDocsLoading ? (
                      <div className="p-4 text-center text-xs text-slate-400">Loading documents...</div>
                    ) : patientDocuments.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-xl text-center border border-slate-200 text-xs text-slate-400">
                        No files or X-Rays uploaded yet for this patient.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {patientDocuments.map((doc: any) => {
                          const isImage = doc.mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.url);
                          const formattedSize = doc.size ? (doc.size / (1024 * 1024)).toFixed(2) + " MB" : "File";
                          const isSelfUpload = doc.uploadedBy?.toLowerCase().includes("patient");

                          return (
                            <div
                              key={doc.id}
                              className="p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-300 transition flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                                  {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 truncate">{doc.name}</span>
                                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                                      {doc.type?.replace(/_/g, " ")}
                                    </span>
                                    {isSelfUpload ? (
                                      <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                                        Uploaded by Patient
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[9px] font-bold">
                                        {doc.uploadedBy || "Clinic Staff"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {formattedSize} • {format(parseISO(doc.uploadedAt), "MMM d, yyyy, h:mm a")}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isImage) {
                                      setPreviewDocModal(doc);
                                    } else {
                                      window.open(doc.url, "_blank");
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Preview</span>
                                </button>

                                <a
                                  href={doc.url}
                                  download={doc.name}
                                  className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to remove this document from the patient record?")) {
                                      deleteStaffDocMutation.mutate(doc.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                  title="Delete document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Clinical Notes, Visits & Previous Reports */}
              {activeDetailTab === "reports" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-indigo-600" />
                        Clinical Case History & Diagnostic Reports
                      </h4>
                      <p className="text-xs text-slate-500">
                        Chronological consultations, clinical notes, past treatments, and diagnostic findings.
                      </p>
                    </div>

                    <Link
                      href={`/reports?tab=patient-cases&patientId=${selectedPatient.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Full Dossier
                    </Link>
                  </div>

                  {isDossierLoading ? (
                    <div className="p-8 text-center text-slate-400 text-xs">Loading patient clinical history...</div>
                  ) : !patientDossierData ? (
                    <div className="p-6 bg-slate-50 rounded-xl text-center border border-slate-200 text-xs text-slate-400">
                      No clinical notes or previous consultation records found.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                      {/* Medical History Summary */}
                      {patientDossierData.medicalHistory && (
                        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                          <span className="font-bold text-amber-900 uppercase tracking-wide text-[10px]">
                            Medical Background & Allergies
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                            <div>
                              <span className="font-semibold text-slate-900">Allergies: </span>
                              {patientDossierData.medicalHistory.allergies || "None reported"}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900">Chronic Conditions: </span>
                              {patientDossierData.medicalHistory.conditions || "None"}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900">Current Medications: </span>
                              {patientDossierData.medicalHistory.medications || "None"}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900">Systemic: </span>
                              {patientDossierData.medicalHistory.diabetes ? "Diabetic • " : ""}
                              {patientDossierData.medicalHistory.hypertension ? "Hypertensive • " : ""}
                              {!patientDossierData.medicalHistory.diabetes && !patientDossierData.medicalHistory.hypertension ? "Normal" : ""}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Past Appointments & Doctor Notes */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Consultation History & Diagnoses ({patientDossierData.appointments?.length || 0})
                        </span>

                        {(!patientDossierData.appointments || patientDossierData.appointments.length === 0) ? (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                            No past appointments recorded.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {patientDossierData.appointments.map((apt: any) => (
                              <div
                                key={apt.id}
                                className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">
                                      {format(parseISO(apt.date), "MMMM d, yyyy")}
                                    </span>
                                    <span className="text-slate-400">({apt.startTime} - {apt.endTime})</span>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[10px]">
                                      {apt.status}
                                    </span>
                                  </div>
                                  <div className="text-slate-600 font-medium flex items-center gap-1">
                                    <Stethoscope className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{apt.doctor?.user?.name || "Attending Dentist"}</span>
                                  </div>
                                </div>

                                {apt.treatments && apt.treatments.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {apt.treatments.map((t: any) => (
                                      <span
                                        key={t.id}
                                        className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium"
                                      >
                                        {t.treatment?.name}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {apt.notes ? (
                                  <div className="p-2 bg-slate-50 rounded-lg text-slate-700 text-xs italic border-l-2 border-indigo-400">
                                    <span className="font-semibold not-italic text-slate-900">Doctor Note / Diagnosis: </span>
                                    {apt.notes}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400 italic">No notes logged for this visit.</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Treatment Plans & Procedures */}
                      {patientDossierData.treatmentPlans && patientDossierData.treatmentPlans.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Treatment Plans & Procedures ({patientDossierData.treatmentPlans.length})
                          </span>
                          <div className="space-y-2">
                            {patientDossierData.treatmentPlans.map((tp: any) => (
                              <div
                                key={tp.id}
                                className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-1.5 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-purple-900">
                                    Plan #{tp.planId} • {tp.status}
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    Est. {formatCurrency(tp.estimatedCost || 0)}
                                  </span>
                                </div>
                                {tp.diagnosis && (
                                  <p className="text-slate-700">
                                    <span className="font-semibold text-slate-900">Clinical Diagnosis: </span>
                                    {tp.diagnosis}
                                  </p>
                                )}
                                {tp.notes && <p className="text-slate-500 italic">{tp.notes}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prescriptions */}
                      {patientDossierData.prescriptions && patientDossierData.prescriptions.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Prescription History ({patientDossierData.prescriptions.length})
                          </span>
                          <div className="space-y-2">
                            {patientDossierData.prescriptions.map((rx: any) => (
                              <div
                                key={rx.id}
                                className="p-3 bg-amber-50/40 border border-amber-200 rounded-xl space-y-1.5 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-amber-900">
                                    Rx #{rx.prescriptionId} • {format(parseISO(rx.date || rx.createdAt), "MMM d, yyyy")}
                                  </span>
                                  <span className="text-slate-500">Dr. {rx.doctor?.user?.name}</span>
                                </div>
                                {rx.diagnosis && (
                                  <div className="text-slate-700">
                                    <span className="font-semibold">Indication: </span>
                                    {rx.diagnosis}
                                  </div>
                                )}
                                {rx.items && rx.items.length > 0 && (
                                  <div className="space-y-1 pt-1">
                                    {rx.items.map((item: any) => (
                                      <div key={item.id} className="text-slate-800 bg-white p-1.5 rounded border border-amber-100 flex items-center justify-between">
                                        <span className="font-bold">{item.medicineName} ({item.dosage})</span>
                                        <span className="text-slate-500">{item.frequency} for {item.duration}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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

      {/* DOCUMENT PREVIEW LIGHTBOX MODAL */}
      {previewDocModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{previewDocModal.name}</h3>
                <p className="text-[11px] text-slate-400">
                  {previewDocModal.type?.replace(/_/g, " ")} • {previewDocModal.uploadedBy || "Patient Upload"}
                </p>
              </div>
              <button
                onClick={() => setPreviewDocModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl bg-slate-950 flex items-center justify-center p-2 min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewDocModal.url}
                alt={previewDocModal.name}
                className="max-h-[60vh] max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={previewDocModal.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>

              <button
                onClick={() => setPreviewDocModal(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

