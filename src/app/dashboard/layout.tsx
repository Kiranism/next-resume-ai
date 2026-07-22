import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import LayoutWrapper from './layout.wrapper';

export const metadata: Metadata = {
  title: 'CVTailor',
  description: 'Your resumes and profiles on CVTailor'
};

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Persist the sidebar open/collapsed state across refreshes. The cookie name
  // must match SIDEBAR_COOKIE_NAME ('sidebar_state') written by SidebarProvider.
  // Default to open when there is no cookie yet; only 'false' collapses it.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <LayoutWrapper>
          {/* page main content */}
          {children}
        </LayoutWrapper>
      </SidebarInset>
    </SidebarProvider>
  );
}
