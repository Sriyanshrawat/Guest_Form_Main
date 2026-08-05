export interface LookupOption {
  id: number;
  name: string;
  subtitle?: string | null;
}

export interface SaveConfigurationPayload {
  boardId: number;
  boardName: string;
  sessionId: number;
  sessionName: string;
  schoolId: number;
  schoolName: string;
  classId: number;
  className: string;
  classSection: string;
}

export interface ConfigurationListItem {
  id: number;
  boardId: number;
  boardName: string;
  sessionId: number;
  sessionName: string;
  schoolId: number;
  schoolName: string;
  classId: number;
  className: string;
  classSection: string;
  specializations: string;
  streams: string;
}

export interface SpecializationDetails {
  sessionId: number;
  sessionName: string;
  boardId: number;
  boardName: string;
  schoolId: number;
  schoolName: string;
  classId: number;
  className: string;
  classSection: string;
  streams: LookupOption[];
  specializations: LookupOption[];
}
