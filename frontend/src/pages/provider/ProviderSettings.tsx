import { useState, useEffect } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProviderProfile } from "@/hooks/useProviderProfile";
import { Mail, Phone, MapPin, Briefcase, Clock } from "lucide-react";

const ProviderSettings = () => {
  const { user, refreshProfile } = useAuth();
  const { profile, workSites, refresh } = useProviderProfile();

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", provider_id: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        provider_id: profile.provider_id || "",
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Name, email, and phone are required.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: form.full_name, email: form.email, phone: form.phone })
      .eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved.");
    refresh();
    refreshProfile();
  };

  const handleChangePassword = async () => {
    if (pw.next.length < 8) return toast.error("Password must be at least 8 characters.");
    if (pw.next !== pw.confirm) return toast.error("Passwords do not match.");
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    setPw({ current: "", next: "", confirm: "" });
  };

  return (
    <PortalLayout portalType="provider">
      <PageHeader title="Settings" description="Manage your profile, work info, team, and password." gradient="portal-gradient-provider" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <Tabs defaultValue="profile">
          <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
            <TabsTrigger value="profile" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">Profile</TabsTrigger>
            <TabsTrigger value="work" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">Work Info</TabsTrigger>
            <TabsTrigger value="team" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">Frontera Team</TabsTrigger>
            <TabsTrigger value="password" className="text-xs sm:text-sm whitespace-normal h-auto py-1.5">Password</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="glass-card rounded-xl p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Provider ID (NPI optional)</Label>
                  <Input value={form.provider_id} disabled placeholder="Assigned by Frontera" />
                </div>
              </div>
              <Button variant="provider" onClick={handleSaveProfile}>Save Profile</Button>
            </div>
          </TabsContent>

          <TabsContent value="work">
            <div className="glass-card rounded-xl p-6 space-y-5">
              <p className="text-xs text-muted-foreground">This information is managed by your Frontera team. Contact your recruiter if anything is incorrect.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field icon={<Briefcase className="w-4 h-4" />} label="Specialty" value={profile?.specialty} />
                <Field icon={<Clock className="w-4 h-4" />} label="Work Schedule" value={profile?.work_schedule} />
              </div>
              <div>
                <Label className="mb-2 block">Approved Work Sites</Label>
                <div className="space-y-2">
                  {workSites.length === 0 && <p className="text-sm text-muted-foreground">No facilities assigned yet.</p>}
                  {workSites.map((s) => (
                    <div key={s.id} className="border border-border rounded-lg p-3 flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-provider mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-foreground">{s.facility_name}</div>
                        <div className="text-muted-foreground">{[s.address, s.city, s.state, s.zip].filter(Boolean).join(", ")}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Client: {s.client_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team">
            <div className="grid sm:grid-cols-2 gap-4">
              <TeamCard title="Recruiter" name={profile?.recruiter_name} email={profile?.recruiter_email} phone={profile?.recruiter_phone} />
              <TeamCard title="Provider Liaison" name={profile?.liaison_name} email={profile?.liaison_email} phone={profile?.liaison_phone} />
            </div>
            <div className="mt-6 glass-card rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">Balboa Travel Support</div>
                  <div className="text-xs text-muted-foreground">Available 24/7 for travel assistance</div>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success">24/7</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <a href="mailto:corporateaccounts@balboa.com" className="flex items-center gap-2 text-foreground hover:text-provider transition-colors">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  corporateaccounts@balboa.com
                </a>
                <a href="tel:8586783323" className="flex items-center gap-2 text-foreground hover:text-provider transition-colors">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  858.678.3323
                </a>
              </div>
            </div>
            <div className="mt-4 glass-card rounded-xl p-5 text-sm text-muted-foreground">
              For questions regarding your work or travel schedule, please reach out to your Provider Liaison.
              <br /><br />
              For all other questions, please contact your recruiter.
            </div>
          </TabsContent>

          <TabsContent value="password">
            <div className="glass-card rounded-xl p-6 space-y-5 max-w-md">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              </div>
              <Button variant="provider" onClick={handleChangePassword}>Update Password</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
};

const Field = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => (
  <div>
    <Label className="mb-1.5 block">{label}</Label>
    <div className="flex items-center gap-2 text-sm border border-border rounded-md px-3 py-2 bg-muted/30">
      {icon}
      <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || "Not set"}</span>
    </div>
  </div>
);

const TeamCard = ({ title, name, email, phone }: { title: string; name?: string | null; email?: string | null; phone?: string | null }) => (
  <div className="glass-card rounded-xl p-5">
    <div className="text-xs uppercase tracking-wider text-provider font-semibold mb-2">{title}</div>
    <div className="text-lg font-semibold text-foreground mb-3">{name || "Not assigned"}</div>
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

export default ProviderSettings;
