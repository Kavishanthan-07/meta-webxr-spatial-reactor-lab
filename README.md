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
```

## Demo Media and Licensing

The 360 gallery is available at `?demo=video` and loads local files from
`public/videos/`.

### Nature 360

Source: Pixabay  
Creator: JosephSenior  
Source URL: https://pixabay.com/videos/aerial-view-wilderness-land-skyline-110941/  
License: Pixabay Content License

### City 360

Source: Pixabay  
Creator: Galaxy7894  
Source URL: https://pixabay.com/videos/footage-drone-flying-shot-110116/  
License: Pixabay Content License

### Space 360

Source: Pixabay  
Creator: ChristianBodhi  
Source URL: https://pixabay.com/videos/earth-galaxy-stars-globe-universe-64349/  
License: Pixabay Content License