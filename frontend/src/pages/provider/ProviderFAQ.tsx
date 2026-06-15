import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";

type FAQ = { q: string; a: React.ReactNode };

const w2Faqs: FAQ[] = [
  {
    q: "Where can I find my W-2?",
    a: "Your W-2 can be accessed through your Paylocity account under the Tax Forms section.",
  },
  {
    q: "How do I submit PTO?",
    a: (
      <>
        After updating your availability in the provider portal, PTO must also be submitted through Paylocity.
        <br />
        <br />
        If you have any issues with PTO submissions, please contact:
        <ul className="list-disc pl-5 mt-2">
          <li>HR: payroll@fronterasearch.com</li>
          <li>Your designated recruiter</li>
          <li>Your provider liaison</li>
        </ul>
      </>
    ),
  },
  {
    q: "How much PTO do I accrue?",
    a: "Providers accrue 1 hour of PTO for every 30 hours worked.",
  },
  {
    q: "What is the process for submitting administrative time?",
    a: (
      <>
        Optum requires an Administrative Time Request Form to be submitted before working outstanding exams.
        <br />
        <br />
        Once submitted, Optum will tentatively approve the requested hours and dates. After the work is completed, the form must be resubmitted so Optum can finalize and process payment for the approved time worked.
        <br />
        <br />
        Please send all administrative time requests to:
        <ul className="list-disc pl-5 mt-2">
          <li>Optum</li>
          <li>Your recruiter</li>
          <li>Your provider liaison</li>
        </ul>
        <br />
        Failure to follow Optum's required process may result in delayed or denied compensation.
      </>
    ),
  },
  {
    q: "Where should administrative time forms be submitted?",
    a: (
      <>
        Administrative time requests should be submitted to:
        <ul className="list-disc pl-5 mt-2">
          <li>Optum</li>
          <li>Your recruiter</li>
          <li>Your provider liaison</li>
        </ul>
      </>
    ),
  },
  {
    q: "Who should I contact regarding payroll discrepancies?",
    a: (
      <>
        Please contact:
        <ul className="list-disc pl-5 mt-2">
          <li>payroll@fronterasearch.com</li>
          <li>Your designated recruiter</li>
          <li>Your provider liaison</li>
        </ul>
      </>
    ),
  },
];

const w2TravelFaqs: FAQ[] = [
  {
    q: "How is mileage reimbursed?",
    a: "All travel-related expenses are submitted through SAP Concur. Reimbursements are processed separately from payroll.",
  },
  {
    q: "When will travel reimbursements appear?",
    a: "Travel reimbursements are processed separately from payroll and are not included on your paycheck.",
  },
  {
    q: "Where and how do I submit travel expenses?",
    a: (
      <>
        All travel expenses must be submitted through SAP Concur.
        <br />
        <br />
        If you experience any issues with travel arrangements or expense submissions, please contact:
        <ul className="list-disc pl-5 mt-2">
          <li>travel@fronterasearch.com</li>
        </ul>
      </>
    ),
  },
];

const f1099Faqs: FAQ[] = [
  {
    q: "What is an invoice?",
    a: "1099 providers are required to submit invoices weekly to comply with IRS guidelines. Invoice templates can be found in the provider portal.",
  },
  {
    q: "When is the invoice deadline?",
    a: "All 1099 providers must submit a separate invoice for each week worked by Tuesday at 12:00 PM CST.",
  },
  {
    q: "Who do I send invoices to?",
    a: "Invoices should be submitted according to the payroll instructions provided in the provider portal or by the payroll team.",
  },
  {
    q: "When can I expect payment after submitting my invoice?",
    a: (
      <>
        Invoices submitted on time will be paid by Friday of the same week.
        <br />
        <br />
        Invoices submitted after the Tuesday deadline will be processed and paid on the following Friday.
      </>
    ),
  },
  {
    q: "Can I submit multiple weeks on one invoice?",
    a: "No. Payroll requires each week worked to be submitted as a separate invoice.",
  },
  {
    q: "What documentation is required with invoice submissions?",
    a: "Please include all required supporting documentation and ensure schedule changes have been approved prior to submission.",
  },
  {
    q: "Who should I contact regarding payroll discrepancies?",
    a: (
      <>
        Please contact:
        <ul className="list-disc pl-5 mt-2">
          <li>payroll@fronterasearch.com</li>
          <li>Your designated recruiter</li>
          <li>Your provider liaison</li>
        </ul>
      </>
    ),
  },
];

