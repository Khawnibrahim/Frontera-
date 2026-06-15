import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ClientRequestCoverage = () => {
  const [form, setForm] = useState({
    facilityName: "",
    specialty: "",
    startDate: "",
    endDate: "",
    shiftType: "",
    urgency: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Coverage request submitted! Our recruiting/BD team has been notified.");
    setForm({ facilityName: "", specialty: "", startDate: "", endDate: "", shiftType: "", urgency: "", notes: "" });
  };

  return (
    <PortalLayout portalType="client">
      <PageHeader title="Request Coverage" description="Submit a structured request that routes directly to our recruiting and BD team." gradient="portal-gradient-client" />
      <div className="p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facility Name</Label>
              <Input value={form.facilityName} onChange={(e) => setForm({ ...form, facilityName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Specialty Needed</Label>
              <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} required />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shift Type</Label>
              <Select value={form.shiftType} onValueChange={(v) => setForm({ ...form, shiftType: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                  <SelectItem value="swing">Swing</SelectItem>
                  <SelectItem value="weekend">Weekend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="asap">ASAP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <Button type="submit" variant="clientPortal">Submit Request</Button>
        </form>
      </div>
    </PortalLayout>
  );
};

export default ClientRequestCoverage;
