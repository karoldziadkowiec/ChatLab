import React, { useEffect, useState } from 'react';
import TimeService from './TimeService';
import '../../styles/time/CurrentTimeDisplay.css'

const CurrentTimeDisplay = () => {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const currentDateTime = TimeService.getCurrentDateTime();
      setCurrentDateTime(currentDateTime);
    };

    const intervalId = setInterval(updateDateTime, 1000);
    updateDateTime();

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="CurrentTimeDisplay">
      {currentDateTime}
    </div>
  );
};

export default CurrentTimeDisplay;