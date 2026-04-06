import React, { useState } from 'react';
import { Activity, Lock, User } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Accept any input for the mock login
    if (username && password) {
      onLogin();
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 flex items-center justify-center font-sans overflow-hidden">
      
      {/* Cool background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="glass-panel p-8 w-full max-w-md z-10 flex flex-col items-center">
        
        <div className="p-3 bg-sky-500/10 rounded-2xl mb-4 border border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
          <Activity className="w-10 h-10 text-sky-400" />
        </div>
        
        <h1 className="text-3xl font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-emerald-400 neon-text mb-2">
          AML Sentinel
        </h1>
        <p className="text-slate-400 text-sm font-mono mb-8 uppercase tracking-widest">Admin Portal</p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 uppercase font-bold tracking-widest">Admin ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter ID..."
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg p-3 pl-10 text-slate-200 focus:outline-none focus:border-sky-500 transition-all font-mono text-sm"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 uppercase font-bold tracking-widest">Passphrase</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg p-3 pl-10 text-slate-200 focus:outline-none focus:border-sky-500 transition-all font-mono text-sm"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="mt-4 w-full bg-gradient-to-r from-sky-500/20 to-emerald-500/20 hover:from-sky-500/40 hover:to-emerald-500/40 border border-sky-500/50 text-sky-300 rounded-lg p-3 font-black uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(14,165,233,0.2)] hover:shadow-[0_0_20px_rgba(14,165,233,0.4)]"
          >
            Authorize Access
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-800/50 w-full text-center">
          <p className="text-slate-600 text-xs font-mono">Any credentials accepted for demo</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
