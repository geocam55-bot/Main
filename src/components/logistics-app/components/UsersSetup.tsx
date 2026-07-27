import React, { useState } from 'react';
import { formatPhoneNumber } from '../lib/formatters';
import { User, UserRole, Branch } from '../types';
import { Users, UserPlus, Edit2, Trash2, Shield, Info, CheckCircle, Mail, Phone, Building, AlertTriangle, Calendar } from 'lucide-react';

interface UsersSetupProps {
  users: User[];
  branches: Branch[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  readOnly?: boolean;
}

export default function UsersSetup({
  users,
  branches,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  readOnly
}: UsersSetupProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form Inputs
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('User');
  const [userPhone, setUserPhone] = useState('');
  const [driverLicenseExpire, setDriverLicenseExpire] = useState('');
  const [associatedStoreId, setAssociatedStoreId] = useState('');
  const [userPassword, setUserPassword] = useState('ProSpaces2026!');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, name: string } | null>(null);

  // Expanded fields state
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [username, setUsername] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('');
  const [driverLicenseClass, setDriverLicenseClass] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [status, setStatus] = useState<'Active' | 'Suspended' | 'Terminated' | 'Inactive'>('Active');

  const ROLES: UserRole[] = ['Driver', 'Picker', 'Dispatcher', 'User', 'Admin'];

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Dispatcher':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Driver':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Picker':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'User':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleStartAdd = () => {
    setUserId(`USR-${Math.floor(1000 + Math.random() * 9000)}`);
    setUserName('');
    setUserEmail('');
    setUserRole('User');
    setUserPhone('');
    setDriverLicenseExpire('');
    setAssociatedStoreId(branches[0]?.id || '');
    setUserPassword('ProSpaces2026!');
    setEmployeeNumber('');
    setUsername('');
    setMobilePhone('');
    setDepartment('');
    setJobTitle('');
    setDriverLicenseNumber('');
    setDriverLicenseClass('');
    setHireDate('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setStatus('Active');
    setIsAdding(true);
    setEditingUserId(null);
  };

  const handleStartEdit = (user: User) => {
    setUserId(user.id);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserPhone(user.phone || '');
    setDriverLicenseExpire(user.driverLicenseExpire || '');
    setAssociatedStoreId(user.associatedStoreId || '');
    setUserPassword(user.password || '');
    
    // Expanded fields
    setEmployeeNumber(user.employeeNumber || '');
    setUsername(user.username || '');
    setMobilePhone(user.mobilePhone || '');
    setDepartment(user.department || '');
    setJobTitle(user.jobTitle || '');
    setDriverLicenseNumber(user.driverLicenseNumber || '');
    setDriverLicenseClass(user.driverLicenseClass || '');
    setHireDate(user.hireDate || '');
    setEmergencyContactName(user.emergencyContactName || '');
    setEmergencyContactPhone(user.emergencyContactPhone || '');
    setStatus(user.status || 'Active');
    
    setEditingUserId(user.id);
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      alert('Please fill in both the User name and email address.');
      return;
    }

    const payload: User = {
      id: userId,
      name: userName.trim(),
      email: userEmail.trim(),
      role: userRole,
      phone: userPhone.trim() || undefined,
      driverLicenseExpire: driverLicenseExpire || undefined,
      associatedStoreId: associatedStoreId || undefined,
      password: userPassword || 'ProSpaces2026!',
      
      // Expanded fields
      employeeNumber: employeeNumber.trim() || undefined,
      username: username.trim() || undefined,
      mobilePhone: mobilePhone.trim() || undefined,
      department: department.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      driverLicenseNumber: driverLicenseNumber.trim() || undefined,
      driverLicenseClass: driverLicenseClass.trim() || undefined,
      driverLicenseExpiry: driverLicenseExpire || undefined, // Syncing with main expire field
      hireDate: hireDate || undefined,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      status: status
    };

    if (editingUserId) {
      onUpdateUser(payload);
      setEditingUserId(null);
      showFeedback('User profile updated successfully.');
    } else {
      // Check if ID unique
      if (users.some(u => u.id === userId)) {
        payload.id = `USR-${Math.floor(10000 + Math.random() * 89999)}`;
      }
      onAddUser(payload);
      setIsAdding(false);
      showFeedback('New user credential provisioned successfully.');
    }

