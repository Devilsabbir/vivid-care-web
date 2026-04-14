// components/agreements/AgreementPDF.tsx

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { VIVID_CARE, AGREEMENT_VERSION } from '@/lib/agreements/constants'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a18',
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  headerBar: {
    backgroundColor: '#1a1a18',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    borderRadius: 4,
  },
  headerTitle: {
    color: '#cdff52',
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  headerSub: {
    color: '#a8a49d',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
  providerBlock: {
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#cdff52',
    paddingLeft: 10,
  },
  providerRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  providerLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    width: 90,
    color: '#4f4c45',
  },
  providerValue: {
    fontSize: 9,
    color: '#1a1a18',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#8a877f',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    color: '#1a1a18',
    fontFamily: 'Helvetica-Bold',
  },
  sectionHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#1a1a18',
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e4dc',
    paddingBottom: 4,
  },
  subHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#1a1a18',
    marginTop: 8,
    marginBottom: 4,
  },
  body: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: '#3a3832',
    marginBottom: 6,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  listBullet: {
    width: 16,
    fontSize: 9.5,
    color: '#3a3832',
  },
  listText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.6,
    color: '#3a3832',
  },
  infoBox: {
    backgroundColor: '#f4f2ed',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  infoBoxText: {
    fontSize: 9,
    color: '#4f4c45',
    lineHeight: 1.5,
    fontFamily: 'Helvetica-Oblique',
  },
  partiesTable: {
    borderWidth: 1,
    borderColor: '#e0dbd3',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  partiesRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0dbd3',
  },
  partiesRowLast: {
    flexDirection: 'row',
  },
  partiesLabel: {
    backgroundColor: '#1a1a18',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    width: 140,
    padding: 8,
  },
  partiesValue: {
    flex: 1,
    fontSize: 9.5,
    color: '#1a1a18',
    padding: 8,
  },
  signatureSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e8e4dc',
    paddingTop: 16,
  },
  signatureRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  signatureBox: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#8a877f',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  signatureImage: {
    width: '100%',
    height: 70,
    borderWidth: 1,
    borderColor: '#dfd9cf',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    objectFit: 'contain',
  },
  signatureName: {
    fontSize: 9,
    color: '#1a1a18',
    marginTop: 6,
    fontFamily: 'Helvetica-Bold',
  },
  signatureDate: {
    fontSize: 9,
    color: '#8a877f',
    marginTop: 2,
  },
  footerNote: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 7.5,
    color: '#a8a49d',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e0dbd3',
    paddingTop: 8,
  },
})

function Clause({ letter, text }: { letter: string; text: string }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.listBullet}>({letter})</Text>
      <Text style={styles.listText}>{text}</Text>
    </View>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.listBullet}>•</Text>
      <Text style={styles.listText}>{text}</Text>
    </View>
  )
}

export type AgreementPDFProps = {
  participantName: string
  advocateName?: string | null
  supportDescription: string
  fundingType: 'self' | 'nominee' | 'ndia' | 'plan_manager'
  paymentMethod: 'eft' | 'cheque' | 'cash'
  commencementDate: string
  expiryDate?: string | null
  signerName: string
  signatureDataUrl: string
  signedAt: string
}

const FUNDING_CLAUSES: Record<string, string> = {
  self: 'The participant has chosen to self-manage the funding for NDIS supports provided under this Service Agreement. After providing supports, Vivid Care will send the participant an invoice for those supports. The participant will pay by EFT/cheque/cash within 7 days.',
  nominee: "The participant's Nominee manages the funding for supports under this Service Agreement. After providing supports, Vivid Care will send the Nominee an invoice. The Nominee will pay by EFT within 7 days.",
  ndia: 'The participant has nominated the NDIA to manage the funding for supports under this Service Agreement. After providing supports, Vivid Care will claim payment directly from the NDIS.',
  plan_manager: 'The participant has nominated a Registered Plan Management Provider to manage the funding for NDIS supports under this Service Agreement. After providing supports, Vivid Care will claim payment from the Plan Management Provider.',
}

