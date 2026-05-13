// components/agreements/AgreementContent.tsx
// Renders all 15 sections of the Vivid Care NDIS Service Agreement as HTML.
// Mirrors the structure of AgreementPDF.tsx but uses Tailwind instead of react-pdf.

import { VIVID_CARE, AGREEMENT_VERSION } from '@/lib/agreements/constants'
import type { ProviderDetails } from './AgreementPDF'

export type AgreementContentProps = {
  participantName: string
  advocateName?: string | null
  supportDescription: string
  fundingType: 'self' | 'nominee' | 'ndia' | 'plan_manager'
  paymentMethod: 'eft' | 'cheque' | 'cash'
  commencementDate: string
  expiryDate?: string | null
  signerName: string
  signatureDataUrl: string | null
  signedAt: string
  provider?: Partial<ProviderDetails>
}

const FUNDING_CLAUSES: Record<'self' | 'nominee' | 'ndia' | 'plan_manager', string> = {
  self: 'The participant has chosen to self-manage the funding for NDIS supports provided under this Service Agreement. After providing supports, Vivid Care will send the participant an invoice for those supports. The participant will pay by EFT/cheque/cash within 7 days.',
  nominee: "The participant's Nominee manages the funding for supports under this Service Agreement. After providing supports, Vivid Care will send the Nominee an invoice. The Nominee will pay by EFT within 7 days.",
  ndia: 'The participant has nominated the NDIA to manage the funding for supports under this Service Agreement. After providing supports, Vivid Care will claim payment directly from the NDIS.',
  plan_manager: 'The participant has nominated a Registered Plan Management Provider to manage the funding for NDIS supports under this Service Agreement. After providing supports, Vivid Care will claim payment from the Plan Management Provider.',
}

const PAYMENT_LABELS: Record<'eft' | 'cheque' | 'cash', string> = {
  eft: 'Electronic Funds Transfer (EFT)',
  cheque: 'Cheque',
  cash: 'Cash',
}

function SectionHeading({ number, title }: { number: number; title: string }) {
  return (
    <h3 className="mt-6 border-b border-[#e6e8ec] pb-2 text-sm font-bold uppercase tracking-[0.1em] text-[#0f172a]">
      {number}. {title}
    </h3>
  )
}

