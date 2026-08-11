import type {
  PreservationStudyAcceptanceRecord,
  PreservationStudyCaseRecord,
  PreservationStudyIntentRecord,
  PreservationStudyPairwiseRecord,
  PreservationStudyPresentationRecord,
  PreservationStudyRatingRecord,
  PreservationStudyRecord,
  PreservationStudyRepository,
} from "@/src/application/ports/outcome/preservation-study-repository";

export class InMemoryPreservationStudyRepository implements PreservationStudyRepository {
  readonly studies: PreservationStudyRecord[] = [];
  readonly cases: PreservationStudyCaseRecord[] = [];
  readonly intents: PreservationStudyIntentRecord[] = [];
  readonly presentations: PreservationStudyPresentationRecord[] = [];
  readonly ratings: PreservationStudyRatingRecord[] = [];
  readonly pairwise: PreservationStudyPairwiseRecord[] = [];
  readonly acceptances: PreservationStudyAcceptanceRecord[] = [];

  async ensureStudy(input: Omit<PreservationStudyRecord, "id" | "createdAt">) {
    const existing = this.studies.find((item) => item.slug === input.slug);
    if (existing) return structuredClone(existing);
    const record = { ...structuredClone(input), id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.studies.push(record);
    return structuredClone(record);
  }

  async findStudyBySlug(slug: string) {
    return structuredClone(this.studies.find((item) => item.slug === slug) ?? null);
  }

  async createCase(input: Omit<PreservationStudyCaseRecord, "id" | "createdAt">) {
    if (this.cases.some((item) => item.studyId === input.studyId && item.transactionId === input.transactionId)) {
      throw new Error("Study case already exists.");
    }
    const record = { ...structuredClone(input), id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.cases.push(record);
    return structuredClone(record);
  }

  async listCases(studyId: string) {
    return structuredClone(this.cases.filter((item) => item.studyId === studyId));
  }

  async findCaseById(id: string) {
    return structuredClone(this.cases.find((item) => item.id === id) ?? null);
  }

  async findCaseByTransactionId(studyId: string, transactionId: string) {
    return structuredClone(this.cases.find((item) => item.studyId === studyId && item.transactionId === transactionId) ?? null);
  }

  async lockIntentAndPresentation(input: Parameters<PreservationStudyRepository["lockIntentAndPresentation"]>[0]) {
    const studyCase = this.cases.find((item) => item.id === input.caseId);
    if (!studyCase) throw new Error("Study case not found.");
    if (this.intents.some((item) => item.caseId === input.caseId) || this.presentations.some((item) => item.caseId === input.caseId)) {
      throw new Error("Intent and presentation are immutable.");
    }
    const validIds = new Set([studyCase.rawCandidateId, studyCase.preservedCandidateId]);
    if (!validIds.has(input.candidateAId) || !validIds.has(input.candidateBId) || input.candidateA === input.candidateB) {
      throw new Error("Presentation does not match the frozen candidate pair.");
    }
    const now = new Date().toISOString();
    const intent: PreservationStudyIntentRecord = { ...structuredClone(input.intent), id: crypto.randomUUID(), caseId: input.caseId, lockedAt: now };
    const presentation: PreservationStudyPresentationRecord = {
      id: crypto.randomUUID(), caseId: input.caseId,
      candidateA: input.candidateA, candidateAId: input.candidateAId,
      candidateB: input.candidateB, candidateBId: input.candidateBId,
      randomizedAt: now,
    };
    this.intents.push(intent);
    this.presentations.push(presentation);
    return structuredClone({ intent, presentation });
  }

  async createRating(input: Omit<PreservationStudyRatingRecord, "id" | "lockedAt">) {
    if (!this.intents.some((item) => item.caseId === input.caseId)) throw new Error("Human intent must be locked first.");
    if (this.ratings.some((item) => item.caseId === input.caseId && item.candidateLabel === input.candidateLabel)) throw new Error("Rating is immutable.");
    const caseRatings = this.ratings.filter((item) => item.caseId === input.caseId);
    if ((input.candidateLabel === "A" && caseRatings.length !== 0) || (input.candidateLabel === "B" && !caseRatings.some((item) => item.candidateLabel === "A"))) {
      throw new Error("Rating is out of sequence.");
    }
    const record = { ...structuredClone(input), id: crypto.randomUUID(), lockedAt: new Date().toISOString() };
    this.ratings.push(record);
    return structuredClone(record);
  }

  async createPairwise(input: Omit<PreservationStudyPairwiseRecord, "id" | "lockedAt">) {
    if (this.pairwise.some((item) => item.caseId === input.caseId)) throw new Error("Pairwise decision is immutable.");
    if (this.ratings.filter((item) => item.caseId === input.caseId).length !== 2) throw new Error("Both ratings are required.");
    const record = { ...structuredClone(input), id: crypto.randomUUID(), lockedAt: new Date().toISOString() };
    this.pairwise.push(record);
    return structuredClone(record);
  }

  async createAcceptance(input: Omit<PreservationStudyAcceptanceRecord, "id" | "lockedAt">) {
    if (this.acceptances.some((item) => item.caseId === input.caseId)) throw new Error("Acceptance is immutable.");
    if (!this.pairwise.some((item) => item.caseId === input.caseId)) throw new Error("Pairwise decision is required.");
    const record = { ...structuredClone(input), id: crypto.randomUUID(), lockedAt: new Date().toISOString() };
    this.acceptances.push(record);
    return structuredClone(record);
  }

  async getCaseBundle(caseId: string) {
    const studyCase = this.cases.find((item) => item.id === caseId);
    if (!studyCase) return null;
    return structuredClone({
      studyCase,
      intent: this.intents.find((item) => item.caseId === caseId) ?? null,
      presentation: this.presentations.find((item) => item.caseId === caseId) ?? null,
      ratings: this.ratings.filter((item) => item.caseId === caseId),
      pairwise: this.pairwise.find((item) => item.caseId === caseId) ?? null,
      acceptance: this.acceptances.find((item) => item.caseId === caseId) ?? null,
    });
  }
}
