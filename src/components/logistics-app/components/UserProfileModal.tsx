import React, { useState, useEffect } from 'react';
import { formatPhoneNumber } from '../lib/formatters';
import { User, Branch } from '../types';
import { Camera, Key, Sliders, Check, Phone, User as UserIcon, Building, Mail, FileText, Upload } from 'lucide-react';

export const GuitaristSvg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <circle cx="50" cy="50" r="48" fill="#E2F1AF" />
    <path d="M25 85 C25 68 38 60 50 60 C62 60 75 68 75 85 Z" fill="#1E3A8A" />
    <circle cx="50" cy="42" r="13" fill="#FED7AA" />
    <path d="M38 39 C38 25 62 25 62 39 C58 33 42 33 38 39 Z" fill="#F59E0B" />
    {/* Guitar */}
    <path d="M 20 72 L 80 43 L 75 32 L 15 61 Z" fill="#1D4ED8" />
    <path d="M 28 67 L 76 45" stroke="#FFFFFF" strokeWidth="1.5" />
    <circle cx="22" cy="69" r="6" fill="#FBBF24" />
    {/* Hands */}
    <circle cx="34" cy="64" r="4" fill="#FED7AA" />
    <circle cx="68" cy="48" r="4" fill="#FED7AA" />
    {/* Sparkles */}
    <path d="M80 20 L82 25 L87 27 L82 29 L80 34 L78 29 L73 27 L78 25 Z" fill="#FBBF24" />
    <path d="M15 35 L16 38 L19 39 L16 40 L15 43 L14 40 L11 39 L14 38 Z" fill="#FBBF24" />
  </svg>
);

export const DispatcherSvg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <circle cx="50" cy="50" r="48" fill="#ECFDF5" />
    <path d="M25 85 C25 68 38 60 50 60 C62 60 75 68 75 85 Z" fill="#059669" />
    <circle cx="50" cy="40" r="14" fill="#FDE047" />
    <path d="M36 40 A14 14 0 0 1 64 40" fill="none" stroke="#1F2937" strokeWidth="3" />
    <rect x="33" y="38" width="4" height="8" rx="2" fill="#1F2937" />
    <rect x="63" y="38" width="4" height="8" rx="2" fill="#1F2937" />
    <path d="M35 44 L45 48" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
    <rect x="70" y="15" width="12" height="12" rx="2" fill="#10B981" transform="rotate(15 76 21)" />
  </svg>
);

export const DriverSvg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <circle cx="50" cy="50" r="48" fill="#FFF7ED" />
    <path d="M25 85 C25 68 38 60 50 60 C62 60 75 68 75 85 Z" fill="#D97706" />
    <circle cx="50" cy="40" r="14" fill="#FED7AA" />
    <path d="M33 34 C33 26 67 26 67 34 Z" fill="#1F2937" />
    <path d="M33 34 L67 34 L73 38 L27 38 Z" fill="#4B5563" />
    <circle cx="50" cy="72" r="12" fill="none" stroke="#1F2937" strokeWidth="3.5" />
    <line x1="50" y1="60" x2="50" y2="84" stroke="#1F2937" strokeWidth="2.5" />
    <line x1="38" y1="72" x2="62" y2="72" stroke="#1F2937" strokeWidth="2.5" />
  </svg>
);

export const AdminSvg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <circle cx="50" cy="50" r="48" fill="#F5F3FF" />
    <path d="M25 85 C25 68 38 60 50 60 C62 60 75 68 75 85 Z" fill="#7C3AED" />
    <circle cx="50" cy="40" r="14" fill="#F5D0FE" />
    <path d="M42 60 L50 72 L58 60 Z" fill="#FFFFFF" />
    <path d="M48 68 L52 68 L54 85 L46 85 Z" fill="#EF4444" />
    <rect x="38" y="36" width="10" height="6" rx="1.5" fill="none" stroke="#1F2937" strokeWidth="2" />
    <rect x="52" y="36" width="10" height="6" rx="1.5" fill="none" stroke="#1F2937" strokeWidth="2" />
    <line x1="48" y1="39" x2="52" y2="39" stroke="#1F2937" strokeWidth="2" />
  </svg>
);

export function renderUserAvatarHelper(avatarUrl: string | undefined, name: string, sizeClass = "h-10 w-10") {
  if (avatarUrl === 'PRESET_GUITARIST') {
    return <div className={`${sizeClass} shrink-0 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shadow-inner`}><GuitaristSvg /></div>;
  }
  if (avatarUrl === 'PRESET_DISPATCHER') {
    return <div className={`${sizeClass} shrink-0 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shadow-inner`}><DispatcherSvg /></div>;
  }
  if (avatarUrl === 'PRESET_DRIVER') {
    return <div className={`${sizeClass} shrink-0 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shadow-inner`}><DriverSvg /></div>;
  }
  if (avatarUrl === 'PRESET_ADMIN') {
    return <div className={`${sizeClass} shrink-0 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shadow-inner`}><AdminSvg /></div>;
  }
  if (avatarUrl && (avatarUrl.startsWith('data:image/') || avatarUrl.startsWith('http'))) {
    return <img src={avatarUrl} alt={name} className={`${sizeClass} shrink-0 rounded-full object-cover border border-slate-200 shadow-sm`} referrerPolicy="no-referrer" />;
  }
  
  // Custom initial color backgrounds
  const firstLetter = name.charAt(0).toUpperCase();
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-purple-600'
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  
  return (
    <div className={`${sizeClass} shrink-0 rounded-full bg-gradient-to-tr ${colors[colorIndex]} flex items-center justify-center text-white font-black text-sm shadow-sm select-none`}>
      {firstLetter}
    </div>
  );
}

