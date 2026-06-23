export interface MatchStream {
  id: string;
  match_id: string;
  channel_id: string | null;
  embed_name: string;
  embed_url: string;
  source: string;
  stream_param: string | null;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  stream_param: string | null;
  logo_url: string | null;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
}
