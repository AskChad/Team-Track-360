/**
 * OpenAI API Key Management for Organizations
 *
 * POST /api/organizations/[id]/openai-key - Save/update OpenAI API key
 * GET /api/organizations/[id]/openai-key - Check if key is configured
 * DELETE /api/organizations/[id]/openai-key - Remove API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

/**
 * GET - Check if organization has OpenAI API key configured
 * Returns status but not the actual key for security
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Check if user is org admin or platform admin for this organization
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r =>
      ['platform_admin', 'super_admin'].includes(r.role_type)
    );
    const isOrgAdmin = adminRoles?.some(r =>
      r.role_type === 'org_admin' && r.organization_id === params.id
    );

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get organization's OpenAI key status
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('openai_api_key_encrypted, openai_api_key_updated_at')
      .eq('id', params.id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        has_key: !!org.openai_api_key_encrypted,
        updated_at: org.openai_api_key_updated_at
      }
    });

  } catch (error: any) {
    console.error('OpenAI key GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check API key status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save/update OpenAI API key (encrypted)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Check if user is org admin or platform admin for this organization
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r =>
      ['platform_admin', 'super_admin'].includes(r.role_type)
    );
    const isOrgAdmin = adminRoles?.some(r =>
      r.role_type === 'org_admin' && r.organization_id === params.id
    );

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { api_key } = body;

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Basic validation - OpenAI keys start with 'sk-'
    if (!api_key.startsWith('sk-')) {
      return NextResponse.json(
        { success: false, error: 'Invalid OpenAI API key format. Key should start with "sk-"' },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedKey = encrypt(api_key);

    // Save to database
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        openai_api_key_encrypted: encryptedKey,
        openai_api_key_updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OpenAI API key saved successfully'
    });

  } catch (error: any) {
    console.error('OpenAI key POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save API key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove OpenAI API key
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Check if user is org admin or platform admin for this organization
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r =>
      ['platform_admin', 'super_admin'].includes(r.role_type)
    );
    const isOrgAdmin = adminRoles?.some(r =>
      r.role_type === 'org_admin' && r.organization_id === params.id
    );

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Remove the API key
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        openai_api_key_encrypted: null,
        openai_api_key_updated_at: null
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OpenAI API key removed successfully'
    });

  } catch (error: any) {
    console.error('OpenAI key DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove API key' },
      { status: 500 }
    );
  }
}
