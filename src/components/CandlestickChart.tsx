import { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  symbol: string;
  height?: number;
}

const CandlestickChart = ({ data, symbol, height = 400 }: CandlestickChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Generate mock data if no data provided or empty
    let chartData = data;
    if (!data || data.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      chartData = Array.from({ length: 30 }, (_, i) => {
        const time = now - (30 - i) * 24 * 60 * 60; // Daily data for 30 days
        const price = 100 + Math.random() * 50; // Random price around 100-150
        const variation = (Math.random() - 0.5) * 10;
        return {
          time,
          open: price,
          high: price + Math.abs(variation) + Math.random() * 5,
          low: price - Math.abs(variation) - Math.random() * 5,
          close: price + variation,
          volume: Math.floor(Math.random() * 1000000) + 500000
        };
      });
    }

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d5db',
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#485563',
      },
      timeScale: {
        borderColor: '#485563',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });

    // Format data for the chart - ensure time is a proper timestamp or date string
    const formattedData = chartData.map(item => ({
      time: item.time as any, // Cast to any to avoid type issues
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candlestickSeries.setData(formattedData);

    // Add volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#64748b',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    const volumeData = chartData.map(item => ({
      time: item.time as any, // Cast to any to avoid type issues
      value: item.volume,
      color: item.close >= item.open ? '#22c55e' : '#ef4444',
    }));

    volumeSeries.setData(volumeData);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height, symbol]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{symbol} Price Chart</h3>
        <p className="text-sm text-muted-foreground">Real-time candlestick chart with volume</p>
      </div>
      <div 
        ref={chartContainerRef} 
        className="w-full bg-card border border-border rounded-lg"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};

export default CandlestickChart;