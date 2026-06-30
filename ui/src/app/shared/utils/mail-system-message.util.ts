import { UserMail } from '../../core/models/user.model';

export const MEETING_SYSTEM_MAIL_MESSAGES = [
  'Ваше предложение встречи принято!',
  'К сожалению, ваше предложение встречи отклонено.',
  'К сожалению, ранее принятая встреча отменена.',
  'Отправитель отозвал предложение встречи.',
  'Отправитель отозвал ранее согласованную встречу.',
] as const;

export function isSystemMailMessage(message: Pick<UserMail, 'mediaType' | 'message' | 'isSystem'> | null | undefined): boolean {
  if (!message) {
    return false;
  }
  if (message.isSystem === true || message.mediaType === 'SYSTEM') {
    return true;
  }
  const text = message.message?.trim();
  return !!text && MEETING_SYSTEM_MAIL_MESSAGES.includes(text as typeof MEETING_SYSTEM_MAIL_MESSAGES[number]);
}
