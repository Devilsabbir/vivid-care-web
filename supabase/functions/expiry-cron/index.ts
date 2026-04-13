import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(() => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: 'Expiry cron placeholder. Wire Supabase admin queries and notification dispatch here.',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
