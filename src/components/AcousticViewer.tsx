import React, { useState, useRef, useEffect } from 'react';
import { TextEffect } from '@/components/ui/text-effect';

const AcousticViewer: React.FC = () => {
  const rooms = ['office', 'classroom', 'hospital', 'cinema'] as const;
  type RoomType = typeof rooms[number];
  
  const [currentRoomIndex, setCurrentRoomIndex] = useState<number>(0);
  const [wallsEnabled, setWallsEnabled] = useState<boolean>(false);
  const [ceilingEnabled, setCeilingEnabled] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [ambientEnabled, setAmbientEnabled] = useState<boolean>(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [videosPreloaded, setVideosPreloaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentRoom = rooms[currentRoomIndex];

  // Function to get the correct audio file based on room and panel state
const getAudioFile = (room: RoomType): string => {
  const roomCapitalized = room.charAt(0).toUpperCase() + room.slice(1);
  
  // Determine which audio file to use based on panel configuration
  if (!wallsEnabled && !ceilingEnabled) {
    // No panels = Echo + high dB
    return `./audio/${roomCapitalized}(echo+highdB).mp3`;
  } else if (!wallsEnabled && ceilingEnabled) {
    // Ceiling only = Echo + low dB
    return `./audio/${roomCapitalized}(echo+lowdB).mp3`;
  } else if (wallsEnabled && !ceilingEnabled) {
    // Wall only = No echo + high dB
    return `./audio/${roomCapitalized}(no-echo+highdB).mp3`;
  } else {
    // Both panels = No echo + low dB
    return `./audio/${roomCapitalized}(no-echo+lowdB).mp3`;
  }
};

// Get all transition videos for preloading
const getAllTransitionVideos = (): string[] => {
  const videos: string[] = [];
  const configs = [
    { walls: false, ceiling: false, suffix: '(No Panels)' },
    { walls: true, ceiling: false, suffix: '(No Ceiling)' },  // Capital C
    { walls: false, ceiling: true, suffix: '(No Wall)' },     
    { walls: true, ceiling: true, suffix: '' }
  ];

  const transitions = [
    ['office', 'classroom', 'Office to Classroom'],
    ['office', 'cinema', 'Office to Cinema'],
    ['classroom', 'office', 'Classroom to Office'],          // Capital O
    ['classroom', 'hospital', 'Classroom to Hospital'],      // Capital H
    ['hospital', 'classroom', 'Hospital to Classroom'],      // Capital C
    ['hospital', 'cinema', 'Hospital to Cinema'],
    ['cinema', 'hospital', 'Cinema to Hospital'],
    ['cinema', 'office', 'Cinema to Office']
  ];

  transitions.forEach(([from, to, name]) => {
    configs.forEach(config => {
      const fileName = config.suffix 
        ? `${name} ${config.suffix}.mp4`
        : `${name}.mp4`;
      videos.push(`./transitions/${fileName}`);
    });
  });

  return videos;
};

  // Handle audio playback when ambient is enabled or panel state changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audioFile = getAudioFile(currentRoom);
    
    if (ambientEnabled && audioFile) {
      // Set the audio source
      audioRef.current.src = audioFile;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.7; // Adjust volume as needed
      
      // Play the audio
      audioRef.current.play().catch(err => {
        console.error('Audio playback failed:', err);
      });
    } else {
      // Stop and reset audio
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [ambientEnabled, wallsEnabled, ceilingEnabled, currentRoom]);

  // Preload images
  useEffect(() => {
    const imagesToPreload = [
      './rooms/Office - no panels.jpg',
      './rooms/Office - no ceiling.jpg',
      './rooms/Office - no wall.jpg',
      './rooms/Office.jpg',
      './rooms/Classroom - no panels.jpg',
      './rooms/Classroom - no ceiling.jpg',
      './rooms/Classroom - no wall.jpg',
      './rooms/Classroom.jpg',
      './rooms/Hospital - no ceiling.jpg',
      './rooms/Hospital - no panels.jpg',
      './rooms/Hospital - no wall.jpg',
      './rooms/Hospital.jpg',
      './rooms/Cinema - no ceiling.jpg',
      './rooms/Cinema - no panels.jpg',
      './rooms/Cinema - no wall.jpg',
      './rooms/Cinema.jpg'
    ];

    let loadedCount = 0;
    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === imagesToPreload.length) {
          setImagesPreloaded(true);
        }
      };
    });
  }, []);

  useEffect(() => {
  // Preload all audio files
  const audioFiles = [
    './audio/Office(echo+highdB).mp3',
    './audio/Office(echo+lowdB).mp3',
    './audio/Office(no-echo+highdB).mp3',
    './audio/Office(no-echo+lowdB).mp3',
    './audio/Classroom(echo+highdB).mp3',
    './audio/Classroom(echo+lowdB).mp3',
    './audio/Classroom(no-echo+highdB).mp3',
    './audio/Classroom(no-echo+lowdB).mp3',
    './audio/Hospital(echo+highdB).mp3',
    './audio/Hospital(echo+lowdB).mp3',
    './audio/Hospital(no-echo+highdB).mp3',
    './audio/Hospital(no-echo+lowdB).mp3',
    './audio/Cinema(echo+highdB).mp3',
    './audio/Cinema(echo+lowdB).mp3',
    './audio/Cinema(no-echo+highdB).mp3',
    './audio/Cinema(no-echo+lowdB).mp3'
  ];

  audioFiles.forEach(src => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = src;
    audio.load();
  });
}, []);

  // Preload next video when room changes
  // Batch preload all transition videos