function Clause({ letter, text }: { letter: string; text: string }) {
  return (
    <div className="flex gap-3 py-1 pl-2">
      <span className="mt-0.5 shrink-0 text-xs font-semibold text-[#64748b]">({letter})</span>
      <p className="text-sm leading-6 text-[#64748b]">{text}</p>
    </div>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <div className="flex gap-3 py-1 pl-4">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#64748b]" />
      <p className="text-sm leading-6 text-[#64748b]">{text}</p>
    </div>
  )
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-6 text-[#64748b]">{children}</p>
}

function PartiesRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex ${last ? '' : 'border-b border-[#e0dbd3]'}`}>
      <div className="w-40 shrink-0 bg-[#0f172a] px-3 py-2 text-xs font-semibold text-white">{label}</div>
      <div className="flex-1 px-3 py-2 text-sm text-[#0f172a]">{value}</div>
    </div>
  )
}

export default function AgreementContent({
  participantName,
  advocateName,
  supportDescription,
  fundingType,
  paymentMethod,
  commencementDate,
  expiryDate,
  signerName,
  signatureDataUrl,
  signedAt,
  provider,
}: AgreementContentProps) {
  const p = { ...VIVID_CARE, ...provider }

  return (
    <div className="space-y-1 text-[#0f172a]">
      {/* Document header */}
      <div className="rounded-2xl bg-[#0f172a] px-5 py-4 text-center">
        <p className="font-headline text-lg font-bold uppercase tracking-[0.2em] text-[#6B2C91]">Service Agreement</p>
        <p className="mt-1 text-[11px] text-[#8f8a80]">Vivid Care · NDIS Registered Service Provider</p>
      </div>

      {/* Provider block */}
      <div className="mt-4 border-l-4 border-[#6B2C91] pl-4">
        <div className="space-y-1 text-xs">
          <div className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-[#64748b]">Company Name:</span><span>{p.name}</span></div>
          <div className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-[#64748b]">Address:</span><span>{p.address}</span></div>
          <div className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-[#64748b]">Phone:</span><span>{p.phone}</span></div>
          <div className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-[#64748b]">Email:</span><span>{p.email}</span></div>
          <div className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-[#64748b]">ABN:</span><span>{p.abn}</span></div>
          <div className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-[#64748b]">Version:</span><span>{AGREEMENT_VERSION}</span></div>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-4 flex gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#64748b]">Date Prepared</p>
          <p className="mt-1 text-sm font-semibold">{commencementDate}</p>
        </div>
        {expiryDate && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#64748b]">Review Date</p>
            <p className="mt-1 text-sm font-semibold">{expiryDate}</p>
          </div>
        )}
      </div>

      {/* Note box */}
      <div className="mt-4 rounded-xl bg-[#f7f8f9] px-4 py-3">
        <p className="text-xs italic leading-5 text-[#64748b]">
          NOTE: A Service Agreement can be made between a participant and a provider or a participant&apos;s representative and a provider. A participant&apos;s representative is someone close to the participant, such as a family member or friend, or someone who manages the funding for supports under a participant&apos;s NDIS plan.
        </p>
      </div>

      {/* Section 1: Parties */}
      <SectionHeading number={1} title="Parties" />
      <Body>
        This Service Agreement is for {participantName}, a participant in the National Disability Insurance Scheme and is made between:
      </Body>
      <div className="mt-3 overflow-hidden rounded-xl border border-[#e0dbd3]">
        <PartiesRow label="Participant" value={participantName} />
        <PartiesRow label="Advocate / Participant's Representative" value={advocateName ?? '—'} last />
      </div>
      <Body>and</Body>
      <div className="mt-2 overflow-hidden rounded-xl border border-[#e0dbd3]">
        <PartiesRow label="Provider" value={p.name} last />
      </div>
      <Body>
        This Service Agreement will commence on {commencementDate}{expiryDate ? ` for the period ${commencementDate} to ${expiryDate}` : ''}.
      </Body>

      {/* Section 2: The NDIS and this Service Agreement */}
      <SectionHeading number={2} title="The NDIS and this Service Agreement" />
      <Clause letter="a" text="This Agreement is made according to the rules and goals of the National Disability Insurance Scheme (NDIS)." />
      <Clause letter="b" text="The participant and Vivid Care agree that this Agreement is in line with the main ideas of the NDIS, including having more choices, achieving goals, and taking part in the community." />
      <Clause letter="c" text="The parties agree that this Service Agreement is made in the context of the NDIS, which is a scheme that aims to:" />
      <Bullet text="support the independence and social and economic participation of people with disability; and" />
      <Bullet text="enable people with a disability to exercise choice and control in the pursuit of their goals and the planning and delivery of their supports." />
      <Clause letter="d" text="A copy of the participant's NDIS plan may be attached to this Service Agreement where the participant consents." />

      {/* Section 3: Schedule of Supports */}
      <SectionHeading number={3} title="Schedule of Supports" />
      <Body>Vivid Care agrees to provide the following supports to the participant:</Body>
      <div className="mt-3 rounded-xl bg-[#f7f8f9] px-4 py-3">
        <p className="text-sm leading-6 text-[#64748b]">{supportDescription}</p>
      </div>
      <Body>
        The supports will be provided according to the participant&apos;s preferred times and schedule, as agreed between the parties. All prices are inclusive of GST (if applicable) and are in line with the NDIS Price Guide current at the time of delivery. Additional expenses not included as part of the participant&apos;s NDIS supports (such as entrance fees, meals, transport costs, and personal care products) are the responsibility of the participant or their representative.
      </Body>

      {/* Section 4: Responsibilities of Vivid Care */}
      <SectionHeading number={4} title="Responsibilities of Vivid Care" />
      <p className="mt-2 text-sm font-semibold text-[#0f172a]">Vivid Care agrees to:</p>
      <Clause letter="a" text="Review the provision of supports at least monthly with the participant or their representative." />
      <Clause letter="b" text="Complete an individual evacuation plan if required — this plan will be added as an appendix to this agreement." />
      <Clause letter="c" text="Once agreed, provide supports that meet the participant's needs at the participant's preferred times." />
      <Clause letter="d" text="Communicate openly and honestly in a timely manner." />
      <Clause letter="e" text="Treat the participant with courtesy and respect at all times." />
      <Clause letter="f" text="Consult the participant on decisions about how supports are provided." />
      <Clause letter="g" text="Ensure that there is no conflict of interest and inform the participant if there is any potential for this." />
      <Clause letter="h" text="Provide supports that meet the participant's needs at the preferred times." />
      <Clause letter="i" text="Review the provision of supports at least monthly." />
      <Clause letter="j" text="Provide information about managing any complaints or disagreements and details of the cancellation policy." />
      <Clause letter="k" text="Listen to the participant's feedback and resolve problems quickly." />
      <Clause letter="l" text="Give the participant a minimum of 24 hours' notice if Vivid Care has to change a scheduled appointment." />
      <Clause letter="m" text="Keep all personal information private and confidential." />
      <Clause letter="n" text="Keep the participant safe and ensure the safety of all others during service delivery." />
      <Clause letter="o" text="Give the participant the required notice if Vivid Care needs to end the Service Agreement (see Section 8)." />
      <Clause letter="p" text="Protect the participant's privacy and confidential information, including personal data, health information, and other personal details gathered during the intake process. This information remains private during the delivery of services." />
      <Clause letter="q" text="Provide supports in a manner consistent with all relevant laws, including the National Disability Insurance Scheme Act 2013 and the Australian Consumer Law; keep accurate records on the supports provided." />
      <Clause letter="r" text="Issue regular invoices and statements of the supports delivered to the participant." />
      <div className="mt-3 rounded-xl bg-[#fff8e1] px-4 py-3">
        <p className="text-sm font-semibold leading-6 text-[#0f172a]">
          Zero Tolerance Policy: Vivid Care has policies and procedures built on human rights. Where allegations of abuse, neglect, violence, exploitation, or discrimination are made, Vivid Care employs a Zero Tolerance policy.
        </p>
      </div>

      {/* Section 5: Responsibilities of the Participant */}
      <SectionHeading number={5} title="Responsibilities of the Participant / Participant's Representative" />
      <p className="mt-2 text-sm font-semibold text-[#0f172a]">The participant/participant&apos;s representative agrees to:</p>
      <Clause letter="a" text="Respect the rights of staff, ensuring their workplace is safe, healthy, and free from harassment." />
      <Clause letter="b" text="Abide by the terms of this Service Agreement." />
      <Clause letter="c" text="Understand that needs may change and, with this, services may need to change to meet those needs." />
      <Clause letter="d" text="Accept responsibility for their own actions and choices, even though some choices may involve risk." />
      <Clause letter="e" text="Tell Vivid Care if there are problems with the care and services being received." />
      <Clause letter="f" text="Give Vivid Care enough information to develop, deliver, and review the support plan." />
      <Clause letter="g" text="Care for their own health and wellbeing as much as they are able." />
      <Clause letter="h" text="Provide Vivid Care with information that will help better meet the participant's needs." />
      <Clause letter="i" text="Provide a minimum of 24 hours' notice when the participant will not be home for their service." />
      <Clause letter="j" text="Be aware that Vivid Care staff are only authorised to perform the agreed number of hours and tasks outlined in this Service Agreement." />
      <Clause letter="k" text="Participate in safety assessments of the participant's home." />
      <Clause letter="l" text="Ensure pets are controlled during service provision." />
      <Clause letter="m" text="Provide a smoke-free working environment during support delivery." />
      <Clause letter="n" text="Pay the agreed amount for the services provided." />
      <Clause letter="o" text="Tell Vivid Care in writing and give notice prior to the day they intend to stop receiving services." />
      <Clause letter="p" text="Inform staff if they wish to opt out of any support activity when asked." />
      <Clause letter="q" text="Inform Vivid Care about how they wish the supports to be delivered to meet the participant's needs." />
      <Clause letter="r" text="Treat Vivid Care staff with courtesy and respect." />
      <Clause letter="s" text="Talk to Vivid Care if the participant has any concerns about the supports being provided." />
      <Clause letter="t" text="Give Vivid Care a minimum of 24 hours' notice if the participant cannot make a scheduled appointment; if notice is not provided by then, the cancellation policy will apply." />
      <Clause letter="u" text="Give Vivid Care the required notice if the participant needs to end the Service Agreement (see Section 8)." />
      <Clause letter="v" text="Let Vivid Care know immediately if the participant's NDIS plan is suspended, replaced by a new NDIS plan, or the participant stops being a participant in the NDIS." />

      {/* Section 6: Payments */}
      <SectionHeading number={6} title="Payments" />
      <Body>Vivid Care will seek payment for the provision of supports after the participant or their representative confirms satisfactory delivery.</Body>
      <Body>{FUNDING_CLAUSES[fundingType]}</Body>
      <Body>Preferred payment method: {PAYMENT_LABELS[paymentMethod]}.</Body>
      <Body>
        A supply of supports under this Service Agreement is a supply of one or more reasonable and necessary supports specified in the statement of supports included, under subsection 33(2) of the National Disability Insurance Scheme Act 2013 (NDIS Act), in the participant&apos;s NDIS Plan currently in effect under section 37 of the NDIS Act.
      </Body>

      {/* Section 7: Changes */}
      <SectionHeading number={7} title="Changes to this Service Agreement" />
      <Body>
        If changes to the supports or their delivery are required, the parties agree to discuss and review this Service Agreement. Any changes to this Service Agreement will be in writing, signed, and dated by both parties.
      </Body>

      {/* Section 8: Ending */}
      <SectionHeading number={8} title="Ending this Service Agreement" />
      <Body>
        Should either party wish to end this Service Agreement they must give 30 days&apos; notice in writing. If either party seriously breaches this Service Agreement the requirement of notice will be waived.
      </Body>

      {/* Section 9: Feedback */}
      <SectionHeading number={9} title="Feedback, Complaints and Disputes" />
      <Body>
        If the participant wishes to give feedback or make a complaint, they can contact: {p.contactName} at {p.phone} or {p.email}.
      </Body>
      <Body>
        If the participant is not satisfied or does not wish to talk to Vivid Care, they can contact the National Disability Insurance Scheme by calling 1800 035 544, visiting one of their offices in person, or visiting ndis.gov.au for further information.
      </Body>

      {/* Section 10: GST */}
      <SectionHeading number={10} title="Goods and Services Tax (GST)" />
      <Body>For the purposes of GST legislation, the parties confirm that:</Body>
      <Clause letter="a" text="A supply of supports under this Service Agreement is a supply of one or more of the reasonable and necessary supports specified in the statement included under subsection 33(2) of the NDIS Act in the participant's NDIS plan currently in effect under section 37 of the NDIS Act;" />
      <Clause letter="b" text="The participant's NDIS plan is expected to remain in effect during the period the supports are provided; and" />
      <Clause letter="c" text="The participant or their representative will immediately notify Vivid Care if the participant's NDIS Plan is replaced by a new plan or the participant stops being a participant in the NDIS." />

      {/* Section 11: Access to Records */}
      <SectionHeading number={11} title="Access to Records" />
      <Body>
        The participant&apos;s file may be accessed by a NDIS Registered Auditor for audit purposes only, with the participant&apos;s consent. Access to participant records by other parties (such as support coordinators, plan managers, family members, or other practitioners) is granted only as agreed in writing between the participant and Vivid Care.
      </Body>

      {/* Section 12: Information Storage */}
      <SectionHeading number={12} title="Information Storage" />
      <Body>
        Vivid Care may collect personal information about the participant from the participant, their representative, or a third party, using forms, online portals, and other electronic or paper correspondence. Vivid Care will not ask for any personal information which is not needed. All personal information is collected and stored in accordance with the Privacy Act 1988 and the Australian Privacy Principles. Information is collected for purposes that are reasonably necessary for, or directly related to, the delivery of NDIS supports.
      </Body>

      {/* Section 13: Contact Details */}
      <SectionHeading number={13} title="Contact Details" />
      <p className="mt-2 text-sm font-semibold text-[#0f172a]">Participant / Representative:</p>
      <div className="mt-2 overflow-hidden rounded-xl border border-[#e0dbd3]">
        <PartiesRow label="Name" value={participantName} />
        {advocateName && <PartiesRow label="Representative" value={advocateName} />}
        <PartiesRow label="Phone / Email" value="—" last />
      </div>
      <p className="mt-4 text-sm font-semibold text-[#0f172a]">Provider (Vivid Care):</p>
      <div className="mt-2 overflow-hidden rounded-xl border border-[#e0dbd3]">
        <PartiesRow label="Contact Name" value={p.contactName} />
        <PartiesRow label="Phone" value={p.phone} />
        <PartiesRow label="Email" value={p.email} />
        <PartiesRow label="Address" value={p.address} last />
      </div>

      {/* Section 14: Participant's Copy */}
      <SectionHeading number={14} title="Participant's Copy of Service Agreement" />
      <Body>
        The participant confirms they have been offered a copy of this signed Service Agreement upon completion. A digital copy (PDF) is available upon request from Vivid Care.
      </Body>

      {/* Section 15: Signatures */}
      <SectionHeading number={15} title="Agreement Signatures" />
      <Body>
        The parties agree to the terms and conditions of this Service Agreement. This agreement has been explained verbally and the participant has had the opportunity to ask questions.
      </Body>

      <div className="mt-4 grid gap-4 border-t border-[#e6e8ec] pt-4 sm:grid-cols-2">
        {/* Participant signature */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#64748b]">Signature of Participant / Representative</p>
          {signatureDataUrl ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-[#e6e8ec] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signatureDataUrl} alt="Participant signature" className="h-[70px] w-full object-contain" />
            </div>
          ) : (
            <div className="mt-2 h-[70px] rounded-xl border border-[#e6e8ec] bg-white" />
          )}
          <p className="mt-2 text-sm font-semibold text-[#0f172a]">{signerName || '—'}</p>
          <p className="text-xs text-[#64748b]">Date: {signedAt}</p>
        </div>

        {/* Provider signature */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#64748b]">Authorised Person from Vivid Care</p>
          <div className="mt-2 h-[70px] rounded-xl border border-[#e6e8ec] bg-white" />
          <p className="mt-2 text-sm font-semibold text-[#0f172a]">{p.contactName}</p>
          <p className="text-xs text-[#64748b]">Date: ___________________</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 border-t border-[#e6e8ec] pt-4 text-center text-[11px] text-[#a8a49d]">
        <p>Vivid Care · ABN {p.abn} · {p.address} · {p.email}</p>
        {signedAt && <p className="mt-1">This document was digitally signed on {signedAt}. Generated by Vivid Care platform.</p>}
      </div>
    </div>
  )
}
