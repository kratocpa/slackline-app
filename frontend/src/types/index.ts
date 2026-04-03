export interface PointResponse {
  id: number; description?: string | null; latitude: number; longitude: number;
}
export interface SlacklineListItem {
  id: number; name: string; state?: string | null; region?: string | null;
  length?: number | null; height?: number | null;
  rating?: number | null; date_tense?: string | null;
  first_anchor?: PointResponse | null; second_anchor?: PointResponse | null;
}
export interface SlacklineListResponse {
  items: SlacklineListItem[]; total: number; page: number; page_size: number; pages: number;
}
export interface SlacklineDetail {
  id: number; name: string; description?: string | null; state?: string | null;
  region?: string | null; sector?: string | null; length?: number | null; height?: number | null;
  author?: string | null; name_history?: string | null; date_tense?: string | null;
  time_approach?: string | null; time_tensioning?: string | null;
  rating?: number | null; cover_image_url?: string | null;
  restriction?: string | null; type?: string | null;
  created_at?: string | null; updated_at?: string | null;
  created_by_id?: string | null; updated_by_id?: string | null;
  first_anchor_point?: PointResponse | null; second_anchor_point?: PointResponse | null;
  parking_spot?: PointResponse | null;
}
export interface UserBrief { id: string; username: string; avatar_url?: string | null; }
export interface UserResponse extends UserBrief {
  email: string; display_name?: string | null; is_active: boolean; is_admin: boolean;
}
export interface CrossingItem {
  id: number; slackline_id: number; date?: string | null; style?: string | null;
  accent_description?: string | null; rating?: number | null; image_url?: string | null;
  project?: boolean | null; user?: UserBrief | null; created_at?: string | null;
}
export interface CrossingListResponse {
  items: CrossingItem[]; total: number; page: number; page_size: number; pages: number;
}
export interface ChangeHistoryItem {
  id: string; entity_type: string; entity_id: number; user?: UserBrief | null;
  changed_at: string; changes: Record<string, { old?: string | null; new?: string | null }>;
}
export interface ChangeHistoryResponse {
  items: ChangeHistoryItem[]; total: number; page: number; page_size: number; pages: number;
}
export interface StatisticsResponse {
  total_crossings: number; style_distribution: { style: string; count: number }[];
  top_users: { username: string; count: number }[]; average_rating?: number | null;
}

export interface DiaryItem {
  id: number; name: string; state?: string | null; region?: string | null;
  length?: number | null; height?: number | null; rating?: number | null;
  last_crossing_date?: string | null; crossing_count: number;
  first_anchor?: PointResponse | null; second_anchor?: PointResponse | null;
}
export interface DiaryResponse {
  items: DiaryItem[]; total: number; page: number; page_size: number; pages: number;
}
export interface DiaryStatsResponse {
  total_lines: number;
  total_crossings: number;
  style_distribution: { style: string; count: number }[];
  length_distribution: { bucket: string; count: number }[];
  height_distribution: { bucket: string; count: number }[];
  most_crossed: { id: number; name: string; crossing_count: number }[];
}

export interface SlacklinerItem {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  crossed_lines: number;
  crossed_lines_last_30d: number;
  longest_crossed?: number | null;
  highest_crossed?: number | null;
}

export interface SlacklinerListResponse {
  items: SlacklinerItem[];
  total: number;
}

export interface SlacklinerLineItem {
  id: number;
  name: string;
  state?: string | null;
  region?: string | null;
  length?: number | null;
  height?: number | null;
  rating?: number | null;
  last_crossing_date?: string | null;
  crossing_count: number;
  first_anchor?: PointResponse | null;
  second_anchor?: PointResponse | null;
}

export interface SlacklinerLinesResponse {
  items: SlacklinerLineItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface SlacklinerUserInfo {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

