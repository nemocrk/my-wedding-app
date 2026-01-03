import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipBack, Loader } from 'lucide-react';
import { api } from '../../services/api';

const SessionReplayModal = ({ invitationId, invitationName, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const containerRef = useRef(null);

  // Load heatmap data
  useEffect(() => {
    const fetchHeatmaps = async () => {
      try {
        const data = await api.getInvitationHeatmaps(invitationId);
        setSessions(data);
        if (data.length > 0) setSelectedSession(data[0]);
      } catch (err) {
        console.error("Failed to load heatmaps", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmaps();
  }, [invitationId]);

  // Handle Playback Logic
  useEffect(() => {
    if (!selectedSession || !isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const mouseData = selectedSession.mouse_data;
    if (!mouseData || mouseData.length < 2) return;

    const startTime = mouseData[0].t;
    const endTime = mouseData[mouseData.length - 1].t;
    const duration = endTime - startTime;
    
    // Resume from current progress
    let startTimestamp = null;
    let initialProgress = progress;

    const animate = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      
      const elapsed = timestamp - startTimestamp;
      // Normalizziamo il tempo corrente in base alla percentuale già avanzata
      const currentPlayTime = (initialProgress * duration) + (elapsed * 1); // *1 per velocità normale

      let newProgress = currentPlayTime / duration;
      
      if (newProgress >= 1) {
        newProgress = 1;
        setIsPlaying(false);
      }

      setProgress(newProgress);
      drawCanvas(newProgress);

      if (newProgress < 1 && isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, selectedSession]); // removed progress from deps to avoid loop reset, handle logically

  // Manual Seek
  useEffect(() => {
      if (selectedSession) drawCanvas(progress);
  }, [progress, selectedSession]);

  const drawCanvas = (currentProgress) => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedSession) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const data = selectedSession.mouse_data;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Scale factors
    const scaleX = width / selectedSession.screen_width;
    const scaleY = height / selectedSession.screen_height;

    // Draw full path as faint background
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    data.forEach((point, i) => {
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Calculate current time
    const startTime = data[0].t;
    const endTime = data[data.length - 1].t;
    const targetTime = startTime + ((endTime - startTime) * currentProgress);

    // Draw active path up to current time
    ctx.beginPath();
    ctx.strokeStyle = '#ec4899'; // Pink-600
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    let lastPoint = null;

    for (let i = 0; i < data.length; i++) {
        if (data[i].t > targetTime) break;
        
        const x = data[i].x * scaleX;
        const y = data[i].y * scaleY;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        lastPoint = { x, y };
    }
    ctx.stroke();

    // Draw cursor
    if (lastPoint) {
        ctx.beginPath();
        ctx.fillStyle = '#db2777'; // Pink-700
        ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Ring
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(219, 39, 119, 0.4)';
        ctx.lineWidth = 10;
        ctx.arc(lastPoint.x, lastPoint.y, 10, 0, Math.PI * 2);
        ctx.stroke();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Replay Sessione: {invitationName}</h3>
            <p className="text-sm text-gray-500">
               {sessions.length} sessioni registrate
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar List */}
            <div className="w-64 border-r border-gray-100 overflow-y-auto bg-gray-50 p-2 space-y-2">
                {loading ? (
                    <div className="flex justify-center py-4"><Loader className="animate-spin text-pink-600"/></div>
                ) : sessions.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm mt-4">Nessuna registrazione</p>
                ) : (
                    sessions.map((sess, idx) => (
                        <div 
                            key={sess.id}
                            onClick={() => {
                                setSelectedSession(sess);
                                setProgress(0);
                                setIsPlaying(false);
                            }}
                            className={`p-3 rounded-lg cursor-pointer text-sm transition-all ${
                                selectedSession?.id === sess.id 
                                ? 'bg-white shadow-md border-l-4 border-pink-500' 
                                : 'hover:bg-white hover:shadow-sm text-gray-600'
                            }`}
                        >
                            <div className="font-semibold mb-1">Sessione #{sessions.length - idx}</div>
                            <div className="text-xs text-gray-400">
                                {new Date(sess.timestamp).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                {sess.mouse_data?.length || 0} punti · {sess.screen_width}x{sess.screen_height}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Canvas Area */}
            <div className="flex-1 bg-gray-100 relative flex items-center justify-center overflow-auto p-4" ref={containerRef}>
                {selectedSession ? (
                    <div 
                        className="relative bg-white shadow-lg border border-gray-200"
                        style={{
                            width: '100%',
                            maxWidth: '800px', // Limite visivo
                            aspectRatio: `${selectedSession.screen_width} / ${selectedSession.screen_height}`
                        }}
                    >
                         <canvas 
                            ref={canvasRef}
                            width={selectedSession.screen_width}
                            height={selectedSession.screen_height}
                            className="w-full h-full block"
                         />
                         
                         {/* Controls Overlay */}
                         <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg rounded-full px-4 py-2 flex items-center gap-4">
                             <button 
                                onClick={() => { setProgress(0); setIsPlaying(true); }}
                                className="p-1 hover:text-pink-600"
                                title="Riavvia"
                             >
                                 <SkipBack size={18} />
                             </button>
                             <button 
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="p-2 bg-pink-600 text-white rounded-full hover:bg-pink-700 shadow-md"
                             >
                                 {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                             </button>
                             <div className="w-32 bg-gray-200 rounded-full h-1.5 cursor-pointer relative group"
                                  onClick={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const x = e.clientX - rect.left;
                                      const newProg = Math.max(0, Math.min(1, x / rect.width));
                                      setProgress(newProg);
                                  }}
                             >
                                 <div 
                                    className="bg-pink-500 h-1.5 rounded-full absolute top-0 left-0" 
                                    style={{ width: `${progress * 100}%` }}
                                 />
                                 <div 
                                    className="w-3 h-3 bg-pink-600 rounded-full absolute top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 shadow transition-opacity"
                                    style={{ left: `${progress * 100}%` }} 
                                 />
                             </div>
                             <span className="text-xs font-mono w-10 text-right">
                                 {Math.round(progress * 100)}%
                             </span>
                         </div>
                    </div>
                ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                        <Play size={48} className="mb-2 opacity-20" />
                        <p>Seleziona una sessione per vederne il replay</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SessionReplayModal;
