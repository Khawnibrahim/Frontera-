import PortalLayout from "@/components/PortalLayout";
import { PageHeader } from "@/components/PortalComponents";
import { MasterProvidersList } from "@/components/MasterProvidersList";

const CorporateProviders = () => (
  <PortalLayout portalType="corporate">
    <PageHeader title="Active Providers" description="Master list of all providers — search, filter, and export." gradient="portal-gradient-corporate" />
    <div className="p-8">
      <MasterProvidersList scope="all" accentClass="text-corporate" />
    </div>
  </PortalLayout>
);

export default CorporateProviders;
