import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(() => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: 'Notifications placeholder. Add email, push, and in-app fan-out logic here.',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
