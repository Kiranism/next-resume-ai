'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import { navItems } from '@/constants/data';
import { useClerk, useUser } from '@clerk/nextjs';
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  PanelLeft
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '../icons';

export const company = {
  name: 'CVTailor',
  logo: Icons.resume,
  plan: 'AI résumé builder'
};

type UserInfoProps = ReturnType<typeof useUser>['user'];

const UserInfo = ({ user }: { user: UserInfoProps }) => (
  <div className='flex items-center gap-2'>
    <Avatar className='h-8 w-8 rounded-lg'>
      <AvatarImage src={user?.imageUrl ?? ''} alt={user?.firstName || ''} />
      <AvatarFallback className='rounded-lg'>
        {user?.firstName?.slice(0, 2)?.toUpperCase() || 'CN'}
      </AvatarFallback>
    </Avatar>
    <div className='grid flex-1 text-left text-sm leading-tight'>
      <span className='truncate font-semibold'>{user?.fullName || ''}</span>
      <span className='truncate text-xs'>
        {user?.primaryEmailAddress?.emailAddress || ''}
      </span>
    </div>
  </div>
);

export default function AppSidebar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();

  return (
    <Sidebar collapsible='offcanvas'>
      <SidebarHeader>
        <div className='text-sidebar-accent-foreground flex gap-2 py-2'>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
            <company.logo className='size-4' />
          </div>
          <div className='grid flex-1 text-left text-sm leading-tight'>
            <span className='truncate font-semibold'>{company.name}</span>
            <span className='truncate text-xs'>{company.plan}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo;
              return item?.items && item?.items?.length > 0 ? (
                <Collapsible
                  key={item.title}
                  defaultOpen={item.isActive}
                  render={<SidebarMenuItem />}
                >
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={pathname === item.url}
                        className='group/collapsible group/menu-button hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:from-primary/20 data-[active=true]:to-primary/5 rounded-lg bg-gradient-to-r hover:bg-transparent'
                      />
                    }
                  >
                    {item.icon && <Icon />}
                    <span>{item.title}</span>
                    <ChevronRight className='ml-auto transition-transform duration-200 group-data-panel-open/collapsible:rotate-90' />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            render={<Link href={subItem.url} />}
                            isActive={pathname === subItem.url}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                    isActive={pathname === item.url}
                    className='group/menu-button hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:from-primary/20 data-[active=true]:to-primary/5 rounded-lg bg-gradient-to-r hover:bg-transparent'
                  >
                    <Icon className='text-muted-foreground/60 group-data-[active=true]/menu-button:text-primary' />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={state === 'expanded' ? 'Collapse' : 'Expand'}
            >
              <PanelLeft />
              <span>{state === 'expanded' ? 'Collapse' : 'Expand'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size='lg'
                    className='data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground'
                  />
                }
              >
                <UserInfo user={user} />
                <ChevronsUpDown className='ml-auto size-4' />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--anchor-width) min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuLabel className='p-0 font-normal'>
                  <div className='px-1 py-1.5'>
                    <UserInfo user={user} />
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <BadgeCheck />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ redirectUrl: '/' })}>
                  <div className='flex w-full items-center'>Log out</div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
