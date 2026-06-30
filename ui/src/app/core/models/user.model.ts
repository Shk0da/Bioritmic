export interface User {
  id?: string;
  email: string;
  name: string;
  birthday: string; // format: yyyy-MM-dd
  gender: Gender;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum Gender {
  MAN = 'MAN',
  WOMAN = 'WOMAN'
}

export interface UserToken {
  name: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expireTime: number;
}

export interface AuthorizationModel {
  email: string;
  password: string;
}

export interface RecoveryModel {
  email: string;
}

export interface UserSettings {
  ageMin?: number; // minimum: 14, maximum: 100
  ageMax?: number; // minimum: 14, maximum: 100
  distance?: number; // minimum: 0.05, maximum: 100
  gender?: Gender;
}

export interface UserSearch {
  ageMin?: number; // minimum: 14, maximum: 100
  ageMax?: number; // minimum: 14, maximum: 100
  distance?: number; // minimum: 0.05, maximum: 100
  gender?: Gender;
  timestamp?: Timestamp;
  interestIds?: number[];
}

export interface Timestamp {
  date?: number;
  day?: number;
  hours?: number;
  minutes?: number;
  month?: number;
  nanos?: number;
  seconds?: number;
  time?: number;
  timezoneOffset?: number;
  year?: number;
}

export interface GisData {
  id?: number;
  userId: string;
  lat: number;
  lon: number;
  timestamp?: Date;
}

export type MailMediaType = 'VOICE' | 'PHOTO' | 'VIDEO_NOTE';
export type MailReactionType = 'LIKE' | 'HEART' | 'FIRE' | 'POOP' | 'CLOWN' | 'LOL' | 'CRY';
export type MailReactionCounts = Partial<Record<MailReactionType, number>>;

export interface UserMail {
  id?: number;
  from?: string;
  to: string;
  message?: string;
  timestamp?: Timestamp;
  replyToMessageId?: number | null;
  mediaType?: MailMediaType | null;
  mediaUrl?: string | null;
  currentUserReaction?: MailReactionType | null;
  reactionCounts?: MailReactionCounts;
  isRead?: boolean;
}

export interface UserMeeting {
  id?: number;
  userId: string;
  lat: number;
  lon: number;
  distance: number;
  description?: string;
  scheduledAt?: Timestamp | string;
  timestamp?: Timestamp;
  status?: string;
  senderName?: string;
  outgoing?: boolean;
}

export interface UserBookmark {
  userId: string;
}

export interface UserInfo {
  age?: number;
  birthday?: string; // format: yyyy-MM-dd
  compare?: Record<string, number>;
  distance?: number;
  email?: string;
  gender?: Gender;
  horo?: number; // порядковый номер знака зодиака (1-12)
  id?: string;
  image?: string;
  isBioCompatible?: boolean;
  isFullCompatible?: boolean;
  isHoroCompatible?: boolean;
  lat?: number;
  lon?: number;
  name?: string;
  bio?: string;
  statusEmoji?: string | null;
  statusPosition?: string | null;
  isOnline?: boolean;
  lastActiveAt?: string;
  isVerified?: boolean;
  isPro?: boolean;
  role?: string;
  isBanned?: boolean;
}

export interface PageableRequest {
  page: number;
  size: number;
}

export interface ApiError {
  code: string;
  message: string;
  parameters?: Record<string, string>;
}

export enum SwipeDirection {
  LEFT = 'left',
  RIGHT = 'right',
  UP = 'up',
  NONE = 'none'
}

export interface UserPhoto {
  id?: number;
  photoOrder: number;
  contentType?: string;
  photoBytes?: number[];
  s3Key?: string;
  dataUrl?: string | null;
}

export interface SwipeCard {
  user: UserInfo;
  photoDataUrl?: string | null;
  photos?: UserPhoto[];
  isLiked?: boolean;
  isSuperLiked?: boolean;
}
