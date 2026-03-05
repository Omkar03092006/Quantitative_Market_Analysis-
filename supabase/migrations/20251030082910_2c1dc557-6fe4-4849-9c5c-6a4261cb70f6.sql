-- First, remove any duplicate rows, keeping only the most recent one for each symbol
DELETE FROM stock_data a
USING stock_data b
WHERE a.symbol = b.symbol 
  AND a.last_updated < b.last_updated;

-- Add unique constraint on symbol column
ALTER TABLE stock_data 
ADD CONSTRAINT stock_data_symbol_key UNIQUE (symbol);