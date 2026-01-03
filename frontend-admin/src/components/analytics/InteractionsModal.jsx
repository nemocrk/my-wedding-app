import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipBack, Loader, Clock, Monitor, MapPin, Activity, MousePointer, Info } from 'lucide-react';
import { api } from '../../services/api';

const InteractionsModal = ({ invitationId, invitationName, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Replay State
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const containerRef = useRef(null);

  // Load interactions data
  useEffect(() => {
    const fetchInteractions = async () => {
      try {
        const data = await api.getInvitationInteractions(invitationId);
        setSessions(data);
        if (data.length > 0) setSelectedSession(data[0]);
      } catch (err) {
        console.error("Failed to load interactions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInteractions();
  }, [invitationId]);

  // Handle Playback Logic
  useEffect(() => {
    if (!selectedSession || !selectedSession.heatmap || !isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const mouseData = selectedSession.heatmap.mouse_data;
    if (!mouseData || mouseData.length < 2) return;

    const startTime = mouseData[0].t;
    const endTime = mouseData[mouseData.length - 1].t;
    const duration = endTime - startTime;
    
    let startTimestamp = null;
    let initialProgress = progress;

    const animate = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      
      const elapsed = timestamp - startTimestamp;
      const currentPlayTime = (initialProgress * duration) + (elapsed * 1); 

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
  }, [isPlaying, selectedSession]); 

  // Manual Seek
  useEffect(() => {
      if (selectedSession?.heatmap) drawCanvas(progress);
  }, [progress, selectedSession]);

  const drawCanvas = (currentProgress) => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedSession?.heatmap) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const heatmap = selectedSession.heatmap;
    const data = heatmap.mouse_data;
    
    ctx.clearRect(0, 0, width, height);
    
    const scaleX = width / heatmap.screen_width;
    const scaleY = height / heatmap.screen_height;

    // Draw full path trace
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

    // Calculate current time target
    const startTime = data[0].t;
    const endTime = data[data.length - 1].t;
    const targetTime = startTime + ((endTime - startTime) * currentProgress);

    // Draw active path
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
        ctx.fillStyle = '#db2777'; 
        ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(219, 39, 119, 0.4)';
        ctx.lineWidth = 10;
        ctx.arc(lastPoint.x, lastPoint.y, 10, 0, Math.PI * 2);
        ctx.stroke();
    }
  };

  const getEventIcon = (type) => {
      if (type.includes('visit')) return <Monitor size={14} className="text-blue-500"/>;
      if (type.includes('rsvp')) return <Activity size={14} className="text-green-500"/>;
      if (type.includes('click')) return <MousePointer size={14} className="text-purple-500"/>;
      return <Info size={14} className="text-gray-400"/>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Analisi Interazioni: {invitationName}</h3>
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
            {/* Sidebar List (Sessions) */}
            <div className="w-72 border-r border-gray-100 overflow-y-auto bg-gray-50 flex flex-col">
                <div className="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sessioni</div>
                <div className="flex-1 space-y-2 p-2 pt-0">
                    {loading ? (
                        <div className="flex justify-center py-4"><Loader className="animate-spin text-pink-600"/></div>
                    ) : sessions.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm mt-4">Nessuna interazione</p>
                    ) : (
                        sessions.map((sess, idx) => (
                            <div 
                                key={sess.session_id}
                                onClick={() => {
                                    setSelectedSession(sess);
                                    setProgress(0);
                                    setIsPlaying(false);
                                }}
                                className={`p-3 rounded-lg cursor-pointer text-sm transition-all border ${
                                    selectedSession?.session_id === sess.session_id 
                                    ? 'bg-white shadow-md border-pink-500' 
                                    : 'bg-white border-transparent hover:border-gray-200 text-gray-600'
                                }`}
                            >
                                <div className="font-semibold mb-1 flex items-center justify-between">
                                    <span>#{sessions.length - idx}</span>
                                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{sess.events.length} eventi</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <Clock size={12} className="mr-1"/>
                                    {new Date(sess.start_time).toLocaleString()}
                                </div>
                                <div className="flex items-center text-xs text-gray-500">
                                    <Monitor size={12} className="mr-1"/>
                                    <span className="truncate">{sess.device_info}</span>
                                </div>
                                {sess.heatmap && (
                                     <div className="mt-2 flex items-center text-xs text-pink-600 font-medium">
                                         <Play size={10} className="mr-1"/> Replay disponibile
                                     </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Middle Panel (Event Timeline) */}
            <div className="w-80 border-r border-gray-100 overflow-y-auto bg-white p-4">
                <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                    <Activity size={16} className="mr-2 text-pink-600"/>
                    Timeline Eventi
                </h4>
                
                {!selectedSession ? (
                     <p className="text-sm text-gray-400">Seleziona una sessione</p>
                ) : (
                    <div className="space-y-4 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-100"></div>

                        {selectedSession.events.map((evt, idx) => (
                            <div key={idx} className="relative pl-8 group">
                                <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 bg-white border-2 border-gray-200 rounded-full group-hover:border-pink-500 transition-colors z-10"></div>
                                <div className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100 group-hover:shadow-sm transition-all">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-gray-700 capitalize flex items-center gap-2">
                                            {getEventIcon(evt.type)}
                                            {evt.type.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(evt.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                        </span>
                                    </div>
                                    {evt.details && Object.keys(evt.details).length > 0 && (
                                        <div className="mt-1 text-xs text-gray-500 bg-white p-1.5 rounded border border-gray-100 overflow-x-auto">
                                            <pre>{JSON.stringify(evt.details, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Panel (Replay Canvas) */}
            <div className="flex-1 bg-gray-100 relative flex flex-col overflow-hidden">
                 <div className="p-3 bg-white border-b border-gray-100 flex justify-between items-center">
                     <h4 className="text-sm font-bold text-gray-800 flex items-center">
                         <MousePointer size={16} className="mr-2 text-pink-600"/>
                         Replay Sessione
                     </h4>
                     {!selectedSession?.heatmap && <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded">Nessun dato heatmap</span>}
                 </div>

                <div className="flex-1 relative flex items-center justify-center overflow-auto p-4 bg-gray-50/50" ref={containerRef}>
                    {selectedSession?.heatmap ? (
                        <div 
                            className="relative bg-white shadow-lg border border-gray-200"
                            style={{
                                width: '100%',
                                maxWidth: '800px',
                                aspectRatio: `${selectedSession.heatmap.screen_width} / ${selectedSession.heatmap.screen_height}`
                            }}
                        >
                             <canvas 
                                ref={canvasRef}
                                width={selectedSession.heatmap.screen_width}
                                height={selectedSession.heatmap.screen_height}
                                className="w-full h-full block"
                             />
                             
                             {/* Controls Overlay */}
                             <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg rounded-full px-4 py-2 flex items-center gap-4 z-10 border border-gray-100">
                                 <button 
                                    onClick={() => { setProgress(0); setIsPlaying(true); }}
                                    className="p-1 hover:text-pink-600"
                                    title="Riavvia"
                                 >
                                     <SkipBack size={18} />
                                 </button>
                                 <button 
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="p-2 bg-pink-600 text-white rounded-full hover:bg-pink-700 shadow-md transform active:scale-95 transition-all"
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
                                 <span className="text-xs font-mono w-10 text-right text-gray-600">
                                     {Math.round(progress * 100)}%
                                 </span>
                             </div>
                        </div>
                    ) : (
                        <div className="text-gray-300 flex flex-col items-center">
                            <Monitor size={64} className="mb-4 opacity-20" />
                            <p className="text-sm">Seleziona una sessione con dati heatmap per vedere il replay</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InteractionsModal;