    // Reset Form
    setUserName('');
    setUserEmail('');
    setUserPhone('');
    setDriverLicenseExpire('');
    setUserPassword('ProSpaces2026!');
    setEmployeeNumber('');
    setUsername('');
    setMobilePhone('');
    setDepartment('');
    setJobTitle('');
    setDriverLicenseNumber('');
    setDriverLicenseClass('');
    setHireDate('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setStatus('Active');
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleDelete = (id: string, name: string) => {
    setShowDeleteConfirm({ id, name });
  };

  return (
    <div className="space-y-6 animate-fade-in" id="users-setup-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h4 className="font-sans font-bold text-gray-900 tracking-tight text-xl">User & Operator Accounts Registry</h4>
          <p className="text-xs text-gray-500">
            Provision roles, manage regional dispatcher log profiles, and authorize drivers for fleet tracking
          </p>
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center space-x-2 shadow-sm">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Add/Edit form */}
        <div className="lg:col-span-4 space-y-4">
          {readOnly ? (
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl text-center space-y-4">
              <div className="w-12 h-12 bg-slate-150/80 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-200/40">
                <Info className="h-6 w-6" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-700">View Only Mode</h5>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  As a Dispatcher, you have permissions to view system authorization profiles, but provisioning or altering user roles is restricted.
                </p>
              </div>
            </div>
          ) : (!isAdding && !editingUserId) ? (
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm text-center space-y-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-gray-900">Provision User Account</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Create secure system roles to assign delivery routes or give supervisory authorization rules.
                </p>
              </div>
              <button
                onClick={handleStartAdd}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add User Account</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider font-mono flex items-center">
                  <UserPlus className="h-4 w-4 mr-1 text-blue-600" />
                  {editingUserId ? 'Edit Account' : 'Provision User'}
                </h5>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingUserId(null); }}
                  className="text-gray-400 hover:text-gray-600 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">User Identifier</label>
                  <input
                    type="text"
                    value={userId}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-xs font-mono text-gray-500"
                  />
                  <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">Unique server-assigned user ID</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. David MacNeil"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Corporate Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@prospaces.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Access Role</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as UserRole)}
                      className="w-full border bg-white border-slate-200 px-2.5 py-1.5 rounded text-xs text-gray-800"
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="(902) 555-xxxx"
                      value={userPhone}
                      onChange={(e) => setUserPhone(formatPhoneNumber(e.target.value))}
                      className="w-full border bg-white border-slate-200 px-2.5 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Primary Linked ProSpaces Branch</label>
                  <select
                    value={associatedStoreId}
                    onChange={(e) => setAssociatedStoreId(e.target.value)}
                    className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800"
                  >
                    <option value="">-- No Store Association --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Driver License Expiration
                  </label>
                  <input
                    type="date"
                    value={driverLicenseExpire}
                    onChange={(e) => setDriverLicenseExpire(e.target.value)}
                    className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400 shrink-0" /> Real-time active status check will analyze this date
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Account Login Password</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter login password (e.g. ProSpaces2026!)"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Use this password to authenticate when logging into this profile.</span>
                </div>

