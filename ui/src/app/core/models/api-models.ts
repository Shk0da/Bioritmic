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

export interface AuthorizationModel {
  email: string;
  password: string;
}

export interface UserModelReq {
  birthday: string; // format: yyyy-MM-dd
  email: string;
  gender?: Gender;
  name: string;
  password?: string;
}

export interface UserModelRes {
  birthday: string; // format: yyyy-MM-dd
  email: string;
  gender?: Gender;
  id: number;
  name: string;
}

export interface UserTokenReq {
  email: string;
  refreshToken: string;
}

export interface UserTokenRes {
  accessToken: string;
  email: string;
  expireTime: number;
  name: string;
  refreshToken: string;
}

export interface RecoveryModel {
  email: string;
}

export interface UserInfo {
  age?: number;
  birthday?: string; // format: yyyy-MM-dd
  compare?: Record<string, number>;
  distance?: number;
  email?: string;
  gender?: Gender;
  horo?: number; // порядковый номер знака зодиака (1-12)
  id?: number;
  image?: string;
  isBioCompatible?: boolean;
  isFullCompatible?: boolean;
  isHoroCompatible?: boolean;
  lat?: number;
  lon?: number;
  name?: string;
}

export interface UserInfoReq {
  birthday?: string; // format: yyyy-MM-dd
  email?: string;
  name?: string;
}

export interface UserInfoRes {
  age?: number;
  birthday?: string; // format: yyyy-MM-dd
  compare?: Record<string, number>;
  distance?: number;
  email?: string;
  gender?: Gender;
  horo?: number; // порядковый номер знака зодиака (1-12)
  id?: number;
  image?: string;
  isBioCompatible?: boolean;
  isFullCompatible?: boolean;
  isHoroCompatible?: boolean;
  lat?: number;
  lon?: number;
  name?: string;
}

export interface GisDataModelReq {
  lat: number;
  lon: number;
}

export interface GisDataModelRes {
  lat: number;
  lon: number;
  timestamp?: Timestamp;
}

export interface UserBookmark {
  userId: number;
}

export interface UserMailModelReq {
  message: string; // minLength: 1, maxLength: 1024
  to: number;
}

export interface UserMailModelRes {
  from?: number;
  id?: number;
  message: string; // minLength: 1, maxLength: 1024
  timestamp?: Timestamp;
  to: number;
}

export interface UserMeetingReq {
  distance: number;
  lat: number;
  lon: number;
  userId: number;
}

export interface UserMeetingRes {
  distance: number;
  lat: number;
  lon: number;
  timestamp?: Timestamp;
  userId: number;
}

export interface UserSearch {
  ageMax?: number; // minimum: 14, maximum: 100
  ageMin?: number; // minimum: 14, maximum: 100
  distance?: number; // minimum: 0.05, maximum: 30
  gender?: Gender;
  timestamp?: Timestamp;
}

export interface UserSettingsModelReq {
  ageMax?: number; // minimum: 14, maximum: 100
  ageMin?: number; // minimum: 14, maximum: 100
  distance?: number; // minimum: 0.05, maximum: 30
  gender?: Gender;
}

export interface UserSettingsModelRes {
  ageMax?: number; // minimum: 14, maximum: 100
  ageMin?: number; // minimum: 14, maximum: 100
  distance?: number; // minimum: 0.05, maximum: 30
  gender?: Gender;
}

export enum Gender {
  MAN = 'MAN',
  WOMAN = 'WOMAN'
}
