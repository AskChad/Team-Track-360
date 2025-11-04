'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  sport_id: string;
  organization_id: string;
  season: string;
  age_group?: string;
  description?: string;
  team_logo_url?: string;
  created_at: string;
}

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load teams');
        setLoading(false);
        return;
      }

      setTeams(data.data || []);
      setLoading(false);
    } catch (err: any) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wrestling-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teams...</p>
        </div>
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
              <h1 className="text-3xl font-bold">Teams</h1>
              <p className="text-gray-200 mt-2">Manage your sports teams</p>
            </div>
            <Link
              href="/dashboard"
              className="bg-white text-wrestling-navy px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              Back to Dashboard
            </Link>
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

        {teams.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Teams Yet</h3>
            <p className="text-gray-600 mb-6">Create your first team to get started</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-wrestling-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-wrestling-bright transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Team Logo */}
                {team.team_logo_url ? (
                  <div className="w-16 h-16 mb-4 rounded-full bg-wrestling-blue bg-opacity-10 flex items-center justify-center">
                    <img
                      src={team.team_logo_url}
                      alt={team.name}
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 mb-4 rounded-full bg-wrestling-blue bg-opacity-10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-wrestling-navy">
                      {team.name.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Team Info */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{team.name}</h3>

                {team.age_group && (
                  <p className="text-sm text-gray-600 mb-2">Age Group: {team.age_group}</p>
                )}

                {team.season && (
                  <p className="text-sm text-gray-600 mb-2">Season: {team.season}</p>
                )}

                {team.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                    {team.description}
                  </p>
                )}

                {/* View Team Button */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-wrestling-blue font-semibold text-sm hover:text-wrestling-navy">
                    View Team →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
