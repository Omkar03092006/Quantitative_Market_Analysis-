-- Create stock_predictions table for storing AI predictions
CREATE TABLE IF NOT EXISTS public.stock_predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL,
  prediction_type text NOT NULL,
  prediction_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_predictions_symbol_type ON public.stock_predictions(symbol, prediction_type);
CREATE INDEX IF NOT EXISTS idx_stock_predictions_created_at ON public.stock_predictions(created_at);

-- Enable RLS
ALTER TABLE public.stock_predictions ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (predictions are public data)
CREATE POLICY "Anyone can view stock predictions" 
ON public.stock_predictions 
FOR SELECT 
USING (true);

-- Create twitter_sentiment table for storing sentiment analysis
CREATE TABLE IF NOT EXISTS public.twitter_sentiment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL,
  sentiment_score numeric NOT NULL DEFAULT 0,
  total_tweets integer NOT NULL DEFAULT 0,
  positive_count integer NOT NULL DEFAULT 0,
  negative_count integer NOT NULL DEFAULT 0,
  neutral_count integer NOT NULL DEFAULT 0,
  average_sentiment numeric NOT NULL DEFAULT 0,
  sentiment_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_twitter_sentiment_symbol ON public.twitter_sentiment(symbol);
CREATE INDEX IF NOT EXISTS idx_twitter_sentiment_created_at ON public.twitter_sentiment(created_at);

-- Enable RLS
ALTER TABLE public.twitter_sentiment ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (sentiment data is public)
CREATE POLICY "Anyone can view twitter sentiment" 
ON public.twitter_sentiment 
FOR SELECT 
USING (true);

-- Create stock_data table for storing historical stock data
CREATE TABLE IF NOT EXISTS public.stock_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL,
  current_price numeric NOT NULL DEFAULT 0,
  previous_close numeric NOT NULL DEFAULT 0,
  change_amount numeric NOT NULL DEFAULT 0,
  change_percent numeric NOT NULL DEFAULT 0,
  volume bigint NOT NULL DEFAULT 0,
  market_cap bigint,
  candlestick_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_data_symbol ON public.stock_data(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_data_last_updated ON public.stock_data(last_updated);

-- Enable RLS
ALTER TABLE public.stock_data ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (stock data is public)
CREATE POLICY "Anyone can view stock data" 
ON public.stock_data 
FOR SELECT 
USING (true);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_stock_predictions_updated_at
BEFORE UPDATE ON public.stock_predictions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_twitter_sentiment_updated_at
BEFORE UPDATE ON public.twitter_sentiment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_data_updated_at
BEFORE UPDATE ON public.stock_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();