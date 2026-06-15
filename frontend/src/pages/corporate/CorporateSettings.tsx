import { useState, useEffect } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CorporateSettings = () => {
  const [settings, setSettings] = useState({
    name: "",
    email: "",
    department: "",
    office: "",
    phone: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("corporate_settings");
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const handleSave = () => {
    localStorage.setItem("corporate_settings", JSON.stringify(settings));
    toast.success("Settings saved!");
  };

  return (
    <PortalLayout portalType="corporate">
      <PageHeader title="Settings" description="Your profile and office information." gradient="portal-gradient-corporate" />
      <div className="p-8 max-w-2xl">
        <div className="glass-card rounded-xl p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={settings.department} onChange={(e) => setSettings({ ...settings, department: e.target.value })} placeholder="e.g. Recruiting, Operations, BD" />
            </div>
            <div className="space-y-2">
              <Label>Office Location</Label>
              <Input value={settings.office} onChange={(e) => setSettings({ ...settings, office: e.target.value })} placeholder="e.g. Austin, TX" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          </div>
          <Button variant="corporate" onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </PortalLayout>
  );
};

export default CorporateSettings;
