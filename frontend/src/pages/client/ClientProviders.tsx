import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { MasterProvidersList } from "@/components/MasterProvidersList";

const ClientProviders = () => (
  <PortalLayout portalType="client">
    <PageHeader title="Active Providers" description="All providers assigned to Optum locations." gradient="portal-gradient-client" />
    <div className="p-8">
      <MasterProvidersList scope="optum" accentClass="text-client" showEmploymentType={false} />
    </div>
  </PortalLayout>
);

export default ClientProviders;
