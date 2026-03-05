-- Create Edge Functions for stock data and predictions

-- First, let's create the necessary database functions and setup

CREATE OR REPLACE FUNCTION public.handle_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    email = NEW.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user();

-- Create tables for stock data and predictions
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create stock_data table for caching yfinance data
CREATE TABLE IF NOT EXISTS public.stock_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol)
);

-- Enable RLS
ALTER TABLE public.stock_data ENABLE ROW LEVEL SECURITY;

-- Create policy for stock data (publicly readable)
CREATE POLICY "Stock data is publicly readable" ON public.stock_data
  FOR SELECT USING (true);

-- Create policy for stock data insertion (authenticated users only)
CREATE POLICY "Authenticated users can insert stock data" ON public.stock_data
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock data" ON public.stock_data
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create stock_predictions table
CREATE TABLE IF NOT EXISTS public.stock_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  prediction_type TEXT NOT NULL, -- '30min', '1hour', '1day'
  prediction_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stock_predictions ENABLE ROW LEVEL SECURITY;

-- Create policy for predictions (publicly readable)
CREATE POLICY "Stock predictions are publicly readable" ON public.stock_predictions
  FOR SELECT USING (true);

-- Create policy for predictions insertion (authenticated users only)
CREATE POLICY "Authenticated users can insert predictions" ON public.stock_predictions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create twitter_sentiment table
CREATE TABLE IF NOT EXISTS public.twitter_sentiment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  sentiment_score DECIMAL(5,2), -- -1.00 to 1.00
  sentiment_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.twitter_sentiment ENABLE ROW LEVEL SECURITY;

-- Create policy for sentiment (publicly readable)
CREATE POLICY "Twitter sentiment is publicly readable" ON public.twitter_sentiment
  FOR SELECT USING (true);

-- Create policy for sentiment insertion (authenticated users only)
CREATE POLICY "Authenticated users can insert sentiment" ON public.twitter_sentiment
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_data_symbol ON public.stock_data(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_predictions_symbol ON public.stock_predictions(symbol);
CREATE INDEX IF NOT EXISTS idx_twitter_sentiment_symbol ON public.twitter_sentiment(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_predictions_created_at ON public.stock_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_twitter_sentiment_created_at ON public.twitter_sentiment(created_at);