import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { useProviderProfile } from "@/hooks/useProviderProfile";
import { Mail, Phone, User } from "lucide-react";

const ProviderContacts = () => {
  const { profile } = useProviderProfile();

  return (
    <PortalLayout portalType="provider">
      <PageHeader title="Your Frontera Team" description="Your recruiter, provider liaison, and HR support." gradient="portal-gradient-provider" />
      <div className="p-8 max-w-4xl space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <TeamCard title="Recruiter" name={profile?.recruiter_name} email={profile?.recruiter_email} phone={profile?.recruiter_phone} />
          <TeamCard title="Provider Liaison" name={profile?.liaison_name} email={profile?.liaison_email} phone={profile?.liaison_phone} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">HR Support</h3>
          <div className="glass-card rounded-xl p-5">
            <div className="text-sm text-muted-foreground mb-2">For HR-related questions, please email:</div>
            <a href="mailto:hrsupport@fronterasearch.com" className="text-provider font-semibold hover:underline flex items-center gap-2">
              <Mail className="w-4 h-4" /> hrsupport@fronterasearch.com
            </a>
            <div className="text-xs text-muted-foreground mt-2">Someone from our HR team will get back to you shortly.</div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Balboa Travel Support</h3>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-provider/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-provider" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-provider font-semibold">Available 24/7</div>
                <div className="font-semibold text-foreground">Balboa Travel Support</div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <a href="mailto:corporateaccounts@balboa.com" className="hover:text-provider">corporateaccounts@balboa.com</a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <a href="tel:8586783323" className="hover:text-provider">858.678.3323</a>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 text-sm text-muted-foreground leading-relaxed">
          For questions regarding your work or travel schedule, please reach out to your Provider Liaison.
          <br /><br />
          For all other questions, please contact your recruiter.
        </div>
      </div>
    </PortalLayout>
  );
};

const TeamCard = ({ title, name, email, phone }: { title: string; name?: string | null; email?: string | null; phone?: string | null }) => (
  <div className="glass-card rounded-xl p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-provider/10 flex items-center justify-center">
        <User className="w-5 h-5 text-provider" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-provider font-semibold">{title}</div>
        <div className="font-semibold text-foreground">{name || "Not assigned"}</div>
      </div>
    </div>
    <div className="space-y-1.5 text-sm">
      {email && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="w-3.5 h-3.5" />
          <a href={`mailto:${email}`} className="hover:text-provider">{email}</a>
        </div>
      )}
      {phone && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="w-3.5 h-3.5" />
          <span>{phone}</span>
        </div>
      )}
    </div>
  </div>
);

export default ProviderContacts;
