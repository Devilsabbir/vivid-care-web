import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function handleOptions(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return null
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  const contentLength = request.headers.get('content-length')

  if (contentLength === null || Number(contentLength) === 0) {
    return {} as T
  }

  return (await request.json()) as T
}

export function createServiceClient() {
  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ??
    Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY in the function environment.',
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function startOfDay(value = new Date()) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export function toIsoDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : new Date(value)
  return date.toISOString().slice(0, 10)
}

export function differenceInWholeDays(target: string | Date, base = new Date()) {
  const targetDate = startOfDay(typeof target === 'string' ? new Date(target) : target)
  const baseDate = startOfDay(base)
  return Math.floor((targetDate.getTime() - baseDate.getTime()) / 86_400_000)
}

export function uniqueValues<T>(values: T[]) {
  return [...new Set(values)]
}

export function relationRow<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}
