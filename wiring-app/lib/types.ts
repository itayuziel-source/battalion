export type Role = "worker" | "inspector" | "manager";

export type EntityStatus =
  | "not_started"
  | "in_progress"
  | "pending_check"
  | "done"
  | "issue";

export type MappingStatus = "new" | "uploaded" | "extracting" | "review" | "approved";

export type DeviationStatus = "open" | "in_review" | "approved" | "rejected";

export const ROLE_LABELS: Record<Role, string> = {
  worker: "עובד",
  inspector: "בודק",
  manager: "מנהל",
};

export const STATUS_LABELS: Record<EntityStatus, string> = {
  not_started: "טרם התחיל",
  in_progress: "בביצוע",
  pending_check: "ממתין לבדיקה",
  done: "הושלם",
  issue: "חריגה",
};

export const STATUS_COLORS: Record<EntityStatus, string> = {
  not_started: "bg-gray-100 text-gray-600 border-gray-300",
  in_progress: "bg-orange-100 text-orange-700 border-orange-300",
  pending_check: "bg-blue-100 text-blue-700 border-blue-300",
  done: "bg-green-100 text-green-700 border-green-300",
  issue: "bg-red-100 text-red-700 border-red-300",
};

export const STATUS_DOT: Record<EntityStatus, string> = {
  not_started: "bg-gray-400",
  in_progress: "bg-orange-500",
  pending_check: "bg-blue-500",
  done: "bg-green-500",
  issue: "bg-red-500",
};

export const MAPPING_LABELS: Record<MappingStatus, string> = {
  new: "חדש",
  uploaded: "קבצים הועלו",
  extracting: "בתהליך מיפוי",
  review: "ממתין לבדיקת נתונים",
  approved: "אושר והוזן",
};

export const DEVIATION_LABELS: Record<DeviationStatus, string> = {
  open: "פתוחה",
  in_review: "בבדיקה",
  approved: "אושרה",
  rejected: "נדחתה",
};

export interface User {
  id: number;
  name: string;
  employee_no: string;
  job_title: string;
  role: Role;
}

export interface Project {
  id: number;
  name: string;
  station_name: string;
  work_number: string;
  manager_name: string;
  start_date: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface WiringSet {
  id: number;
  project_id: number;
  name: string;
  version: string;
  received_date: string;
  mapping_status: MappingStatus;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  files?: SetFile[];
  approver_name?: string;
  project_name?: string;
}

export interface SetFile {
  id: number;
  set_id: number;
  file_name: string;
  file_size: number;
  uploaded_at: string;
}

export interface ExtractedRow {
  id: number;
  set_id: number;
  cabinet_no: string;
  cable_no: string;
  wire_no: string;
  cable_type: string;
  source_cabinet: string;
  source_terminal: string;
  dest_cabinet: string;
  dest_terminal: string;
  description: string;
  valid: number;
  error_msg: string;
  approved: number;
}

export interface Cabinet {
  id: number;
  project_id: number;
  set_id: number | null;
  cabinet_no: string;
  name: string;
  location: string;
  status: EntityStatus;
  total_cables: number;
  completed_cables: number;
  progress: number;
  assignee_id: number | null;
  assignee_name?: string;
  started_at: string | null;
  finished_at: string | null;
  notes: string;
  updated_at: string;
  open_deviations?: number;
}

export interface Cable {
  id: number;
  cabinet_id: number;
  cable_no: string;
  source_cabinet: string;
  dest_cabinet: string;
  cable_type: string;
  wire_count: number;
  description: string;
  status: EntityStatus;
  completed_by: number | null;
  completed_by_name?: string;
  completed_at: string | null;
  notes: string;
  checked: number;
  checked_by: number | null;
  checked_by_name?: string;
  checked_at: string | null;
  updated_at: string;
  completed_wires?: number;
  cabinet_no?: string;
}

export interface Wire {
  id: number;
  cable_id: number;
  wire_no: string;
  source_cabinet: string;
  source_terminal: string;
  dest_cabinet: string;
  dest_terminal: string;
  description: string;
  completed: number;
  completed_by: number | null;
  completed_by_name?: string;
  completed_at: string | null;
  has_deviation: number;
  deviation_note: string;
}

export interface Deviation {
  id: number;
  project_id: number;
  cabinet_id: number;
  cable_id: number | null;
  wire_id: number | null;
  description: string;
  reason: string;
  reported_by: number;
  reported_by_name?: string;
  reported_at: string;
  image_name: string;
  status: DeviationStatus;
  manager_response: string;
  approved_by: number | null;
  approved_by_name?: string;
  approved_at: string | null;
  cabinet_no?: string;
  cable_no?: string;
  wire_no?: string;
}

export interface ActivityEntry {
  id: number;
  user_id: number;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: number;
  entity_label: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface AppNotification {
  id: number;
  type: string;
  message: string;
  entity_type: string;
  entity_id: number | null;
  created_at: string;
  read: number;
}
