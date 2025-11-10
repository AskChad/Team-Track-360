'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Athlete {
  id: string;
  current_weight_class?: string;
  wrestling_style?: string;
  grade_level?: string;
  is_active: boolean;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    date_of_birth?: string;
  };
  teams?: {
    id: string;
    name: string;
  };
}

interface Team {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  platform_role: string;
}

export default function AthletesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    team_id: '',
    current_weight_class: '',
    preferred_weight_class: '',
    wrestling_style: '',
    grade_level: '',
    years_experience: '',
    medical_clearance_date: '',
    medical_clearance_expires_at: '',
  });

  // Check if user can create athletes (Platform Admin or has teams)
  const canCreateAthlete = (user?.platform_role === 'platform_admin' || user?.platform_role === 'super_admin') || teams.length > 0;

  useEffect(() => {
    // Load user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchAthletes();
    fetchTeams();
  }, []);

  const fetchAthletes = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/athletes', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setAthletes(data.data || []);
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load athletes');
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setTeams(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load teams');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/athletes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormData({
          email: '',
          first_name: '',
          last_name: '',
          date_of_birth: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          team_id: '',
          current_weight_class: '',
          preferred_weight_class: '',
          wrestling_style: '',
          grade_level: '',
          years_experience: '',
          medical_clearance_date: '',
          medical_clearance_expires_at: '',
        });
        fetchAthletes();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create athlete');
    }
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const WEIGHT_CLASSES = ['106', '113', '120', '126', '132', '138', '145', '152', '160', '170', '182', '195', '220', '285'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wrestling-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-wrestling-dark via-wrestling-navy to-wrestling-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Athletes</h1>
              <p className="text-gray-200 mt-2">Manage wrestler profiles and information</p>
            </div>
            <div className="flex gap-4">
              {canCreateAthlete && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-wrestling-teal text-white px-4 py-2 rounded-lg font-bold hover:opacity-90"
                >
                  + Add Athlete
                </button>
              )}
              <Link
                href="/dashboard"
                className="bg-white text-wrestling-navy px-4 py-2 rounded-lg font-bold hover:bg-gray-100"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {athletes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤼</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Athletes Yet</h3>
            <p className="text-gray-600 mb-6">Add your first wrestler profile</p>
            {canCreateAthlete && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-wrestling-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-wrestling-bright"
              >
                Add Athlete
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes.map((athlete) => (
              <Link
                key={athlete.id}
                href={`/athletes/${athlete.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {athlete.profiles?.first_name} {athlete.profiles?.last_name}
                    </h3>
                    {athlete.teams && (
                      <p className="text-sm text-gray-600">{athlete.teams.name}</p>
                    )}
                  </div>
                  <div className="text-3xl">🤼</div>
                </div>

                <div className="space-y-2 mb-3">
                  {athlete.current_weight_class && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1 text-sm font-bold rounded bg-wrestling-blue bg-opacity-10 text-wrestling-navy">
                        {athlete.current_weight_class} lbs
                      </span>
                    </div>
                  )}

                  {athlete.grade_level && (
                    <p className="text-sm text-gray-600">
                      <span className="font-bold">Grade:</span> {athlete.grade_level}
                    </p>
                  )}

                  {athlete.profiles?.date_of_birth && (
                    <p className="text-sm text-gray-600">
                      <span className="font-bold">Age:</span> {calculateAge(athlete.profiles.date_of_birth)}
                    </p>
                  )}

                  {athlete.wrestling_style && (
                    <p className="text-sm text-gray-600 capitalize">
                      <span className="font-bold">Style:</span> {athlete.wrestling_style}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    athlete.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {athlete.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-wrestling-blue font-semibold text-sm">
                    View Profile →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Athlete</h2>

              <form onSubmit={handleCreate} className="space-y-6">
                {/* Personal Info */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Wrestling Info */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Wrestling Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Team *
                      </label>
                      <select
                        required
                        value={formData.team_id}
                        onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                      >
                        <option value="">Select team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Current Weight Class
                        </label>
                        <select
                          value={formData.current_weight_class}
                          onChange={(e) => setFormData({ ...formData, current_weight_class: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                        >
                          <option value="">Select</option>
                          {WEIGHT_CLASSES.map((wc) => (
                            <option key={wc} value={wc}>{wc} lbs</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Preferred Weight Class
                        </label>
                        <select
                          value={formData.preferred_weight_class}
                          onChange={(e) => setFormData({ ...formData, preferred_weight_class: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                        >
                          <option value="">Select</option>
                          {WEIGHT_CLASSES.map((wc) => (
                            <option key={wc} value={wc}>{wc} lbs</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Wrestling Style
                        </label>
                        <select
                          value={formData.wrestling_style}
                          onChange={(e) => setFormData({ ...formData, wrestling_style: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                        >
                          <option value="">Select</option>
                          <option value="folkstyle">Folkstyle</option>
                          <option value="freestyle">Freestyle</option>
                          <option value="greco-roman">Greco-Roman</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Grade Level
                        </label>
                        <select
                          value={formData.grade_level}
                          onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                        >
                          <option value="">Select</option>
                          <option value="9">9th Grade</option>
                          <option value="10">10th Grade</option>
                          <option value="11">11th Grade</option>
                          <option value="12">12th Grade</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Years Experience
                        </label>
                        <input
                          type="number"
                          value={formData.years_experience}
                          onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                          placeholder="e.g., 3"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-wrestling-blue text-white py-3 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Create Athlete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
