








from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv
import math

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)


class StockPredictor:
    """
    Pure Python stock prediction engine using mathematical formulas.
    100-point scoring system for transparent, explainable predictions.
    """
    
    def __init__(self, data, sentiment_score=0):
        """
        Initialize predictor with historical candlestick data and sentiment.
        
        Args:
            data: List of candlestick dictionaries with 'close', 'high', 'low', 'volume'
            sentiment_score: Sentiment score from -100 to +100
        """
        self.data = data
        self.sentiment_score = sentiment_score
        self.closes = [d['close'] for d in data]
        self.highs = [d['high'] for d in data]
        self.lows = [d['low'] for d in data]
        self.volumes = [d['volume'] for d in data]
        self.current_price = self.closes[-1]

    def calculate_sma(self, period):
        """
        Calculate Simple Moving Average.
        Formula: SMA = sum(prices[-period:]) / period
        """
        if len(self.closes) < period:
            return self.closes[-1]
        return sum(self.closes[-period:]) / period

    def calculate_ema(self, period):
        """
        Calculate Exponential Moving Average.
        Formula: EMA = price × K + EMA(prev) × (1-K), where K = 2/(period+1)
        """
        if len(self.closes) < period:
            return self.closes[-1]
        
        multiplier = 2 / (period + 1)
        ema = self.closes[0]
        
        for price in self.closes[1:]:
            ema = (price - ema) * multiplier + ema
        
        return ema

    def calculate_rsi(self, period=14):
        """
        Calculate Relative Strength Index.
        Formula: RSI = 100 - (100 / (1 + RS)), where RS = avg_gain / avg_loss
        
        Returns:
            RSI value between 0-100
            < 30: Oversold (potential buy signal)
            > 70: Overbought (potential sell signal)
        """
        if len(self.closes) < period + 1:
            return 50
        
        deltas = [self.closes[i] - self.closes[i-1] for i in range(1, len(self.closes))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi

    def calculate_macd(self):
        """
        Calculate MACD (Moving Average Convergence Divergence).
        
        Formula:
            MACD Line = EMA(12) - EMA(26)
            Signal Line = EMA(9) of MACD Line
            Histogram = MACD Line - Signal Line
        
        Returns:
            Dictionary with 'macd', 'signal', 'histogram'
        """
        ema_12 = self.calculate_ema(12)
        ema_26 = self.calculate_ema(26)
        
        macd_line = ema_12 - ema_26
        
        # Calculate signal line (9-day EMA of MACD)
        macd_values = []
        for i in range(26, len(self.closes)):
            temp_data = self.closes[:i+1]
            temp_ema_12 = self._calculate_ema_for_list(temp_data, 12)
            temp_ema_26 = self._calculate_ema_for_list(temp_data, 26)
            macd_values.append(temp_ema_12 - temp_ema_26)
        
        if len(macd_values) >= 9:
            signal_line = self._calculate_ema_for_list(macd_values, 9)
        else:
            signal_line = macd_line
        
        histogram = macd_line - signal_line
        
        return {
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        }

    def _calculate_ema_for_list(self, data, period):
        """Helper function to calculate EMA for a given list."""
        if len(data) < period:
            return data[-1]
        
        multiplier = 2 / (period + 1)
        ema = data[0]
        
        for price in data[1:]:
            ema = (price - ema) * multiplier + ema
        
        return ema

    def calculate_volatility(self):
        """
        Calculate price volatility using standard deviation.
        Formula: σ = sqrt(sum((x - mean)²) / n)
        
        Returns:
            Standard deviation of closing prices
        """
        if len(self.closes) < 2:
            return 0
        
        mean = sum(self.closes) / len(self.closes)
        variance = sum((x - mean) ** 2 for x in self.closes) / len(self.closes)
        std_dev = math.sqrt(variance)
        
        return std_dev

    def calculate_linear_regression(self):
        """
        Calculate linear regression for trend analysis.
        
        Formula:
            slope = sum((x - x_mean)(y - y_mean)) / sum((x - x_mean)²)
            intercept = y_mean - slope × x_mean
        
        Returns:
            Dictionary with 'slope', 'intercept', 'projected'
        """
        n = len(self.closes)
        x = list(range(n))
        y = self.closes
        
        x_mean = sum(x) / n
        y_mean = sum(y) / n
        
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return {'slope': 0, 'intercept': y_mean, 'projected': y_mean}
        
        slope = numerator / denominator
        intercept = y_mean - slope * x_mean
        
        return {
            'slope': slope,
            'intercept': intercept,
            'projected': slope * n + intercept
        }

    def calculate_trend_score(self):
        """
        Calculate trend score based on moving averages.
        
        Scoring (0-50 points):
            - Price > SMA(20): +15 points
            - Price > SMA(50): +15 points
            - SMA(20) > SMA(50): +10 points (Golden Cross)
            - Price > EMA(12): +10 points
        
        Returns:
            Trend score (0-50)
        """
        sma_20 = self.calculate_sma(20)
        sma_50 = self.calculate_sma(50)
        ema_12 = self.calculate_ema(12)
        
        score = 0
        
        # Price vs SMA
        if self.current_price > sma_20:
            score += 15
        if self.current_price > sma_50:
            score += 15
        
        # SMA relationship (Golden Cross indicator)
        if sma_20 > sma_50:
            score += 10
        
        # EMA trend
        if self.current_price > ema_12:
            score += 10
        
        return min(score, 50)

    def calculate_momentum_score(self):
        """
        Calculate momentum score based on RSI and MACD.
        
        Scoring (-20 to +30 points):
        
        RSI Scoring:
            - RSI 40-60 (neutral): +10 points
            - RSI 30-40 or 60-70 (moderate): +15 points
            - RSI < 30 (oversold): +20 points (buy signal)
            - RSI > 70 (overbought): -10 points (sell signal)
        
        MACD Scoring:
            - Histogram > 0: +15 points (positive momentum)
            - MACD > Signal: +10 points (bullish crossover)
        
        Returns:
            Momentum score (-20 to +30)
        """
        rsi = self.calculate_rsi()
        macd = self.calculate_macd()
        
        score = 0
        
        # RSI scoring
        if 40 <= rsi <= 60:
            score += 10
        elif 30 <= rsi < 40 or 60 < rsi <= 70:
            score += 15
        elif rsi < 30:
            score += 20  # Oversold - strong buy signal
        elif rsi > 70:
            score -= 10  # Overbought - sell signal
        
        # MACD scoring
        if macd['histogram'] > 0:
            score += 15
        if macd['macd'] > macd['signal']:
            score += 10
        
        return min(max(score, -20), 30)

    def calculate_volume_score(self):
        """
        Calculate volume score based on volume trends.
        
        Scoring (0-10 points):
            - Volume > 1.5× avg: +10 points (strong volume)
            - Volume > avg: +5 points (above average)
        
        Returns:
            Volume score (0-10)
        """
        if len(self.volumes) < 20:
            return 0
        
        avg_volume = sum(self.volumes[-20:]) / 20
        current_volume = self.volumes[-1]
        
        score = 0
        
        if current_volume > avg_volume * 1.5:
            score += 10
        elif current_volume > avg_volume:
            score += 5
        
        return min(score, 10)

    def calculate_sentiment_score(self):
        """
        Calculate sentiment score contribution.
        
        Sentiment is weighted at 20% of total prediction.
        Formula: sentiment_score × 0.1
        
        Returns:
            Sentiment contribution to total score
        """
        return self.sentiment_score * 0.1

    def calculate_regression_score(self):
        """
        Calculate regression-based trend score.
        
        Scoring (-10 to +10 points):
            - Positive slope: up to +10 points (upward trend)
            - Negative slope: up to -10 points (downward trend)
        
        Returns:
            Regression score (-10 to +10)
        """
        regression = self.calculate_linear_regression()
        slope = regression['slope']
        
        score = 0
        
        if slope > 0:
            score += min(slope * 100, 10)
        else:
            score += max(slope * 100, -10)
        
        return score

    def predict(self, prediction_type):
        """
        Generate comprehensive stock prediction using 100-point scoring system.
        
        Args:
            prediction_type: '1day', '1week', or '1month'
        
        Scoring Components (Total: 100 points):
            - Trend Score: 0-50 points (moving averages)
            - Momentum Score: -20 to +30 points (RSI, MACD)
            - Volume Score: 0-10 points (volume analysis)
            - Sentiment Score: variable (social sentiment, 20% weight)
            - Regression Score: -10 to +10 points (linear trend)
        
        Returns:
            Dictionary with prediction data including:
            - predicted_price: Calculated price prediction
            - confidence: Confidence level (35-95%)
            - price_range: Low/high price range
            - score: Total score
            - analysis: Text analysis
            - technical_indicators: All calculated indicators
            - components: Score breakdown by component
        """
        # Calculate all component scores
        trend_score = self.calculate_trend_score()
        momentum_score = self.calculate_momentum_score()
        volume_score = self.calculate_volume_score()
        sentiment_score = self.calculate_sentiment_score()
        regression_score = self.calculate_regression_score()
        
        # Total score (-100 to +100)
        total_score = trend_score + momentum_score + volume_score + sentiment_score + regression_score
        total_score = max(-100, min(100, total_score))
        
        # Calculate confidence (35-95%)
        rsi = self.calculate_rsi()
        volatility = self.calculate_volatility()
        
        confidence = 70  # Base confidence
        
        # Adjust confidence based on RSI extremes
        if rsi < 30 or rsi > 70:
            confidence += 10  # Higher confidence at extremes
        
        # Adjust confidence based on volatility
        volatility_ratio = volatility / self.current_price if self.current_price > 0 else 0
        if volatility_ratio < 0.02:
            confidence += 15  # Low volatility = higher confidence
        elif volatility_ratio > 0.05:
            confidence -= 20  # High volatility = lower confidence
        
        confidence = max(35, min(95, confidence))
        
        # Timeframe multipliers for price prediction
        timeframe_multipliers = {
            '1day': 0.01,    # 1% max movement
            '1week': 0.05,   # 5% max movement
            '1month': 0.15   # 15% max movement
        }
        multiplier = timeframe_multipliers.get(prediction_type, 0.05)
        
        # Calculate predicted price change
        base_change = (total_score / 100) * multiplier * self.current_price
        volatility_factor = volatility * multiplier * 2
        
        predicted_price = self.current_price + base_change
        price_range_low = predicted_price - volatility_factor
        price_range_high = predicted_price + volatility_factor
        
        # Generate analysis summary
        direction = "bullish" if total_score > 0 else "bearish" if total_score < 0 else "neutral"
        strength = "strong" if abs(total_score) > 50 else "moderate" if abs(total_score) > 25 else "weak"
        
        analysis = f"Technical analysis indicates a {strength} {direction} signal. "
        
        if trend_score > 25:
            analysis += "Strong upward trend detected. "
        elif trend_score < -25:
            analysis += "Strong downward trend detected. "
        
        if rsi < 30:
            analysis += "RSI suggests oversold conditions (potential buy opportunity). "
        elif rsi > 70:
            analysis += "RSI suggests overbought conditions (consider taking profits). "
        
        if sentiment_score > 5:
            analysis += "Positive market sentiment. "
        elif sentiment_score < -5:
            analysis += "Negative market sentiment. "
        
        # Key factors
        key_factors = []
        if abs(trend_score) > 20:
            key_factors.append(f"Trend: {trend_score:.1f}")
        if abs(momentum_score) > 15:
            key_factors.append(f"Momentum: {momentum_score:.1f}")
        if volume_score > 5:
            key_factors.append(f"Volume: {volume_score:.1f}")
        if abs(sentiment_score) > 3:
            key_factors.append(f"Sentiment: {sentiment_score:.1f}")
        if abs(regression_score) > 3:
            key_factors.append(f"Trend Projection: {regression_score:.1f}")
        
        # Technical indicators
        macd = self.calculate_macd()
        
        return {
            'predicted_price': round(predicted_price, 2),
            'confidence': round(confidence, 1),
            'price_range': {
                'low': round(price_range_low, 2),
                'high': round(price_range_high, 2)
            },
            'analysis': analysis.strip(),
            'key_factors': key_factors,
            'score': round(total_score, 1),
            'technical_indicators': {
                'rsi': round(rsi, 2),
                'macd': round(macd['macd'], 2),
                'signal': round(macd['signal'], 2),
                'histogram': round(macd['histogram'], 2),
                'sma_20': round(self.calculate_sma(20), 2),
                'sma_50': round(self.calculate_sma(50), 2),
                'ema_12': round(self.calculate_ema(12), 2),
                'volatility': round(volatility, 2)
            },
            'components': {
                'trend': round(trend_score, 1),
                'momentum': round(momentum_score, 1),
                'volume': round(volume_score, 1),
                'sentiment': round(sentiment_score, 1),
                'regression': round(regression_score, 1)
            }
        }


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify API is running."""
    return jsonify({
        'status': 'healthy',
        'service': 'stock-prediction-api',
        'version': '2.0',
        'engine': 'Pure Python with mathematical formulas'
    })


@app.route('/predict', methods=['POST'])
def predict_stock():
    """
    Main prediction endpoint using 100-point scoring system.
    
    Request Body:
        {
            "symbol": "AAPL",
            "prediction_type": "1day" | "1week" | "1month"
        }
    
    Response:
        {
            "symbol": "AAPL",
            "prediction_type": "1day",
            "current_price": 180.00,
            "prediction": { ... },
            "timestamp": "2025-01-18T12:00:00Z"
        }
    """
    try:
        data = request.get_json()
        symbol = data.get('symbol')
        prediction_type = data.get('prediction_type', '1week')
        
        if not symbol:
            return jsonify({'error': 'Symbol is required'}), 400
        
        if prediction_type not in ['1day', '1week', '1month']:
            return jsonify({'error': 'Invalid prediction type. Use: 1day, 1week, or 1month'}), 400
        
        print(f"📊 Processing prediction for {symbol} ({prediction_type})")
        
        # Fetch stock data from Supabase
        stock_response = supabase.table('stock_data').select('*').eq('symbol', symbol).order('created_at', desc=True).limit(1).execute()
        
        if not stock_response.data:
            return jsonify({'error': f'Stock data not found for {symbol}. Try searching for it first.'}), 404
        
        stock_data = stock_response.data[0]
        candlestick_data = stock_data.get('candlestick_data', [])
        
        if len(candlestick_data) < 20:
            return jsonify({'error': f'Insufficient historical data for {symbol}. Need at least 20 data points.'}), 400
        
        # Fetch sentiment data
        sentiment_response = supabase.table('twitter_sentiment').select('*').eq('symbol', symbol).order('created_at', desc=True).limit(1).execute()
        
        sentiment_score = 0
        if sentiment_response.data:
            sentiment_score = sentiment_response.data[0].get('sentiment_score', 0)
        
        print(f"✅ Loaded {len(candlestick_data)} data points | Sentiment: {sentiment_score}")
        
        # Create predictor and generate prediction
        predictor = StockPredictor(candlestick_data, sentiment_score)
        prediction = predictor.predict(prediction_type)
        
        print(f"🎯 Prediction: ${prediction['predicted_price']} | Confidence: {prediction['confidence']}% | Score: {prediction['score']}")
        
        return jsonify({
            'symbol': symbol,
            'prediction_type': prediction_type,
            'current_price': stock_data.get('current_price'),
            'prediction': prediction,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error in prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n🚀 StockWatch Prediction API starting on port {port}")
    print(f"📈 Engine: Pure Python with 100-point scoring system")
    print(f"🔧 Ready to process predictions!\n")
    app.run(host='0.0.0.0', port=port, debug=True)
