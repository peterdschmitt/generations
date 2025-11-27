import React from 'react';

interface VideoPlayerProps {
  src: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  return (
    <div className="w-full">
      <video
        key={src} // Force re-render when src changes
        controls
        autoPlay
        muted
        loop
        className="w-full h-auto max-h-[450px] object-contain rounded-lg"
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
