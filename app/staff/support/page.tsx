import SupportClient from './SupportClient'

export default function SupportPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#171717] px-5 py-5 text-white shadow-[0_24px_44px_rgba(23,23,22,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8a80]">Support</p>
        <h1 className="mt-3 font-headline text-[1.85rem] font-semibold leading-none tracking-[-0.05em]">Get help fast</h1>
        <p className="mt-3 text-sm leading-6 text-[#d1ccc3]">
          Ask the assistant for workflow help or jump straight to the support contact options.
        </p>
      </section>

      <SupportClient />
    </div>
  )
}
