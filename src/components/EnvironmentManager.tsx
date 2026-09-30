
import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useGlobalStore } from '../store/GlobalStore';

const EnvironmentManager: React.FC = () => {
    const { state } = useGlobalStore();
    const { config, backendStatus } = state;
    const [status, setStatus] = useState<{
        hasVenv: boolean;
        isExternallyManaged: boolean;
        pythonPath: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [fixing, setFixing] = useState(false);

    const getBackendUrl = () => {
        let url = config.activeBackend === 'pc' ? config.pcBackendUrl : config.customBackendUrl;
        if (!url) return '';
        url = url.trim().replace(/\/$/, '');
        if (!url.startsWith('http')) {
            url = window.location.protocol === 'https:' ? 'https://' + url : 'http://' + url;
        }
        return url;
    };

    const checkStatus = async () => {
        const backendUrl = getBackendUrl();
        if (!backendUrl || backendStatus !== 'online') return;

        setLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/env-status`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'bypass-tunnel-reminder': 'true'
                }
            });
            if (!res.ok) {
                console.warn(`Backend env-status returned ${res.status}. Falling back to default.`);
                setStatus({
                    hasVenv: true,
                    isExternallyManaged: false,
                    pythonPath: "python (legacy backend)"
                });
                return;
            }
            const data = await res.json();
            setStatus(data);
        } catch (err: any) {
            if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
                // Suppress network errors from polluting console since offline/unavailable backend is expected
                console.warn('Backend is offline or unreachable (env-status fetch failed).');
            } else {
                console.error('Failed to check env status:', err);
            }
            setStatus(null);
        } finally {
            setLoading(false);
        }
    };

    const fixEnvironment = async () => {
        const backendUrl = getBackendUrl();
        if (!backendUrl) return;

        setFixing(true);
        try {
            const res = await fetch(`${backendUrl}/api/env-fix`, { 
                method: 'POST',
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'bypass-tunnel-reminder': 'true',
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success) {
                alert('Environment Fixed: Virtual Environment created and dependencies installed.');
                checkStatus();
            } else {
                alert('Fix Failed: ' + data.output);
            }
        } catch (err) {
            alert('Error connecting to backend.');
        } finally {
            setFixing(false);
        }
    };

    useEffect(() => {
        if (backendStatus === 'online') {
            checkStatus();
        } else {
            setStatus(null);
        }
    }, [backendStatus, config.customBackendUrl, config.pcBackendUrl, config.activeBackend]);

    if (!status && loading) return <Loader2 className="animate-spin text-gray-500" size={14} />;
    if (!status) return null;

    const needsFix = status.isExternallyManaged && !status.hasVenv;

    return (
        <div className="flex items-center gap-2 px-2 py-1 border border-white/10 rounded bg-black/40 ">
            {needsFix ? (
                <button 
                    onClick={fixEnvironment}
                    disabled={fixing}
                    className="flex items-center gap-2 bg-[#ff0033] text-black px-3 py-1 rounded text-[9px] font-black animate-pulse hover:scale-105 transition-all"
                >
                    {fixing ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />}
                    FIX PYTHON ENV (PEP 668)
                </button>
            ) : (
                <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-tighter">
                    {status.hasVenv ? (
                        <span className="text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 size={10} /> VENV_ACTIVE
                        </span>
                    ) : (
                        <span className="text-gray-500 flex items-center gap-1">
                            <AlertTriangle size={10} /> SYS_PYTHON
                        </span>
                    )}
                    <button onClick={checkStatus} className="hover:text-white text-gray-600">
                        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default EnvironmentManager;