interface UserProfileModalProps {
  currentUser: User;
  branches: Branch[];
  initialTab?: 'info' | 'photo' | 'password';
  onClose: () => void;
  onUpdateProfile: (updatedUser: User) => Promise<void>;
}

export default function UserProfileModal({
  currentUser,
  branches,
  initialTab = 'info',
  onClose,
  onUpdateProfile
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'photo' | 'password'>(initialTab);
  
  // Personal Info Form States
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [associatedStoreId, setAssociatedStoreId] = useState(currentUser.associatedStoreId || '');
  const [driverLicenseExpire, setDriverLicenseExpire] = useState(currentUser.driverLicenseExpire || '');
  
  // Profile Photo/Avatar States
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Status and Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [activeTab]);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Name cannot be empty.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Email cannot be empty.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated: User = {
        ...currentUser,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        associatedStoreId,
        driverLicenseExpire: driverLicenseExpire || undefined
      };
      await onUpdateProfile(updated);
      setSuccessMsg("Personal information updated successfully!");
    } catch (err: any) {
      setErrorMsg("Failed to save changes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (avatarType: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updated: User = {
        ...currentUser,
        avatarUrl: avatarType
      };
      await onUpdateProfile(updated);
      setAvatarUrl(avatarType);
      setSuccessMsg("Profile avatar updated successfully!");
    } catch (err) {
      setErrorMsg("Failed to update avatar.");
    } finally {
      setLoading(false);
    }
  };

  const processFile = (file: File) => {
    setFileError(null);
    if (!file.type.startsWith('image/')) {
      setFileError('Please upload an image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError('Image must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        setLoading(true);
        try {
          const updated: User = {
            ...currentUser,
            avatarUrl: base64
          };
          await onUpdateProfile(updated);
          setAvatarUrl(base64);
          setSuccessMsg("Custom profile photo uploaded and saved!");
        } catch (err) {
          setFileError("Failed to save custom image.");
        } finally {
          setLoading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const userCurrentDbPass = currentUser.password || "";
    if (currentPassword !== userCurrentDbPass) {
      setErrorMsg("The current password you entered is incorrect.");
      return;
    }
    if (newPassword.trim() === '') {
      setErrorMsg("New password cannot be empty.");
      return;
    }
    if (newPassword === '123456') {
      setErrorMsg("For security reasons, '123456' is not allowed. Choose a stronger password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const updated: User = {
        ...currentUser,
        password: newPassword
      };
      await onUpdateProfile(updated);
      setSuccessMsg("Password changed successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setErrorMsg("Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="profile-management-modal">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 text-slate-800 flex flex-col md:flex-row overflow-hidden max-h-[90vh] animate-fade-in">
        
        {/* Sidebar Nav */}
        <div className="bg-slate-50 border-r border-slate-100 p-5 md:w-56 shrink-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              {renderUserAvatarHelper(avatarUrl, currentUser.name, "h-11 w-11")}
              <div className="text-left font-sans">
                <p className="text-xs font-black text-slate-900 truncate max-w-[120px]">{currentUser.name}</p>
                <span className="inline-block text-[9px] font-mono font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 mt-0.5">
                  {currentUser.role}
                </span>
              </div>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('info')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'info'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sliders className="h-4 w-4" />
                <span>Personal Info</span>
              </button>

              <button
                onClick={() => setActiveTab('photo')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'photo'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Camera className="h-4 w-4" />
                <span>Profile Photo</span>
              </button>

              <button
                onClick={() => setActiveTab('password')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'password'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Key className="h-4 w-4" />
                <span>Change Password</span>
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-200 text-center md:text-left mt-4 md:mt-0">
            <button
              onClick={onClose}
              className="text-xs font-black text-slate-500 hover:text-slate-800 transition-all py-1.5 px-3 bg-white border border-slate-200 rounded-xl w-full"
            >
              Done & Close
            </button>
          </div>
        </div>

        {/* Content Region */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto min-h-[350px] md:min-h-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 font-sans">
                {activeTab === 'info' && "Customize Profile Details"}
                {activeTab === 'photo' && "Select or Upload Photo"}
                {activeTab === 'password' && "Change Account Password"}
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-50 transition-all text-xs font-sans"
              >
                ✕
              </button>
            </div>

            {/* Error & Success Banners */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-800 flex items-start space-x-2">
                <span className="text-rose-500 font-bold shrink-0">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 flex items-start space-x-2 animate-pulse">
                <span className="text-emerald-500 font-bold shrink-0">✅</span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB 1: Personal Info */}
            {activeTab === 'info' && (
              <form onSubmit={handleInfoSubmit} className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <UserIcon className="h-3 w-3 text-slate-400" /> Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-slate-400" /> Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400" /> Phone Contact
                    </label>
                    <input
                      type="text"
                      value={phone}
                      placeholder="+1 (555) 019-2834"
                      onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Building className="h-3 w-3 text-slate-400" /> Associated Depot/Store
                    </label>
                    <select
                      value={associatedStoreId}
                      onChange={(e) => setAssociatedStoreId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium"
                    >
                      <option value="">No Depot Affiliation</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="h-3 w-3 text-slate-400" /> CDL / Driver's License Expiration
                    </label>
                    <input
                      type="date"
                      value={driverLicenseExpire}
                      onChange={(e) => setDriverLicenseExpire(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    {loading ? "Saving..." : "Save Information"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Avatar Photo Selection */}
            {activeTab === 'photo' && (
              <div className="space-y-5 text-left">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Preset Illustrated Avatars</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <button
                      onClick={() => handleAvatarSelect('PRESET_GUITARIST')}
                      className={`relative rounded-2xl p-1.5 border-2 transition-all hover:scale-105 bg-slate-50 flex flex-col items-center justify-center cursor-pointer ${
                        avatarUrl === 'PRESET_GUITARIST' ? 'border-blue-500 bg-blue-50/20' : 'border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="h-12 w-12 rounded-full overflow-hidden mb-1"><GuitaristSvg /></div>
                      <span className="text-[9px] font-black text-slate-700">Guitarist</span>
                      {avatarUrl === 'PRESET_GUITARIST' && <div className="absolute top-1 right-1 bg-blue-500 text-white p-0.5 rounded-full"><Check className="h-2.5 w-2.5" /></div>}
                    </button>

                    <button
                      onClick={() => handleAvatarSelect('PRESET_DISPATCHER')}
                      className={`relative rounded-2xl p-1.5 border-2 transition-all hover:scale-105 bg-slate-50 flex flex-col items-center justify-center cursor-pointer ${
                        avatarUrl === 'PRESET_DISPATCHER' ? 'border-blue-500 bg-blue-50/20' : 'border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="h-12 w-12 rounded-full overflow-hidden mb-1"><DispatcherSvg /></div>
                      <span className="text-[9px] font-black text-slate-700">Planner</span>
                      {avatarUrl === 'PRESET_DISPATCHER' && <div className="absolute top-1 right-1 bg-blue-500 text-white p-0.5 rounded-full"><Check className="h-2.5 w-2.5" /></div>}
                    </button>

                    <button
                      onClick={() => handleAvatarSelect('PRESET_DRIVER')}
                      className={`relative rounded-2xl p-1.5 border-2 transition-all hover:scale-105 bg-slate-50 flex flex-col items-center justify-center cursor-pointer ${
                        avatarUrl === 'PRESET_DRIVER' ? 'border-blue-500 bg-blue-50/20' : 'border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="h-12 w-12 rounded-full overflow-hidden mb-1"><DriverSvg /></div>
                      <span className="text-[9px] font-black text-slate-700">Navigator</span>
                      {avatarUrl === 'PRESET_DRIVER' && <div className="absolute top-1 right-1 bg-blue-500 text-white p-0.5 rounded-full"><Check className="h-2.5 w-2.5" /></div>}
                    </button>

                    <button
                      onClick={() => handleAvatarSelect('PRESET_ADMIN')}
                      className={`relative rounded-2xl p-1.5 border-2 transition-all hover:scale-105 bg-slate-50 flex flex-col items-center justify-center cursor-pointer ${
                        avatarUrl === 'PRESET_ADMIN' ? 'border-blue-500 bg-blue-50/20' : 'border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="h-12 w-12 rounded-full overflow-hidden mb-1"><AdminSvg /></div>
                      <span className="text-[9px] font-black text-slate-700">HQ Director</span>
                      {avatarUrl === 'PRESET_ADMIN' && <div className="absolute top-1 right-1 bg-blue-500 text-white p-0.5 rounded-full"><Check className="h-2.5 w-2.5" /></div>}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Or Upload a Custom Photo</h4>
                  
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                      dragActive ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="file"
                      id="avatar-file-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="avatar-file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                      <Upload className="h-7 w-7 text-slate-400 mb-1" />
                      <span className="text-xs font-black text-slate-700">Click to upload or drag & drop</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, WebP (Max 2MB)</span>
                    </label>
                  </div>

                  {fileError && <p className="text-[11px] text-rose-600 mt-2 font-medium">⚠️ {fileError}</p>}
                </div>
              </div>
            )}

            {/* TAB 3: Change Password */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Current Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
