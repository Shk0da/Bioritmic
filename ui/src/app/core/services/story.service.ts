import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type StoryReactionType = 'LIKE' | 'HEART' | 'FIRE' | 'POOP' | 'CLOWN' | 'LOL' | 'CRY';

export type StoryReactionCounts = Partial<Record<StoryReactionType, number>>;

export interface Story {
  id: number;
  userId: string;
  mediaUrl: string;
  caption?: string;
  expiresAt: number;
  createdAt: number;
  viewerCount: number;
  viewedByCurrentUser: boolean;
  currentUserReaction?: StoryReactionType | null;
  reactionCounts?: StoryReactionCounts;
}

export interface StoryReactionResponse {
  reaction: StoryReactionType | null;
  reactionCounts: StoryReactionCounts;
}

export interface StoryReactionOption {
  type: StoryReactionType;
  emoji: string;
  label: string;
}

export const STORY_REACTIONS: StoryReactionOption[] = [
  { type: 'LIKE', emoji: '👍', label: 'Лайк' },
  { type: 'HEART', emoji: '❤️', label: 'Сердце' },
  { type: 'FIRE', emoji: '🔥', label: 'Огонь' },
  { type: 'POOP', emoji: '💩', label: 'Какашка' },
  { type: 'CLOWN', emoji: '🤡', label: 'Клоун' },
  { type: 'LOL', emoji: '😂', label: 'Смех' },
  { type: 'CRY', emoji: '😭', label: 'Плачу' },
];

@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private readonly apiUrl = '/api/v1/stories';

  constructor(private http: HttpClient) {}

  getFeed(): Observable<Story[]> {
    return this.http.get<Story[]>(this.apiUrl);
  }

  createStory(file: File, caption?: string): Observable<Story> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }
    return this.http.post<Story>(this.apiUrl, formData);
  }

  viewStory(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/${id}/view`, {});
  }

  reactToStory(id: number, reaction: StoryReactionType): Observable<StoryReactionResponse> {
    return this.http.post<StoryReactionResponse>(`${this.apiUrl}/${id}/react`, { reaction });
  }

  deleteStory(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }
}
