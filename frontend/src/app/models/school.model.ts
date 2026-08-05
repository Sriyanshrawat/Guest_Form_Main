export interface School {
  id?: number;
  schoolBoardId: number;
  schoolBoardName?: string;
  name: string;
  isActive?: boolean;
  insertedDate?: string;
}

export interface SchoolPayload {
  schoolBoardId: number;
  name: string;
  isActive?: boolean;
}
