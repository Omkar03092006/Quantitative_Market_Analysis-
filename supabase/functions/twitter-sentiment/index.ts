import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const twitterBearerToken = Deno.env.get('TWITTER_BEARER_TOKEN')!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Ticker symbol to company name mapping
const tickerToCompanyName: Record<string, string> = {
  'AAPL': 'Apple',
  'MSFT': 'Microsoft',
  'GOOGL': 'Google',
  'GOOG': 'Google',
  'AMZN': 'Amazon',
  'TSLA': 'Tesla',
  'META': 'Meta',
  'NVDA': 'NVIDIA',
  'AMD': 'AMD',
  'NFLX': 'Netflix',
  'DIS': 'Disney',
  'BA': 'Boeing',
  'NKE': 'Nike',
  'SBUX': 'Starbucks',
  'MCD': 'McDonalds',
  'KO': 'Coca-Cola',
  'PEP': 'Pepsi',
  'WMT': 'Walmart',
  'TGT': 'Target',
  'JPM': 'JPMorgan',
  'BAC': 'Bank of America',
  'GS': 'Goldman Sachs',
  'V': 'Visa',
  'MA': 'Mastercard',
  'PYPL': 'PayPal',
  'SQ': 'Block',
  'COIN': 'Coinbase',
  'INTC': 'Intel',
  'CSCO': 'Cisco',
  'IBM': 'IBM',
  'ORCL': 'Oracle',
  'CRM': 'Salesforce',
  'ADBE': 'Adobe',
  'UBER': 'Uber',
  'LYFT': 'Lyft',
  'ABNB': 'Airbnb',
  'SPOT': 'Spotify',
  'SNAP': 'Snapchat',
  'TWTR': 'Twitter',
  'ROKU': 'Roku',
  'ZM': 'Zoom',
  'DOCU': 'DocuSign',
  'SHOP': 'Shopify',
  'SQ': 'Square',
  'HOOD': 'Robinhood',
  'F': 'Ford',
  'GM': 'General Motors',
  'T': 'AT&T',
  'VZ': 'Verizon',
  'CMCSA': 'Comcast',
  'XOM': 'Exxon Mobil',
  'CVX': 'Chevron',
  'PFE': 'Pfizer',
  'JNJ': 'Johnson & Johnson',
  'MRNA': 'Moderna',
  'BNTX': 'BioNTech'
};

// Simple sentiment analysis using word lists (word2vec/ngram approach)
const positiveWords = [
  'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful',
  'bullish', 'buy', 'moon', 'rocket', 'gain', 'profit', 'surge', 'rally',
  'strong', 'positive', 'growth', 'up', 'rise', 'increase', 'love', 'like'
];

const negativeWords = [
  'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'crash', 'dump',
  'bearish', 'sell', 'fall', 'drop', 'loss', 'decline', 'weak', 'negative',
  'down', 'decrease', 'hate', 'dislike', 'fear', 'panic', 'worry', 'concern'
];

function analyzeSentiment(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  // Normalize score between -1 and 1
  const maxWords = words.length;
  return maxWords > 0 ? Math.max(-1, Math.min(1, score / maxWords * 10)) : 0;
}

async function fetchTwitterSentiment(symbol: string) {
  try {
    // Get company name from ticker symbol, fallback to symbol if not found
    const companyName = tickerToCompanyName[symbol] || symbol;
    
    // Search for recent tweets using company name for better results
    const searchQuery = `${companyName} stock OR ${companyName} shares OR ${companyName} (lang:en)`;
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(searchQuery)}&max_results=100&tweet.fields=created_at,public_metrics,text`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${twitterBearerToken}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.error('Twitter API error:', response.status, await response.text());
      // Return neutral sentiment if Twitter API fails
      return {
        overallSentiment: 0,
        sentimentData: {
          totalTweets: 0,
          averageSentiment: 0,
          positiveCount: 0,
          negativeCount: 0,
          neutralCount: 0,
          tweetSamples: []
        }
      };
    }
    
    const data = await response.json();
    const tweets = data.data || [];
    
    console.log(`Found ${tweets.length} tweets for ${symbol}`);
    
    let totalSentiment = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const tweetSamples: any[] = [];
    
    tweets.forEach((tweet: any) => {
      const sentiment = analyzeSentiment(tweet.text);
      totalSentiment += sentiment;
      
      if (sentiment > 0.1) positiveCount++;
      else if (sentiment < -0.1) negativeCount++;
      else neutralCount++;
      
      // Store sample tweets for analysis
      if (tweetSamples.length < 10) {
        tweetSamples.push({
          text: tweet.text.substring(0, 100) + '...',
          sentiment: sentiment,
          created_at: tweet.created_at
        });
      }
    });
    
    const averageSentiment = tweets.length > 0 ? totalSentiment / tweets.length : 0;
    
    return {
      overallSentiment: averageSentiment,
      sentimentData: {
        totalTweets: tweets.length,
        averageSentiment: averageSentiment,
        positiveCount,
        negativeCount,
        neutralCount,
        tweetSamples
      }
    };
    
  } catch (error) {
    console.error('Error fetching Twitter sentiment:', error);
    // Return neutral sentiment on error
    return {
      overallSentiment: 0,
      sentimentData: {
        totalTweets: 0,
        averageSentiment: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        tweetSamples: [],
        error: error.message
      }
    };
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

    console.log(`Analyzing sentiment for symbol: ${symbol}`);

    // Check if we have recent sentiment data (less than 30 minutes old)
    const { data: existingData } = await supabase
      .from('twitter_sentiment')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    if (existingData && new Date(existingData.created_at) > thirtyMinutesAgo) {
      console.log('Returning cached sentiment data');
      return new Response(
        JSON.stringify({
          symbol: existingData.symbol,
          sentiment_score: existingData.sentiment_score,
          ...existingData.sentiment_data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh sentiment data
    const sentimentResult = await fetchTwitterSentiment(symbol.toUpperCase());

    // Store in database
    await supabase
      .from('twitter_sentiment')
      .insert({
        symbol: symbol.toUpperCase(),
        sentiment_score: sentimentResult.overallSentiment,
        sentiment_data: sentimentResult.sentimentData,
        created_at: new Date().toISOString()
      });

    console.log('Sentiment analysis completed and stored');

    return new Response(
      JSON.stringify({
        symbol: symbol.toUpperCase(),
        sentiment_score: sentimentResult.overallSentiment,
        ...sentimentResult.sentimentData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in twitter-sentiment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);