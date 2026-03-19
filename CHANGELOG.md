# Changelog

All notable changes to DataMind AI are documented here.

## [3.0.0] - 2026-03-20

### Added

- Matplotlib + Seaborn chart generation on Python backend
- Correlation heatmap using Seaborn
- Distribution + Boxplot for numeric columns
- Scatter plot with regression line
- Area chart with gradient fill
- Charts returned as base64 images

### Changed

- Charts now rendered server-side (Python) instead of client-side (Recharts)
- Frontend displays PNG images from backend instead of JS chart components

### Fixed

- Backend 500 error caused by broken indentation in get_basic_stats
- Lux incompatibility with Pandas 3.0 — disabled with graceful fallback

## [2.0.0] - 2026-03-19

### Added

- Python Flask backend with Pandas analysis
- Lux integration attempt (later disabled due to Pandas 3.0 conflict)
- Correlation detection
- Trend analysis
- Outlier detection using IQR
- Skewness calculation
- Stats tab in frontend

### Changed

- Moved from Claude-only to Pandas + Claude hybrid approach

## [1.0.0] - 2026-03-18

### Added

- Initial React app with Vite
- Claude API integration for AI insights
- Recharts for frontend chart rendering
- CSV parsing in browser
- Sample datasets (Sales, Climate, App Metrics)
- Dark theme UI with DM Mono + Syne fonts
