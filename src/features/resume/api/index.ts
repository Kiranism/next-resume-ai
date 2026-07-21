import { client } from '@/lib/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TResumeEditFormValues, TResumeFormValues } from '../utils/form-schema';

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

export const useUpdateResume = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TResumeEditFormValues & { id: string }) => {
      const response = await client.resume.updateResume.$post(data);
      return response.json();
    }
  });
};

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

export const useResumeChatMessages = (resumeId: string) => {
  return useQuery({
    queryKey: ['resume-chat', resumeId],
    queryFn: async () => {
      const response = await client.chat.getMessages.$get({ resumeId });
      return response.json();
    },
    enabled: !!resumeId,
    // History is hydrated once into local state, then managed there.
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });
};

export const useClearResumeChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (resumeId: string) => {
      const response = await client.chat.clearMessages.$post({ resumeId });
      return response.json();
    },
    onSuccess: (_data, resumeId) => {
      queryClient.invalidateQueries({ queryKey: ['resume-chat', resumeId] });
    }
  });
};

export const useAtsReport = (resumeId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['ats-report', resumeId],
    queryFn: async () => {
      const response = await client.ats.getReport.$get({ resumeId });
      return await response.json();
    },
    enabled: enabled && !!resumeId,
    staleTime: 60_000
  });
};

export const useDeleteResume = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.resume.deleteResume.$post({ id });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    }
  });
};

export const useDuplicateResume = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.resume.duplicateResume.$post({ id });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    }
  });
};
