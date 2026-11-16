import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AiChatRequestBody {
  roomCode?: string;
  messages?: ChatMessage[];
  model?: string;
  temperature?: number;
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

    const body = (await req.json()) as AiChatRequestBody;
    const roomCode = body.roomCode?.trim();
    const messages = body.messages;

    if (!roomCode || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'roomCode and messages are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: room, error: roomError } = await adminClient
      .from('rooms')
      .select('id, teacher_id, is_active')
      .eq('code', roomCode)
      .eq('is_active', true)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: '활성화된 수업 방을 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: teacher, error: teacherError } = await adminClient
      .from('teachers')
      .select('openai_api_key, is_active')
      .eq('id', room.teacher_id)
      .single();

    if (teacherError || !teacher || teacher.is_active === false || !teacher.openai_api_key?.trim()) {
      return new Response(
        JSON.stringify({ error: 'API 키가 설정되지 않았거나 비활성화된 교사 계정입니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacher.openai_api_key.trim()}`,
      },
      body: JSON.stringify({
        model: body.model ?? 'gpt-4o',
        messages,
        temperature: body.temperature ?? 0.7,
      }),
    });

    const openaiData = await openaiResponse.json().catch(() => null);
    if (!openaiResponse.ok) {
      return new Response(
        JSON.stringify({
          error: openaiData?.error?.message || `OpenAI API request failed (${openaiResponse.status})`,
        }),
        { status: openaiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = openaiData?.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Empty response from OpenAI API.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ content }),
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
