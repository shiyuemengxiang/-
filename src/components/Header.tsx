import React, { useState } from 'react';
import { ShieldCheck, Cpu, Settings, Activity, Globe, Wifi } from 'lucide-react';
import { LongPortConfig } from '../types';

interface HeaderProps {
  config: LongPortConfig;
  onSaveConfig: (cfg: { appKey: string; appSecret: string; accessToken: string; mode: 'sandbox' | 'live' }) => void;
  systemStatus: 'connected' | 'simulating';
}

export default function Header({ config, onSaveConfig, systemStatus }: HeaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [appKey, setAppKey] = useState(config.appKey || '');
  const [appSecret, setAppSecret] = useState(config.appSecret || '');
  const [accessToken, setAccessToken] = useState(config.accessToken || '');
  const [mode, setMode] = useState<'sandbox' | 'live'>(config.mode || 'sandbox');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({ appKey, appSecret, accessToken, mode });
    setShowModal(false);
  };

  return (
    <header className="bg-[#1E293B] text-slate-250 border-b border-slate-700 px-4 h-14 flex items-center justify-between shrink-0 select-none" id="app-header">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 text-white p-1.5 rounded flex items-center justify-center">
          <Activity className="h-4.5 w-4.5" />
        </div>
        <div>
          <h1 className="font-sans font-semibold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
            LongPort <span className="text-blue-400 font-medium text-xs">OpenAPI 证券交易终端</span>
          </h1>
          <p className="text-[10px] text-slate-400 hidden sm:block">极速响应 • 简洁美观 • 模拟实盘一体化</p>
        </div>
      </div>

      {/* Network Status / Mode indicator */}
      <div className="flex items-center gap-4">
        {/* Environment Status Badge */}
        <div className="hidden md:flex items-center gap-2 text-[10px] bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${systemStatus === 'connected' ? 'bg-indigo-500' : 'bg-red-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${systemStatus === 'connected' ? 'bg-indigo-500' : 'bg-red-400'}`}></span>
          </span>
          <span className="text-slate-400">
            模式: {config.isConnected && config.mode === 'live' ? (
              <span className="text-indigo-400 font-medium flex items-center gap-1 inline-flex">
                <Wifi className="h-3 w-3 inline" /> 实盘连接模式 (Live)
              </span>
            ) : (
              <span className="text-red-400 font-medium flex items-center gap-1 inline-flex">
                <Cpu className="h-3 w-3 inline" /> 极速沙盒模拟 (Sandbox)
              </span>
            )}
          </span>
        </div>

        {/* API connection button */}
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1.5 text-[11px] py-1.5 px-3 rounded font-medium transition-all ${
            config.isConnected 
              ? 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/15'
          }`}
          id="btn-longport-config"
        >
          <Settings className="h-3.5 w-3.5" />
          {config.isConnected ? '已配置 LongPort API' : '对接 LongPort OpenAPI'}
        </button>
      </div>

      {/* Configuration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-700 rounded-lg max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-start">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  LongPort OpenAPI 凭据配置
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">设置凭据后，将尝试使用您的 LongPort 证券账户实盘交易通道。</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">环境选择 (Mode)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('sandbox')}
                    className={`py-1.5 px-2 border rounded text-xs font-medium transition-all ${
                      mode === 'sandbox' 
                        ? 'border-blue-500 bg-blue-950/20 text-blue-400' 
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    模拟沙盒 (Sandbox)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('live')}
                    className={`py-1.5 px-2 border rounded text-xs font-medium transition-all ${
                      mode === 'live' 
                        ? 'border-blue-500 bg-blue-950/20 text-blue-400' 
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    实盘系统 (Live Production)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">AppKey</label>
                <input
                  type="text"
                  required
                  placeholder="长桥 AppKey"
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs p-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">AppSecret</label>
                <input
                  type="password"
                  required
                  placeholder="长桥 AppSecret 密钥"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs p-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">AccessToken</label>
                <textarea
                  required
                  rows={2}
                  placeholder="长桥 Access Token 访问令牌"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs p-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="bg-blue-950/10 border border-blue-900/20 p-2.5 rounded text-[10px] text-blue-400 leading-relaxed">
                💡 <span className="font-semibold">提示:</span> 终端使用业界标准对称签名。您的凭据将被传输到安全的后端，此演示不会泄露给浏览器。若没有真实的 AppKey，可随时切换回沙盒模式体验零成本高保真模拟交易。
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium shadow-md shadow-blue-600/10"
                >
                  保存并连接
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
