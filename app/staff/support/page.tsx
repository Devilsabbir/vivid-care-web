import SupportClient from './SupportClient'

export default function SupportPage() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold font-headline text-on-surface">Support</h2>
        <p className="text-on-surface-variant text-sm mt-0.5">AI assistant & help</p>
      </div>
      <SupportClient />
    </div>
  )
}
