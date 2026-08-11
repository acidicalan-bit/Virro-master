import type {
  PixelHumanDivergenceTag,
  StudyCandidateIdentity,
  StudyCandidateLabel,
  StudyCaseSnapshot,
  StudyDerivedPreference,
  StudyFailureTag,
  StudyIntentInput,
  StudyPairwisePreference,
  StudyRatings,
  StudyTaskType,
  StudyTopology,
} from "@/src/domain/outcome/media/preservation-study";

export type PreservationStudyRecord = {
  id: string;
  slug: string;
  name: string;
  protocolVersion: string;
  targetCaseCount: number;
  createdAt: string;
};

export type PreservationStudyCaseRecord = StudyCaseSnapshot & {
  id: string;
  studyId: string;
  planCaseId: string | null;
  topology: StudyTopology;
  taskType: StudyTaskType;
  createdAt: string;
};

export type PreservationStudyIntentRecord = StudyIntentInput & {
  id: string;
  caseId: string;
  lockedAt: string;
};

export type PreservationStudyPresentationRecord = {
  id: string;
  caseId: string;
  candidateA: StudyCandidateIdentity;
  candidateAId: string;
  candidateB: StudyCandidateIdentity;
  candidateBId: string;
  randomizedAt: string;
};

export type PreservationStudyRatingRecord = {
  id: string;
  caseId: string;
  candidateLabel: StudyCandidateLabel;
  ratings: StudyRatings;
  failureTags: StudyFailureTag[];
  notes: string | null;
  lockedAt: string;
};

export type PreservationStudyPairwiseRecord = {
  id: string;
  caseId: string;
  preference: StudyPairwisePreference;
  derivedPreference: StudyDerivedPreference;
  divergenceTags: PixelHumanDivergenceTag[];
  notes: string | null;
  lockedAt: string;
};

export type PreservationStudyAcceptanceRecord = {
  id: string;
  caseId: string;
  rawAccepted: boolean;
  preservedAccepted: boolean;
  lockedAt: string;
};

export type PreservationStudyCaseBundle = {
  studyCase: PreservationStudyCaseRecord;
  intent: PreservationStudyIntentRecord | null;
  presentation: PreservationStudyPresentationRecord | null;
  ratings: PreservationStudyRatingRecord[];
  pairwise: PreservationStudyPairwiseRecord | null;
  acceptance: PreservationStudyAcceptanceRecord | null;
};

export interface PreservationStudyRepository {
  ensureStudy(input: Omit<PreservationStudyRecord, "id" | "createdAt">): Promise<PreservationStudyRecord>;
  findStudyBySlug(slug: string): Promise<PreservationStudyRecord | null>;
  createCase(input: Omit<PreservationStudyCaseRecord, "id" | "createdAt">): Promise<PreservationStudyCaseRecord>;
  listCases(studyId: string): Promise<PreservationStudyCaseRecord[]>;
  findCaseById(id: string): Promise<PreservationStudyCaseRecord | null>;
  findCaseByTransactionId(studyId: string, transactionId: string): Promise<PreservationStudyCaseRecord | null>;
  lockIntentAndPresentation(input: {
    caseId: string;
    intent: StudyIntentInput;
    candidateA: StudyCandidateIdentity;
    candidateAId: string;
    candidateB: StudyCandidateIdentity;
    candidateBId: string;
  }): Promise<{ intent: PreservationStudyIntentRecord; presentation: PreservationStudyPresentationRecord }>;
  createRating(input: Omit<PreservationStudyRatingRecord, "id" | "lockedAt">): Promise<PreservationStudyRatingRecord>;
  createPairwise(input: Omit<PreservationStudyPairwiseRecord, "id" | "lockedAt">): Promise<PreservationStudyPairwiseRecord>;
  createAcceptance(input: Omit<PreservationStudyAcceptanceRecord, "id" | "lockedAt">): Promise<PreservationStudyAcceptanceRecord>;
  getCaseBundle(caseId: string): Promise<PreservationStudyCaseBundle | null>;
}
