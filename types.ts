export type GameStatus = 'INTRO' | 'PLAYING' | 'REVEALED' | 'SUMMARY';

export interface OptionItem {
  id: 'A' | 'B' | 'C' | 'D';
  textEs: string;
  textRu: string;
}

export interface QuestionItem {
  id: number;
  part: string;
  partTitleEs: string;
  partTitleRu: string;
  topicRu: string;
  topicEs: string;
  questionRu: string;
  questionEs: string;
  options: OptionItem[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanationEs: string;
  explanationRu: string;
}

export interface LifelineState {
  fiftyFiftyUsed: boolean;
  audienceUsed: boolean;
  phoneUsed: boolean;
}

export interface AudienceVote {
  option: 'A' | 'B' | 'C' | 'D';
  percentage: number;
}

export interface PhoneFriendAdvice {
  friendName: string;
  confidence: number;
  messageEs: string;
  messageRu: string;
  recommendedOption: 'A' | 'B' | 'C' | 'D';
}

export interface UserAnswerRecord {
  questionId: number;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  timeSpentSeconds: number;
}
