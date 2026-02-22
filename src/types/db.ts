export type SlotLabel = 'shortest' | 'popular' | 'afterwork';

export interface Stylist {
  id: string;
  name: string;
  instagram_id: string | null;
  auth_user_id: string | null;
  hourly_rate: number | null;
  email: string | null;
  created_at: string;
}

export interface Slot {
  id: string;
  stylist_id: string;
  start_at: string;
  label: SlotLabel;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SlotWithRemaining extends Slot {
  remaining: number;
}

export interface Reservation {
  id: string;
  slot_id: string;
  name: string;
  phone: string;
  email: string | null;
  instagram_id: string | null;
  menu_note: string | null;
  created_at: string;
}

export interface PublicSlotRow {
  id: string;
  start_at: string;
  label: string;
  note: string | null;
  remaining: number;
  stylist_name: string;
  stylist_hourly_rate: number | null;
}
