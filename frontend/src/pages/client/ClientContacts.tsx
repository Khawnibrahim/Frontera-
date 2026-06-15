import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Mail, User } from "lucide-react";

const contacts = [
  { name: "Claire Shakesby", role: "Strategic Account Manager", email: "cshakesby@fronterasearch.com" },
  { name: "Jody Talbert", role: "Managing Partner", email: "jtalbert@fronterasearch.com" },
];

const ClientContacts = () => (
  <PortalLayout portalType="client">
    <PageHeader title="Points of Contact" description="Your dedicated Frontera team." gradient="portal-gradient-client" />
    <div className="p-8 max-w-4xl">
      <div className="grid sm:grid-cols-2 gap-4">
        {contacts.map((c) => (
          <div key={c.name} className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-client/10 flex items-center justify-center">
                <User className="w-5 h-5 text-client" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">{c.name}</h4>
                <p className="text-xs text-muted-foreground">{c.role}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <a href={`mailto:${c.email}`} className="hover:text-client transition-colors">{c.email}</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </PortalLayout>
);

export default ClientContacts;
