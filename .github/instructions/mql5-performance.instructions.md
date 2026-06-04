---
name: "MQL5 Performance Scripts"
description: "Use when: writing MQL5 trading algorithms. Ensures strict performance optimization, minimal allocations, and efficient indicator usage."
applyTo: "**/*.mq5"
---

# MQL5 Performance Optimization

## Memory & Allocation
- Declare arrays at class level to avoid repeated allocations
- Use fixed-size buffers; pre-allocate `ArraySetAsSeries()` once at init
- Avoid string concatenation in tick handlers; use `StringFormat()` sparingly

## Indicator Optimization
```mql5
// ✓ Good: Declare handles globally, reuse
int maHandle;
void OnInit() {
  maHandle = iMA(_Symbol, _Period, 20, 0, MODE_SMA, PRICE_CLOSE);
}

void OnTick() {
  double ma[]; CopyBuffer(maHandle, 0, 0, 1, ma);
}

// ✗ Avoid: Creating handles every tick
void OnTick() {
  int handle = iMA(_Symbol, _Period, 20, 0, MODE_SMA, PRICE_CLOSE);
}
```

## Tick Processing Performance Target
- Keep OnTick() execution under 10ms
- Use `ArrayCopy()` for buffer operations instead of loops where possible
- Cache `Ask/Bid` values; don't call repeatedly

## Order Management
- Batch pending orders; avoid firing on every tick
- Implement exponential backoff for rejected orders
- Log order errors with timestamps and context

---
