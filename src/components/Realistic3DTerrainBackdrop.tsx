import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Realistic3DTerrainBackdropProps {
  lat: number;
  lng: number;
  pitch: number;
  roll: number;
  heading: number;
  altitude: number;
  speed: number;
  timeEnv: 'DAY' | 'SUNSET' | 'NIGHT_NVG';
  terrainSource: 'MAPBOX_SATELLITE' | 'ESRI_REAL_3D' | 'GOOGLE_SATELLITE' | 'OPEN_TOPO';
}

export const Realistic3DTerrainBackdrop: React.FC<Realistic3DTerrainBackdropProps> = ({
  lat,
  lng,
  pitch,
  roll,
  heading,
  altitude,
  speed,
  timeEnv,
  terrainSource = 'ESRI_REAL_3D'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize high-resolution WebGL / Slippy Map Canvas
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: Math.max(8, Math.min(17, Math.round(18 - Math.log2(Math.max(1000, altitude) / 500)))),
        zoomControl: false,
        attributionControl: false,
        keyboard: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        fadeAnimation: true,
        inertia: false
      });

      // Map Provider Tile Sources (Full photorealistic satellite imagery)
      let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      let maxZoom = 19;

      if (terrainSource === 'GOOGLE_SATELLITE') {
        tileUrl = 'https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}';
      } else if (terrainSource === 'OPEN_TOPO') {
        tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      } else if (terrainSource === 'MAPBOX_SATELLITE') {
        // High-res USGS imagery / ESRI Clarity
        tileUrl = 'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      }

      const layer = L.tileLayer(tileUrl, {
        maxZoom: maxZoom,
        subdomains: ['a', 'b', 'c']
      }).addTo(map);

      tileLayerRef.current = layer;
      mapInstanceRef.current = map;

      // Force instant tile recalculation so no grey/clipped edges appear
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 400);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [terrainSource]);

  // Dynamically pan & sync zoom based on GPS lat/lng and altitude
  useEffect(() => {
    if (mapInstanceRef.current) {
      // Calculate dynamic camera altitude to zoom level
      const targetZoom = Math.max(8, Math.min(16, Math.round(17 - Math.log2(Math.max(1000, altitude) / 800))));
      mapInstanceRef.current.setView([lat, lng], targetZoom, { animate: false });
      mapInstanceRef.current.invalidateSize();
    }
  }, [lat, lng, altitude]);

  // CSS 3D Perspective Matrix transformation calculations
  // Pitch tilts the horizon, Roll rotates, Heading rotates camera azimuth, Altitude changes focal scale
  const perspectivePitchDeg = Math.min(82, Math.max(20, 52 + pitch * 1.6));
  const perspectiveRollDeg = -roll;
  const perspectiveHeadingDeg = -heading;

  // Lighting & Atmospheric shaders
  const getFilterStyle = () => {
    if (timeEnv === 'NIGHT_NVG') {
      return 'brightness(0.9) contrast(1.7) saturate(1.8) hue-rotate(85deg) invert(0.08) drop-shadow(0 0 10px #10b981)';
    } else if (timeEnv === 'SUNSET') {
      return 'brightness(0.85) contrast(1.2) sepia(0.55) saturate(1.6) hue-rotate(-20deg)';
    } else {
      // DAY CLEAR REALISTIC
      return 'brightness(1.05) contrast(1.15) saturate(1.25)';
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      
      {/* 1. ATMOSPHERIC SKY & HORIZON LAYER */}
      <div 
        className="absolute inset-0 w-full h-full z-0 transition-colors duration-500"
        style={{
          background: timeEnv === 'NIGHT_NVG' 
            ? 'linear-gradient(to bottom, #021207 0%, #062b14 45%, #0e4c25 65%, #051a0d 100%)'
            : (timeEnv === 'SUNSET'
              ? 'linear-gradient(to bottom, #110726 0%, #3b1342 35%, #91352e 60%, #e07222 75%, #fbb438 85%, #2a1b14 100%)'
              : 'linear-gradient(to bottom, #0b2545 0%, #134074 30%, #4482b5 55%, #8ecae6 75%, #d0ebf7 85%, #183820 100%)')
        }}
      />

      {/* 2. REALISTIC 3D PERSPECTIVE TERRAIN PROJECTION STAGE (FULL SCREEN OVERSAMPLED CANVAS - NO CLIPPING) */}
      <div 
        className="absolute inset-0 w-full h-full flex items-center justify-center origin-center"
        style={{
          perspective: '550px',
          perspectiveOrigin: '50% 60%'
        }}
      >
        <div
          className="relative transition-transform duration-75 ease-linear will-change-transform"
          style={{
            width: '450%',
            height: '450%',
            transformOrigin: '50% 50%',
            transform: `translateY(22%) rotateX(${perspectivePitchDeg}deg) rotateZ(${perspectiveRollDeg}deg) rotate(${perspectiveHeadingDeg}deg) scale(1.35)`,
            filter: getFilterStyle()
          }}
        >
          <div 
            ref={mapContainerRef} 
            className="w-full h-full bg-[#0a1829]"
          />
        </div>
      </div>

      {/* 3. ATMOSPHERIC HAZE & DEPTH FOG GRADIENT (BLENDS HORIZON SEAMLESSLY) */}
      <div 
        className="absolute inset-0 pointer-events-none z-1"
        style={{
          background: timeEnv === 'NIGHT_NVG'
            ? 'linear-gradient(to bottom, rgba(2,18,7,0.85) 0%, rgba(6,43,20,0.4) 40%, rgba(6,43,20,0.1) 60%, rgba(2,18,7,0.7) 100%)'
            : (timeEnv === 'SUNSET'
              ? 'linear-gradient(to bottom, rgba(17,7,38,0.7) 0%, rgba(224,114,34,0.45) 50%, rgba(251,180,56,0.15) 65%, rgba(20,10,5,0.75) 100%)'
              : 'linear-gradient(to bottom, rgba(11,37,69,0.7) 0%, rgba(142,202,230,0.35) 48%, rgba(208,235,247,0.15) 62%, rgba(10,25,15,0.65) 100%)')
        }}
      />

      {/* 4. CLOUD SHADOWS & PASSING VAPOR EFFECT */}
      <div 
        className="absolute inset-0 pointer-events-none z-2 opacity-30 mix-blend-overlay animate-pulse"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, transparent 60%)',
          backgroundSize: '180% 180%'
        }}
      />

      {/* 5. NIGHT NVG NOISE & SCANLINE SHADER (IF NVG MODE) */}
      {timeEnv === 'NIGHT_NVG' && (
        <div 
          className="absolute inset-0 pointer-events-none z-3 opacity-25"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3) 1px, transparent 1px, transparent 3px)'
          }}
        />
      )}

    </div>
  );
};
