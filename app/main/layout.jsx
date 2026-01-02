import SidebarLayout from "@/components/sidebarLayout";
import { SidebarProvider } from "@/context/SidebarContext";
import { CartProvider } from "@/context/CartContext";

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <CartProvider>
        <SidebarLayout>{children}</SidebarLayout>
      </CartProvider>
    </SidebarProvider>
  );
}
