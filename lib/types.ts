export type QuestionType = "single_choice" | "rating" | "text";

export interface SurveyQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  required: boolean;
  position: number;
  options: string[];
}

export interface SurveySummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  isActive: boolean;
  questionCount: number;
  responseCount: number;
  createdAt: string;
}

export interface SurveyDetail extends SurveySummary {
  questions: SurveyQuestion[];
}

export interface QuestionAnalytics {
  questionId: string;
  prompt: string;
  type: QuestionType;
  totalAnswers: number;
  options: string[];
  distribution: Array<{
    label: string;
    count: number;
  }>;
  textAnswers: string[];
}

export interface SurveyAnalytics extends SurveyDetail {
  results: QuestionAnalytics[];
}

export interface SurveyDraftQuestion {
  prompt: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
}