export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      _airtable_schema: {
        Row: {
          fingerprint: string
          id: number
          inserted_at: string | null
          payload: Json
          resource_id: string
        }
        Insert: {
          fingerprint: string
          id?: number
          inserted_at?: string | null
          payload: Json
          resource_id: string
        }
        Update: {
          fingerprint?: string
          id?: number
          inserted_at?: string | null
          payload?: Json
          resource_id?: string
        }
      }
      _sync_event: {
        Row: {
          event_type: string
          id: number
          inserted_at: string
          object_type: string
          payload: Json | null
        }
        Insert: {
          event_type: string
          id?: number
          inserted_at: string
          object_type: string
          payload?: Json | null
        }
        Update: {
          event_type?: string
          id?: number
          inserted_at?: string
          object_type?: string
          payload?: Json | null
        }
      }
      _sync_event_cursor: {
        Row: {
          group_name: string
          group_offset: number
          heartbeat: string
          id: number
        }
        Insert: {
          group_name: string
          group_offset: number
          heartbeat?: string
          id?: number
        }
        Update: {
          group_name?: string
          group_offset?: number
          heartbeat?: string
          id?: number
        }
      }
      _sync_meta: {
        Row: {
          completed_at: string | null
          duration_last: unknown | null
          id: number
          started_at: string | null
        }
        Insert: {
          completed_at?: string | null
          duration_last?: unknown | null
          id: number
          started_at?: string | null
        }
        Update: {
          completed_at?: string | null
          duration_last?: unknown | null
          id?: number
          started_at?: string | null
        }
      }
      telegram_users: {
        Row: {
          created_at: string | null
          learning_language: string
          native_language: string
          state: string | null
          telegram_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          learning_language?: string
          native_language: string
          state?: string | null
          telegram_id?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          learning_language?: string
          native_language?: string
          state?: string | null
          telegram_id?: number
          user_id?: string
        }
      }
      transactions: {
        Row: {
          _sync_inserted_at: string
          _sync_updated_at: string
          category: string | null
          created_time: string | null
          date: string | null
          expence: number | null
          id: string
          id_: number | null
          income: number | null
          notes: string | null
        }
        Insert: {
          _sync_inserted_at?: string
          _sync_updated_at?: string
          category?: string | null
          created_time?: string | null
          date?: string | null
          expence?: number | null
          id: string
          id_?: number | null
          income?: number | null
          notes?: string | null
        }
        Update: {
          _sync_inserted_at?: string
          _sync_updated_at?: string
          category?: string | null
          created_time?: string | null
          date?: string | null
          expence?: number | null
          id?: string
          id_?: number | null
          income?: number | null
          notes?: string | null
        }
      }
      user_feed_queue: {
        Row: {
          created_at: string | null
          id: number
          phrase: string
          reply: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          phrase: string
          reply?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          phrase?: string
          reply?: string | null
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _assign_event_cursor: {
        Args: {
          name?: string
          default_start?: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
