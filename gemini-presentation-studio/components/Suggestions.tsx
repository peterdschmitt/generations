import React from 'react';
import Spinner from './Spinner';

interface SuggestionsProps {
    suggestions: string[];
    onApply: (suggestion: string) => void;
    isLoading: boolean;
}

const Suggestions: React.FC<SuggestionsProps> = ({ suggestions, onApply, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-full mt-2">
                <Spinner />
            </div>
        );
    }

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <div className="w-full mt-2 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-md font-semibold text-gray-300 mb-2">Try these ideas:</h3>
            <div className="flex flex-col space-y-2">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onApply(suggestion)}
                        className="w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm text-gray-200 transition-colors"
                    >
                        "{suggestion}"
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Suggestions;