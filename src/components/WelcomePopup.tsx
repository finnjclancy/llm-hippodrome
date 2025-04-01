import React from 'react';

interface WelcomePopupProps {
  onClose: () => void;
}

const WelcomePopup: React.FC<WelcomePopupProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-0 relative overflow-hidden transform transition-all duration-300 animate-scaleIn">
        {/* Top decorative gradient bar */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500"></div>
        
        {/* Header with background */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 sm:p-3 rounded-lg mr-3 sm:mr-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Welcome to LLM Hippodrome!</h2>
          </div>
          
          <button 
            onClick={onClose} 
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:bg-gray-100 rounded-full p-2 touch-manipulation"
            aria-label="Close"
          >
            <svg className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <div className="text-gray-600 space-y-4 sm:space-y-5">
            <p className="text-base sm:text-lg leading-relaxed">
              LLM Hippodrome is a platform where multiple AI models debate topics to reach a consensus.
            </p>
            
            <div className="bg-blue-50 p-4 sm:p-5 rounded-lg border border-blue-100 mt-3 sm:mt-4">
              <h3 className="font-semibold text-blue-700 flex items-center text-lg sm:text-xl mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How it works:
              </h3>
              
              <ol className="list-decimal list-inside space-y-3 sm:space-y-4 ml-2 text-blue-800 text-base sm:text-lg">
                <li className="transition-all duration-300 hover:translate-x-1 p-1.5 sm:p-2">
                  <span className="font-medium">Select models</span> - Choose two or more AI models from the list
                </li>
                <li className="transition-all duration-300 hover:translate-x-1 p-1.5 sm:p-2">
                  <span className="font-medium">Enter prompt</span> - Type your question or debate topic
                </li>
                <li className="transition-all duration-300 hover:translate-x-1 p-1.5 sm:p-2">
                  <span className="font-medium">Start debate</span> - Click the button to begin the AI discussion
                </li>
                <li className="transition-all duration-300 hover:translate-x-1 p-1.5 sm:p-2">
                  <span className="font-medium">View results</span> - Watch the debate unfold and see the final consensus
                </li>
              </ol>
            </div>
            
            <p className="mt-4 sm:mt-5 bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-5 rounded-lg border border-purple-100 text-base sm:text-lg">
              <span className="font-medium text-purple-700">Pro Tip:</span> This is a great way to see how different AI models approach the same question and how they can collaborate to find common ground.
            </p>
          </div>
        </div>
        
        <div className="mt-2 flex justify-center items-center px-4 sm:px-6 py-4 sm:py-5 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base sm:text-lg rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5 font-medium touch-manipulation"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

// Add animations to tailwind
const addAnimationStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { 
      from { opacity: 0; } 
      to { opacity: 1; } 
    }
    @keyframes scaleIn { 
      from { transform: scale(0.95); opacity: 0; } 
      to { transform: scale(1); opacity: 1; } 
    }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
    .animate-scaleIn { animation: scaleIn 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); }
  `;
  document.head.appendChild(style);
};

// Run once when component is imported
if (typeof window !== 'undefined') {
  addAnimationStyles();
}

export default WelcomePopup; 