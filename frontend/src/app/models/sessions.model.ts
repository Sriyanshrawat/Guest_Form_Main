export interface SessionRecord {
  id?: number;
  name: string;
  isActive?: boolean;
  insertedDate?: string;
}

export interface SessionPayload {
  name: string;
  isActive: boolean;
}
