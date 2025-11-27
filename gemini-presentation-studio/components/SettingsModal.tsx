
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { AirtableConfig, checkAirtableConnection } from '../services/airtableService';
import Spinner from './Spinner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AirtableConfig;
  onSave: (config: AirtableConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [baseId, setBaseId] = useState(config.baseId);
  const [tableName, setTableName] = useState(config.tableName || 'Generations');
  const [imgbbApiKey, setImgbbApiKey] = useState(config.imgbbApiKey || '');
  
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setApiKey(config.apiKey);
      setBaseId(config.baseId);
      setTableName(config.tableName || 'Generations');
      setImgbbApiKey(config.imgbbApiKey || '');
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen, config]);

  const handleSave = () => {
    onSave({ apiKey, baseId, tableName, imgbbApiKey });
    onClose();
  };
  
  const handleTestConnection = async () => {
      setTestStatus('testing');
      setTestMessage('');
      
      try {
          await checkAirtableConnection({ apiKey, baseId, tableName });
          setTestStatus('success');
          setTestMessage('Airtable Connection successful!');
      } catch (e: any) {
          setTestStatus('error');
          setTestMessage(e.message || "Failed to connect");
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gray-900/50 p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 backdrop-blur-md">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Icon name="settings" className="w-5 h-5 text-gray-400" />
            Database Settings
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          
          {/* Section 1: Airtable */}
          <div className="space-y-4">
              <h4 className="text-sm font-bold text-primary-light uppercase tracking-wide border-b border-gray-700 pb-1">Airtable Config</h4>
              <p className="text-xs text-gray-400">
                You need a Personal Access Token (PAT) with <code>data.records:write</code> scope.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="pat.xxxxxxxx..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Base ID
                    </label>
                    <input
                      type="text"
                      value={baseId}
                      onChange={(e) => setBaseId(e.target.value)}
                      placeholder="appxxxxxxxx"
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Table Name
                    </label>
                    <input
                      type="text"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      placeholder="Generations"
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
              </div>
          </div>

          {/* Section 2: Image Bridge */}
          <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center border-b border-gray-700 pb-1">
                 <h4 className="text-sm font-bold text-primary-light uppercase tracking-wide">Image Hosting Bridge</h4>
                 <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded text-gray-300">Optional</span>
              </div>
              <p className="text-xs text-gray-400">
                Airtable requires a public URL to upload attachments. Add a free ImgBB key to automatically sync images.
                <br/>
                <a href="https://api.imgbb.com/" target="_blank" className="text-primary hover:underline">Get free API Key here</a>
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  ImgBB API Key
                </label>
                <input
                  type="password"
                  value={imgbbApiKey}
                  onChange={(e) => setImgbbApiKey(e.target.value)}
                  placeholder="e.g. 306927e..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
          </div>
          
          <div className="flex items-center justify-between pt-2">
              <button 
                onClick={handleTestConnection}
                disabled={testStatus === 'testing' || !apiKey || !baseId}
                className={`text-xs px-3 py-2 rounded border transition-colors flex items-center gap-2 ${
                    testStatus === 'success' ? 'bg-green-900/30 border-green-700 text-green-400' :
                    testStatus === 'error' ? 'bg-red-900/30 border-red-700 text-red-400' :
                    'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                  {testStatus === 'testing' && <Spinner />}
                  {testStatus === 'success' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  {testStatus === 'error' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                  {testStatus === 'testing' ? 'Testing Airtable...' : 'Test Airtable'}
              </button>
              
              {testMessage && (
                  <span className={`text-xs ${testStatus === 'success' ? 'text-green-500' : 'text-red-400'}`}>
                      {testMessage}
                  </span>
              )}
          </div>
        </div>

        <div className="p-4 bg-gray-900/30 border-t border-gray-700 flex justify-end gap-3 sticky bottom-0 backdrop-blur-md">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-lg transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
