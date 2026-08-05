export interface StreamRecord {
  id?: number;
  classId: number;
  className?: string;
  classSection?: string;
  schoolName?: string;
  name: string;
  acronym?: string;
  isActive?: boolean;
  insertedDate?: string;
}

export interface StreamPayload {
  classId: number;
  name: string;
  acronym?: string;
  isActive: boolean;
}
