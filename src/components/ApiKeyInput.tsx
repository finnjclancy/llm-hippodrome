import React, { useState, useEffect } from 'react';

interface ApiKeyInputProps {
  onSave: (key: string) => void;
}

const ApiKeyTutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="mt-3 bg-blue-50 rounded-lg border border-blue-200 p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-lg font-medium text-blue-800">Getting an OpenRouter API Key</h4>
        <button 
          onClick={onClose}
          className="text-blue-500 hover:text-blue-700"
          aria-label="Close tutorial"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-3 text-sm text-blue-900">
        <p>An OpenRouter API key allows you to access powerful AI models through a unified API. Follow these steps to get your own key:</p>
        
        <ol className="list-decimal list-inside space-y-2 ml-1">
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
        
        <div className="bg-white p-3 rounded-md border border-blue-100 mt-1">
          <p className="font-medium text-blue-800 mb-1">💡 Note:</p>
          <p>New OpenRouter accounts get free credits to start. Your key will look something like: <code className="bg-gray-100 px-1 py-0.5 rounded">sk-or-v1-...</code></p>
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
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-gray-800">OpenRouter API Key</h3>
        {isSaved && !isEditing && (
          <div className="flex space-x-2">
            <button
              onClick={handleEdit}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={handleClear}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenRouter API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="text-xs text-gray-500">
            Your API key is stored locally in your browser and never sent to our servers.
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className={`px-3 py-1.5 rounded-md text-white font-medium ${
                apiKey.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Save Key
            </button>
            {isSaved && (
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
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
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {showTutorial ? 'Hide tutorial' : 'Show tutorial'}
            </button>
          </div>
          
          {showTutorial && <ApiKeyTutorial onClose={() => setShowTutorial(false)} />}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-md p-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-700">API Key saved</span>
        </div>
      )}
    </div>
  );
};

export default ApiKeyInput; 