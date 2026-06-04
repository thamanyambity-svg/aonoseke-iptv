---
name: "Python Data Integration"
description: "Use when: writing Python for complex data pipelines, ETL workflows, or data analysis. Focus on async operations, type safety, and integration patterns."
applyTo: "**/*.py"
---

# Python Data Integration Workflows

## Type Safety & Validation
```python
from typing import AsyncIterator
from pydantic import BaseModel, Field, validator

class DataRecord(BaseModel):
    id: int = Field(..., gt=0)
    timestamp: datetime
    value: float = Field(..., gt=-273.15)  # Celsius
    
    @validator('timestamp')
    def timestamp_not_future(cls, v):
        if v > datetime.now():
            raise ValueError('Timestamp cannot be in future')
        return v
```

## Async Data Pipelines
```python
import asyncio
import aiohttp

async def fetch_batch(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [session.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        return [await r.json() for r in responses]
```

## Pandas/Polars for Data Manipulation
- Use Polars for large datasets (faster, eager evaluation)
- Vectorize operations; avoid iterrows()
- Chain operations with `.select()`, `.filter()`, `.with_columns()`

```python
import polars as pl

df = pl.read_csv('data.csv')
result = (df
    .filter(pl.col('status') == 'active')
    .with_columns(pl.col('value') * 2)
    .sort('timestamp', descending=True)
)
```

## Error Handling & Logging
- Use structured logging (json format for parsing)
- Implement retry logic with exponential backoff
- Log exceptions with full context (input, state, stack trace)

```python
import logging
logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s')

async def resilient_fetch(url: str, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as resp:
                    return await resp.json()
        except Exception as e:
            wait = 2 ** attempt
            logging.warning(f"Attempt {attempt+1} failed, retrying in {wait}s: {e}")
            await asyncio.sleep(wait)
    raise RuntimeError(f"Failed to fetch {url} after {retries} attempts")
```

## Testing
```python
import pytest

@pytest.mark.asyncio
async def test_data_pipeline():
    result = await fetch_batch(['http://example.com/api/1'])
    assert isinstance(result, list)
    assert len(result) > 0
```

---
