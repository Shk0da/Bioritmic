export interface User {
  id?: number;
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
  distance?: number; // minimum: 0.05, maximum: 30
  gender?: Gender;
}

export interface UserSearch {
  ageMin?: number; // minimum: 14, maximum: 100
  ageMax?: number; // minimum: 14, maximum: 100
  distance?: number; // minimum: 0.05, maximum: 30
  gender?: Gender;
  timestamp?: Timestamp;
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
  userId: number;
  lat: number;
  lon: number;
  timestamp?: Date;
}

export interface UserMail {
  id?: number;
  from?: number;
  to: number;
  message: string; // minLength: 1, maxLength: 1024
  timestamp?: Timestamp;
}

export interface UserMeeting {
  id?: number;
  userId: number;
  lat: number;
  lon: number;
  distance: number;
  timestamp?: Timestamp;
}

export interface UserBookmark {
  userId: number;
}

export interface UserInfo {
  age?: number;
  birthday?: string; // format: yyyy-MM-dd
  compare?: Record<string, number>;
  distance?: number;
  email?: string;
  gender?: Gender;
  id?: number;
  image?: string;
  isBioCompatible?: boolean;
  isFullCompatible?: boolean;
  isHoroCompatible?: boolean;
  lat?: number;
  lon?: number;
  name?: string;
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
