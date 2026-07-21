import { NavItem } from 'types';

//Info: The following data is used for the sidebar navigation and Cmd K bar.
export const navItems: NavItem[] = [
  {
    title: 'Profiles',
    url: '/dashboard/profile',
    icon: 'user',
    label: 'Profile Management'
  },
  {
    title: 'Resume',
    url: '/dashboard/resume',
    icon: 'resume',
    label: 'Resume Management'
  }
];
