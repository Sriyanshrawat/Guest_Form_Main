export interface Student {
  id?: number;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phoneNumber?: string;
  address: string;
  bloodGroup?: string;
  fatherName: string;
  motherName: string;
  fatherPhone: string;
  motherPhone: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  aadhaarNumber?: string;
  nationality?: string;
  religion?: string;
  motherTongue?: string;
  category?: string;
  enrollmentNumber?: string;
  rollNumber?: string;
  boardId: number;
  boardName?: string;
  sessionId: number;
  sessionName?: string;
  schoolId: number;
  schoolName?: string;
  classId: number;
  className?: string;
  classSection?: string;
  streamId?: number | null;
  streamName?: string;
  specializationId?: number | null;
  specializationName?: string;
  isActive?: boolean;
  createdAt?: string;
  deletedDate?: string;
}

export interface LookupOption {
  id: number;
  name: string;
  subtitle?: string | null;
}
