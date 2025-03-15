import React from 'react';

export const Spinner = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-16 h-16 border-4 border-t-transparent border-solid rounded-full animate-spin-smooth border-[#B3D8A8]"></div>
    </div>
  );
};