const PAYMENT_LABELS: Record<string, string> = {
  eft: 'Electronic Funds Transfer (EFT)',
  cheque: 'Cheque',
  cash: 'Cash',
}

export default function AgreementPDF({
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
}: AgreementPDFProps) {
  return (
    <Document
      title={`Vivid Care Service Agreement — ${participantName}`}
      author="Vivid Care"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>SERVICE AGREEMENT</Text>
          <Text style={styles.headerSub}>Vivid Care · NDIS Registered Service Provider</Text>
        </View>

        <View style={styles.providerBlock}>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Company Name:</Text>
            <Text style={styles.providerValue}>{VIVID_CARE.name}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Address:</Text>
            <Text style={styles.providerValue}>{VIVID_CARE.address}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Phone:</Text>
            <Text style={styles.providerValue}>{VIVID_CARE.phone}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Email:</Text>
            <Text style={styles.providerValue}>{VIVID_CARE.email}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>ABN:</Text>
            <Text style={styles.providerValue}>{VIVID_CARE.abn}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Version:</Text>
            <Text style={styles.providerValue}>{AGREEMENT_VERSION}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date Prepared</Text>
            <Text style={styles.metaValue}>{commencementDate}</Text>
          </View>
          {expiryDate ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Review Date</Text>
              <Text style={styles.metaValue}>{expiryDate}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>
            NOTE: A Service Agreement can be made between a participant and a provider or a participant's representative and a provider. A participant's representative is someone close to the participant, such as a family member or friend, or someone who manages the funding for supports under a participant's NDIS plan.
          </Text>
        </View>

        <Text style={styles.sectionHeading}>1. Parties</Text>
        <Text style={styles.body}>
          This Service Agreement is for {participantName}, a participant in the National Disability Insurance Scheme and is made between:
        </Text>

        <View style={styles.partiesTable}>
          <View style={styles.partiesRow}>
            <Text style={styles.partiesLabel}>Participant</Text>
            <Text style={styles.partiesValue}>{participantName}</Text>
          </View>
          <View style={styles.partiesRowLast}>
            <Text style={styles.partiesLabel}>Advocate / Participant's Representative</Text>
            <Text style={styles.partiesValue}>{advocateName ?? '—'}</Text>
          </View>
        </View>

        <Text style={[styles.body, { marginBottom: 4, marginTop: 4 }]}>and</Text>

        <View style={styles.partiesTable}>
          <View style={styles.partiesRowLast}>
            <Text style={styles.partiesLabel}>Provider</Text>
            <Text style={styles.partiesValue}>{VIVID_CARE.name}</Text>
          </View>
        </View>

        <Text style={styles.body}>
          This Service Agreement will commence on {commencementDate}{expiryDate ? ` for the period ${commencementDate} to ${expiryDate}` : ''}.
        </Text>

        <Text style={styles.sectionHeading}>2. The NDIS and this Service Agreement</Text>
        <Clause letter="a" text="This Agreement is made according to the rules and goals of the National Disability Insurance Scheme (NDIS)." />
        <Clause letter="b" text="The participant and Vivid Care agree that this Agreement is in line with the main ideas of the NDIS, including having more choices, achieving goals, and taking part in the community." />
        <Clause letter="c" text="The parties agree that this Service Agreement is made in the context of the NDIS, which is a scheme that aims to:" />
        <Bullet text="support the independence and social and economic participation of people with disability; and" />
        <Bullet text="enable people with a disability to exercise choice and control in the pursuit of their goals and the planning and delivery of their supports." />
        <Clause letter="d" text="A copy of the participant's NDIS plan may be attached to this Service Agreement where the participant consents." />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionHeading}>3. Schedule of Supports</Text>
        <Text style={styles.body}>
          Vivid Care agrees to provide the following supports to the participant:
        </Text>
        <View style={styles.infoBox}>
          <Text style={[styles.body, { marginBottom: 0 }]}>{supportDescription}</Text>
        </View>
        <Text style={styles.body}>
          The supports will be provided according to the participant's preferred times and schedule, as agreed between the parties. All prices are inclusive of GST (if applicable) and are in line with the NDIS Price Guide current at the time of delivery. Additional expenses not included as part of the participant's NDIS supports (such as entrance fees, meals, transport costs, and personal care products) are the responsibility of the participant or their representative.
        </Text>

        <Text style={styles.sectionHeading}>4. Responsibilities of Vivid Care</Text>
        <Text style={[styles.subHeading, { marginTop: 4 }]}>Vivid Care agrees to:</Text>
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
        <Text style={[styles.body, { marginTop: 6, fontFamily: 'Helvetica-Bold' }]}>
          Zero Tolerance Policy: Vivid Care has policies and procedures built on human rights. Where allegations of abuse, neglect, violence, exploitation, or discrimination are made, Vivid Care employs a Zero Tolerance policy.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionHeading}>5. Responsibilities of the Participant / Participant's Representative</Text>
        <Text style={[styles.subHeading, { marginTop: 4 }]}>The participant/participant's representative agrees to:</Text>
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

        <Text style={styles.sectionHeading}>6. Payments</Text>
        <Text style={styles.body}>
          Vivid Care will seek payment for the provision of supports after the participant or their representative confirms satisfactory delivery.
        </Text>
        <Text style={styles.body}>{FUNDING_CLAUSES[fundingType]}</Text>
        <Text style={styles.body}>
          Preferred payment method: {PAYMENT_LABELS[paymentMethod]}.
        </Text>
        <Text style={styles.body}>
          A supply of supports under this Service Agreement is a supply of one or more reasonable and necessary supports specified in the statement of supports included, under subsection 33(2) of the National Disability Insurance Scheme Act 2013 (NDIS Act), in the participant's NDIS Plan currently in effect under section 37 of the NDIS Act.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionHeading}>7. Changes to this Service Agreement</Text>
        <Text style={styles.body}>
          If changes to the supports or their delivery are required, the parties agree to discuss and review this Service Agreement. Any changes to this Service Agreement will be in writing, signed, and dated by both parties.
        </Text>

        <Text style={styles.sectionHeading}>8. Ending this Service Agreement</Text>
        <Text style={styles.body}>
          Should either party wish to end this Service Agreement they must give 30 days' notice in writing. If either party seriously breaches this Service Agreement the requirement of notice will be waived.
        </Text>

        <Text style={styles.sectionHeading}>9. Feedback, Complaints and Disputes</Text>
        <Text style={styles.body}>
          If the participant wishes to give feedback or make a complaint, they can contact: {VIVID_CARE.contactName} at {VIVID_CARE.phone} or {VIVID_CARE.email}.
        </Text>
        <Text style={styles.body}>
          If the participant is not satisfied or does not wish to talk to Vivid Care, they can contact the National Disability Insurance Scheme by calling 1800 035 544, visiting one of their offices in person, or visiting ndis.gov.au for further information.
        </Text>

        <Text style={styles.sectionHeading}>10. Goods and Services Tax (GST)</Text>
        <Text style={styles.body}>For the purposes of GST legislation, the parties confirm that:</Text>
        <Clause letter="a" text="A supply of supports under this Service Agreement is a supply of one or more of the reasonable and necessary supports specified in the statement included under subsection 33(2) of the NDIS Act in the participant's NDIS plan currently in effect under section 37 of the NDIS Act;" />
        <Clause letter="b" text="The participant's NDIS plan is expected to remain in effect during the period the supports are provided; and" />
        <Clause letter="c" text="The participant or their representative will immediately notify Vivid Care if the participant's NDIS Plan is replaced by a new plan or the participant stops being a participant in the NDIS." />

        <Text style={styles.sectionHeading}>11. Access to Records</Text>
        <Text style={styles.body}>
          The participant's file may be accessed by a NDIS Registered Auditor for audit purposes only, with the participant's consent. Access to participant records by other parties (such as support coordinators, plan managers, family members, or other practitioners) is granted only as agreed in writing between the participant and Vivid Care.
        </Text>

        <Text style={styles.sectionHeading}>12. Information Storage</Text>
        <Text style={styles.body}>
          Vivid Care may collect personal information about the participant from the participant, their representative, or a third party, using forms, online portals, and other electronic or paper correspondence. Vivid Care will not ask for any personal information which is not needed. All personal information is collected and stored in accordance with the Privacy Act 1988 and the Australian Privacy Principles. Information is collected for purposes that are reasonably necessary for, or directly related to, the delivery of NDIS supports.
        </Text>

        <Text style={styles.sectionHeading}>13. Contact Details</Text>
        <Text style={[styles.subHeading, { marginTop: 4 }]}>Participant / Representative:</Text>
        <View style={styles.partiesTable}>
          <View style={styles.partiesRow}>
            <Text style={styles.partiesLabel}>Name</Text>
            <Text style={styles.partiesValue}>{participantName}</Text>
          </View>
          {advocateName ? (
            <View style={styles.partiesRow}>
              <Text style={styles.partiesLabel}>Representative</Text>
              <Text style={styles.partiesValue}>{advocateName}</Text>
            </View>
          ) : null}
          <View style={styles.partiesRowLast}>
            <Text style={styles.partiesLabel}>Phone / Email</Text>
            <Text style={styles.partiesValue}></Text>
          </View>
        </View>

        <Text style={[styles.subHeading, { marginTop: 8 }]}>Provider (Vivid Care):</Text>
        <View style={styles.partiesTable}>
          <View style={styles.partiesRow}>
            <Text style={styles.partiesLabel}>Contact Name</Text>
            <Text style={styles.partiesValue}>{VIVID_CARE.contactName}</Text>
          </View>
          <View style={styles.partiesRow}>
            <Text style={styles.partiesLabel}>Phone</Text>
            <Text style={styles.partiesValue}>{VIVID_CARE.phone}</Text>
          </View>
          <View style={styles.partiesRow}>
            <Text style={styles.partiesLabel}>Email</Text>
            <Text style={styles.partiesValue}>{VIVID_CARE.email}</Text>
          </View>
          <View style={styles.partiesRowLast}>
            <Text style={styles.partiesLabel}>Address</Text>
            <Text style={styles.partiesValue}>{VIVID_CARE.address}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>14. Participant's Copy of Service Agreement</Text>
        <Text style={styles.body}>
          The participant confirms they have been offered a copy of this signed Service Agreement upon completion. A digital copy (PDF) is available upon request from Vivid Care.
        </Text>

        <Text style={styles.sectionHeading}>15. Agreement Signatures</Text>
        <Text style={styles.body}>
          The parties agree to the terms and conditions of this Service Agreement. This agreement has been explained verbally and the participant has had the opportunity to ask questions.
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Signature of Participant / Representative</Text>
              {signatureDataUrl ? (
                <Image src={signatureDataUrl} style={styles.signatureImage} />
              ) : (
                <View style={styles.signatureImage} />
              )}
              <Text style={styles.signatureName}>{signerName}</Text>
              <Text style={styles.signatureDate}>Date: {signedAt}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Authorised Person from Vivid Care</Text>
              <View style={styles.signatureImage} />
              <Text style={styles.signatureName}>{VIVID_CARE.contactName}</Text>
              <Text style={styles.signatureDate}>Date: ___________________</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Vivid Care · ABN {VIVID_CARE.abn} · {VIVID_CARE.address} · {VIVID_CARE.email}
          {'\n'}This document was digitally signed on {signedAt}. Generated by Vivid Care platform.
        </Text>
      </Page>
    </Document>
  )
}
