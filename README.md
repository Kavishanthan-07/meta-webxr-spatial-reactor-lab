# Meta WebXR Spatial Reactor Lab

A small interactive WebXR prototype built using Meta Immersive Web SDK (IWSDK).

## Demo Goal

This project explores interaction patterns for Meta VR Glasses using:

- WebXR
- Meta IWSDK
- gaze targeting
- hand pinch interaction
- spatial object manipulation
- distance grabbing
- proximity-based snapping
- procedural Three.js geometry

## Experience

The user assembles a spatial energy reactor using three components:

1. Energy Core
2. Power Module
3. Control Module

Interaction flow:

Gaze at component
→ highlight
→ pinch/grab
→ move in 3D
→ place near matching socket
→ snap
→ reactor progress updates
→ reactor activates when complete

## Technologies

- Meta Immersive Web SDK
- WebXR
- Three.js
- TypeScript
- Vite
- IWER emulator

## Run Locally

```bash
npm install
npm run dev