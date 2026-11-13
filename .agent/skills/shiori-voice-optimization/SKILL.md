---
name: shiori-voice-optimization
description: Audit and optimize Shiori's existing TTS/STT/audio pipeline with repeatable benchmarks and quality gates. Use for voice latency, pronunciation, prosody, streaming audio, or provider issues.
---

# Shiori Voice Optimization

## Entry gate
First inspect the actual voice provider code, configuration, model files, audio post-processing, streaming path, and tests. Do not assume current paths, provider, hardware, or model configuration. Do not download models or install packages without approval.

## Baseline
Use the same fixed Vietnamese test corpus, hardware, provider, model, settings, and warm/cold-start conditions before and after a change. Include short and long sentences, punctuation, names, numbers, common mispronunciations, and repeated/streamed requests.

Measure where possible:
- time to first audio (TTFA)
- synthesis latency and real-time factor
- failure/empty-audio rate
- pronunciation correctness
- audio clipping, silence, chunk boundaries, and streaming continuity
- CPU/GPU/RAM use and model load time
- STT transcription consistency for repeated identical inputs

Keep raw measurements and environment/config details. Do not compare measurements from materially different setups as if they were equivalent.

## Change strategy
- Change one factor at a time for A/B tests: prosody, speaking rate, pitch, pauses, chunking, provider, or post-processing.
- Preserve the existing provider interface and callers unless the approved task explicitly allows an API change.
- Check all call sites and configuration defaults before editing.
- Add tests for boundary cases and regression behavior.
- Separate objective metrics from subjective listening judgments. For subjective quality, use a fixed rubric and blinded A/B listening when practical.
- Do not claim "more kawaii", "more natural", or "better pronunciation" without recorded evaluation evidence.
- Do not optimize latency by silently truncating text, skipping synthesis, dropping chunks, or lowering quality beyond approved thresholds.

## Release gate
A voice change is acceptable only if the target metric improves and no mandatory quality metric regresses beyond its agreed tolerance. If no quality thresholds exist, propose them in the plan and get approval before implementation.

## Report
Record exact config and code changes, corpus/version, environment, raw before/after metrics, failures, quality review, regression tests, and rollback instructions.
