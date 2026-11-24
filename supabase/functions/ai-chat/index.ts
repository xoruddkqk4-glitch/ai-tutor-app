import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN')?.trim() || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type AiRequestKind = 'tutoring' | 'simple';

interface AiChatRequestBody {
  roomCode?: string;
  messages?: ChatMessage[];
  kind?: AiRequestKind;
}

const ALLOWED_MODELS = new Set(['gpt-6-sol', 'gpt-6-luna', 'gpt-4o', 'gpt-4o-mini']);
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
const MAX_MESSAGES = 40;
const MAX_TOTAL_CHARS = 30_000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  if (rateLimitStore.size > 2000) {
    for (const [entryKey, timestamps] of rateLimitStore.entries()) {
      const recent = timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) {
        rateLimitStore.delete(entryKey);
      } else {
        rateLimitStore.set(entryKey, recent);
      }
    }
  }

  const current = (rateLimitStore.get(key) ?? []).filter((t) => t > cutoff);
  if (current.length >= RATE_LIMIT_MAX) {
    const oldest = current[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
    rateLimitStore.set(key, current);
    return { allowed: false, retryAfterSeconds };
  }

  current.push(now);
  rateLimitStore.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('cf-connecting-ip')?.trim() || 'unknown';
}

function validateMessages(messages: unknown): { valid: boolean; reason?: string } {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, reason: 'messages must be a non-empty array.' };
  }
  if (messages.length > MAX_MESSAGES) {
    return { valid: false, reason: `Too many messages (max ${MAX_MESSAGES}).` };
  }

  let totalChars = 0;
  for (const item of messages) {
    if (typeof item !== 'object' || item === null) {
      return { valid: false, reason: 'Each message must be an object.' };
    }
    const msg = item as { role?: unknown; content?: unknown };
    if (typeof msg.role !== 'string' || !ALLOWED_ROLES.has(msg.role)) {
      return { valid: false, reason: 'Invalid message role.' };
    }
    if (typeof msg.content !== 'string' || msg.content.trim().length === 0) {
      return { valid: false, reason: 'Each message content must be a non-empty string.' };
    }
    totalChars += msg.content.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return { valid: false, reason: `Total prompt length exceeds ${MAX_TOTAL_CHARS} characters.` };
    }
  }

  return { valid: true };
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
    const kind = body.kind ?? 'tutoring';

    if (!roomCode || !/^\d{4,10}$/.test(roomCode)) {
      return new Response(
        JSON.stringify({ error: 'Valid roomCode is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const msgCheck = validateMessages(body.messages);
    if (!msgCheck.valid) {
      return new Response(
        JSON.stringify({ error: msgCheck.reason || 'Invalid messages.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (kind !== 'tutoring' && kind !== 'simple') {
      return new Response(
        JSON.stringify({ error: 'Invalid kind. Expected "tutoring" or "simple".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rateResult = checkRateLimit(`${roomCode}:${getClientIp(req)}`);
    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateResult.retryAfterSeconds),
          },
        }
      );
    }

    const model = Deno.env.get('OPENAI_MODEL')?.trim() || 'gpt-6-sol';
    if (!ALLOWED_MODELS.has(model)) {
      return new Response(
        JSON.stringify({ error: 'Configured model is not permitted.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    const reasoningEffort = kind === 'simple' ? 'none' : 'low';
    const maxCompletionTokens = kind === 'simple' ? 1000 : 1500;
    const isReasoningModel = /^(?:gpt-[56]|o[134])/i.test(model);

    const openaiPayload = isReasoningModel
      ? {
          model,
          messages: body.messages,
          reasoning_effort: reasoningEffort,
          max_completion_tokens: maxCompletionTokens,
        }
      : {
          model,
          messages: body.messages,
          temperature: 0.7,
          max_tokens: maxCompletionTokens,
        };

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacher.openai_api_key.trim()}`,
      },
      body: JSON.stringify(openaiPayload),
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
      JSON.stringify({ content, usage: openaiData?.usage ?? null }),
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
