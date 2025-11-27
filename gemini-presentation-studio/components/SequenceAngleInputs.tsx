import React from 'react';

interface SequenceAngleInputsProps {
    imageCount: number;
    angles: string[];
    onAnglesChange: (angles: string[]) => void;
}

const ANGLE_SUGGESTIONS = [
    "Wide establishing shot showing the full scene",
    "Medium shot at eye level",
    "Close-up detail shot",
    "Low angle looking up",
    "High angle looking down",
    "Over-the-shoulder perspective",
    "Side profile view",
    "Tracking shot with motion",
    "Dutch angle for dramatic effect",
    "Point-of-view shot"
];

const SequenceAngleInputs: React.FC<SequenceAngleInputsProps> = ({
    imageCount,
    angles,
    onAnglesChange
}) => {
    const handleAngleChange = (index: number, value: string) => {
        const newAngles = [...angles];
        newAngles[index] = value;
        onAnglesChange(newAngles);
    };

    const applySuggestion = (index: number, suggestion: string) => {
        handleAngleChange(index, suggestion);
    };

    // Ensure angles array matches imageCount
    React.useEffect(() => {
        if (angles.length !== imageCount) {
            const newAngles = Array(imageCount).fill('').map((_, i) => angles[i] || '');
            onAnglesChange(newAngles);
        }
    }, [imageCount]);

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Camera Angle / Perspective for Each Image
                </label>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {Array.from({ length: imageCount }).map((_, index) => (
                    <div key={index} className="flex gap-2 items-start">
                        <span className="flex-shrink-0 w-8 h-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center font-bold text-sm">
                            {index + 1}
                        </span>
                        <div className="flex-1 space-y-1">
                            <input
                                type="text"
                                value={angles[index] || ''}
                                onChange={(e) => handleAngleChange(index, e.target.value)}
                                placeholder={`Describe angle/perspective for image ${index + 1}...`}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                            />
                            {/* Quick suggestions dropdown */}
                            <div className="flex gap-1 flex-wrap">
                                {ANGLE_SUGGESTIONS.slice(0, 3).map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => applySuggestion(index, suggestion)}
                                        className="text-[10px] text-gray-500 hover:text-primary px-1.5 py-0.5 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                                    >
                                        {suggestion.split(' ').slice(0, 3).join(' ')}...
                                    </button>
                                ))}
                                <div className="relative group">
                                    <button className="text-[10px] text-gray-500 hover:text-primary px-1.5 py-0.5 bg-gray-800 rounded hover:bg-gray-700">
                                        More...
                                    </button>
                                    <div className="absolute bottom-full left-0 mb-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                        <div className="p-2 max-h-48 overflow-y-auto">
                                            {ANGLE_SUGGESTIONS.map((suggestion, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => applySuggestion(index, suggestion)}
                                                    className="block w-full text-left text-xs text-gray-300 hover:text-white hover:bg-gray-700 px-2 py-1.5 rounded"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-gray-500">
                Describe the camera angle, perspective, or framing for each image in the sequence.
                Each image will use its own angle while maintaining consistency in subject matter.
            </p>
        </div>
    );
};

export default SequenceAngleInputs;
