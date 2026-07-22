'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useClerk, useUser } from '@clerk/nextjs';

export function UserNav() {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant='ghost' className='relative h-8 w-8 rounded-full' />
          }
        >
          <Avatar className='h-8 w-8'>
            <AvatarImage src={user.imageUrl || ''} alt={user.fullName || ''} />
            <AvatarFallback>{user.firstName?.[0]}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end'>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm leading-none font-medium'>
                {user.fullName}
              </p>
              <p className='text-muted-foreground text-xs leading-none'>
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>New Team</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ redirectUrl: '/' })}>
            <div className='flex w-full items-center justify-between'>
              Log out
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
