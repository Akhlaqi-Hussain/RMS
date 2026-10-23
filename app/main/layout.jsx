import SidebarLayout from "@/components/sidebarLayout";
import { SidebarProvider } from "@/context/SidebarContext";
import { CartProvider } from "@/context/CartContext";
// R9-LIC: renewal reminder / read-only notice (installed RMS only)
import LicenceNotice from "@/components/licenceNotice";

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <CartProvider>
        <SidebarLayout>
          <LicenceNotice />
          {children}
        </SidebarLayout>
      </CartProvider>
    </SidebarProvider>
  );
}
