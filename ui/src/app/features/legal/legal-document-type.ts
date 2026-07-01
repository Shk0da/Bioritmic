export type LegalDocumentType = 'user-agreement' | 'privacy-policy';

export const LEGAL_DOCUMENT_TITLES: Record<LegalDocumentType, string> = {
  'user-agreement': 'Пользовательское соглашение',
  'privacy-policy': 'Политика конфиденциальности и согласие на обработку персональных данных',
};
