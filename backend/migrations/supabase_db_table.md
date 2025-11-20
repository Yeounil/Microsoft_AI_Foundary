| 순서 | 테이블명                | CREATE TABLE 문                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | ai_analysis_history | CREATE TABLE public.ai_analysis_history (
  id integer NOT NULL DEFAULT nextval('ai_analysis_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  symbol character varying(20) NOT NULL,
  analysis_type character varying(50) DEFAULT 'stock_analysis'::character varying,
  analysis_content text NOT NULL,
  additional_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_analysis_history_pkey PRIMARY KEY (id),
  CONSTRAINT ai_analysis_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2  | auth_users          | CREATE TABLE public.auth_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username character varying(50) NOT NULL,
  email character varying(255) NOT NULL,
  hashed_password character varying(255) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT auth_users_pkey PRIMARY KEY (id),
  CONSTRAINT auth_users_email_key UNIQUE (email),
  CONSTRAINT auth_users_username_key UNIQUE (username)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 3  | news_articles       | CREATE TABLE public.news_articles (
  id integer NOT NULL DEFAULT nextval('news_articles_id_seq'::regclass),
  symbol character varying(20),
  title character varying(500) NOT NULL,
  description text,
  content text,
  url character varying(500) NOT NULL,
  source character varying(100),
  author character varying(100),
  published_at timestamp with time zone,
  image_url character varying(500),
  language character varying(10) DEFAULT 'en'::character varying,
  category character varying(50) DEFAULT 'finance'::character varying,
  api_source character varying(50),
  relevance_score double precision DEFAULT 0.5,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  base_score double precision DEFAULT 0.5,
  ai_score double precision DEFAULT 0.5,
  analyzed_at timestamp with time zone,
  body text,
  positive_score double precision,
  ai_analyzed_text text,
  kr_translate text,
  CONSTRAINT news_articles_pkey PRIMARY KEY (id),
  CONSTRAINT news_articles_url_key UNIQUE (url)
); |
| 4  | news_crawl_history  | CREATE TABLE public.news_crawl_history (
  id integer NOT NULL DEFAULT nextval('news_crawl_history_id_seq'::regclass),
  symbol character varying NOT NULL,
  crawl_type character varying DEFAULT 'scheduled'::character varying,
  articles_collected integer DEFAULT 0,
  crawl_started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  crawl_completed_at timestamp with time zone,
  status character varying DEFAULT 'in_progress'::character varying,
  error_message text,
  CONSTRAINT news_crawl_history_pkey PRIMARY KEY (id)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 5  | news_reports        | CREATE TABLE public.news_reports (
  id integer NOT NULL DEFAULT nextval('news_reports_id_seq'::regclass),
  symbol character varying(20) NOT NULL,
  report_data jsonb NOT NULL,
  analyzed_count integer NOT NULL DEFAULT 20,
  limit_used integer NOT NULL DEFAULT 20,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  CONSTRAINT news_reports_pkey PRIMARY KEY (id)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6  | refresh_tokens      | CREATE TABLE public.refresh_tokens (
  id integer NOT NULL DEFAULT nextval('refresh_tokens_id_seq'::regclass),
  user_id uuid NOT NULL,
  token_hash character varying NOT NULL,
  device_info character varying,
  ip_address character varying,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  revoked_at timestamp with time zone,
  is_revoked boolean DEFAULT false,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id, id),
  CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash),
  CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);                                                                                                                                                                                                                                                                                                                                                                                                               |
| 7  | search_history      | CREATE TABLE public.search_history (
  id integer NOT NULL DEFAULT nextval('search_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  symbol character varying(20) NOT NULL,
  searched_at timestamp with time zone DEFAULT now(),
  CONSTRAINT search_history_pkey PRIMARY KEY (id),
  CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 8  | stock_indicators    | CREATE TABLE public.stock_indicators (
  id bigint NOT NULL DEFAULT nextval('stock_indicators_id_seq'::regclass),
  symbol character varying(10) NOT NULL,
  company_name character varying(255),
  currency character varying(3) DEFAULT 'USD'::character varying,
  exchange character varying(50),
  industry character varying(100),
  sector character varying(100),
  current_price numeric(12, 2),
  previous_close numeric(12, 2),
  market_cap bigint,
  fifty_two_week_high numeric(12, 2),
  fifty_two_week_low numeric(12, 2),
  current_ratio numeric(8, 2),
  profit_margin numeric(8, 4),
  quick_ratio numeric(8, 2),
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_indicators_pkey PRIMARY KEY (id),
  CONSTRAINT symbol_unique UNIQUE (symbol)
);                                                                                                                                                                                                                                  |
| 9  | stock_price_history | CREATE TABLE public.stock_price_history (
  id bigint NOT NULL DEFAULT nextval('stock_price_history_id_seq'::regclass),
  symbol character varying(10) NOT NULL,
  date date NOT NULL,
  open numeric(12, 2),
  high numeric(12, 2),
  low numeric(12, 2),
  close numeric(12, 2),
  volume bigint DEFAULT 0,
  change numeric(10, 2),
  change_percent numeric(8, 4),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_price_history_pkey PRIMARY KEY (id),
  CONSTRAINT symbol_date_unique UNIQUE (symbol, date)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 10 | user_activity_logs  | CREATE TABLE public.user_activity_logs (
  id integer NOT NULL DEFAULT nextval('user_activity_logs_id_seq'::regclass),
  user_id uuid NOT NULL,
  activity_type character varying(50) NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 11 | user_favorites      | CREATE TABLE public.user_favorites (
  id integer NOT NULL DEFAULT nextval('user_favorites_id_seq'::regclass),
  user_id uuid NOT NULL,
  symbol character varying(20) NOT NULL,
  company_name character varying(100),
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT user_favorites_user_id_symbol_key UNIQUE (user_id, symbol),
  CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 12 | user_interests      | CREATE TABLE public.user_interests (
  id integer NOT NULL DEFAULT nextval('user_interests_id_seq'::regclass),
  user_id uuid NOT NULL,
  interest character varying(50) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_interests_pkey PRIMARY KEY (id),
  CONSTRAINT user_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 13 | user_profiles       | CREATE TABLE public.user_profiles (
  id integer NOT NULL DEFAULT nextval('user_profiles_id_seq'::regclass),
  user_id uuid NOT NULL,
  name character varying(100),
  date_of_birth date,
  gender character varying(10),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |