import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AttendanceChart = ({ data, options, filter }) => {
  const chartRef = useRef(null);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        <p>No data available for chart</p>
      </div>
    );
  }

  return (
    <Line 
      ref={chartRef}
      data={data} 
      options={options}
      key={filter}
    />
  );
};

export default AttendanceChart;