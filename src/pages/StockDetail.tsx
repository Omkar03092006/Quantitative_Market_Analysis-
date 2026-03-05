import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, Brain, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CandlestickChart from '@/components/CandlestickChart';

interface StockData {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  candlestickData: any[];
  lastUpdated: string;
}

interface PredictionData {
  predictionType: string;
  currentPrice: number;
  predictedPrice: number;
  priceChange: number;
  priceChangePercent: number;
  confidence: number;
  priceRange: { low: number; high: number };
  technicalIndicators: any;
  score: number;
  analysis: string;
  keyFactors?: string[];
}

interface SentimentData {
  sentiment_score: number;
  totalTweets: number;
  averageSentiment: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

const StockDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [predictions, setPredictions] = useState<{ [key: string]: PredictionData }>({});
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStockData();
  }, [symbol]);

  const fetchStockData = async () => {
    if (!symbol) return;
    
    try {
      setRefreshing(true);
      
      // Fetch stock data using direct HTTP call with query parameters
      const stockResponse = await fetch(`https://qvylszybrcoqhaauyesk.supabase.co/functions/v1/fetch-stock-data?symbol=${symbol}`);
      const stockResult = await stockResponse.json();
      
      if (!stockResponse.ok) throw new Error(stockResult.error || 'Failed to fetch stock data');
      setStockData(stockResult);
      
      // Fetch predictions from Python API
      const predictionTypes = ['1day', '1week', '1month'];
      const pythonApiUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:5000';
      
      const predictionPromises = predictionTypes.map(async (type) => {
        try {
          const predResponse = await fetch(`${pythonApiUrl}/predict`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              symbol: symbol,
              prediction_type: type
            })
          });
          
          const predResult = await predResponse.json();
          
          if (predResponse.ok && predResult && predResult.prediction) {
            // Transform Python API response to match frontend format
            return { 
              type, 
              data: {
                predictionType: type,
                currentPrice: predResult.current_price,
                predictedPrice: predResult.prediction.predicted_price,
                priceChange: predResult.prediction.predicted_price - predResult.current_price,
                priceChangePercent: ((predResult.prediction.predicted_price - predResult.current_price) / predResult.current_price) * 100,
                confidence: predResult.prediction.confidence,
                priceRange: predResult.prediction.price_range,
                technicalIndicators: predResult.prediction.technical_indicators,
                score: predResult.prediction.score,
                analysis: predResult.prediction.analysis,
                keyFactors: predResult.prediction.key_factors
              }
            };
          }
        } catch (error) {
          console.error(`Error fetching ${type} prediction from Python API:`, error);
        }
        return null;
      });
      
      const predictionResults = await Promise.all(predictionPromises);
      const predictionsObj: { [key: string]: PredictionData } = {};
      predictionResults.forEach(result => {
        if (result) {
          predictionsObj[result.type] = result.data;
        }
      });
      setPredictions(predictionsObj);
      
      // Fetch sentiment using direct HTTP call
      try {
        const sentimentResponse = await fetch(`https://qvylszybrcoqhaauyesk.supabase.co/functions/v1/twitter-sentiment?symbol=${symbol}`);
        const sentimentResult = await sentimentResponse.json();
        
        if (sentimentResponse.ok && sentimentResult) {
          setSentiment(sentimentResult);
        }
      } catch (error) {
        console.error('Error fetching sentiment:', error);
      }
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading {symbol} data...</p>
        </div>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No data available for {symbol}</p>
          <Button onClick={() => navigate('/search')} className="mt-4">
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  const getSentimentColor = (score: number) => {
    if (score > 0.2) return 'text-success';
    if (score < -0.2) return 'text-danger';
    return 'text-muted-foreground';
  };

  const getPredictionColor = (change: number) => {
    return change >= 0 ? 'text-success' : 'text-danger';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/search')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{stockData.symbol}</h1>
                <p className="text-muted-foreground">Real-time data & AI predictions</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchStockData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stock Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground">{stockData.symbol}</h2>
              <p className="text-lg text-muted-foreground">Real-time stock data</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-foreground">₹{stockData.currentPrice.toFixed(2)}</div>
              <div className={`text-lg font-medium flex items-center justify-end gap-2 ${stockData.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stockData.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {stockData.change >= 0 ? '+' : ''}₹{stockData.change.toFixed(2)} ({stockData.changePercent >= 0 ? '+' : ''}{stockData.changePercent.toFixed(2)}%)
              </div>
              <p className="text-sm text-muted-foreground">1D</p>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Volume</div>
            <div className="text-lg font-semibold">{stockData.volume?.toLocaleString() || 'N/A'}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Market Cap</div>
            <div className="text-lg font-semibold">{stockData.marketCap ? `₹${(stockData.marketCap / 1e9).toFixed(2)}B` : 'N/A'}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Sentiment</div>
            <div className={`text-lg font-semibold ${sentiment ? getSentimentColor(sentiment.sentiment_score) : ''}`}>
              {sentiment ? `${sentiment.sentiment_score > 0 ? '+' : ''}${(sentiment.sentiment_score * 100).toFixed(1)}%` : 'Loading...'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Previous Close</div>
            <div className="text-lg font-semibold">₹{stockData.previousClose.toFixed(2)}</div>
          </Card>
        </div>

        {/* Chart */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <CandlestickChart 
              data={stockData.candlestickData} 
              symbol={stockData.symbol}
              height={400}
            />
          </CardContent>
        </Card>

        {/* AI Predictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Price Predictions
            </CardTitle>
            <CardDescription>
              Advanced predictions based on historical patterns and market sentiment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['1day', '1week', '1month'].map((timeframe) => {
                const prediction = predictions[timeframe];
                if (!prediction) {
                  return (
                    <div key={timeframe} className="text-center p-4 border border-border rounded-lg">
                      <h3 className="font-semibold mb-2">{timeframe}</h3>
                      <p className="text-sm text-muted-foreground">Loading prediction...</p>
                    </div>
                  );
                }

                return (
                  <div key={timeframe} className="p-4 border border-border rounded-lg">
                    <h3 className="font-semibold mb-3">{timeframe.toUpperCase()} Prediction</h3>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Current Price:</span>
                        <span className="font-medium">${prediction.currentPrice.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Predicted Price:</span>
                        <span className="font-medium">${prediction.predictedPrice.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Change:</span>
                        <span className={`font-medium ${getPredictionColor(prediction.priceChange)}`}>
                          {prediction.priceChange >= 0 ? '+' : ''}${prediction.priceChange.toFixed(2)}
                          ({prediction.priceChangePercent >= 0 ? '+' : ''}{prediction.priceChangePercent.toFixed(2)}%)
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Score:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${prediction.score >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.abs(prediction.score / 100) * 100}%` }}
                            />
                          </div>
                          <span className={`font-medium ${prediction.score >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {prediction.score > 0 ? '+' : ''}{prediction.score}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Confidence:</span>
                        <Badge variant={prediction.confidence > 70 ? 'default' : 'secondary'}>
                          {prediction.confidence}%
                        </Badge>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                          Range: ${prediction.priceRange.low.toFixed(2)} - ${prediction.priceRange.high.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {prediction.analysis}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Mathematical Prediction System</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Score-based</strong>: -100 (strong bearish) to +100 (strong bullish)</li>
                <li>• <strong>Trend Analysis</strong>: SMA crossovers & price position (30 pts)</li>
                <li>• <strong>Momentum</strong>: RSI & MACD signals (25 pts)</li>
                <li>• <strong>Volume & Volatility</strong>: Trading activity analysis (15 pts)</li>
                <li>• <strong>Sentiment</strong>: Twitter/social media analysis (20 pts)</li>
                <li>• <strong>Regression</strong>: Linear trend projection (10 pts)</li>
                <li>• <strong>Confidence</strong>: Based on signal alignment & volatility</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StockDetail;