                {/* HR & Logistics Details */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logistics & Human Resources</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Employee #</label>
                      <input
                        type="text"
                        placeholder="e.g. EMP-103"
                        value={employeeNumber}
                        onChange={(e) => setEmployeeNumber(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Username</label>
                      <input
                        type="text"
                        placeholder="e.g. dmacneil"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Mobile Phone</label>
                      <input
                        type="text"
                        placeholder="e.g. (902) 555-0192"
                        value={mobilePhone}
                        onChange={(e) => setMobilePhone(formatPhoneNumber(e.target.value))}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Terminated">Terminated</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Logistics"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Job Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Lead Delivery Driver"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Commercial Driver Endorsements</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-0.5 uppercase">License #</label>
                        <input
                          type="text"
                          placeholder="e.g. NS-87481-CD"
                          value={driverLicenseNumber}
                          onChange={(e) => setDriverLicenseNumber(e.target.value)}
                          className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-0.5 uppercase">License Class</label>
                        <input
                          type="text"
                          placeholder="e.g. CDL Class 1"
                          value={driverLicenseClass}
                          onChange={(e) => setDriverLicenseClass(e.target.value)}
                          className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Hire Date</label>
                      <input
                        type="date"
                        value={hireDate}
                        onChange={(e) => setHireDate(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Emergency Contact</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-0.5 uppercase">Contact Name</label>
                        <input
                          type="text"
                          placeholder="Name"
                          value={emergencyContactName}
                          onChange={(e) => setEmergencyContactName(e.target.value)}
                          className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-0.5 uppercase">Contact Phone</label>
                        <input
                          type="text"
                          placeholder="Phone"
                          value={emergencyContactPhone}
                          onChange={(e) => setEmergencyContactPhone(formatPhoneNumber(e.target.value))}
                          className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg text-center font-sans tracking-tight"
                >
                  {editingUserId ? 'Save Profile' : 'Authorize User'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingUserId(null); }}
                  className="px-3 bg-slate-100 hover:bg-slate-200 text-gray-600 text-xs font-medium rounded-lg"
                >
                  Dismiss
                </button>
              </div>
            </form>
          )}

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] text-gray-500 space-y-2">
            <p className="font-semibold flex items-center text-gray-800 text-xs">
              <Info className="h-3.5 w-3.5 mr-1 text-blue-500" /> Account Roles Matrix
            </p>
            <p>
              <strong>Driver:</strong> Operates physical vehicles. Logged runs.
              <br />
              <strong>Dispatcher:</strong> Directs queues and prints barcodes.
              <br />
              <strong>Admin:</strong> Total control of registries and store boundaries.
              <br />
              <strong>User:</strong> Customer support and generic order viewing.
            </p>
          </div>
        </div>

        {/* Right column: User grid list */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-sans font-bold text-gray-900 text-base">Registered System Users Roster</h4>
                <p className="text-xs text-gray-500 font-medium">Currently authorizing {users.length} registered profiles in this zone</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {users.map(user => {
                const matchedBranch = branches.find(b => b.id === user.associatedStoreId);

                return (
                  <div
                    key={user.id}
                    className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all bg-white relative flex flex-col justify-between shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-sans font-bold text-gray-900 text-sm">{user.name}</h5>
                          <span className="text-[10px] text-gray-400 font-mono font-medium block">
                            ID: {user.id}
                          </span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${getRoleBadgeStyle(user.role)}`}>
                          {user.role}
                        </span>
                      </div>

                      <div className="border-t border-slate-100/60 pt-2.5 space-y-1 text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>Main Phone: {user.phone}</span>
                          </div>
                        )}
                        {user.mobilePhone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>Mobile Phone: {user.mobilePhone}</span>
                          </div>
                        )}
                        {user.employeeNumber && (
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-slate-400 w-3.5 text-center font-mono">#</span>
                            <span>Emp ID: <strong className="font-mono text-slate-700">{user.employeeNumber}</strong></span>
                          </div>
                        )}
                        {(user.department || user.jobTitle) && (
                          <div className="flex items-center space-x-2">
                            <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {user.jobTitle || 'Crew Member'} {user.department ? `(${user.department})` : ''}
                            </span>
                          </div>
                        )}
                        {user.status && (
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-slate-400 w-3.5 text-center font-mono">S</span>
                            <span>Status: <strong className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              user.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>{user.status}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {matchedBranch ? matchedBranch.name.replace(' ProSpaces', '') : 'No Store Association'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>Passcode: <strong className="font-mono bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">{user.password || 'ProSpaces2026!'}</strong></span>
                        </div>
                        {user.driverLicenseNumber && (
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-slate-400 w-3.5 text-center font-mono">L</span>
                            <span>Lic #: <strong className="font-mono text-slate-700">{user.driverLicenseNumber}</strong> {user.driverLicenseClass ? `(Class ${user.driverLicenseClass})` : ''}</span>
                          </div>
                        )}
                        {user.emergencyContactName && (
                          <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded border border-slate-100 mt-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                            <div className="text-[10px] leading-tight">
                              <span className="font-bold text-slate-700 block">Emergency Contact</span>
                              <span>{user.emergencyContactName} {user.emergencyContactPhone ? `(${user.emergencyContactPhone})` : ''}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {matchedBranch ? matchedBranch.name.replace(' ProSpaces', '') : 'No Store Association'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>Passcode: <strong className="font-mono bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">{user.password || 'ProSpaces2026!'}</strong></span>
                        </div>
                        {user.driverLicenseExpire && (
                          <div className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border mt-2.5 ${
                            (() => {
                              const expDate = new Date(user.driverLicenseExpire);
                              const now = new Date();
                              return expDate < now;
                            })() 
                              ? 'bg-red-50 text-red-800 border-red-200/60' 
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                          }`}>
                            <Calendar className={`h-3.5 w-3.5 shrink-0 ${
                              (() => {
                                const expDate = new Date(user.driverLicenseExpire);
                                const now = new Date();
                                return expDate < now;
                              })() ? 'text-red-500 animate-pulse' : 'text-emerald-500'
                            }`} />
                            <div className="text-[11px] leading-tight select-none">
                              <span className="font-semibold block sm:inline">License Expires: </span>
                              <span className="font-mono">{user.driverLicenseExpire}</span>
                              {(() => {
                                const expDate = new Date(user.driverLicenseExpire);
                                const now = new Date();
                                return expDate < now;
                              })() && (
                                <span className="text-red-600 font-extrabold ml-1 uppercase text-[9px] tracking-wide animate-pulse block">(! EXPIRED)</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center justify-end space-x-1 border-t border-slate-100/60 mt-3 pt-2">
                        <button
                          onClick={() => handleStartEdit(user)}
                          className="p-1.5 hover:bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                          title="Edit User profile"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-1.5 hover:bg-red-50 border border-red-50 rounded-lg text-red-500 hover:text-red-700 transition-colors"
                          title="Disable Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 bg-white">
            <span className="flex items-center">
              <Shield className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Active Local User Session Authorization
            </span>
            <span>Active regional crew: <strong>{users.length}</strong></span>
          </div>
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-55 backdrop-blur-xs font-sans">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-150 p-6">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h4 className="font-sans font-bold text-slate-900 text-lg">
                Decomission User Account
              </h4>
            </div>
            
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Are you sure you want to permanently disable and delete user account: <strong className="text-slate-900 font-semibold">{showDeleteConfirm.name}</strong> ({showDeleteConfirm.id})? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors font-semibold cursor-pointer text-xs"
              >
                Cancel, Keep User
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteUser(showDeleteConfirm.id);
                  showFeedback('User database record decommissioned.');
                  setShowDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-colors font-bold cursor-pointer text-xs flex items-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete User</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
