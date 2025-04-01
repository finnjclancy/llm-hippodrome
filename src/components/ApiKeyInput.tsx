import React, { useState, useEffect } from 'react';

interface ApiKeyInputProps {
  onSave: (key: string) => void;
}

const ApiKeyTutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="mt-3 bg-blue-50 rounded-lg border border-blue-200 p-3 sm:p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-base sm:text-lg font-medium text-blue-800">Getting an OpenRouter API Key</h4>
        <button 
          onClick={onClose}
          className="text-blue-500 hover:text-blue-700 touch-manipulation"
          aria-label="Close tutorial"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-blue-900">
        <p>An OpenRouter API key allows you to access powerful AI models through a unified API. Follow these steps to get your own key:</p>
        
        <ol className="list-decimal list-inside space-y-1.5 sm:space-y-2 ml-1">
          <li>
            <span className="font-medium">Visit OpenRouter:</span> Go to <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline">openrouter.ai/keys</a>
          </li>
          <li>
            <span className="font-medium">Sign in:</span> Use Google, GitHub, or email to create an account or sign in
          </li>
          <li>
            <span className="font-medium">Navigate to Keys:</span> Click on the "Keys" section in the left sidebar
          </li>
          <li>
            <span className="font-medium">Create a new key:</span> Click the "+ Create Key" button
          </li>
          <li>
            <span className="font-medium">Configure your key:</span> Name your key (e.g., "LLM Hippodrome") and set the rate limit
          </li>
          <li>
            <span className="font-medium">Copy the key:</span> Your new key will be displayed - copy it to your clipboard
          </li>
          <li>
            <span className="font-medium">Paste it here:</span> Paste the key into the input field above and click "Save Key"
          </li>
        </ol>
        
        <div className="bg-white p-2 sm:p-3 rounded-md border border-blue-100 mt-1">
          <p className="font-medium text-blue-800 mb-1">💡 Note:</p>
          <p>New OpenRouter accounts get free credits to start. Your key will look something like: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs sm:text-sm">sk-or-v1-...</code></p>
        </div>
      </div>
    </div>
  );
};

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Load saved key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('openrouter_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
      onSave(savedKey); // Inform parent component of the saved key
    } else {
      setIsEditing(true); // Show editing mode if no key is saved
      setShowTutorial(true); // Show tutorial by default if no key is saved
    }
  }, [onSave]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openrouter_api_key', apiKey);
      setIsSaved(true);
      setIsEditing(false);
      onSave(apiKey);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleClear = () => {
    localStorage.removeItem('openrouter_api_key');
    setApiKey('');
    setIsSaved(false);
    setIsEditing(true);
    onSave('');
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">OpenRouter API Key</h2>
      
      {isEditing ? (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenRouter API key"
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:shadow-outline text-sm sm:text-base"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className={`px-3 py-1.5 sm:py-2 rounded-md text-white text-sm sm:text-base font-medium touch-manipulation ${
                apiKey.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Save Key
            </button>
            {isSaved && (
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md text-gray-700 text-sm sm:text-base font-medium hover:bg-gray-50 touch-manipulation"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600">
              Need an API key? <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Get one from OpenRouter</a>
            </div>
            <button 
              onClick={() => setShowTutorial(!showTutorial)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium touch-manipulation"
            >
              {showTutorial ? 'Hide tutorial' : 'Show tutorial'}
            </button>
          </div>
          
          {showTutorial && <ApiKeyTutorial onClose={() => setShowTutorial(false)} />}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700 text-sm sm:text-base">API Key saved</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleEdit}
              className="px-3 py-1.5 sm:py-2 text-blue-600 hover:text-blue-800 text-sm sm:text-base font-medium touch-manipulation"
            >
              Edit
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 sm:py-2 text-red-600 hover:text-red-800 text-sm sm:text-base font-medium touch-manipulation"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyInput; 