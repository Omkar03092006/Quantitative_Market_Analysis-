import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Yahoo Finance API (Free alternative to yfinance)
async function fetchYahooFinanceData(symbol: string) {
  try {
    // Using Yahoo Finance Query API (free)
    const baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
    const params = new URLSearchParams({
      symbols: symbol,
      interval: '1m',
      range: '5d',
      includePrePost: 'true',
      events: 'div%2Csplit'
    });
    
    const response = await fetch(`${baseUrl}/${symbol}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Yahoo Finance response:', data);
    
    if (!data.chart?.result?.[0]) {
      throw new Error('No data found for symbol');
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const indicators = result.indicators?.quote?.[0] || {};
    
    // Format candlestick data
    const candlestickData = timestamps.map((timestamp: number, index: number) => ({
      time: timestamp,
      open: indicators.open?.[index] || 0,
      high: indicators.high?.[index] || 0,
      low: indicators.low?.[index] || 0,
      close: indicators.close?.[index] || 0,
      volume: indicators.volume?.[index] || 0
    })).filter((candle: any) => candle.close > 0);
    
    return {
      symbol: meta.symbol,
      currentPrice: meta.regularMarketPrice || meta.previousClose,
      previousClose: meta.previousClose,
      change: (meta.regularMarketPrice || meta.previousClose) - meta.previousClose,
      changePercent: ((meta.regularMarketPrice || meta.previousClose) - meta.previousClose) / meta.previousClose * 100,
      volume: meta.regularMarketVolume,
      marketCap: meta.marketCap,
      candlestickData: candlestickData,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    throw error;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol');
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching data for symbol: ${symbol}`);

    // Check if we have recent data (less than 5 minutes old)
    const { data: existingDataArray } = await supabase
      .from('stock_data')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .order('last_updated', { ascending: false })
      .limit(1);

    const existingData = existingDataArray?.[0];
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    if (existingData && new Date(existingData.last_updated) > fiveMinutesAgo) {
      console.log('Returning cached data');
      return new Response(
        JSON.stringify({
          symbol: existingData.symbol,
          currentPrice: existingData.current_price,
          previousClose: existingData.previous_close,
          change: existingData.change_amount,
          changePercent: existingData.change_percent,
          volume: existingData.volume,
          marketCap: existingData.market_cap,
          candlestickData: existingData.candlestick_data,
          lastUpdated: existingData.last_updated
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh data
    const stockData = await fetchYahooFinanceData(symbol.toUpperCase());

    // Store in database using upsert with symbol as the unique key
    const { error: upsertError } = await supabase
      .from('stock_data')
      .upsert({
        symbol: symbol.toUpperCase(),
        current_price: stockData.currentPrice,
        previous_close: stockData.previousClose,
        change_amount: stockData.change,
        change_percent: stockData.changePercent,
        volume: stockData.volume,
        market_cap: stockData.marketCap,
        candlestick_data: stockData.candlestickData,
        last_updated: stockData.lastUpdated
      }, {
        onConflict: 'symbol'
      });

    if (upsertError) {
      console.error('Error upserting stock data:', upsertError);
      throw upsertError;
    }

    console.log('Stock data fetched and stored successfully');

    return new Response(
      JSON.stringify(stockData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in fetch-stock-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);