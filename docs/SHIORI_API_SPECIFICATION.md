# SHIORI API Specification

## 1. Engine Interface Contract
Mọi engine chuyên biệt (`web-ad`, `youtube`, `redirect`, `privacy`) đều phải implement interface chuẩn:
- `initialize(config: EngineConfig): Promise<void>`
- `process(input: SignalInput): Promise<DetectionResult | null>`
- `destroy(): Promise<void>`
- `getHealth(): EngineHealth`

## 2. Decision Engine Interface
- `evaluate(signals: SignalInput[]): Promise<DetectionResult>`
- `applyPolicy(result: DetectionResult): ResolvedAction`
