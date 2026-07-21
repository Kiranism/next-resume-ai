import { accounts } from './accounts';
import { users } from './users';
import {
  profiles,
  jobs,
  educations,
  profilesRelations,
  jobsRelations,
  educationsRelations
} from './profiles';
import { resumes } from './resumes';
import { resumeChatMessages } from './resume-chat-messages';

export {
  // Tables
  accounts,
  users,
  profiles,
  jobs,
  educations,
  resumes,
  resumeChatMessages,

  // Relations
  profilesRelations,
  jobsRelations,
  educationsRelations
};
