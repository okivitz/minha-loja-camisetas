
import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, colorClass = "bg-sky-500", onClick, ariaLabel }) => {
  const cardBaseClasses = "bg-white p-5 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out h-full flex flex-col";

  const cardContent = (
    <div className={`${cardBaseClasses} ${onClick ? 'group' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium mb-0.5">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 truncate">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClass} text-white text-2xl ml-3 shadow-md ${onClick ? 'group-hover:scale-110 transition-transform' : ''}`}>
          {icon}
        </div>
      </div>
      {onClick && (
        <div className="mt-auto pt-2">
            <span className="text-xs text-blue-500 group-hover:underline">Ver detalhes &rarr;</span>
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="text-left w-full h-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 rounded-xl"
        aria-label={ariaLabel || `Ver detalhes de ${title}`}
      >
        {cardContent}
      </button>
    );
  }

  return <div className={cardBaseClasses}>{cardContent}</div>;
};

export default DashboardCard;
