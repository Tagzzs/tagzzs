import { useState } from 'react';
import { X, Sparkles, Upload, Plus, Edit2, Trash2, ChevronRight, MessageCircle, Youtube, Radio, Globe, FileText, Play, Film, CheckCircle2, Lightbulb, FileEdit, CheckSquare, HelpCircle, Book, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

type TabType = 'url' | 'wiki' | 'pdf' | 'idea';
type ViewState = 'capture' | 'preview' | 'analyzing';
type IdeaType = 'idea' | 'note' | 'task' | 'question' | 'journal' | 'braindump' | null;

export function AddContentModal({ isOpen, onClose, isDark }: AddContentModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('url');
  const [viewState, setViewState] = useState<ViewState>('capture');
  const [urlInput, setUrlInput] = useState('');
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [aiAssistantExpanded, setAiAssistantExpanded] = useState(false);
  const [tags, setTags] = useState<string[]>(['YouTube']);
  const [newTag, setNewTag] = useState('');
  const [selectedIdeaType, setSelectedIdeaType] = useState<IdeaType>(null);
  const [ideaContent, setIdeaContent] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  
  // Mock preview data
  const [previewData, setPreviewData] = useState({
    title: 'How to Build a Personal Knowledge Management System',
    description: 'Learn the fundamentals of creating your own PKM system with practical examples and best practices.',
    domain: 'youtube.com',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop',
    duration: '12:34',
    type: 'video' as const
  });

  const handleAnalyze = () => {
    setViewState('analyzing');
    setTimeout(() => {
      setViewState('preview');
    }, 2000);
  };

  const handleSave = () => {
    // Mock save action
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && tags.length < 10) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const tabs: { id: TabType; icon: string; label: string }[] = [
    { id: 'url', icon: '🔗', label: 'URL' },
    { id: 'wiki', icon: '📚', label: 'Wiki' },
    { id: 'pdf', icon: '📄', label: 'Document' },
    { id: 'idea', icon: '💡', label: 'Idea' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${
              isDark 
                ? 'bg-black/60 backdrop-blur-sm' 
                : 'bg-black/40 backdrop-blur-sm'
            }`}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-[900px] max-h-[85vh] overflow-hidden rounded-[20px] ${
              isDark
                ? 'bg-[#12121A] border border-[#9B8CFF]/30'
                : 'bg-[#FFFFFF] border border-[#7C6AF2]/20'
            } shadow-2xl flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-8 pt-8 pb-6 border-b ${
              isDark ? 'border-[#9B8CFF]/10' : 'border-[#7C6AF2]/10'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className={isDark ? 'text-white' : 'text-gray-900'}>
                    Quick Capture
                  </h2>
                  <p className={`mt-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Save anything. TAGZZS will organize it.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-all ${
                    isDark 
                      ? 'hover:bg-white/5 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Source Tabs */}
            <div className={`px-8 border-b ${
              isDark ? 'border-[#9B8CFF]/10' : 'border-[#7C6AF2]/10'
            }`}>
              <div className="flex gap-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setViewState('capture');
                    }}
                    className={`relative py-4 transition-all ${
                      activeTab === tab.id
                        ? isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                        : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                          isDark ? 'bg-[#9B8CFF]' : 'bg-[#7C6AF2]'
                        }`}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="space-y-6">
                {/* Capture State */}
                {viewState === 'capture' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {activeTab === 'url' && (
                      <div className="space-y-6">
                        <div>
                          <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="Paste a URL here"
                            className={`w-full px-6 py-4 rounded-2xl border transition-all outline-none ${ 
                              isDark
                                ? 'bg-[#0B0B10] border-[#9B8CFF]/20 text-white placeholder:text-gray-500 focus:border-[#9B8CFF]/50'
                                : 'bg-[#F7F6FB] border-[#7C6AF2]/20 text-gray-900 placeholder:text-gray-400 focus:border-[#7C6AF2]/50'
                            }`}
                          />
                        </div>

                        <div className="space-y-4">
                          <h3 className={isDark ? 'text-white' : 'text-gray-900'}>
                            Supports
                          </h3>

                          <div className="space-y-3">
                            {/* YouTube Videos/Shorts */}
                            <div className={`flex items-center gap-3 ${ 
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <Youtube className="w-5 h-5" />
                              <span>YouTube Videos/Shorts</span>
                            </div>

                            {/* Apple and Spotify Podcasts */}
                            <div className={`flex items-center gap-3 ${ 
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <Radio className="w-5 h-5" />
                              <span>Apple and Spotify Podcasts</span>
                            </div>

                            {/* Websites, Articles & Blogs */}
                            <div className={`flex items-center gap-3 ${ 
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <Globe className="w-5 h-5" />
                              <span>Websites, Articles & Blogs</span>
                            </div>

                            {/* Vimeo Videos */}
                            <div className={`flex items-center gap-3 ${ 
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <Play className="w-5 h-5" />
                              <span>Vimeo Videos</span>
                            </div>

                            {/* Online PDFs */}
                            <div className={`flex items-center gap-3 ${ 
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <FileText className="w-5 h-5" />
                              <span>Online PDFs</span>
                            </div>

                            {/* Google Docs */}
                            <div className={`flex items-center gap-3 ${ 
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <FileText className="w-5 h-5" />
                              <span>Google Docs</span>
                            </div>

                            {/* Google Slides */}
                            <div className={`flex items-center gap-3 ${ 
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <Film className="w-5 h-5" />
                              <span>Google Slides</span>
                            </div>

                            {/* TikTok Videos */}
                            <div className={`flex items-center gap-3 ${ 
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <Play className="w-5 h-5" />
                              <span>TikTok Videos</span>
                            </div>
                          </div>
                        </div>

                        {/* Tip Box */}
                        <div className={`rounded-xl border p-4 ${ 
                          isDark
                            ? 'bg-[#0B0B10] border-[#9B8CFF]/20'
                            : 'bg-[#F7F6FB] border-[#7C6AF2]/20'
                        }`}>
                          <p className={`text-sm ${ 
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <span className={isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'}>Tip:</span> Use your browser's share option to quickly add content to TAGZZS.
                          </p>
                        </div>

                        {/* Analyze Button */}
                        <button
                          onClick={handleAnalyze}
                          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all ${
                            isDark
                              ? 'bg-gradient-to-r from-[#9B8CFF] to-[#7C6AF2] text-white hover:shadow-lg hover:shadow-[#9B8CFF]/20'
                              : 'bg-gradient-to-r from-[#7C6AF2] to-[#9B8CFF] text-white hover:shadow-lg hover:shadow-[#7C6AF2]/20'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          Analyze
                        </button>
                      </div>
                    )}

                    {activeTab === 'pdf' && (
                      <>
                        <div
                          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                            isDark
                              ? 'border-[#9B8CFF]/30 hover:border-[#9B8CFF]/50 bg-[#0B0B10]/50'
                              : 'border-[#7C6AF2]/30 hover:border-[#7C6AF2]/50 bg-[#F7F6FB]'
                          }`}
                        >
                          <Upload className={`w-12 h-12 mx-auto mb-4 ${
                            isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                          }`} />
                          <p className={`mb-4 ${
                            isDark ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Drag & drop a document here
                          </p>
                          <button
                            className={`px-6 py-2 rounded-xl border transition-all ${
                              isDark
                                ? 'border-[#9B8CFF]/30 text-[#9B8CFF] hover:bg-[#9B8CFF]/10'
                                : 'border-[#7C6AF2]/30 text-[#7C6AF2] hover:bg-[#7C6AF2]/10'
                            }`}
                          >
                            Choose file
                          </button>
                        </div>
                        <button
                          onClick={handleAnalyze}
                          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
                            isDark
                              ? 'bg-gradient-to-r from-[#9B8CFF] to-[#7C6AF2] text-white hover:shadow-lg hover:shadow-[#9B8CFF]/20'
                              : 'bg-gradient-to-r from-[#7C6AF2] to-[#9B8CFF] text-white hover:shadow-lg hover:shadow-[#7C6AF2]/20'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          Analyze
                        </button>
                      </>
                    )}

                    {activeTab === 'wiki' && (
                      <>
                        <div>
                          <input
                            type="text"
                            placeholder="Add wiki sources for movies, people, places, an..."
                            className={`w-full px-6 py-4 rounded-2xl border transition-all outline-none ${
                              isDark
                                ? 'bg-[#0B0B10] border-[#9B8CFF]/20 text-white placeholder:text-gray-500 focus:border-[#9B8CFF]/50'
                                : 'bg-[#F7F6FB] border-[#7C6AF2]/20 text-gray-900 placeholder:text-gray-400 focus:border-[#7C6AF2]/50'
                            }`}
                          />
                        </div>

                        <div className="space-y-3">
                          <p className={`text-sm ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            From predefined data sources
                          </p>

                          <div className="space-y-2">
                            {/* Wikipedia */}
                            <button
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                isDark
                                  ? 'hover:bg-[#9B8CFF]/10 text-white'
                                  : 'hover:bg-[#7C6AF2]/10 text-gray-900'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded flex items-center justify-center ${
                                isDark ? 'bg-white/10' : 'bg-gray-100'
                              }`}>
                                <span className="text-lg">W</span>
                              </div>
                              <span>Wikipedia</span>
                            </button>

                            {/* Google Knowledge Graph */}
                            <button
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                isDark
                                  ? 'hover:bg-[#9B8CFF]/10 text-white'
                                  : 'hover:bg-[#7C6AF2]/10 text-gray-900'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded flex items-center justify-center ${
                                isDark ? 'bg-white/10' : 'bg-gray-100'
                              }`}>
                                <span className="text-lg">G</span>
                              </div>
                              <span>Google Knowledge Graph</span>
                            </button>

                            {/* Wikidata */}
                            <button
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                isDark
                                  ? 'hover:bg-[#9B8CFF]/10 text-white'
                                  : 'hover:bg-[#7C6AF2]/10 text-gray-900'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded flex items-center justify-center ${
                                isDark ? 'bg-white/10' : 'bg-gray-100'
                              }`}>
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                  <rect x="2" y="2" width="2" height="16" />
                                  <rect x="6" y="2" width="2" height="16" />
                                  <rect x="10" y="2" width="2" height="16" />
                                  <rect x="14" y="2" width="2" height="16" />
                                </svg>
                              </div>
                              <span>Wikidata</span>
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={handleAnalyze}
                          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
                            isDark
                              ? 'bg-gradient-to-r from-[#9B8CFF] to-[#7C6AF2] text-white hover:shadow-lg hover:shadow-[#9B8CFF]/20'
                              : 'bg-gradient-to-r from-[#7C6AF2] to-[#9B8CFF] text-white hover:shadow-lg hover:shadow-[#7C6AF2]/20'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          Analyze
                        </button>
                      </>
                    )}

                    {activeTab === 'idea' && (
                      <div className="space-y-6">
                        {/* Header */}
                        <div>
                          <h3 className={isDark ? 'text-white' : 'text-gray-900'}>
                            Create
                          </h3>
                          <p className={`text-sm mt-1 ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Start from a blank thought. TAGZZS will organize it.
                          </p>
                        </div>

                        {/* Idea Type Selector Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Idea */}
                          <motion.button
                            onClick={() => setSelectedIdeaType('idea')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                              selectedIdeaType === 'idea'
                                ? isDark
                                  ? 'border-[#9B8CFF] bg-[#9B8CFF]/10 shadow-lg shadow-[#9B8CFF]/20'
                                  : 'border-[#7C6AF2] bg-[#7C6AF2]/10 shadow-lg shadow-[#7C6AF2]/20'
                                : isDark
                                  ? 'border-[#9B8CFF]/20 hover:border-[#9B8CFF]/40 bg-[#0B0B10]/50'
                                  : 'border-[#7C6AF2]/20 hover:border-[#7C6AF2]/40 bg-[#F7F6FB]'
                            }`}
                          >
                            {selectedIdeaType === 'idea' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={`absolute top-3 right-3 ${
                                  isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                }`}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </motion.div>
                            )}
                            <div className="mb-2">
                              <Lightbulb className={`w-6 h-6 ${
                                selectedIdeaType === 'idea'
                                  ? isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                  : isDark ? 'text-gray-400' : 'text-gray-600'
                              }`} />
                            </div>
                            <h4 className={`mb-1 ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              Idea
                            </h4>
                            <p className={`text-sm ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Raw thoughts, sparks, or quick ideas
                            </p>
                          </motion.button>

                          {/* Note */}
                          <motion.button
                            onClick={() => setSelectedIdeaType('note')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                              selectedIdeaType === 'note'
                                ? isDark
                                  ? 'border-[#9B8CFF] bg-[#9B8CFF]/10 shadow-lg shadow-[#9B8CFF]/20'
                                  : 'border-[#7C6AF2] bg-[#7C6AF2]/10 shadow-lg shadow-[#7C6AF2]/20'
                                : isDark
                                  ? 'border-[#9B8CFF]/20 hover:border-[#9B8CFF]/40 bg-[#0B0B10]/50'
                                  : 'border-[#7C6AF2]/20 hover:border-[#7C6AF2]/40 bg-[#F7F6FB]'
                            }`}
                          >
                            {selectedIdeaType === 'note' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={`absolute top-3 right-3 ${
                                  isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                }`}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </motion.div>
                            )}
                            <div className="mb-2">
                              <FileEdit className={`w-6 h-6 ${
                                selectedIdeaType === 'note'
                                  ? isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                  : isDark ? 'text-gray-400' : 'text-gray-600'
                              }`} />
                            </div>
                            <h4 className={`mb-1 ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              Note
                            </h4>
                            <p className={`text-sm ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Structured notes or explanations
                            </p>
                          </motion.button>

                          {/* Task */}
                          <motion.button
                            onClick={() => setSelectedIdeaType('task')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                              selectedIdeaType === 'task'
                                ? isDark
                                  ? 'border-[#9B8CFF] bg-[#9B8CFF]/10 shadow-lg shadow-[#9B8CFF]/20'
                                  : 'border-[#7C6AF2] bg-[#7C6AF2]/10 shadow-lg shadow-[#7C6AF2]/20'
                                : isDark
                                  ? 'border-[#9B8CFF]/20 hover:border-[#9B8CFF]/40 bg-[#0B0B10]/50'
                                  : 'border-[#7C6AF2]/20 hover:border-[#7C6AF2]/40 bg-[#F7F6FB]'
                            }`}
                          >
                            {selectedIdeaType === 'task' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={`absolute top-3 right-3 ${
                                  isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                }`}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </motion.div>
                            )}
                            <div className="mb-2">
                              <CheckSquare className={`w-6 h-6 ${
                                selectedIdeaType === 'task'
                                  ? isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                  : isDark ? 'text-gray-400' : 'text-gray-600'
                              }`} />
                            </div>
                            <h4 className={`mb-1 ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              Task
                            </h4>
                            <p className={`text-sm ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Actionable to-dos
                            </p>
                          </motion.button>

                          {/* Question */}
                          <motion.button
                            onClick={() => setSelectedIdeaType('question')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                              selectedIdeaType === 'question'
                                ? isDark
                                  ? 'border-[#9B8CFF] bg-[#9B8CFF]/10 shadow-lg shadow-[#9B8CFF]/20'
                                  : 'border-[#7C6AF2] bg-[#7C6AF2]/10 shadow-lg shadow-[#7C6AF2]/20'
                                : isDark
                                  ? 'border-[#9B8CFF]/20 hover:border-[#9B8CFF]/40 bg-[#0B0B10]/50'
                                  : 'border-[#7C6AF2]/20 hover:border-[#7C6AF2]/40 bg-[#F7F6FB]'
                            }`}
                          >
                            {selectedIdeaType === 'question' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={`absolute top-3 right-3 ${
                                  isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                }`}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </motion.div>
                            )}
                            <div className="mb-2">
                              <HelpCircle className={`w-6 h-6 ${
                                selectedIdeaType === 'question'
                                  ? isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                  : isDark ? 'text-gray-400' : 'text-gray-600'
                              }`} />
                            </div>
                            <h4 className={`mb-1 ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              Question
                            </h4>
                            <p className={`text-sm ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Things you want to explore or answer later
                            </p>
                          </motion.button>

                          {/* Journal */}
                          <motion.button
                            onClick={() => setSelectedIdeaType('journal')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                              selectedIdeaType === 'journal'
                                ? isDark
                                  ? 'border-[#9B8CFF] bg-[#9B8CFF]/10 shadow-lg shadow-[#9B8CFF]/20'
                                  : 'border-[#7C6AF2] bg-[#7C6AF2]/10 shadow-lg shadow-[#7C6AF2]/20'
                                : isDark
                                  ? 'border-[#9B8CFF]/20 hover:border-[#9B8CFF]/40 bg-[#0B0B10]/50'
                                  : 'border-[#7C6AF2]/20 hover:border-[#7C6AF2]/40 bg-[#F7F6FB]'
                            }`}
                          >
                            {selectedIdeaType === 'journal' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={`absolute top-3 right-3 ${
                                  isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                }`}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </motion.div>
                            )}
                            <div className="mb-2">
                              <Book className={`w-6 h-6 ${
                                selectedIdeaType === 'journal'
                                  ? isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                  : isDark ? 'text-gray-400' : 'text-gray-600'
                              }`} />
                            </div>
                            <h4 className={`mb-1 ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              Journal
                            </h4>
                            <p className={`text-sm ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Personal thoughts or reflections
                            </p>
                          </motion.button>

                          {/* Brain Dump */}
                          <motion.button
                            onClick={() => setSelectedIdeaType('braindump')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                              selectedIdeaType === 'braindump'
                                ? isDark
                                  ? 'border-[#9B8CFF] bg-[#9B8CFF]/10 shadow-lg shadow-[#9B8CFF]/20'
                                  : 'border-[#7C6AF2] bg-[#7C6AF2]/10 shadow-lg shadow-[#7C6AF2]/20'
                                : isDark
                                  ? 'border-[#9B8CFF]/20 hover:border-[#9B8CFF]/40 bg-[#0B0B10]/50'
                                  : 'border-[#7C6AF2]/20 hover:border-[#7C6AF2]/40 bg-[#F7F6FB]'
                            }`}
                          >
                            {selectedIdeaType === 'braindump' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={`absolute top-3 right-3 ${
                                  isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                }`}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </motion.div>
                            )}
                            <div className="mb-2">
                              <Brain className={`w-6 h-6 ${
                                selectedIdeaType === 'braindump'
                                  ? isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'
                                  : isDark ? 'text-gray-400' : 'text-gray-600'
                              }`} />
                            </div>
                            <h4 className={`mb-1 ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              Brain Dump
                            </h4>
                            <p className={`text-sm ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Messy thoughts, zero structure
                            </p>
                          </motion.button>
                        </div>

                        {/* Dynamic Editor Area */}
                        <AnimatePresence mode="wait">
                          {selectedIdeaType && (
                            <motion.div
                              key={selectedIdeaType}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="space-y-4"
                            >
                              <textarea
                                value={ideaContent}
                                onChange={(e) => {
                                  setIdeaContent(e.target.value);
                                  // Mock tag suggestion
                                  if (e.target.value.length > 10 && suggestedTags.length === 0) {
                                    setSuggestedTags([selectedIdeaType.charAt(0).toUpperCase() + selectedIdeaType.slice(1)]);
                                  }
                                }}
                                placeholder={
                                  selectedIdeaType === 'idea' ? 'Write anything that\'s on your mind…' :
                                  selectedIdeaType === 'note' ? 'Start writing your note…' :
                                  selectedIdeaType === 'task' ? 'What needs to be done?' :
                                  selectedIdeaType === 'question' ? 'What are you curious about?' :
                                  selectedIdeaType === 'journal' ? 'How are you feeling today?' :
                                  'Dump everything here. No rules.'
                                }
                                rows={selectedIdeaType === 'braindump' ? 10 : 6}
                                className={`w-full px-6 py-4 rounded-2xl border transition-all outline-none resize-none ${
                                  isDark
                                    ? 'bg-[#0B0B10] border-[#9B8CFF]/20 text-white placeholder:text-gray-500 focus:border-[#9B8CFF]/50'
                                    : 'bg-white border-[#7C6AF2]/20 text-gray-900 placeholder:text-gray-400 focus:border-[#7C6AF2]/50'
                                }`}
                              />

                              {/* Tag Preview */}
                              {suggestedTags.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="flex items-center gap-2"
                                >
                                  <span className={`text-sm ${
                                    isDark ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    Suggested tags:
                                  </span>
                                  {suggestedTags.map((tag, index) => (
                                    <span
                                      key={index}
                                      className={`px-3 py-1 rounded-full text-sm ${
                                        isDark
                                          ? 'bg-[#9B8CFF]/15 text-[#9B8CFF]'
                                          : 'bg-[#7C6AF2]/15 text-[#7C6AF2]'
                                      }`}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </motion.div>
                              )}

                              {/* AI Assistance Indicator */}
                              <div className={`flex items-center gap-2 text-sm ${
                                isDark ? 'text-gray-500' : 'text-gray-600'
                              }`}>
                                <Brain className="w-4 h-4" />
                                <span>Kai will auto-organize this after you save</span>
                              </div>

                              {/* Save Button */}
                              <button
                                onClick={handleSave}
                                disabled={!ideaContent.trim()}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all ${
                                  ideaContent.trim()
                                    ? isDark
                                      ? 'bg-gradient-to-r from-[#9B8CFF] to-[#7C6AF2] text-white hover:shadow-lg hover:shadow-[#9B8CFF]/20'
                                      : 'bg-gradient-to-r from-[#7C6AF2] to-[#9B8CFF] text-white hover:shadow-lg hover:shadow-[#7C6AF2]/20'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <Sparkles className="w-4 h-4" />
                                Save to TAGZZS
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Analyzing State */}
                {viewState === 'analyzing' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center"
                  >
                    <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${
                      isDark ? 'bg-[#9B8CFF]/10' : 'bg-[#7C6AF2]/10'
                    }`}>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        🧠
                      </motion.div>
                      <span className={isDark ? 'text-[#9B8CFF]' : 'text-[#7C6AF2]'}>
                        Kai is organizing this…
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Preview State */}
                {viewState === 'preview' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Preview Card */}
                    <motion.div
                      whileHover={{ y: -2 }}
                      className={`rounded-2xl p-5 border transition-all ${
                        isDark
                          ? 'bg-[#0B0B10] border-[#9B8CFF]/20 hover:border-[#9B8CFF]/40'
                          : 'bg-[#F7F6FB] border-[#7C6AF2]/20 hover:border-[#7C6AF2]/40'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        <div className="relative w-40 h-24 rounded-xl overflow-hidden flex-shrink-0">
                          <img
                            src={previewData.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {previewData.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isDark ? 'bg-[#9B8CFF]' : 'bg-[#7C6AF2]'
                              }`}>
                                <div className="w-0 h-0 border-l-8 border-l-white border-y-6 border-y-transparent ml-1" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Content Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className={isDark ? 'text-white' : 'text-gray-900'}>
                              {previewData.title}
                            </h3>
                            <button
                              className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                                isDark
                                  ? 'hover:bg-white/5 text-gray-400 hover:text-white'
                                  : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className={`text-sm mb-3 line-clamp-2 ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {previewData.description}
                          </p>
                          
                          {/* Metadata */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`flex items-center gap-2 text-sm ${
                              isDark ? 'text-gray-500' : 'text-gray-600'
                            }`}>
                              <div className="w-4 h-4 rounded bg-gradient-to-br from-red-500 to-red-600" />
                              <span>{previewData.domain}</span>
                            </div>
                            <span className={`text-sm ${
                              isDark ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                              •
                            </span>
                            <span className={`text-sm ${
                              isDark ? 'text-gray-500' : 'text-gray-600'
                            }`}>
                              {previewData.duration}
                            </span>
                          </div>

                          {/* Tags */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {tags.map((tag, index) => (
                              <span
                                key={index}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
                                  isDark
                                    ? 'bg-[#9B8CFF]/15 text-[#9B8CFF]'
                                    : 'bg-[#7C6AF2]/15 text-[#7C6AF2]'
                                }`}
                              >
                                {tag}
                                <button
                                  onClick={() => removeTag(index)}
                                  className="hover:opacity-70"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                            <button
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all ${
                                isDark
                                  ? 'border border-[#9B8CFF]/30 text-[#9B8CFF] hover:bg-[#9B8CFF]/10'
                                  : 'border border-[#7C6AF2]/30 text-[#7C6AF2] hover:bg-[#7C6AF2]/10'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                              Add Tag
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* AI Analysis Indicator */}
                    <div className={`flex items-center gap-2 text-sm ${
                      isDark ? 'text-gray-500' : 'text-gray-600'
                    }`}>
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        🧠
                      </motion.span>
                      <span>Kai is organizing this…</span>
                    </div>

                    {/* Optional Details */}
                    <div>
                      <button
                        onClick={() => setDetailsExpanded(!detailsExpanded)}
                        className={`flex items-center gap-2 py-2 transition-all ${
                          isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <motion.div
                          animate={{ rotate: detailsExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </motion.div>
                        <span>Add details (optional)</span>
                      </button>

                      <AnimatePresence>
                        {detailsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 mt-4 overflow-hidden"
                          >
                            <div>
                              <label className={`block mb-2 ${
                                isDark ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                Title
                              </label>
                              <input
                                type="text"
                                value={previewData.title}
                                onChange={(e) => setPreviewData({ ...previewData, title: e.target.value })}
                                className={`w-full px-4 py-2 rounded-xl border transition-all outline-none ${
                                  isDark
                                    ? 'bg-[#0B0B10] border-[#9B8CFF]/20 text-white focus:border-[#9B8CFF]/50'
                                    : 'bg-white border-[#7C6AF2]/20 text-gray-900 focus:border-[#7C6AF2]/50'
                                }`}
                              />
                            </div>

                            <div>
                              <label className={`block mb-2 ${
                                isDark ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                Description
                              </label>
                              <textarea
                                value={previewData.description}
                                onChange={(e) => setPreviewData({ ...previewData, description: e.target.value })}
                                rows={3}
                                className={`w-full px-4 py-2 rounded-xl border transition-all outline-none resize-none ${
                                  isDark
                                    ? 'bg-[#0B0B10] border-[#9B8CFF]/20 text-white focus:border-[#9B8CFF]/50'
                                    : 'bg-white border-[#7C6AF2]/20 text-gray-900 focus:border-[#7C6AF2]/50'
                                }`}
                              />
                            </div>

                            <div>
                              <label className={`block mb-2 ${
                                isDark ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                Tags {tags.length}/10
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newTag}
                                  onChange={(e) => setNewTag(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                                  placeholder="Add a tag..."
                                  className={`flex-1 px-4 py-2 rounded-xl border transition-all outline-none ${
                                    isDark
                                      ? 'bg-[#0B0B10] border-[#9B8CFF]/20 text-white placeholder:text-gray-600 focus:border-[#9B8CFF]/50'
                                      : 'bg-white border-[#7C6AF2]/20 text-gray-900 placeholder:text-gray-400 focus:border-[#7C6AF2]/50'
                                  }`}
                                />
                                <button
                                  onClick={addTag}
                                  disabled={!newTag.trim() || tags.length >= 10}
                                  className={`px-4 py-2 rounded-xl transition-all ${
                                    newTag.trim() && tags.length < 10
                                      ? isDark
                                        ? 'bg-[#9B8CFF]/20 text-[#9B8CFF] hover:bg-[#9B8CFF]/30'
                                        : 'bg-[#7C6AF2]/20 text-[#7C6AF2] hover:bg-[#7C6AF2]/30'
                                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}
                                >
                                  Add
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className={`block mb-2 ${
                                isDark ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                Personal Notes
                              </label>
                              <textarea
                                placeholder="Why did you save this? Key takeaways…"
                                rows={4}
                                className={`w-full px-4 py-2 rounded-xl border transition-all outline-none resize-none ${
                                  isDark
                                    ? 'bg-[#0B0B10] border-[#9B8CFF]/20 text-white placeholder:text-gray-600 focus:border-[#9B8CFF]/50'
                                    : 'bg-white border-[#7C6AF2]/20 text-gray-900 placeholder:text-gray-400 focus:border-[#7C6AF2]/50'
                                }`}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={`px-8 py-5 border-t ${
              isDark ? 'border-[#9B8CFF]/10' : 'border-[#7C6AF2]/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setAiAssistantExpanded(!aiAssistantExpanded)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      isDark
                        ? 'text-[#9B8CFF] hover:bg-[#9B8CFF]/10'
                        : 'text-[#7C6AF2] hover:bg-[#7C6AF2]/10'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Ask Kai about this content</span>
                  </button>

                  <select
                    className={`px-4 py-2 rounded-xl border transition-all outline-none ${
                      isDark
                        ? 'bg-[#0B0B10] border-[#9B8CFF]/20 text-white'
                        : 'bg-white border-[#7C6AF2]/20 text-gray-900'
                    }`}
                  >
                    <option>Summary style: Concise</option>
                    <option>Summary style: Detailed</option>
                    <option>Summary style: Bullet Points</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className={`px-6 py-2 rounded-xl transition-all ${
                      isDark
                        ? 'text-gray-400 hover:text-white hover:bg-white/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={viewState !== 'preview'}
                    className={`px-8 py-2 rounded-xl transition-all ${
                      viewState === 'preview'
                        ? isDark
                          ? 'bg-gradient-to-r from-[#9B8CFF] to-[#7C6AF2] text-white hover:shadow-lg hover:shadow-[#9B8CFF]/30'
                          : 'bg-gradient-to-r from-[#7C6AF2] to-[#9B8CFF] text-white hover:shadow-lg hover:shadow-[#7C6AF2]/30'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Save to TAGZZS
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}