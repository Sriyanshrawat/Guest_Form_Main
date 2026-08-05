export interface SchoolBoard {
  id?: number;
  universityName?: string;
  name?: string;
  insertedBy?: string;
  insertedDate?: string;
  isActive?: boolean;
  updatedBy?: string;
  updatedDate?: string;
  deletedBy?: string;
  deletedDate?: string;
}

export type SchoolBoardCreatePayload = {
  name: string;
};

export type SchoolBoardUpdatePayload = {
  name: string;
  isActive: boolean;
};
