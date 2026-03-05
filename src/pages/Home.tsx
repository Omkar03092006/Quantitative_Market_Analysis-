import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, TrendingUp } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  // Popular stocks for quick access
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">StockWatch</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="mb-8 max-w-md mx-auto">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/search')}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Search className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <CardTitle className="text-lg">Search Stocks</CardTitle>
                <CardDescription>Find and analyze any stock with AI predictions</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Popular Stocks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Popular Stocks
            </CardTitle>
            <CardDescription>
              Quick access to frequently searched stocks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {popularStocks.map((stock) => (
                <Button
                  key={stock.symbol}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/stock/${stock.symbol}`)}
                >
                  <span className="font-semibold text-lg">{stock.symbol}</span>
                  <span className="text-sm text-muted-foreground text-left">
                    {stock.name}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Home;