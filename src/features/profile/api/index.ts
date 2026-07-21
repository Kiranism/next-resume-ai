import { client } from '@/lib/client';
import {
  TProfileFormValues,
  TUpdateProfileFormValues
} from '../utils/form-schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const response = await client.profile.getProfiles.$get();
      return await response.json();
    }
  });
};

export const useCreateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TProfileFormValues) => {
      const response = await client.profile.createProfile.$post(data);
      return await response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['profiles']
      });
    }
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TUpdateProfileFormValues) => {
      const { id, ...rest } = data;
      const response = await client.profile.updateProfile.$post({
        id,
        ...rest
      });
      return await response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['profiles']
      });
    }
  });
};

export const useDeleteProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.profile.deleteProfile.$post({ id });
      return await response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    }
  });
};
