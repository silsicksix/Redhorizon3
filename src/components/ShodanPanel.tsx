
import React from 'react';
import { ShodanHost } from '../types';
import { Shield, Globe, Server, AlertTriangle, X } from 'lucide-react';

interface ShodanPanelProps {
  data: ShodanHost;
  onClose: () => void;
}

const ShodanPanel: React.FC<ShodanPanelProps> = ({ data, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90  p-4">
      <div className="w-full max-w-2xl bg-[#0a0a0a] border-2 border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.2)] font-mono flex flex-col max-h-[90vh]">
         
         <div className="flex justify-between items-center p-4 border-b border-orange-500/50 bg-orange-900/10">
            <div className="flex items-center gap-3">
                <Shield className="text-orange-500" size={24} />
                <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest">Shodan Intelligence</h2>
                    <p className="text-[10px] text-orange-400">NETWORK RECONNAISSANCE</p>
                </div>
            </div>
            <button onClick={onClose}><X className="text-orange-500 hover:text-white" /></button>
         </div>

         <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            
            {data.isSimulated && (
                <div className="bg-yellow-900/20 border border-yellow-600 p-3 flex items-center gap-3 text-yellow-500">
                    <AlertTriangle size={20} />
                    <div className="text-xs">
                        <strong>SIMULATION MODE ACTIVE:</strong> Real Shodan data requires a configured backend or API key to bypass CORS.
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#111] p-3 border border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">IP Address</div>
                    <div className="text-lg text-white font-bold">{data.ip_str}</div>
                </div>
                <div className="bg-[#111] p-3 border border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Organization / ISP</div>
                    <div className="text-sm text-white">{data.org || data.isp}</div>
                </div>
                <div className="bg-[#111] p-3 border border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Location</div>
                    <div className="text-sm text-white flex items-center gap-2">
                        <Globe size={12} className="text-blue-500" /> {data.city}, {data.country_name}
                    </div>
                </div>
                <div className="bg-[#111] p-3 border border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Operating System</div>
                    <div className="text-sm text-white flex items-center gap-2">
                        <Server size={12} className="text-gray-400" /> {data.os || 'Unknown'}
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-orange-500 font-bold uppercase text-xs mb-3">Open Ports</h3>
                <div className="flex gap-2 flex-wrap">
                    {(data.ports || []).map(port => (
                        <span key={port} className="px-2 py-1 bg-orange-900/20 text-orange-400 border border-orange-700 text-xs font-bold rounded">
                            {port}
                        </span>
                    ))}
                </div>
            </div>

            {data.vulns && data.vulns.length > 0 && (
                <div>
                    <h3 className="text-red-500 font-bold uppercase text-xs mb-3">Vulnerabilities (CVE)</h3>
                    <div className="flex gap-2 flex-wrap">
                        {data.vulns.map(vuln => (
                            <span key={vuln} className="px-2 py-1 bg-red-900/20 text-red-500 border border-red-700 text-xs font-bold rounded">
                                {vuln}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {data.data && (
                <div>
                    <h3 className="text-gray-400 font-bold uppercase text-xs mb-3">Banner Grab</h3>
                    <div className="space-y-2">
                        {data.data.map((service, i) => (
                            <div key={i} className="bg-black border border-gray-800 p-3 font-mono text-[10px] text-gray-300 whitespace-pre-wrap overflow-x-auto">
                                <div className="text-orange-500 font-bold mb-1">PORT {service.port} ({service.product})</div>
                                {service.data}
                            </div>
                        ))}
                    </div>
                </div>
            )}

         </div>

      </div>
    </div>
  );
};

export default ShodanPanel;
