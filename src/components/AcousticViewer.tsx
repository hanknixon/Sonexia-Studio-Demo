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
    <div className="min-h-screen h-screen w-screen overflow-hidden relative flex items-center justify-center" style={{ margin: 0, padding: 0 }}>
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
          filter: 'blur(8px)',
          margin: 0,
          padding: 0
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
          filter: 'blur(8px)',
          margin: 0,
          padding: 0
        }}
      />
      
      {/* Overlay to darken background slightly */}
      <div className="fixed inset-0 bg-black/10" />
      
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

          /* Lock viewport to prevent zoom affecting layout */
          @media screen and (min-width: 768px) {
            .main-container {
              width: 90vw;
              max-width: 1400px;
              height: 85vh;
            }
          }

          @media screen and (max-width: 767px) {
            .room-viewer-mobile {
              aspect-ratio: 16 / 9;
              width: 100%;
              max-height: 50vh;
            }
          }
        `}
      </style>
      
      <div className="main-container w-full h-full relative z-10 flex flex-col p-4 md:p-8 mx-auto">

        {/* Main room container */}
        <div className="relative flex items-center gap-0 flex-1 min-h-0">
          
          {/* Room label - Desktop only positioning */}
<div className="hidden md:block absolute -top-8 sm:-top-10 md:-top-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
  <div className="relative">
    {/* Decorative sign board background */}
    <div className="relative bg-gradient-to-br from-[#5a89b8] via-[#6a99c8] to-[#7aa9d8] px-12 py-6 rounded-2xl shadow-2xl border-4 border-white/20">
      {/* Metallic frame effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      {/* Corner decorations */}
      <div className="absolute -top-2 -left-2 w-8 h-8 bg-[#577bac] rounded-full border-4 border-white/30 shadow-lg" />
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#577bac] rounded-full border-4 border-white/30 shadow-lg" />
      <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-[#577bac] rounded-full border-4 border-white/30 shadow-lg" />
      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#577bac] rounded-full border-4 border-white/30 shadow-lg" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(64,125,213,0.5)]" />
      
      {/* Room name */}
      <div className="relative text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] bebas-neue text-white tracking-[0.15em] whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
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
    
    {/* Hanging chain effect */}
    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-1 h-8 bg-gradient-to-b from-white/40 to-white/10 rounded-full" />
    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white/30 rounded-full shadow-lg" />
  </div>
</div>
          {/* Mobile: Combined viewer and controls */}
<div className="md:hidden w-full flex flex-col">
  {/* Mobile Room Title - Styled Sign Board */}
  <div className="mb-4 flex justify-center">
    <div className="relative">
      {/* Sign board background */}
      <div className="relative bg-gradient-to-br from-[#5a89b8] via-[#6a99c8] to-[#7aa9d8] px-8 py-4 rounded-xl shadow-2xl border-4 border-white/20">
        {/* Metallic effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
        
        {/* Corner dots */}
        <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#577bac] rounded-full border-2 border-white/30 shadow-lg" />
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#577bac] rounded-full border-2 border-white/30 shadow-lg" />
        <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 bg-[#577bac] rounded-full border-2 border-white/30 shadow-lg" />
        <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-[#577bac] rounded-full border-2 border-white/30 shadow-lg" />

        {/* Glow */}
        <div className="absolute inset-0 rounded-xl shadow-[0_0_20px_rgba(64,125,213,0.4)]" />
        
        {/* Text */}
        <div className="relative text-[1.75rem] bebas-neue text-white tracking-[0.15em] whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
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
      
      {/* Hanging chain */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-white/40 to-white/10 rounded-full" />
      <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white/30 rounded-full shadow-lg" />
    </div>
  </div>

            {/* Mobile Viewer and Control Panel - Seamlessly connected */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl">
              {/* Room viewer */}
              <div className="relative w-full bg-[#407dd5] overflow-hidden" style={{ aspectRatio: '16/9' }}>
                
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

                {/* Current room display */}
                <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${showVideo ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
                  {renderRoom(currentRoom)}
                </div>
                
                {/* Close button */}
                <button className="absolute top-2 right-2 bg-gray-800/90 hover:bg-gray-900 text-white px-3 py-1.5 rounded text-xs transition-colors duration-200 flex items-center gap-2 z-40">
                  <span className="bebas-neue tracking-wider">CLOSE</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mobile Control Panel - No border separation */}
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
                            ? 'CINEMA HALL' 
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
                            ? 'CINEMA HALL' 
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

                {/* Audio Preview */}
                <div>
                  <div className="text-[0.65rem] bebas-neue tracking-widest text-gray-400 mb-2 text-center">AUDIO PREVIEW</div>
                  <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 rounded-xl border border-gray-200/50">
                    <div className="flex items-center justify-center gap-0.5">
                      {[...Array(20)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-[#407dd5] rounded-full animate-pulse"
                          style={{
                            height: `${Math.random() * 16 + 8}px`,
                            animationDelay: `${i * 0.05}s`,
                            opacity: 0.3 + Math.random() * 0.7
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

          {/* Desktop: Room viewer */}
          <div className="hidden md:block room-viewer-mobile relative w-full h-full bg-[#407dd5] rounded-t-lg md:rounded-t-2xl overflow-hidden shadow-2xl">
            
            {/* Video transition overlay - DESKTOP */}
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

            {/* Current room display */}
            <div className={`absolute inset-0 z-10 ${showVideo ? 'invisible' : 'visible'}`}>
              {renderRoom(currentRoom)}
            </div>
            
            {/* Close button */}
            <button className="absolute top-2 right-2 md:top-4 md:right-4 bg-gray-800/90 hover:bg-gray-900 text-white px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm transition-colors duration-200 flex items-center gap-2 z-40">
              <span className="bebas-neue tracking-wider">CLOSE</span>
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop: Bottom control panel */}
        <div className="hidden md:block bg-white/95 backdrop-blur-sm rounded-b-lg md:rounded-b-2xl overflow-hidden md:border-t-0 md:border-x md:border-b border-gray-200/50 md:shadow-2xl">
          
          {/* Desktop Layout - 5 columns */}
          <div className="grid grid-cols-5 divide-x divide-gray-200/50">
            
            {/* Left Room Navigation */}
            <div className="p-4 lg:p-6">
              <div className="text-xs bebas-neue tracking-widest text-gray-400 mb-3 lg:mb-4">PREVIOUS ROOM</div>
              <button
                onClick={switchToPrevRoom}
                disabled={isTransitioning}
                className="group relative w-full px-3 py-2 lg:px-4 lg:py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-[#407dd5] hover:text-white transition-all duration-300 disabled:opacity-50 overflow-hidden"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                
                <div className="flex items-center gap-2 lg:gap-3 relative z-10">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <div className="flex-1 overflow-hidden">
                    <div className="relative h-5">
                      <span className="bebas-neue text-xs lg:text-sm tracking-wider absolute left-0 top-0 group-hover:opacity-0 group-hover:-translate-y-full transition-all duration-300">
                        {rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1] === 'cinema' 
                          ? 'CINEMA HALL' 
                          : rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1].toUpperCase()}
                      </span>
                      <span className="bebas-neue text-xs lg:text-sm tracking-wider absolute left-0 top-full opacity-0 group-hover:opacity-100 group-hover:top-0 transition-all duration-300">
                        GO TO {rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1] === 'cinema' 
                          ? 'CINEMA HALL' 
                          : rooms[currentRoomIndex === 0 ? rooms.length - 1 : currentRoomIndex - 1].toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Absorption Controls */}
            <div className="p-4 lg:p-6">
              <div className="text-xs bebas-neue tracking-widest text-gray-400 mb-3 lg:mb-4">ACOUSTIC PANELS</div>
              <div className="flex flex-col gap-2 lg:gap-3">
                <button
                  onClick={() => setWallsEnabled(!wallsEnabled)}
                  className={`group relative px-3 py-2 lg:px-4 lg:py-3 rounded-xl transition-all duration-300 overflow-hidden ${
                    wallsEnabled
                      ? 'bg-[#407dd5] text-white shadow-lg shadow-[#407dd5]/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <span className="bebas-neue text-xs lg:text-sm tracking-wider">WALL PANELS</span>
                    <div className={`transition-all ${wallsEnabled ? 'text-white' : 'text-gray-400'}`}>
                      {wallsEnabled ? (
                        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setCeilingEnabled(!ceilingEnabled)}
                  className={`group relative px-3 py-2 lg:px-4 lg:py-3 rounded-xl transition-all duration-300 overflow-hidden ${
                    ceilingEnabled
                      ? 'bg-[#407dd5] text-white shadow-lg shadow-[#407dd5]/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <span className="bebas-neue text-xs lg:text-sm tracking-wider">CEILING PANELS</span>
                    <div className={`transition-all ${ceilingEnabled ? 'text-white' : 'text-gray-400'}`}>
                      {ceilingEnabled ? (
                        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Sound Visualization */}
            <div className="p-4 lg:p-6 flex flex-col justify-center">
              <div className="text-xs bebas-neue tracking-widest text-gray-400 mb-3 lg:mb-4 text-center">AUDIO PREVIEW</div>
              <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 lg:px-6 lg:py-4 rounded-xl border border-gray-200/50">
                <div className="flex items-center justify-center gap-1">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#407dd5] rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 20 + 10}px`,
                        animationDelay: `${i * 0.05}s`,
                        opacity: 0.3 + Math.random() * 0.7
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Sound Controls */}
            <div className="p-4 lg:p-6">
              <div className="text-xs bebas-neue tracking-widest text-gray-400 mb-3 lg:mb-4">AUDIO SAMPLE</div>
              <button 
                onClick={() => setAmbientEnabled(!ambientEnabled)}
                className={`group relative w-full px-3 py-2 lg:px-4 lg:py-3 rounded-xl transition-all duration-300 overflow-hidden ${
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
                  <span className="bebas-neue text-xs lg:text-sm tracking-wider">SOUNDSCAPE</span>
                </div>
              </button>
            </div>

            {/* Right Room Navigation */}
            <div className="p-4 lg:p-6">
              <div className="text-xs bebas-neue tracking-widest text-gray-400 mb-3 lg:mb-4">NEXT ROOM</div>
              <button
                onClick={switchToNextRoom}
                disabled={isTransitioning}
                className="group relative w-full px-3 py-2 lg:px-4 lg:py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-[#407dd5] hover:text-white transition-all duration-300 disabled:opacity-50 overflow-hidden"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                
                <div className="flex items-center gap-2 lg:gap-3 relative z-10">
                  <div className="flex-1 overflow-hidden">
                    <div className="relative h-5">
                      <span className="bebas-neue text-xs lg:text-sm tracking-wider absolute left-0 top-0 group-hover:opacity-0 group-hover:-translate-y-full transition-all duration-300">
                        {rooms[(currentRoomIndex + 1) % rooms.length] === 'cinema' 
                          ? 'CINEMA HALL' 
                          : rooms[(currentRoomIndex + 1) % rooms.length].toUpperCase()}
                      </span>
                      <span className="bebas-neue text-xs lg:text-sm tracking-wider absolute left-0 top-full opacity-0 group-hover:opacity-100 group-hover:top-0 transition-all duration-300">
                        GO TO {rooms[(currentRoomIndex + 1) % rooms.length] === 'cinema' 
                          ? 'CINEMA HALL' 
                          : rooms[(currentRoomIndex + 1) % rooms.length].toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcousticViewer;
