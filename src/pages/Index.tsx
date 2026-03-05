import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Brain, Shield, BarChart3 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="mb-8">
            <TrendingUp className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              StockWatch
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Advanced stock analysis platform with predictions, real-time data, 
              and sentiment analysis tools.
            </p>
          </div>
          
          <div className="flex justify-center mb-12">
            <Button size="lg" onClick={() => navigate('/home')} className="bg-primary hover:bg-primary/90">
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>AI Predictions</CardTitle>
                <CardDescription>
                  Advanced TensorFlow LSTM models for accurate stock price forecasting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get predictions for 30 minutes, 1 hour, and 1 day intervals
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Real-Time Data</CardTitle>
                <CardDescription>
                  Live stock prices and market data powered by Yahoo Finance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Stay updated with trending stocks and market movements
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Sentiment Analysis</CardTitle>
                <CardDescription>
                  Social media sentiment tracking from Twitter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Real-time sentiment scores to gauge market mood
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-6">Secure & Reliable</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your data is protected with enterprise-grade security. Start exploring stock predictions 
            and market analysis with our powerful AI tools.
          </p>
          <Button size="lg" onClick={() => navigate('/home')}>
            Start Analyzing Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
