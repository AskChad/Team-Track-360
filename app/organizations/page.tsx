'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone_number?: string;
  email?: string;
  website_url?: string;
  logo_url?: string;
  team_count?: number;
  sports?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  created_at: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/organizations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setOrganizations(data.data.organizations || []);
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load organizations');
      setLoading(false);
    }
  };

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
              <h1 className="text-3xl font-bold">Organizations</h1>
              <p className="text-gray-200 mt-2">View and manage wrestling organizations</p>
            </div>
            <div className="flex gap-4">
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

        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏛️</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Organizations Found</h3>
            <p className="text-gray-600 mb-6">You don't have access to any organizations yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{org.name}</h3>
                    {org.slug && (
                      <p className="text-xs text-gray-500 font-mono mb-2">/{org.slug}</p>
                    )}
                  </div>
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt={`${org.name} logo`}
                      className="w-12 h-12 rounded"
                    />
                  ) : (
                    <div className="text-3xl">🏛️</div>
                  )}
                </div>

                {org.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {org.description}
                  </p>
                )}

                <div className="space-y-2 mb-3">
                  {org.sports && org.sports.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {org.sports.map((sport) => (
                        <span
                          key={sport.id}
                          className="inline-block px-2 py-1 text-xs font-bold rounded bg-wrestling-blue bg-opacity-10 text-wrestling-navy"
                        >
                          {sport.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {(org.city || org.state) && (
                    <p className="text-sm text-gray-600">
                      📍 {org.city}{org.city && org.state && ', '}{org.state}
                    </p>
                  )}

                  {org.team_count !== undefined && (
                    <p className="text-sm text-gray-600">
                      <span className="font-bold">Teams:</span> {org.team_count}
                    </p>
                  )}

                  {org.email && (
                    <p className="text-sm text-gray-600">
                      📧 {org.email}
                    </p>
                  )}

                  {org.phone_number && (
                    <p className="text-sm text-gray-600">
                      📞 {org.phone_number}
                    </p>
                  )}

                  {org.website_url && (
                    <p className="text-sm">
                      <a
                        href={org.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-wrestling-blue hover:text-wrestling-navy"
                      >
                        🌐 Visit Website →
                      </a>
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/organizations/${org.id}`}
                    className="text-wrestling-blue font-semibold text-sm hover:text-wrestling-navy"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