useEffect(() => {
  const allVideos = getAllTransitionVideos();
  const batchSize = 6;
  const delayBetweenBatches = 2000; // 2 seconds
  let batchIndex = 0;

  const loadBatch = () => {
    const batch = allVideos.slice(batchIndex, batchIndex + batchSize);
    
    if (batch.length === 0) {
      setVideosPreloaded(true);
      console.log('✅ All videos preloaded');
      return;
    }

    console.log(`📦 Preloading batch ${Math.floor(batchIndex / batchSize) + 1}: ${batch.length} videos`);
    
    let loadedInBatch = 0;
    
    batch.forEach(src => {
      const video = document.createElement('video');
      video.src = src;
      video.preload = 'auto';
      
      const onCanPlay = () => {
        loadedInBatch++;
        console.log(`✓ Loaded: ${src.split('/').pop()}`);
        
        if (loadedInBatch === batch.length) {
          batchIndex += batchSize;
          setTimeout(loadBatch, delayBetweenBatches);
        }
        
        video.removeEventListener('canplaythrough', onCanPlay);
        video.removeEventListener('error', onError);
      };
      
      const onError = () => {
        loadedInBatch++;
        console.error(`✗ Failed: ${src}`);
        
        if (loadedInBatch === batch.length) {
          batchIndex += batchSize;
          setTimeout(loadBatch, delayBetweenBatches);
        }
        
        video.removeEventListener('canplaythrough', onCanPlay);
        video.removeEventListener('error', onError);
      };
      
      video.addEventListener('canplaythrough', onCanPlay);
      video.addEventListener('error', onError);
      video.load();
    });
  };

  // Start preloading after a short delay to let images load first
  const timeout = setTimeout(loadBatch, 1000);
  
  return () => clearTimeout(timeout);
}, []);

  // Complete video mapping for all transition videos
  const getTransitionVideo = (fromRoom: RoomType, toRoom: RoomType): string => {
    const config = {
      walls: wallsEnabled,
      ceiling: ceilingEnabled
    };

    console.log(`🔍 Transition: ${fromRoom} → ${toRoom}, walls: ${config.walls}, ceiling: ${config.ceiling}`);

    // OFFICE TO CLASSROOM (4 videos)
    if (fromRoom === 'office' && toRoom === 'classroom') {
      if (!config.walls && !config.ceiling) {
        return './transitions/Office to Classroom (No Panels).mp4';
      } else if (config.walls && !config.ceiling) {
        return './transitions/Office to Classroom (No Ceiling).mp4';
      } else if (!config.walls && config.ceiling) {
        return './transitions/Office to Classroom (No Wall).mp4';
      } else {
        return './transitions/Office to Classroom.mp4';
      }
    }

    // OFFICE TO CINEMA (4 videos) - NEW
    if (fromRoom === 'office' && toRoom === 'cinema') {
      if (!config.walls && !config.ceiling) {
        return './transitions/Office to Cinema (No Panels).mp4';
      } else if (config.walls && !config.ceiling) {
        return './transitions/Office to Cinema (No Ceiling).mp4';
      } else if (!config.walls && config.ceiling) {
        return './transitions/Office to Cinema (No Wall).mp4';
      } else {
        return './transitions/Office to Cinema.mp4';
      }
    }

    // CLASSROOM TO OFFICE (4 videos)
    if (fromRoom === 'classroom' && toRoom === 'office') {
      if (!config.walls && !config.ceiling) {
        return './transitions/Classroom to Office (No Panels).mp4';
      } else if (config.walls && !config.ceiling) {
        return './transitions/Classroom to Office (No Ceiling).mp4';
      } else if (!config.walls && config.ceiling) {
        return './transitions/Classroom to Office (No Wall).mp4';
      } else {
        return './transitions/Classroom to Office.mp4';
      }
    }

    // CLASSROOM TO HOSPITAL (4 videos)
    if (fromRoom === 'classroom' && toRoom === 'hospital') {
      if (!config.walls && !config.ceiling) {
        return './transitions/Classroom to Hospital (No Panels).mp4';
      } else if (config.walls && !config.ceiling) {
        return './transitions/Classroom to Hospital (No Ceiling).mp4';
      } else if (!config.walls && config.ceiling) {
        return './transitions/Classroom to Hospital (No Wall).mp4';
      } else {
        return './transitions/Classroom to Hospital.mp4';
      }
    }

    // HOSPITAL TO CLASSROOM (4 videos)
    if (fromRoom === 'hospital' && toRoom === 'classroom') {
      if (!config.walls && !config.ceiling) {
        return './transitions/Hospital to Classroom (No Panels).mp4';
      } else if (config.walls && !config.ceiling) {
        return './transitions/Hospital to Classroom (No Ceiling).mp4';
      } else if (!config.walls && config.ceiling) {
        return './transitions/Hospital to Classroom (No Wall).mp4';
      } else {
        return './transitions/Hospital to Classroom.mp4';
      }
    }

    // HOSPITAL TO CINEMA (4 videos) - NEW
    if (fromRoom === 'hospital' && toRoom === 'cinema') {
      if (!config.walls && !config.ceiling) {
        return './transitions/Hospital to Cinema (No Panels).mp4';
      } else if (config.walls && !config.ceiling) {
        return './transitions/Hospital to Cinema (No Ceiling).mp4';
      } else if (!config.walls && config.ceiling) {
        return './transitions/Hospital to Cinema (No Wall).mp4';
      } else {
        return './transitions/Hospital to Cinema.mp4';
      }
    }

    // CINEMA TO HOSPITAL (4 videos) - NEW
    if (fromRoom === 'cinema' && toRoom === 'hospital') {
      if (!config.walls && !config.ceiling) {
        return './transitions/Cinema to Hospital (No Panels).mp4';
      } else if (config.walls && !config.ceiling) {
        return './transitions/Cinema to Hospital (No Ceiling).mp4';
      } else if (!config.walls && config.ceiling) {
        return './transitions/Cinema to Hospital (No Wall).mp4';
      } else {
        return './transitions/Cinema to Hospital.mp4';
      }
    }

    // CINEMA TO OFFICE (4 videos) - NEW
    if (fromRoom === 'cinema' && toRoom === 'office') {
      if (!config.walls && !config.ceiling) {
        return './transitions/Cinema to Office (No Panels).mp4';
      } else if (config.walls && !config.ceiling) {
        return './transitions/Cinema to Office (No Ceiling).mp4';
      } else if (!config.walls && config.ceiling) {
        return './transitions/Cinema to Office (No Wall).mp4';
      } else {
        return './transitions/Cinema to Office.mp4';
      }
    }

    // Fallback (should never reach here)
    return '';
  };

  // Preload video before transition with error handling
  const preloadAndPlayVideo = (videoSrc: string, targetIndex: number, isMobile: boolean = false) => {
    const video = isMobile ? mobileVideoRef.current : videoRef.current;
    if (!video) return;
    
    console.log(`[${isMobile ? 'MOBILE' : 'DESKTOP'}] Loading video: ${videoSrc}`);
    console.log(`Configuration - Walls: ${wallsEnabled}, Ceiling: ${ceilingEnabled}`);
    
    // Reset video state
    video.currentTime = 0;
    video.src = videoSrc;
    video.load();
    
    const errorHandler = () => {
      console.error(`[${isMobile ? 'MOBILE' : 'DESKTOP'}] FAILED to load: ${videoSrc}`);
      console.error('Check if file exists in ./transitions/ folder');
      setShowVideo(false);
      setIsTransitioning(false);
      video.removeEventListener('error', errorHandler);
      video.removeEventListener('loadeddata', loadedDataHandler);
    };
    
    // Use loadeddata instead of canplay for better reliability
    const loadedDataHandler = () => {
      console.log(`[${isMobile ? 'MOBILE' : 'DESKTOP'}] SUCCESS: Video data loaded`);
      
      // Start playing the video first
      video.play().then(() => {
        console.log(`[${isMobile ? 'MOBILE' : 'DESKTOP'}] Video playing`);
        // Only show video and change room after playback starts
        setShowVideo(true);
        setCurrentRoomIndex(targetIndex);
      }).catch(err => {
        console.error(`[${isMobile ? 'MOBILE' : 'DESKTOP'}] Video play error:`, err);
        setShowVideo(false);
        setIsTransitioning(false);
      });
      
      video.removeEventListener('loadeddata', loadedDataHandler);
      video.removeEventListener('error', errorHandler);
    };
    
    video.addEventListener('loadeddata', loadedDataHandler);
    video.addEventListener('error', errorHandler);
  };

  const switchToNextRoom = () => {
    if (isTransitioning) return;
    
    const nextIndex = (currentRoomIndex + 1) % rooms.length;
    const nextRoom = rooms[nextIndex];
    const videoSrc = getTransitionVideo(currentRoom, nextRoom);
    
    console.log(`Transitioning: ${currentRoom} → ${nextRoom}`);
    
    setIsTransitioning(true);
    
    // Detect if mobile
    const isMobile = window.innerWidth < 768;
    preloadAndPlayVideo(videoSrc, nextIndex, isMobile);
  };

  const switchToPrevRoom = () => {
    if (isTransitioning) return;
    
    const prevIndex = currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1;
    const prevRoom = rooms[prevIndex];
    const videoSrc = getTransitionVideo(currentRoom, prevRoom);
    
    console.log(`Transitioning: ${currentRoom} → ${prevRoom}`);
    
    setIsTransitioning(true);
    
    // Detect if mobile
    const isMobile = window.innerWidth < 768;
    preloadAndPlayVideo(videoSrc, prevIndex, isMobile);
  };

  const handleVideoEnded = () => {
    console.log('Video transition complete');
    setShowVideo(false);
    setVideoStarted(false);
    setIsTransitioning(false);
  };

  const getRoomImages = (room: RoomType) => {
    if (room === 'office') {
      return {
        noPanels: './rooms/Office - no panels.jpg',
        noCeilingPanels: './rooms/Office - no ceiling.jpg',
        noWallPanels: './rooms/Office - no wall.jpg',
        withPanels: './rooms/Office.jpg'
      };
    } else if (room === 'classroom') {
      return {
        noPanels: './rooms/Classroom - no panels.jpg',
        noCeilingPanels: './rooms/Classroom - no ceiling.jpg',
        noWallPanels: './rooms/Classroom - no wall.jpg',
        withPanels: './rooms/Classroom.jpg'
      };
    } else if (room === 'hospital') {
      return {
        noPanels: './rooms/Hospital - no panels.jpg',
        noCeilingPanels: './rooms/Hospital - no ceiling.jpg',
        noWallPanels: './rooms/Hospital - no wall.jpg',
        withPanels: './rooms/Hospital.jpg'
      };
    } else if (room === 'cinema') {
      return {
        noPanels: './rooms/Cinema - no panels.jpg',
        noCeilingPanels: './rooms/Cinema - no ceiling.jpg',
        noWallPanels: './rooms/Cinema - no wall.jpg',
        withPanels: './rooms/Cinema.jpg'
      };
    }
    return {
      noPanels: '',
      noCeilingPanels: '',
      noWallPanels: '',
      withPanels: ''
    };
  };

  const renderRoom = (room: RoomType) => {
    const images = getRoomImages(room);
    
    return (
      <div className="relative w-full h-full">
        <img
          src={images.noPanels}
          alt={`Base ${room}`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="sync"
          style={{ imageRendering: 'high-quality' }}
        />
        
        <div
          className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
            wallsEnabled ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={images.noCeilingPanels}
            alt={`${room} wall panels`}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="sync"
            style={{ imageRendering: 'high-quality' }}
          />
        </div>
        
        <div
          className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
            ceilingEnabled ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={images.noWallPanels}
            alt={`${room} ceiling panels`}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="sync"
            style={{ imageRendering: 'high-quality' }}
          />
        </div>
        
        <div
          className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
            (wallsEnabled && ceilingEnabled) ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={images.withPanels}
            alt={`${room} full panels`}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="sync"
            style={{ imageRendering: 'high-quality' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-hidden relative flex items-center justify-center bg-[#1a3a4a]">
      {/* Hidden audio element for soundscape */}
      <audio ref={audioRef} />
      
      {/* Background image with blur - fill entire screen */}
      <div 
        className="fixed inset-0 w-full h-full hidden md:block"
        style={{
          backgroundImage: 'url(./Background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(8px)'
        }}
      />
      
      {/* Mobile Background */}
      <div 
        className="fixed inset-0 w-full h-full md:hidden"
        style={{
          backgroundImage: 'url(./Background-Mobile.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(8px)'
        }}
      />
      
      {/* Overlay to darken background slightly */}
      <div className="fixed inset-0 bg-black/10" />

      {/* Desktop: Left Arrow Navigation Button */}
      <button
        onClick={switchToPrevRoom}
        disabled={isTransitioning}
        className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-50 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="relative w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm shadow-2xl border-2 border-white/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-[#407dd5] group-hover:shadow-[0_0_30px_rgba(64,125,213,0.5)]">
          <svg 
            className="w-7 h-7 text-gray-700 group-hover:text-white transition-all duration-300 group-hover:scale-125" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        
        <div className="absolute left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap">
          <div className="bg-gray-900/95 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-xl">
            <span className="bebas-neue text-sm tracking-wider">
              {rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1] === 'cinema' 
                ? 'CINEMA HALL' 
                : rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1].toUpperCase()}
            </span>
          </div>
          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-r-6 border-r-gray-900/95" />
        </div>
      </button>

      {/* Desktop: Right Arrow Navigation Button */}
      <button
        onClick={switchToNextRoom}
        disabled={isTransitioning}
        className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 z-50 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="relative w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm shadow-2xl border-2 border-white/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-[#407dd5] group-hover:shadow-[0_0_30px_rgba(64,125,213,0.5)]">
          <svg 
            className="w-7 h-7 text-gray-700 group-hover:text-white transition-all duration-300 group-hover:scale-125" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        
        <div className="absolute right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap">
          <div className="bg-gray-900/95 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-xl">
            <span className="bebas-neue text-sm tracking-wider">
              {rooms[(currentRoomIndex + 1) % rooms.length] === 'cinema' 
                ? 'CINEMA HALL' 
                : rooms[(currentRoomIndex + 1) % rooms.length].toUpperCase()}
            </span>
          </div>
          <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-l-6 border-l-gray-900/95" />
        </div>
      </button>
      
      <style>
  {`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body, html, #root {
      margin: 0;
      padding: 0;
      overflow: hidden;
      width: 100%;
      height: 100%;
      background: #1a3a4a;
    }
    
    .bebas-neue {
      font-family: "Bebas Neue", sans-serif;
    }
    
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(-50%) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(-50%) scale(1);
      }
    }
    
    .animate-fade-in {
      animation: fade-in 0.2s ease-out forwards;
    }

    /* Responsive container - keep original size */
    .responsive-container {
      width: 90vw;
      max-width: 1200px;
      min-width: 320px;
      aspect-ratio: 16 / 10;
      max-height: 85vh;
    }
    
    /* Desktop: Ensure proper sizing */
    @media screen and (min-width: 1024px) {
      .responsive-container {
        width: 85vw;
        max-width: 1000px;
      }
    }
    
    /* Large screens */
    @media screen and (min-width: 1440px) {
      .responsive-container {
        width: 80vw;
        max-width: 1100px;
      }
    }

    /* Give more space to room viewer - changed aspect ratio to 16:8 for taller image */
    .room-viewer {
      aspect-ratio: 16 / 8;
      width: 100%;
    }
    
    /* Compact control panel - reduced height significantly */
    .control-panel {
      height: calc(100% - (100% * 8 / 16));
      min-height: 80px; /* Reduced from 120px */
      max-height: 100px; /* Added max height */
    }
    
    /* Mobile adjustments */
    @media screen and (max-width: 1023px) {
      .responsive-container {
        width: 95vw;
        max-width: none;
        aspect-ratio: 4 / 3;
      }
      
      .room-viewer {
        aspect-ratio: 16 / 9;
      }
    }
    
    /* Prevent images from scaling */
    img {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  `}
</style>
      
      {/* Main responsive container */}
      <div className="responsive-container relative z-10 flex flex-col">

        {/* Room label - Desktop only */}
        <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 z-50 pointer-events-none" style={{ top: '-60px' }}>
          <div className="relative">
            <div className="relative bg-gradient-to-br from-[#5a89b8] via-[#6a99c8] to-[#7aa9d8] px-6 py-2.5 rounded-lg shadow-xl border-2 border-white/20">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <div className="absolute inset-0 rounded-lg shadow-[0_0_20px_rgba(64,125,213,0.3)]" />
              
              <div className="relative text-xl bebas-neue text-white tracking-[0.15em] whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                <TextEffect 
                  per='char' 
                  preset='blur'
                  key={currentRoom}
                  as='span'
                >
                  {currentRoom === 'cinema' ? 'CINEMA HALL' : currentRoom.toUpperCase()}
                </TextEffect>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Combined viewer and controls */}
        <div className="lg:hidden w-full flex flex-col">
          {/* Mobile Room Title */}
          <div className="mb-3 flex justify-center">
            <div className="relative">
              <div className="relative bg-gradient-to-br from-[#5a89b8] via-[#6a99c8] to-[#7aa9d8] px-6 py-3 rounded-xl shadow-2xl border-3 border-white/20">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
                
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-[#577bac] rounded-full border-2 border-white/30 shadow-lg" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#577bac] rounded-full border-2 border-white/30 shadow-lg" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-[#577bac] rounded-full border-2 border-white/30 shadow-lg" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#577bac] rounded-full border-2 border-white/30 shadow-lg" />

                <div className="absolute inset-0 rounded-xl shadow-[0_0_20px_rgba(64,125,213,0.4)]" />
                
                <div className="relative text-lg bebas-neue text-white tracking-[0.15em] whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                  <TextEffect 
                    per='char' 
                    preset='blur'
                    key={currentRoom}
                    as='span'
                  >
                    {currentRoom === 'cinema' ? 'CINEMA HALL' : currentRoom.toUpperCase()}
                  </TextEffect>
                </div>
              </div>
              
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-0.5 h-5 bg-gradient-to-b from-white/40 to-white/10 rounded-full" />
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white/30 rounded-full shadow-lg" />
            </div>
          </div>

          {/* Mobile Viewer and Control Panel */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl">
            {/* Room viewer with fixed 16:9 aspect ratio */}
            <div className="room-viewer relative bg-[#407dd5] overflow-hidden">
              
              <video
                ref={mobileVideoRef}
                className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${showVideo ? 'opacity-100 z-40' : 'opacity-0 -z-10'}`}
                onEnded={handleVideoEnded}
                onPlay={() => setVideoStarted(true)}
                playsInline
                webkit-playsinline="true"
                muted
                preload="auto"
                style={{ 
                  backgroundColor: 'transparent',
                  objectFit: 'cover',
                  imageRendering: 'high-quality',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)'
                }}
                disablePictureInPicture
                controlsList="nodownload"
                autoPlay={false}
              />

              <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${showVideo ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
                {renderRoom(currentRoom)}
              </div>
              
              <button className="absolute top-2 right-2 bg-gray-800/90 hover:bg-gray-900 text-white px-3 py-1.5 rounded text-xs transition-colors duration-200 flex items-center gap-2 z-40">
                <span className="bebas-neue tracking-wider">CLOSE</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Control Panel */}
            <div className="p-3 space-y-3">
              
              {/* Room Navigation */}
              <div>
                <div className="text-[0.65rem] bebas-neue tracking-widest text-gray-400 mb-2">ROOM NAVIGATION</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={switchToPrevRoom}
                    disabled={isTransitioning}
                    className="group relative px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-[#407dd5] hover:text-white transition-all duration-300 disabled:opacity-50 overflow-hidden"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    
                    <div className="flex items-center justify-center gap-1.5 relative z-10">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="bebas-neue text-xs tracking-wider">
                        {rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1] === 'cinema' 
                          ? 'CINEMA' 
                          : rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1].toUpperCase()}
                      </span>
                    </div>
                  </button>
                  
                  <button
                    onClick={switchToNextRoom}
                    disabled={isTransitioning}
                    className="group relative px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-[#407dd5] hover:text-white transition-all duration-300 disabled:opacity-50 overflow-hidden"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    
                    <div className="flex items-center justify-center gap-1.5 relative z-10">
                      <span className="bebas-neue text-xs tracking-wider">
                        {rooms[(currentRoomIndex + 1) % rooms.length] === 'cinema' 
                          ? 'CINEMA' 
                          : rooms[(currentRoomIndex + 1) % rooms.length].toUpperCase()}
                      </span>
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>

              {/* Acoustic Panels */}
              <div>
                <div className="text-[0.65rem] bebas-neue tracking-widest text-gray-400 mb-2">ACOUSTIC PANELS</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setWallsEnabled(!wallsEnabled)}
                    className={`group relative px-3 py-2.5 rounded-xl transition-all duration-300 overflow-hidden ${
                      wallsEnabled
                        ? 'bg-[#407dd5] text-white shadow-lg shadow-[#407dd5]/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    
                    <div className="flex flex-col items-center gap-1.5 relative z-10">
                      <div className={`transition-all ${wallsEnabled ? 'text-white' : 'text-gray-400'}`}>
                        {wallsEnabled ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <span className="bebas-neue text-xs tracking-wider">WALLS</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setCeilingEnabled(!ceilingEnabled)}
                    className={`group relative px-3 py-2.5 rounded-xl transition-all duration-300 overflow-hidden ${
                      ceilingEnabled
                        ? 'bg-[#407dd5] text-white shadow-lg shadow-[#407dd5]/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    
                    <div className="flex flex-col items-center gap-1.5 relative z-10">
                      <div className={`transition-all ${ceilingEnabled ? 'text-white' : 'text-gray-400'}`}>
                        {ceilingEnabled ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <span className="bebas-neue text-xs tracking-wider">CEILING</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Mobile Audio Preview */}
              <div>
                <div className="text-[0.65rem] bebas-neue tracking-widest text-gray-400 mb-2 text-center">AUDIO PREVIEW</div>
                <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 rounded-xl border border-gray-200/50">
                  <div className="flex items-end justify-center gap-0.5 h-6">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 bg-[#407dd5] rounded-full ${ambientEnabled ? 'animate-pulse' : ''}`}
                        style={{
                          height: ambientEnabled ? `${Math.random() * 16 + 8}px` : '8px',
                          animationDelay: ambientEnabled ? `${i * 0.05}s` : '0s',
                          opacity: ambientEnabled ? 0.3 + Math.random() * 0.7 : 0.2
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Audio Sample */}
              <div>
                <div className="text-[0.65rem] bebas-neue tracking-widest text-gray-400 mb-2">AUDIO SAMPLE</div>
                <button 
                  onClick={() => setAmbientEnabled(!ambientEnabled)}
                  className={`group relative w-full px-3 py-2.5 rounded-xl transition-all duration-300 overflow-hidden ${
                    ambientEnabled
                      ? 'bg-gradient-to-r from-[#407dd5] to-[#2d5fa8] text-white shadow-lg shadow-[#407dd5]/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="bebas-neue text-xs tracking-wider">SOUNDSCAPE</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Room viewer and controls */}
        <div className="hidden lg:flex flex-col w-full h-full">
          {/* Desktop Room viewer with taller aspect ratio for more image space */}
          <div className="room-viewer relative bg-[#407dd5] rounded-t-2xl overflow-hidden shadow-2xl">
            
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full ${showVideo ? 'opacity-100 z-40' : 'opacity-0 -z-10 invisible'}`}
              onEnded={handleVideoEnded}
              onPlay={() => setVideoStarted(true)}
              playsInline
              muted
              preload="auto"
              style={{ 
                backgroundColor: 'transparent',
                objectFit: 'cover',
                imageRendering: 'high-quality',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
              }}
              disablePictureInPicture
              controlsList="nodownload"
            />

            <div className={`absolute inset-0 z-10 ${showVideo ? 'invisible' : 'visible'}`}>
              {renderRoom(currentRoom)}
            </div>
            
            <button className="absolute top-4 right-4 bg-gray-800/90 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm transition-colors duration-200 flex items-center gap-2 z-40">
              <span className="bebas-neue tracking-wider">CLOSE</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Desktop Control Panel - Much more compact */}
          <div className="control-panel bg-white/95 backdrop-blur-sm rounded-b-2xl border-t-0 shadow-2xl overflow-hidden">
            
            <div className="grid grid-cols-5 gap-px bg-gray-200/30 h-full">
              
              {/* Left Room Navigation */}
              <div className="px-3 py-2 flex flex-col justify-center bg-white/95">
                <div className="text-[0.6rem] bebas-neue tracking-wider text-gray-700 mb-1 uppercase text-center font-medium">Previous Room</div>
                <button
                  onClick={switchToPrevRoom}
                  disabled={isTransitioning}
                  className="group relative w-full px-2 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-[#407dd5] hover:text-white transition-all duration-300 disabled:opacity-50 overflow-hidden"
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <div className="flex items-center gap-1.5 relative z-10">
                    <svg className="w-4 h-4 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <div className="flex-1 overflow-hidden">
                      <span className="bebas-neue text-xs tracking-wider">
                        {rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1] === 'cinema' 
                          ? 'Cinema Hall' 
                          : rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1].charAt(0).toUpperCase() + rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1].slice(1)}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
              
              {/* Acoustic Panels - More compact */}
              <div className="px-3 py-2 flex flex-col justify-center bg-white/95">
                <div className="text-[0.6rem] bebas-neue tracking-wider text-gray-700 mb-1 uppercase text-center font-medium">Acoustic Panels</div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setWallsEnabled(!wallsEnabled)}
                    className={`group relative px-2 py-1.5 rounded-lg transition-all duration-300 overflow-hidden ${
                      wallsEnabled
                        ? 'bg-[#407dd5] text-white shadow-lg shadow-[#407dd5]/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <span className="bebas-neue text-xs tracking-wider">Wall Panels</span>
                      <div className={`transition-all ${wallsEnabled ? 'text-white' : 'text-gray-400'}`}>
                        {wallsEnabled ? (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setCeilingEnabled(!ceilingEnabled)}
                    className={`group relative px-2 py-1.5 rounded-lg transition-all duration-300 overflow-hidden ${
                      ceilingEnabled
                        ? 'bg-[#407dd5] text-white shadow-lg shadow-[#407dd5]/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <span className="bebas-neue text-xs tracking-wider">Ceiling Panels</span>
                      <div className={`transition-all ${ceilingEnabled ? 'text-white' : 'text-gray-400'}`}>
                        {ceilingEnabled ? (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Desktop Audio Preview - More compact */}
              <div className="px-3 py-2 flex flex-col justify-center bg-white/95">
                <div className="text-[0.6rem] bebas-neue tracking-wider text-gray-700 mb-1 uppercase text-center font-medium">Audio Preview</div>
                <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-3 py-2 rounded-lg border border-gray-200/50">
                  <div className="flex items-end justify-center gap-0.5 h-5">
                    {[...Array(15)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 bg-[#407dd5] rounded-full ${ambientEnabled ? 'animate-pulse' : ''}`}
                        style={{
                          height: ambientEnabled ? `${Math.random() * 16 + 8}px` : '8px',
                          animationDelay: ambientEnabled ? `${i * 0.05}s` : '0s',
                          opacity: ambientEnabled ? 0.3 + Math.random() * 0.7 : 0.2
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Audio Sample - More compact */}
              <div className="px-3 py-2 flex flex-col justify-center bg-white/95">
                <div className="text-[0.6rem] bebas-neue tracking-wider text-gray-700 mb-1 uppercase text-center font-medium">Audio Sample</div>
                <button 
                  onClick={() => setAmbientEnabled(!ambientEnabled)}
                  className={`group relative w-full px-2 py-2.5 rounded-lg transition-all duration-300 overflow-hidden ${
                    ambientEnabled
                      ? 'bg-gradient-to-r from-[#407dd5] to-[#2d5fa8] text-white shadow-lg shadow-[#407dd5]/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <div className="flex items-center justify-center gap-1.5 relative z-10">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="bebas-neue text-xs tracking-wider">Soundscape</span>
                  </div>
                </button>
              </div>

              {/* Right Room Navigation */}
              <div className="px-3 py-2 flex flex-col justify-center bg-white/95">
                <div className="text-[0.6rem] bebas-neue tracking-wider text-gray-700 mb-1 uppercase text-center font-medium">Next Room</div>
                <button
                  onClick={switchToNextRoom}
                  disabled={isTransitioning}
                  className="group relative w-full px-2 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-[#407dd5] hover:text-white transition-all duration-300 disabled:opacity-50 overflow-hidden"
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <div className="flex items-center gap-1.5 relative z-10">
                    <div className="flex-1 overflow-hidden">
                      <span className="bebas-neue text-xs tracking-wider">
                        {rooms[(currentRoomIndex + 1) % rooms.length] === 'cinema' 
                          ? 'Cinema Hall' 
                          : rooms[(currentRoomIndex + 1) % rooms.length].charAt(0).toUpperCase() + rooms[(currentRoomIndex + 1) % rooms.length].slice(1)}
                      </span>
                    </div>
                    <svg className="w-4 h-4 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcousticViewer;