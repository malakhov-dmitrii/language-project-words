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
      pa_chats: {
        Row: {
          assistant_id: number | null
          client_id: number | null
          created_at: string | null
          id: number
          join_code: number
        }
        Insert: {
          assistant_id?: number | null
          client_id?: number | null
          created_at?: string | null
          id?: number
          join_code: number
        }
        Update: {
          assistant_id?: number | null
          client_id?: number | null
          created_at?: string | null
          id?: number
          join_code?: number
        }
      }
      pa_profiles: {
        Row: {
          chat_id: number | null
          created_at: string | null
          id: number
          role: string
          username: string | null
        }
        Insert: {
          chat_id?: number | null
          created_at?: string | null
          id?: number
          role?: string
          username?: string | null
        }
        Update: {
          chat_id?: number | null
          created_at?: string | null
          id?: number
          role?: string
          username?: string | null
        }
      }
      pa_todos: {
        Row: {
          chat_id: number
          client_inbox: boolean
          date: string | null
          description: string | null
          id: number
          inserted_at: string
          is_complete: boolean | null
          title: string | null
          url: string | null
          user_id: number
        }
        Insert: {
          chat_id: number
          client_inbox?: boolean
          date?: string | null
          description?: string | null
          id?: number
          inserted_at?: string
          is_complete?: boolean | null
          title?: string | null
          url?: string | null
          user_id: number
        }
        Update: {
          chat_id?: number
          client_inbox?: boolean
          date?: string | null
          description?: string | null
          id?: number
          inserted_at?: string
          is_complete?: boolean | null
          title?: string | null
          url?: string | null
          user_id?: number
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          chats_ids: number[] | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          chats_ids?: number[] | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          chats_ids?: number[] | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
      }
      telegram_users: {
        Row: {
          created_at: string | null
          default_explanation_language: string
          email: string
          learning_language: string
          native_language: string
          phrases_batch_size: string | null
          state: string | null
          telegram_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_explanation_language?: string
          email: string
          learning_language?: string
          native_language: string
          phrases_batch_size?: string | null
          state?: string | null
          telegram_id?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_explanation_language?: string
          email?: string
          learning_language?: string
          native_language?: string
          phrases_batch_size?: string | null
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
          generated_text: string | null
          gpt_reply: string | null
          id: number
          jokes: string[]
          message_id: number | null
          phrase: string
          phrase_original_id: number | null
          prompt: string | null
          reply: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          generated_text?: string | null
          gpt_reply?: string | null
          id?: number
          jokes?: string[]
          message_id?: number | null
          phrase: string
          phrase_original_id?: number | null
          prompt?: string | null
          reply?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          generated_text?: string | null
          gpt_reply?: string | null
          id?: number
          jokes?: string[]
          message_id?: number | null
          phrase?: string
          phrase_original_id?: number | null
          prompt?: string | null
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
