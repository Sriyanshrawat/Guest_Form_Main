export interface SpecializationRecord {
  id?: number;
  classId: number;
  className?: string;
  classSection?: string;
  schoolName?: string;
  streamId?: number | null;
  streamName?: string;
  streamAcronym?: string;
  name: string;
  isActive?: boolean;
  insertedDate?: string;
}

export interface SpecializationPayload {
  classId: number;
  streamId?: number | null;
  name: string;
  isActive: boolean;
}
