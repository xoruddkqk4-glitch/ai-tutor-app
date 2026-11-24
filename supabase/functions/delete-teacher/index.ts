import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN')?.trim() || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteTeacherBody {
  teacherId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase server environment is not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: '인증 토큰이 필요합니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 인증 세션입니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = userData.user.id;
    const { data: callerTeacher, error: callerError } = await adminClient
      .from('teachers')
      .select('role, is_active')
      .eq('id', callerId)
      .single();

    if (callerError || !callerTeacher || callerTeacher.role !== 'master' || callerTeacher.is_active === false) {
      return new Response(
        JSON.stringify({ error: '마스터 교사만 다른 교사를 삭제할 수 있습니다.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json()) as DeleteTeacherBody;
    const teacherId = body.teacherId?.trim();
    if (!teacherId) {
      return new Response(
        JSON.stringify({ error: 'teacherId is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (teacherId === callerId) {
      return new Response(
        JSON.stringify({ error: '현재 로그인된 마스터 계정은 삭제할 수 없습니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: targetTeacher } = await adminClient
      .from('teachers')
      .select('role')
      .eq('id', teacherId)
      .maybeSingle();

    if (targetTeacher?.role === 'master') {
      return new Response(
        JSON.stringify({ error: '다른 마스터 계정은 삭제할 수 없습니다.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: deleteRowError } = await adminClient
      .from('teachers')
      .delete()
      .eq('id', teacherId);

    if (deleteRowError) {
      return new Response(
        JSON.stringify({ error: deleteRowError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(teacherId);
    if (deleteAuthError && !deleteAuthError.message.toLowerCase().includes('not found')) {
      return new Response(
        JSON.stringify({ error: deleteAuthError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ deleted: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
