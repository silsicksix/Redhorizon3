import React from 'react';

export const TacticalBrackets: React.FC = () => {
  const bracketClass = "pointer-events-none absolute h-16 w-16 border-cyan-300/60";
  return (
    <React.Fragment>
      <div className={`${bracketClass} left-3 top-3 border-l-2 border-t-2`} />
      <div className={`${bracketClass} right-3 top-3 border-r-2 border-t-2`} />
      <div className={`${bracketClass} bottom-3 left-3 border-b-2 border-l-2`} />
      <div className={`${bracketClass} bottom-3 right-3 border-b-2 border-r-2`} />
      <div className="pointer-events-none absolute left-3 top-3 h-1.5 w-1.5 bg-amber-400 shadow-[0_0_10px_#ffb703]" />
      <div className="pointer-events-none absolute bottom-3 right-3 h-1.5 w-1.5 bg-amber-400 shadow-[0_0_10px_#ffb703]" />
    </React.Fragment>
  );
};
