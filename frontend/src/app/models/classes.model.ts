export interface ClassRecord {
  id?: number;
  schoolId: number | null;
  sessionId?: number | null;
  schoolName?: string;
  sessionName?: string;
  name: string;
  section: string;
  isActive?: boolean;
  insertedDate?: string;
}

export interface ClassPayload {
  schoolId: number;
  sessionId?: number | null;
  name: string;
  section: string;
  isActive: boolean;
}
