export enum IDStatus {
  ACTIVE = "ACTIVE",
  EXPIRING_SOON = "EXPIRING_SOON",
  GRACE_PERIOD = "GRACE_PERIOD",
  INVALID = "INVALID",
}

export interface UserRecord {
  id: string;
  qid_number: string;
  name: string;
  expiry_date: string;
  visit_count: number;
  last_seen_at: string;
  created_at: string;
  name_ar?: string;
  dob?: string;
  nationality?: string;
  employer?: string;
}

export interface ScanResponse {
  user?: UserRecord;
  status: IDStatus;
  status_message: string;
  is_new_user: boolean;
  requires_review: boolean;
  ocr_confidence: number;
  extracted_fields: any;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}
