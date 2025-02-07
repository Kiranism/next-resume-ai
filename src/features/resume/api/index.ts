import { client } from '@/lib/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TResumeFormValues } from '../utils/form-schema';

export const useCreateResume = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TResumeFormValues & { profileId: string }) => {
      const response = await client.resume.createResume.$post(data);
      return await response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    }
  });
};

export const useGetResume = (id: string) => {
  return useQuery({
    queryKey: ['resume', id],
    queryFn: async () => {
      const response = await client.resume.getResume.$get({ id });
      return await response.json();
    },
    enabled: !!id
  });
};

// export const useUpdateResume = (id: string) => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async (data: TResumeEditFormValues) => {
//       const response = await client.resume.updateResume.$post({
//         json: { id, ...data }
//       });
//       return response.json();
//     },
//     onSuccess: () => {
//       toast.success('Resume updated successfully');
//       queryClient.invalidateQueries({ queryKey: ['resume', id] });
//     },
//     onError: (error) => {
//       toast.error('Failed to update resume');
//       console.error('Error updating resume:', error);
//     }
//   });
// };

export const useGetResumes = (profileId?: string) => {
  return useQuery({
    queryKey: ['resumes', profileId],
    queryFn: async () => {
      const response = profileId
        ? await client.resume.getProfileResumes.$get({ profileId })
        : await client.resume.getAllResumes.$get();
      return await response.json();
    }
  });
};

export const useUploadPreviewImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resumeId,
      image
    }: {
      resumeId: string;
      image: string;
    }) => {
      const response = await client.resume.uploadPreviewImage.$post({
        resumeId,
        image
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    }
  });
};