const f1099TravelFaqs: FAQ[] = [
  {
    q: "How are travel reimbursements processed?",
    a: "Travel expenses are submitted through SAP Concur and reimbursed separately from invoice payments.",
  },
  {
    q: "What travel expenses qualify for reimbursement?",
    a: "Approved business-related travel expenses may qualify for reimbursement, including airfare, hotel, mileage, parking, and other approved travel costs.",
  },
];

const generalFaqs: FAQ[] = [
  {
    q: "What is a PACR form?",
    a: (
      <>
        PACR stands for Practitioner Availability Change Request.
        <br />
        <br />
        This form is required by Optum anytime a provider needs to make a change to their schedule or availability.
      </>
    ),
  },
  {
    q: "Is there a deadline for submitting schedule changes?",
    a: "Yes. Optum requires all schedule changes to be submitted at least 2 weeks in advance.",
  },
  {
    q: "How do I upload schedule changes into the provider portal?",
    a: "Schedule changes can be uploaded directly through the provider portal using the designated scheduling section.",
  },
  {
    q: "How far in advance should static schedules be uploaded?",
    a: "Providers should upload schedules as far in advance as possible to help ensure adequate coverage and timely processing.",
  },
  {
    q: "How do I verify my schedule was successfully uploaded?",
    a: "After submission, providers should confirm the upload status within the portal or contact their recruiter/provider liaison if confirmation is not received.",
  },
  {
    q: "When should I notify the team about availability changes?",
    a: "Please notify the team as soon as possible. All changes requiring PACR approval must be submitted at least 2 weeks in advance per Optum policy.",
  },
  {
    q: "Where do I upload supporting documentation or paperwork?",
    a: "Supporting documents can be uploaded through the provider portal in the designated documentation section.",
  },
  {
    q: "What documentation is needed after completing exams?",
    a: "Providers should submit all required exam documentation, supporting paperwork, and any additional items requested by Optum or the credentialing team.",
  },
  {
    q: "Who can help if I'm having technical issues with the portal?",
    a: "Please contact your recruiter or provider liaison for portal assistance.",
  },
];

const generalTravelFaqs: FAQ[] = [
  {
    q: "Can I choose my preferred hotel or flight?",
    a: "Travel preferences can often be accommodated when possible, but all travel arrangements must follow company travel guidelines and approval processes.",
  },
  {
    q: "What should I do if my travel plans change?",
    a: "Please notify the travel team immediately at travel@fronterasearch.com so arrangements can be updated accordingly.",
  },
  {
    q: "How are IV Exam travel miles calculated?",
    a: "Mileage reimbursement is calculated based on approved travel routes and company travel policies. Additional guidance can be provided by the travel team.",
  },
  {
    q: "When should travel receipts be submitted?",
    a: "Travel receipts should be submitted promptly after travel is completed to avoid reimbursement delays.",
  },
];

const Section = ({ title, items, startIdx }: { title: string; items: FAQ[]; startIdx: number }) => (
  <div className="glass-card rounded-xl p-6">
    <h2 className="text-lg font-semibold mb-3">{title}</h2>
    <Accordion type="single" collapsible className="w-full">
      {items.map((faq, i) => (
        <AccordionItem key={startIdx + i} value={`faq-${startIdx + i}`}>
          <AccordionTrigger className="text-left text-sm font-medium text-foreground">
            {faq.q}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

const ProviderFAQ = () => {
  const { profile } = useAuth();
  const employmentType = (profile?.employment_type || "").toUpperCase();
  const is1099 = employmentType === "1099";
  const typeSpecific = is1099 ? f1099Faqs : w2Faqs;
  const typeSpecificTravel = is1099 ? f1099TravelFaqs : w2TravelFaqs;
  const travelFaqs = [...typeSpecificTravel, ...generalTravelFaqs];

  return (
    <PortalLayout portalType="provider">
      <PageHeader
        title="Frequently Asked Questions"
        description="Find answers to common questions."
        gradient="portal-gradient-provider"
      />
      <div className="p-8 max-w-6xl space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Payroll & Pay" items={typeSpecific} startIdx={0} />
          <Section title="Travel" items={travelFaqs} startIdx={typeSpecific.length} />
        </div>
        <Section title="General" items={generalFaqs} startIdx={typeSpecific.length + travelFaqs.length} />
      </div>
    </PortalLayout>
  );
};

export default ProviderFAQ;
