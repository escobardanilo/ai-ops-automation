export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      suppliers: {
        Row: {
          id: string;
          name: string;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          verified?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      workflows: {
        Row: {
          id: string;
          source_type: "pdf" | "email";
          original_filename: string | null;
          raw_text: string;
          document_type: "invoice" | "purchase_order" | "customer_request" | "other" | null;
          classification_confidence: number | null;
          extracted_data: Json;
          decision: "auto_process" | "human_review" | "blocked" | null;
          status: "processing" | "completed" | "failed";
          generated_response: string | null;
          supplier_id: string | null;
          invoice_number: string | null;
          amount: number | null;
          currency: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_type: "pdf" | "email";
          original_filename?: string | null;
          raw_text: string;
          document_type?: "invoice" | "purchase_order" | "customer_request" | "other" | null;
          classification_confidence?: number | null;
          extracted_data?: Json;
          decision?: "auto_process" | "human_review" | "blocked" | null;
          status?: "processing" | "completed" | "failed";
          generated_response?: string | null;
          supplier_id?: string | null;
          invoice_number?: string | null;
          amount?: number | null;
          currency?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source_type?: "pdf" | "email";
          original_filename?: string | null;
          raw_text?: string;
          document_type?: "invoice" | "purchase_order" | "customer_request" | "other" | null;
          classification_confidence?: number | null;
          extracted_data?: Json;
          decision?: "auto_process" | "human_review" | "blocked" | null;
          status?: "processing" | "completed" | "failed";
          generated_response?: string | null;
          supplier_id?: string | null;
          invoice_number?: string | null;
          amount?: number | null;
          currency?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflows_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_events: {
        Row: {
          id: string;
          workflow_id: string;
          event_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          event_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          event_type?: string;
          payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_events_workflow_id_fkey";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "workflows";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
