import { useState, useEffect } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ClientSettings = () => {
  const [settings, setSettings] = useState({
    name: "",
    email: "",
    facilityName: "",
    facilityLocation: "",
    phone: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("client_settings");
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const handleSave = () => {
    localStorage.setItem("client_settings", JSON.stringify(settings));
    toast.success("Settings saved!");
  };

  return (
    <PortalLayout portalType="client">
      <PageHeader title="Settings" description="Your facility and contact information." gradient="portal-gradient-client" />
      <div className="p-8 max-w-2xl">
        <div className="glass-card rounded-xl p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Healthcare Facility Name</Label>
            <Input value={settings.facilityName} onChange={(e) => setSettings({ ...settings, facilityName: e.target.value })} placeholder="e.g. Optum Health Center" />
          </div>
          <div className="space-y-2">
            <Label>Facility Location</Label>
            <Input value={settings.facilityLocation} onChange={(e) => setSettings({ ...settings, facilityLocation: e.target.value })} placeholder="City, State" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          </div>
          <Button variant="clientPortal" onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </PortalLayout>
  );
};

export default ClientSettings;
