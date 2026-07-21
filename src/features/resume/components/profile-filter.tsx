'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useProfiles } from '@/features/profile/api';
import { useResumeFilters } from '../hooks/use-resume-filters';

export function ProfileFilter() {
  const { data: profiles } = useProfiles();
  const { profileId, setProfileId } = useResumeFilters();

  const handleProfileChange = (value: string | null) => {
    if (!value || value === 'all') {
      setProfileId(null, {
        shallow: false
      });
    } else {
      setProfileId(value, {
        shallow: false
      });
    }
  };

  return (
    <div className='mb-6'>
      <Select value={profileId || 'all'} onValueChange={handleProfileChange}>
        <SelectTrigger className='w-[280px]'>
          <SelectValue placeholder='Filter by profile' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Profiles</SelectItem>
          {profiles?.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.firstname} {profile.lastname}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
