-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ai_analysis_history (
  id integer NOT NULL DEFAULT nextval('ai_analysis_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  symbol character varying NOT NULL,
  analysis_type character varying DEFAULT 'stock_analysis'::character varying,
  analysis_content text NOT NULL,
  additional_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_analysis_history_pkey PRIMARY KEY (id),
  CONSTRAINT ai_analysis_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);
CREATE TABLE public.auth_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username character varying NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  hashed_password character varying NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT auth_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.news_articles (
  id integer NOT NULL DEFAULT nextval('news_articles_id_seq'::regclass),
  symbol character varying,
  title character varying NOT NULL,
  description text,
  content text,
  url character varying NOT NULL UNIQUE,
  source character varying,
  author character varying,
  published_at timestamp with time zone,
  image_url character varying,
  language character varying DEFAULT 'en'::character varying,
  category character varying DEFAULT 'finance'::character varying,
  api_source character varying,
  relevance_score double precision DEFAULT 0.5,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  base_score double precision DEFAULT 0.5,
  ai_score double precision DEFAULT 0.5,
  positive_score double precision DEFAULT 0.5,
  ai_analyzed_text text,
  analyzed_at timestamp with time zone,
  body text,
  kr_translate text,
  CONSTRAINT news_articles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.news_crawl_history (
  id integer NOT NULL DEFAULT nextval('news_crawl_history_id_seq'::regclass),
  symbol character varying NOT NULL,
  crawl_type character varying DEFAULT 'scheduled'::character varying,
  articles_collected integer DEFAULT 0,
  crawl_started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  crawl_completed_at timestamp with time zone,
  status character varying DEFAULT 'in_progress'::character varying,
  error_message text,
  CONSTRAINT news_crawl_history_pkey PRIMARY KEY (id)
);
CREATE TABLE public.news_history (
  id integer NOT NULL DEFAULT nextval('news_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  article_url character varying NOT NULL,
  title character varying,
  viewed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_history_pkey PRIMARY KEY (id),
  CONSTRAINT news_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);
CREATE TABLE public.refresh_tokens (
  id integer NOT NULL DEFAULT nextval('refresh_tokens_id_seq'::regclass),
  user_id uuid NOT NULL,
  token_hash character varying NOT NULL UNIQUE,
  device_info character varying,
  ip_address character varying,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  revoked_at timestamp with time zone,
  is_revoked boolean DEFAULT false,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);
CREATE TABLE public.search_history (
  id integer NOT NULL DEFAULT nextval('search_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  symbol character varying NOT NULL,
  searched_at timestamp with time zone DEFAULT now(),
  CONSTRAINT search_history_pkey PRIMARY KEY (id),
  CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);
CREATE TABLE public.stock_indicators (
  id bigint NOT NULL DEFAULT nextval('stock_indicators_id_seq'::regclass),
  symbol character varying NOT NULL UNIQUE,
  company_name character varying,
  currency character varying DEFAULT 'USD'::character varying,
  exchange character varying,
  industry character varying,
  sector character varying,
  current_price numeric,
  previous_close numeric,
  market_cap bigint,
  fifty_two_week_high numeric,
  fifty_two_week_low numeric,
  current_ratio numeric,
  profit_margin numeric,
  quick_ratio numeric,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_indicators_pkey PRIMARY KEY (id)
);
CREATE TABLE public.stock_price_history (
  id bigint NOT NULL DEFAULT nextval('stock_price_history_id_seq'::regclass),
  symbol character varying NOT NULL,
  date date NOT NULL,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume bigint DEFAULT 0,
  change numeric,
  change_percent numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_price_history_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_activity_logs (
  id integer NOT NULL DEFAULT nextval('user_activity_logs_id_seq'::regclass),
  user_id uuid NOT NULL,
  activity_type character varying NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);
CREATE TABLE public.user_favorites (
  id integer NOT NULL DEFAULT nextval('user_favorites_id_seq'::regclass),
  user_id uuid NOT NULL,
  symbol character varying NOT NULL,
  company_name character varying,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);
CREATE TABLE public.user_interests (
  id integer NOT NULL DEFAULT nextval('user_interests_id_seq'::regclass),
  user_id uuid NOT NULL,
  interest character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_interests_pkey PRIMARY KEY (id),
  CONSTRAINT user_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);
CREATE TABLE public.user_profiles (
  id integer NOT NULL DEFAULT nextval('user_profiles_id_seq'::regclass),
  user_id uuid NOT NULL UNIQUE,
  name character varying,
  date_of_birth date,
  gender character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);