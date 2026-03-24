import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, CheckCircle2, XCircle, Play, Terminal, Smartphone, Hash, Zap, 
  Loader2, Settings, Bomb, Menu, X, ChevronRight, ShieldCheck, UserCheck, 
  Lock, MessageCircle, LayoutDashboard, Activity, History, Globe, Cpu, 
  ArrowUpRight, Clock, AlertCircle, Copy, ExternalLink, Server, Database, 
  Wifi, MoreVertical, Search, RefreshCw, Trash2, Rocket, Shield, ZapOff, 
  Sparkles, Mail, LogIn, LogOut, Plus, Key, BarChart3, Info, LogIn as LogInIcon, PlusCircle,
  Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';

interface LogEntry {
  id: string;
  service: string;
  status: 'SUCCESS' | 'FAILED';
  code?: number;
  error?: string;
  timestamp: string;
}

interface ProgressData {
  completed: number;
  successful: number;
  failed: number;
  total: number;
}

interface HistoryEntry {
  id: string;
  target: string;
  type: 'SMS' | 'GARENA' | 'EMAIL';
  status: 'COMPLETED' | 'FAILED';
  timestamp: string;
  details: string;
}

type View = 'dashboard' | 'bomber' | 'garena' | 'settings' | 'upcoming' | 'email' | 'admin' | 'login';

// --- Components ---
export default function App() {
  const [number, setNumber] = useState('');
  const [totalRequests, setTotalRequests] = useState(10);
  const [isTesting, setIsTesting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userKey, setUserKey] = useState('');
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [isCheckingKey, setIsCheckingKey] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    }
    return 'light';
  });
  const [dbStatus, setDbStatus] = useState<{ status: string; time?: string; message?: string } | null>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const checkDbHealth = async () => {
    try {
      const res = await fetch('/api/db-health');
      const data = await res.json();
      if (!res.ok) {
        setDbStatus({ status: 'error', message: data.message || 'Failed to connect to database' });
        return;
      }
      setDbStatus(data);
    } catch (err: any) {
      let message = 'Failed to connect to database';
      if (err.message?.includes('EAI_AGAIN') || err.message?.includes('ENOTFOUND') || err.message?.includes('dpg-')) {
        message = 'DATABASE CONNECTION FAILED: You are using an "Internal Connection String" (dpg-...). Please use the "External Connection String" from Render instead.';
      } else if (err.message?.includes('DATABASE_URL is missing')) {
        message = 'DATABASE_URL is missing. Please add your PostgreSQL "External Connection String" to the AI Studio Secrets panel.';
      }
      setDbStatus({ status: 'error', message });
    }
  };

  useEffect(() => {
    checkDbHealth();
  }, []);

  // Admin Panel States
  const [allKeys, setAllKeys] = useState<any[]>([]);
  const [newKeyDuration, setNewKeyDuration] = useState(24); // hours
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      setIsAuthLoading(true);
      
      // Master key check overrides everything and is synchronous
      const storedKey = localStorage.getItem('toolbox_key');
      if (storedKey === 'DEVADMINKEY@021412') {
        setIsAdmin(true);
        setIsKeyValid(true);
        setIsAuthLoading(false);
        return;
      }

      let adminStatus = false;
      
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            adminStatus = userDoc.data().role === 'admin';
          } else {
            // Check if this is the owner email to auto-grant admin
            const isOwner = fbUser.email === 'joshleetabisula79@gmail.com';
            await setDoc(doc(db, 'users', fbUser.uid), {
              email: fbUser.email,
              role: isOwner ? 'admin' : 'user',
              createdAt: serverTimestamp()
            });
            if (isOwner) adminStatus = true;
          }
        } catch (err) {
          console.error("Error fetching user doc:", err);
        }
      }

      setIsAdmin(adminStatus);
      if (storedKey) {
        validateKey(storedKey);
      }
      
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const validateKey = async (key: string) => {
    setIsCheckingKey(true);
    setKeyError('');
    
    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await response.json();
      
      if (data.status === 'SUCCESS') {
        setIsKeyValid(true);
        localStorage.setItem('toolbox_key', key);
        if (key === 'DEVADMINKEY@021412') setIsAdmin(true);
      } else if (data.status === 'EXPIRED') {
        setKeyError(`Key expired on ${data.expiration}`);
        setIsKeyValid(false);
      } else {
        setKeyError('Invalid access key.');
        setIsKeyValid(false);
      }
    } catch (err) {
      console.error("Error validating key:", err);
      setKeyError('Connection error during validation.');
    } finally {
      setIsCheckingKey(false);
    }
  };

  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoginError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setLoginError('Login cancelled. Please complete the sign-in process in the popup.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore multiple popup requests
      } else {
        console.error("Login error:", err);
        setLoginError(`Login failed: ${err.message}`);
      }
      setTimeout(() => setLoginError(''), 5000);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('toolbox_key');
    setCurrentView('dashboard');
  };

  const generateKey = async () => {
    if (!isAdmin) {
      setAdminError('System Error: Admin privileges not detected.');
      return;
    }
    
    setIsGeneratingKey(true);
    setAdminError('');
    setAdminSuccess('');

    try {
      const prefix = "OMNI-";
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      const key = `${prefix}${randomPart}`;
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + newKeyDuration);
      const expirationStr = expiresAt.toISOString().split('T')[0];
      
      const response = await fetch('/api/admin/add-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key, 
          expiration: expirationStr, 
          adminKey: localStorage.getItem('toolbox_key') 
        }),
      });
      
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        setAdminSuccess(`SUCCESS: Key ${key} is now active.`);
        fetchKeys();
        setTimeout(() => setAdminSuccess(''), 8000);
      } else {
        setAdminError(data.error || 'Failed to generate key');
      }
    } catch (err: any) {
      setAdminError(`SYSTEM ERROR: ${err.message}`);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const fetchKeys = async () => {
    try {
      const response = await fetch(`/api/admin/keys?adminKey=${localStorage.getItem('toolbox_key')}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setAllKeys(data);
      }
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!isAdmin) return;

    try {
      const response = await fetch('/api/admin/revoke-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: keyId, 
          adminKey: localStorage.getItem('toolbox_key') 
        }),
      });
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        setAdminSuccess('Key revoked successfully.');
        fetchKeys();
        setTimeout(() => setAdminSuccess(''), 3000);
      } else {
        setAdminError(data.error || 'Failed to revoke key');
      }
    } catch (err: any) {
      setAdminError(`Failed to revoke key: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isAdmin && currentView === 'admin') {
      fetchKeys();
    }
  }, [isAdmin, currentView]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const stopRef = useRef(false);
  const emailStopRef = useRef(false);

  // Email State
  const [email, setEmail] = useState('');
  const [emailRequests, setEmailRequests] = useState(10);
  const [isEmailTesting, setIsEmailTesting] = useState(false);
  const [emailLogs, setEmailLogs] = useState<LogEntry[]>([]);
  const [emailProgress, setEmailProgress] = useState<ProgressData | null>(null);
  const [availableEmailServices, setAvailableEmailServices] = useState<string[]>([]);

  // Garena State
  const [garenaAccount, setGarenaAccount] = useState('');
  const [garenaPassword, setGarenaPassword] = useState('');
  const [isCheckingGarena, setIsCheckingGarena] = useState(false);
  const [garenaResult, setGarenaResult] = useState<any>(null);
  const [garenaTab, setGarenaTab] = useState<'single' | 'bulk'>('single');
  const [garenaBulkFile, setGarenaBulkFile] = useState<File | null>(null);
  const [garenaBulkCookies, setGarenaBulkCookies] = useState<string>('');
  const [isBulkCheckingGarena, setIsBulkCheckingGarena] = useState(false);
  const [garenaBulkResults, setGarenaBulkResults] = useState<any[]>([]);
  const [garenaBulkProgress, setGarenaBulkProgress] = useState({ current: 0, total: 0 });

  const handleGarenaBulkCheck = async () => {
    if (!garenaBulkFile || isBulkCheckingGarena) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.includes(':'));
      const accounts = lines.map(l => {
        const [user, pass] = l.split(':').map(s => s.trim());
        return { user, pass };
      });

      if (accounts.length === 0) {
        alert("No valid accounts found in file. Format: user:pass");
        return;
      }

      setIsBulkCheckingGarena(true);
      setGarenaBulkResults([]);
      setGarenaBulkProgress({ current: 0, total: accounts.length });

      try {
        const response = await fetch('/api/garena/bulk-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            accounts, 
            cookies: garenaBulkCookies ? garenaBulkCookies.split('\n').filter(c => c.trim()) : null 
          }),
        });
        const data = await response.json();
        if (data.status === 'SUCCESS') {
          setGarenaBulkResults(data.results);
        } else {
          alert(`Bulk check failed: ${data.error}`);
        }
      } catch (err: any) {
        alert(`Bulk check error: ${err.message}`);
      } finally {
        setIsBulkCheckingGarena(false);
      }
    };
    reader.readAsText(garenaBulkFile);
  };
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemLogs, setSystemLogs] = useState<{ id: string; msg: string; type: 'info' | 'warn' | 'error' }[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Add some initial system logs
    const initialLogs = [
      { id: '1', msg: 'System kernel initialized', type: 'info' },
      { id: '2', msg: 'Anti-DDoS layer active', type: 'info' },
      { id: '3', msg: 'Vite dev server connected', type: 'info' },
    ];
    setSystemLogs(initialLogs as any);
  }, []);

  useEffect(() => {
    // Load history from local storage
    const savedHistory = localStorage.getItem('omni_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    fetch('/api/services')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => setAvailableServices(data))
      .catch(err => console.error('Failed to fetch services:', err));

    fetch('/api/email-services')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => setAvailableEmailServices(data))
      .catch(err => console.error('Failed to fetch email services:', err));

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('omni_history', JSON.stringify(history));
  }, [history]);

  const addHistory = (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleString()
    };
    setHistory(prev => [newEntry, ...prev].slice(0, 50));
  };

  const handleStart = async () => {
    if (!isKeyValid && !isAdmin) {
      setKeyError('A valid key is required to use this tool.');
      setCurrentView('dashboard');
      return;
    }
    if (!number || isTesting || availableServices.length === 0) return;
    
    setLogs([]);
    setProgress({ completed: 0, successful: 0, failed: 0, total: totalRequests });
    setIsTesting(true);
    stopRef.current = false;

    let completed = 0;
    let successful = 0;
    let failed = 0;

    const batchSize = 5; // Send 5 requests at a time
    const totalBatches = Math.ceil(totalRequests / batchSize);

    for (let b = 0; b < totalBatches; b++) {
      if (stopRef.current) break;

      const currentBatchSize = Math.min(batchSize, totalRequests - completed);
      const batchPromises = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const serviceIndex = Math.floor(Math.random() * availableServices.length);
        
        const promise = fetch('/api/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number, serviceIndex }),
        })
        .then(async response => {
          const result = await response.json();
          if (result.status === 'SUCCESS') {
            successful++;
            setLogs(prev => [{
              id: Math.random().toString(36),
              service: result.name,
              status: 'SUCCESS',
              code: result.code,
              timestamp: new Date().toLocaleTimeString()
            }, ...prev].slice(0, 100));
          } else {
            failed++;
            setLogs(prev => [{
              id: Math.random().toString(36),
              service: 'Service Integration',
              status: 'FAILED',
              error: result.error,
              timestamp: new Date().toLocaleTimeString()
            }, ...prev].slice(0, 100));
          }
        })
        .catch(err => {
          failed++;
          setLogs(prev => [{
            id: Math.random().toString(36),
            service: 'Network',
            status: 'FAILED',
            error: err.message,
            timestamp: new Date().toLocaleTimeString()
          }, ...prev].slice(0, 100));
        })
        .finally(() => {
          completed++;
          setProgress({ completed, successful, failed, total: totalRequests });
        });

        batchPromises.push(promise);
      }

      await Promise.all(batchPromises);
      await new Promise(r => setTimeout(r, 100)); // Small delay between batches
    }

    setIsTesting(false);
    addHistory({
      target: number,
      type: 'SMS',
      status: successful > 0 ? 'COMPLETED' : 'FAILED',
      details: `${successful} successful, ${failed} failed`
    });
  };

  const handleStop = () => {
    stopRef.current = true;
    setIsTesting(false);
  };

  const handleGarenaCheck = async () => {
    if (!isKeyValid && !isAdmin) {
      setKeyError('A valid key is required to use this tool.');
      setCurrentView('dashboard');
      return;
    }
    if (!garenaAccount || !garenaPassword || isCheckingGarena) return;
    
    setIsCheckingGarena(true);
    setGarenaResult(null);

    try {
      const response = await fetch('/api/garena/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: garenaAccount, password: garenaPassword }),
      });
      
      const result = await response.json();
      setGarenaResult(result);
      addHistory({
        target: garenaAccount,
        type: 'GARENA',
        status: result.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
        details: result.status === 'SUCCESS' ? `Nickname: ${result.data.nickname}` : result.error
      });
    } catch (err: any) {
      setGarenaResult({ status: 'FAILED', error: err.message });
    } finally {
      setIsCheckingGarena(false);
    }
  };

  const handleEmailStart = async () => {
    if (!isKeyValid && !isAdmin) {
      setKeyError('A valid key is required to use this tool.');
      setCurrentView('dashboard');
      return;
    }
    if (!email || isEmailTesting || availableEmailServices.length === 0) return;
    
    setEmailLogs([]);
    setEmailProgress({ completed: 0, successful: 0, failed: 0, total: emailRequests });
    setIsEmailTesting(true);
    emailStopRef.current = false;

    let completed = 0;
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < emailRequests; i++) {
      if (emailStopRef.current) break;

      const serviceIndex = Math.floor(Math.random() * availableEmailServices.length);
      
      try {
        const response = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, serviceIndex }),
        });
        
        const result = await response.json();
        
        if (result.status === 'SUCCESS') {
          successful++;
          setEmailLogs(prev => [{
            id: Math.random().toString(36),
            service: result.name,
            status: 'SUCCESS',
            code: result.code,
            timestamp: new Date().toLocaleTimeString()
          }, ...prev].slice(0, 100));
        } else {
          failed++;
          setEmailLogs(prev => [{
            id: Math.random().toString(36),
            service: 'Email Integration',
            status: 'FAILED',
            error: result.error,
            timestamp: new Date().toLocaleTimeString()
          }, ...prev].slice(0, 100));
        }
      } catch (err: any) {
        failed++;
        setEmailLogs(prev => [{
          id: Math.random().toString(36),
          service: 'Network',
          status: 'FAILED',
          error: err.message,
          timestamp: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 100));
      }

      completed++;
      setEmailProgress({ completed, successful, failed, total: emailRequests });
      
      await new Promise(r => setTimeout(r, 300)); // Slightly slower for email
    }

    setIsEmailTesting(false);
    addHistory({
      target: email,
      type: 'EMAIL',
      status: successful > 0 ? 'COMPLETED' : 'FAILED',
      details: `${successful} successful, ${failed} failed`
    });
  };

  const handleEmailStop = () => {
    emailStopRef.current = true;
    setIsEmailTesting(false);
  };

  const successRate = progress ? (progress.successful / progress.completed || 0) * 100 : 0;
  const emailSuccessRate = emailProgress ? (emailProgress.successful / emailProgress.completed || 0) * 100 : 0;

  const changeView = (view: View) => {
    setCurrentView(view);
    setIsSidebarOpen(true);
  };

  return (
    <div className="flex h-screen bg-surface-bg text-surface-text font-sans overflow-hidden selection:bg-brand-primary selection:text-surface-bg">
      <div className="scanline fixed inset-0 z-50 opacity-10 pointer-events-none" />
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-surface-bg flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Background Grid Effect */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(var(--surface-text) 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="relative mb-8">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-4 border border-brand-primary/20 rounded-full"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-8 border border-brand-secondary/10 rounded-full border-dashed"
                />
                <div className="bg-surface-card p-6 rounded-3xl shadow-[0_0_50px_rgba(0,255,148,0.1)] relative z-10 border border-surface-border">
                  <Zap className="w-16 h-16 text-brand-primary animate-pulse-glow" />
                </div>
              </div>

              <h1 className="text-surface-text text-4xl font-display font-bold tracking-tighter mb-4 flex items-center gap-2">
                Omni<span className="text-brand-primary">Toolbox</span>
              </h1>

              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-surface-text/5 rounded-full border border-surface-border backdrop-blur-sm">
                  <RefreshCw className="w-4 h-4 text-brand-secondary animate-spin" />
                  <span className="text-[10px] font-mono font-bold text-surface-text/60 uppercase tracking-widest">
                    Establishing Secure Link...
                  </span>
                </div>
                
                {/* Simulated Terminal Output */}
                <div className="font-mono text-[9px] text-surface-text/20 space-y-1 text-center max-w-xs">
                  <p className="animate-pulse">{'>'}&nbsp;INITIALIZING_CORE_MODULES...</p>
                  <p className="opacity-40">{'>'}&nbsp;ENCRYPTING_SESSION_DATA...</p>
                  <p className="opacity-20">{'>'}&nbsp;BYPASSING_RESTRICTIONS...</p>
                </div>
              </div>
            </motion.div>
            
            <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-4">
              <div className="w-64 h-1 bg-surface-text/5 rounded-full overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary shadow-[0_0_15px_rgba(0,255,148,0.5)]"
                />
              </div>
              <div className="flex items-center gap-6 opacity-20">
                <p className="text-[9px] font-bold text-surface-text uppercase tracking-[0.3em]">v2.5.0 STABLE</p>
                <div className="w-1 h-1 bg-surface-text rounded-full" />
                <p className="text-[9px] font-bold text-surface-text uppercase tracking-[0.3em]">ENCRYPTED</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-surface-card border-r border-surface-border flex flex-col relative z-20 backdrop-blur-xl"
      >
        <div className="p-6 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary p-2 rounded-lg shadow-[0_0_15px_rgba(0,255,148,0.3)]">
              <Zap className="w-5 h-5 text-surface-bg" />
            </div>
            <span className="font-display font-bold tracking-tight text-xl text-surface-text">Omni<span className="text-brand-primary">Toolbox</span></span>
          </div>
          <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,148,0.6)]" />
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="px-3 py-2 text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.3em]">
            Overview
          </div>
          <button 
            onClick={() => changeView('dashboard')}
            className={`w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
              currentView === 'dashboard' 
                ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                : 'text-surface-text/50 hover:bg-surface-text/5 hover:text-surface-text'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 transition-transform duration-300 ${currentView === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="font-medium text-sm">Dashboard</span>
            {currentView === 'dashboard' && (
              <motion.div 
                layoutId="active-pill"
                className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-brand-primary rounded-r-full"
              />
            )}
          </button>

          {(isKeyValid || isAdmin) && (
            <>
              <div className="px-3 py-2 mt-6 text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.3em]">
                Main Feature
              </div>
              <button 
                onClick={() => changeView('bomber')}
                className={`w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
                  currentView === 'bomber' 
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                    : 'text-surface-text/50 hover:bg-surface-text/5 hover:text-surface-text'
                }`}
              >
                <Bomb className={`w-5 h-5 transition-transform duration-300 ${currentView === 'bomber' ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-medium text-sm">SMS Bomber</span>
                {currentView === 'bomber' && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-brand-primary rounded-r-full"
                  />
                )}
              </button>

              <button 
                onClick={() => changeView('garena')}
                className={`w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
                  currentView === 'garena' 
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                    : 'text-surface-text/50 hover:bg-surface-text/5 hover:text-surface-text'
                }`}
              >
                <UserCheck className={`w-5 h-5 transition-transform duration-300 ${currentView === 'garena' ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-medium text-sm">Garena Checker</span>
                {currentView === 'garena' && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-brand-primary rounded-r-full"
                  />
                )}
              </button>

              <button 
                onClick={() => changeView('email')}
                className={`w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
                  currentView === 'email' 
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                    : 'text-surface-text/50 hover:bg-surface-text/5 hover:text-surface-text'
                }`}
              >
                <Mail className={`w-5 h-5 transition-transform duration-300 ${currentView === 'email' ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-medium text-sm">Email Bomber</span>
                {currentView === 'email' && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-brand-primary rounded-r-full"
                  />
                )}
              </button>

              <button 
                onClick={() => changeView('upcoming')}
                className={`w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
                  currentView === 'upcoming' 
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                    : 'text-surface-text/50 hover:bg-surface-text/5 hover:text-surface-text'
                }`}
              >
                <Rocket className={`w-5 h-5 transition-transform duration-300 ${currentView === 'upcoming' ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-medium text-sm">Upcoming</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[8px] font-bold bg-brand-secondary text-surface-bg px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(0,209,255,0.3)]">NEW</span>
                  {currentView === 'upcoming' && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-brand-primary rounded-r-full"
                    />
                  )}
                </div>
              </button>
            </>
          )}

          <div className="px-3 py-2 mt-6 text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.3em]">
            System
          </div>
          <button 
            onClick={() => changeView('settings')}
            className={`w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
              currentView === 'settings' 
                ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                : 'text-surface-text/50 hover:bg-surface-text/5 hover:text-surface-text'
            }`}
          >
            <Settings className={`w-5 h-5 transition-transform duration-300 ${currentView === 'settings' ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="font-medium text-sm">Settings</span>
            {currentView === 'settings' && (
              <motion.div 
                layoutId="active-pill"
                className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-brand-primary rounded-r-full"
              />
            )}
          </button>

          {isAdmin && (
            <button 
              onClick={() => changeView('admin')}
              className={`w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
                currentView === 'admin' 
                  ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                  : 'text-surface-text/50 hover:bg-surface-text/5 hover:text-surface-text'
              }`}
            >
              <Shield className={`w-5 h-5 transition-transform duration-300 ${currentView === 'admin' ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="font-medium text-sm">Admin Panel</span>
              {currentView === 'admin' && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-brand-primary rounded-r-full"
                />
              )}
            </button>
          )}

          <a 
            href="https://t.me/ItsMeJeff"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-surface-text/50 hover:bg-surface-text/5 hover:text-surface-text"
          >
            <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">Contact Support</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-30" />
          </a>
        </nav>

        <div className="p-4 border-t border-surface-border bg-surface-card/50 backdrop-blur-md">
          {user ? (
            <div className="bg-surface-card p-4 rounded-2xl border border-surface-border flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                    alt="Avatar" 
                    className="w-10 h-10 rounded-xl border border-surface-border" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-brand-primary rounded-full border-2 border-surface-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-surface-text truncate">{user.displayName}</p>
                  <p className="text-[9px] text-brand-primary font-mono uppercase tracking-widest">{isAdmin ? 'Administrator' : 'Verified User'}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-2.5 bg-surface-card border border-surface-border text-surface-text/70 rounded-xl text-[10px] font-bold hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-3 h-3" />
                TERMINATE SESSION
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={handleLogin}
                className="w-full py-4 bg-brand-primary text-surface-bg rounded-2xl font-bold text-xs shadow-[0_0_20px_rgba(0,255,148,0.2)] hover:shadow-[0_0_30px_rgba(0,255,148,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                ESTABLISH CONNECTION
              </button>
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                >
                  <p className="text-[10px] text-red-500 font-bold leading-tight flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {loginError}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar */}
        <header className="h-16 bg-surface-bg/80 backdrop-blur-md border-b border-surface-border flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-surface-card rounded-lg transition-colors text-surface-text"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="font-display font-bold text-lg capitalize tracking-tight text-surface-text">
              {currentView === 'dashboard' ? 'Overview' : 
               currentView === 'bomber' ? 'SMS Bomber' : 
               currentView === 'email' ? 'Email Bomber' :
               currentView === 'garena' ? 'Garena Checker' : 
               currentView === 'upcoming' ? 'Upcoming Features' : 'Settings'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-card border border-surface-border rounded-lg text-[11px] font-mono font-medium text-surface-text/60">
              <Clock className="w-3.5 h-3.5" />
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-lg bg-surface-card border border-surface-border text-surface-text hover:bg-brand-primary/10 transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <div 
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-help",
                  dbStatus?.status === 'ok' 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                )}
                title={dbStatus?.status === 'ok' ? 'Database is connected' : dbStatus?.message || 'Database connection error'}
              >
                <Database className="w-3 h-3" />
                {dbStatus?.status === 'ok' ? 'DB Online' : 'DB Offline'}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                <ShieldCheck className="w-3 h-3" />
                Anti-DDoS
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {dbStatus?.status === 'error' && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-4"
            >
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-1">Database Connection Error</h3>
                <p className="text-xs text-surface-text-muted leading-relaxed">
                  {dbStatus.message}
                </p>
                <div className="mt-3 flex gap-3">
                  <a 
                    href="https://dashboard.render.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Open Render Dashboard
                  </a>
                  <button 
                    onClick={checkDbHealth}
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-surface-card border border-surface-border text-surface-text rounded-lg hover:bg-brand-primary/10 transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          <AnimatePresence mode="wait">
            {currentView === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                {/* Key System Banner */}
                {!isKeyValid && !isAdmin && (
                  <div className="bg-surface-card border-2 border-surface-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="max-w-xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-surface-text p-2 rounded-lg">
                            <Lock className="w-5 h-5 text-surface-bg" />
                          </div>
                          <span className="text-[10px] font-bold text-surface-text uppercase tracking-widest">System Locked</span>
                        </div>
                        <h2 className="text-3xl font-display font-bold mb-4 text-surface-text">Access Key Required</h2>
                        <p className="text-surface-text/60 mb-6">To prevent abuse and maintain system performance, a valid access key is required to use the stress testing tools. You can get a key from our official channel.</p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="relative flex-1">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-text/40" />
                            <input 
                              type="text" 
                              placeholder="Enter Access Key"
                              value={userKey}
                              onChange={(e) => setUserKey(e.target.value)}
                              className="w-full bg-surface-bg border border-surface-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-primary transition-all font-mono text-surface-text"
                            />
                          </div>
                          <button 
                            onClick={() => validateKey(userKey)}
                            disabled={isCheckingKey || !userKey}
                            className="px-8 py-4 bg-surface-text text-surface-bg rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isCheckingKey ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            Activate
                          </button>
                        </div>
                        {keyError && <p className="mt-4 text-red-500 text-xs font-bold uppercase tracking-widest">{keyError}</p>}
                      </div>
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 bg-surface-bg rounded-full flex items-center justify-center border-2 border-surface-border">
                          <Zap className="w-10 h-10 text-surface-text" />
                        </div>
                        <a 
                          href="https://t.me/ItsMeJeff" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-surface-text underline underline-offset-4"
                        >
                          Get a Key
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {isKeyValid && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500 p-2 rounded-lg">
                        <ShieldCheck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-green-500">System Access Granted</p>
                        <p className="text-[10px] text-green-500/60 font-bold uppercase tracking-widest">Your key is active and valid</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setIsKeyValid(false);
                        localStorage.removeItem('toolbox_key');
                      }}
                      className="text-[10px] font-bold text-green-800 hover:underline uppercase tracking-widest"
                    >
                      Deactivate
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-surface-card p-6 rounded-2xl border border-surface-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-500/10 p-2 rounded-lg">
                        <Activity className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">LIVE</span>
                    </div>
                    <p className="text-xs font-bold text-surface-text/40 uppercase tracking-widest">Total Operations</p>
                    <p className="text-3xl font-bold mt-1 text-surface-text">{history.length}</p>
                  </div>
                  <div className="bg-surface-card p-6 rounded-2xl border border-surface-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-purple-500/10 p-2 rounded-lg">
                        <Globe className="w-5 h-5 text-purple-500" />
                      </div>
                      <span className="text-[10px] font-bold text-surface-text/40">GLOBAL</span>
                    </div>
                    <p className="text-xs font-bold text-surface-text/40 uppercase tracking-widest">Active Services</p>
                    <p className="text-3xl font-bold mt-1 text-surface-text">{availableServices.length}</p>
                  </div>
                  <div className="bg-surface-card p-6 rounded-2xl border border-surface-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-orange-500/10 p-2 rounded-lg">
                        <Cpu className="w-5 h-5 text-orange-500" />
                      </div>
                      <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full">12% LOAD</span>
                    </div>
                    <p className="text-xs font-bold text-surface-text/40 uppercase tracking-widest">System Health</p>
                    <div className="mt-4 h-1.5 bg-surface-bg rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 w-[12%]" />
                    </div>
                    <p className="text-[10px] font-bold mt-2 text-surface-text/60">STABLE</p>
                  </div>
                  <div className="bg-surface-card p-6 rounded-2xl border border-surface-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <Wifi className="w-5 h-5 text-emerald-500" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">24ms</span>
                    </div>
                    <p className="text-xs font-bold text-surface-text/40 uppercase tracking-widest">Network Latency</p>
                    <div className="mt-4 flex items-end gap-0.5 h-6">
                      {[4, 7, 5, 8, 6, 9, 7].map((h, i) => (
                        <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-sm" style={{ height: `${h * 10}%` }} />
                      ))}
                    </div>
                    <p className="text-[10px] font-bold mt-2 text-surface-text/60">OPTIMIZED</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-surface-card rounded-2xl border border-surface-border shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-surface-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <History className="w-5 h-5 text-surface-text" />
                          <h3 className="font-display font-bold text-surface-text">Recent Activity</h3>
                        </div>
                        <button 
                          onClick={() => setHistory([])}
                          className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Clear
                        </button>
                      </div>
                      <div className="divide-y divide-surface-border">
                        {history.length === 0 ? (
                          <div className="p-12 text-center">
                            <Clock className="w-12 h-12 text-surface-text/20 mx-auto mb-4" />
                            <p className="text-sm text-surface-text/40 font-medium">No recent activity found.</p>
                          </div>
                        ) : (
                          history.map((item) => (
                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-surface-text/5 transition-colors group">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg transition-transform group-hover:scale-110 ${item.type === 'SMS' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                  {item.type === 'SMS' ? <Bomb className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-surface-text">{item.target}</p>
                                  <p className="text-[10px] text-surface-text/40 font-medium uppercase tracking-wider">{item.type} • {item.timestamp}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                  {item.status}
                                </span>
                                <p className="text-[10px] text-surface-text/60 mt-1 max-w-[150px] truncate">{item.details}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-surface-card rounded-2xl border border-surface-border shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-surface-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Terminal className="w-5 h-5 text-surface-text" />
                          <h3 className="font-display font-bold text-surface-text">System Log</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-bold text-surface-text/40 uppercase tracking-widest">Streaming</span>
                        </div>
                      </div>
                      <div className="p-4 bg-surface-text font-mono text-[11px] h-48 overflow-y-auto space-y-1">
                        {systemLogs.map(log => (
                          <div key={log.id} className="flex gap-2">
                            <span className="text-surface-bg/30">[{new Date().toLocaleTimeString()}]</span>
                            <span className={log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-blue-400'}>
                              {log.type.toUpperCase()}
                            </span>
                            <span className="text-surface-bg/80">{log.msg}</span>
                          </div>
                        ))}
                        <div className="flex gap-2 animate-pulse">
                          <span className="text-surface-bg/30">[{new Date().toLocaleTimeString()}]</span>
                          <span className="text-green-400">WAIT</span>
                          <span className="text-surface-bg/80">Listening for incoming requests...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-surface-text text-surface-bg p-6 rounded-2xl shadow-xl shadow-surface-text/20 relative overflow-hidden">
                      <div className="relative z-10">
                        <h3 className="font-bold text-lg mb-2">Omni Premium</h3>
                        <p className="text-xs text-surface-bg/60 mb-6 leading-relaxed">Get access to exclusive high-speed APIs and advanced security features.</p>
                        <button className="w-full py-3 bg-surface-bg text-surface-text rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                          Upgrade Now <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                      <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-surface-bg/5 rotate-12" />
                    </div>

                    <div className="bg-surface-card p-6 rounded-2xl border border-surface-border shadow-sm">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-surface-text">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        System Status
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-surface-text/60">API Gateway</span>
                          <span className="text-[10px] font-bold text-green-500">OPERATIONAL</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-surface-text/60">Database Cluster</span>
                          <span className="text-[10px] font-bold text-green-500">OPERATIONAL</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-surface-text/60">Rate Limiter</span>
                          <span className="text-[10px] font-bold text-green-500">OPERATIONAL</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-card p-6 rounded-2xl border border-surface-border shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    <h3 className="font-display font-bold text-surface-text">System Info</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-bg rounded-xl border border-surface-border">
                      <p className="text-[10px] font-bold text-surface-text/40 uppercase tracking-widest mb-1">Engine Version</p>
                      <p className="font-bold text-sm text-surface-text">v2.4.0 STABLE</p>
                    </div>
                    <div className="p-4 bg-surface-bg rounded-xl border border-surface-border">
                      <p className="text-[10px] font-bold text-surface-text/40 uppercase tracking-widest mb-1">Security Level</p>
                      <p className="font-bold text-sm text-green-500">MAXIMUM</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : currentView === 'bomber' ? (
              <motion.div 
                key="bomber"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                {/* ... existing bomber content ... */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Configuration Card */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-surface-card rounded-2xl border border-surface-border p-8 shadow-sm relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="bg-surface-text p-3 rounded-xl shadow-lg shadow-black/20">
                            <Bomb className="w-6 h-6 text-surface-bg" />
                          </div>
                          <div>
                            <h3 className="text-lg font-display font-bold text-surface-text">SMS Stress Test</h3>
                            <p className="text-sm text-surface-text/60">Configure and launch high-volume request sequences.</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-bold mb-2 text-surface-text/40 uppercase tracking-widest">Target Phone Number</label>
                            <div className="relative group">
                              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-text/40 group-focus-within:text-brand-primary transition-colors" />
                              <input 
                                type="text" 
                                placeholder="09123456789"
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                disabled={isTesting}
                                className="w-full bg-surface-bg border border-surface-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-primary focus:bg-surface-bg transition-all font-mono text-lg text-surface-text"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold mb-2 text-surface-text/40 uppercase tracking-widest">Request Volume</label>
                            <div className="relative group">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-text/40 group-focus-within:text-brand-primary transition-colors" />
                              <input 
                                type="number" 
                                value={totalRequests}
                                onChange={(e) => setTotalRequests(parseInt(e.target.value))}
                                disabled={isTesting}
                                className="w-full bg-surface-bg border border-surface-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-primary focus:bg-surface-bg transition-all font-mono text-lg text-surface-text"
                              />
                            </div>
                          </div>

                          {isTesting ? (
                            <button 
                              onClick={handleStop}
                              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-3"
                            >
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Stop Operation
                            </button>
                          ) : (
                            <button 
                              onClick={handleStart}
                              disabled={!number}
                              className="w-full py-4 bg-surface-text hover:opacity-90 text-surface-bg rounded-xl font-bold transition-all shadow-lg shadow-surface-text/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Play className="w-5 h-5" />
                              Initiate Sequence
                            </button>
                          )}
                        </div>
                      </div>
                      <Zap className="absolute -right-8 -bottom-8 w-32 h-32 text-surface-text/5 rotate-12" />
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-card rounded-2xl border border-surface-border p-6 shadow-sm group hover:border-brand-primary transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold text-surface-text/40 uppercase tracking-widest">Success Rate</p>
                          <Zap className="w-4 h-4 text-yellow-500" />
                        </div>
                        <p className="text-3xl font-display font-bold text-surface-text">{successRate.toFixed(1)}%</p>
                        <div className="mt-4 h-1 bg-surface-bg rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-green-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${successRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-surface-card rounded-2xl border border-surface-border p-6 shadow-sm group hover:border-brand-primary transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold text-surface-text/40 uppercase tracking-widest">Processed</p>
                          <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-3xl font-display font-bold text-surface-text">{progress?.completed || 0}</p>
                        <p className="text-[10px] text-surface-text/40 font-bold mt-2 uppercase tracking-widest">Of {totalRequests} Requests</p>
                      </div>
                    </div>
                  </div>

                  {/* Logs Card */}
                  <div className="lg:col-span-7 flex flex-col min-h-[500px]">
                    <div className="bg-surface-text rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border border-surface-border">
                      <div className="p-6 border-b border-surface-border flex items-center justify-between bg-surface-bg/5 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-surface-bg/60">Sequence Telemetry</h3>
                        </div>
                        <div className="flex items-center gap-4">
                          {isTesting && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              LIVE
                            </div>
                          )}
                          <button 
                            onClick={() => setLogs([])}
                            className="text-[10px] font-bold text-surface-bg/40 hover:text-surface-bg/80 transition-colors uppercase tracking-widest"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto font-mono text-[11px] p-4 custom-scrollbar">
                        <div className="space-y-1.5">
                          {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center py-32 opacity-10 text-surface-bg">
                              <Terminal className="w-16 h-16 mb-4" />
                              <p className="font-bold tracking-widest uppercase">Awaiting Signal...</p>
                            </div>
                          )}
                          <AnimatePresence initial={false}>
                            {logs.map((log) => (
                              <motion.div 
                                key={log.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-4 px-3 py-2 hover:bg-surface-bg/5 rounded transition-colors group"
                              >
                                <span className="text-surface-bg/20 shrink-0">[{log.timestamp}]</span>
                                <span className="text-surface-bg/60 font-bold w-24 truncate">{log.service}</span>
                                <span className={`font-bold shrink-0 px-1.5 py-0.5 rounded text-[9px] ${log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {log.status === 'SUCCESS' ? 'OK' : 'ERR'}
                                </span>
                                <span className="text-surface-bg/40 truncate flex-1">
                                  {log.status === 'SUCCESS' ? `HTTP ${log.code}` : log.error}
                                </span>
                                <ArrowUpRight className="w-3 h-3 text-surface-bg/0 group-hover:text-surface-bg/20 transition-colors" />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Progress bar at bottom of logs */}
                      {isTesting && progress && (
                        <div className="h-1.5 bg-surface-bg/5 w-full">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${(progress.completed / progress.total) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : currentView === 'email' ? (
              <motion.div 
                key="email"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Configuration Card */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-surface-card rounded-2xl border border-surface-border p-8 shadow-sm relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="bg-surface-text p-3 rounded-xl shadow-lg shadow-black/20">
                            <Mail className="w-6 h-6 text-surface-bg" />
                          </div>
                          <div>
                            <h3 className="text-lg font-display font-bold text-surface-text">Email Stress Test</h3>
                            <p className="text-sm text-surface-text/60">Simulate high-volume email registration requests.</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-bold mb-2 text-surface-text/40 uppercase tracking-widest">Target Email Address</label>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-text/40 group-focus-within:text-brand-primary transition-colors" />
                              <input 
                                type="email" 
                                placeholder="target@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isEmailTesting}
                                className="w-full bg-surface-bg border border-surface-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-primary focus:bg-surface-bg transition-all font-mono text-lg text-surface-text"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold mb-2 text-surface-text/40 uppercase tracking-widest">Request Volume</label>
                            <div className="relative group">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-text/40 group-focus-within:text-brand-primary transition-colors" />
                              <input 
                                type="number" 
                                value={emailRequests}
                                onChange={(e) => setEmailRequests(parseInt(e.target.value))}
                                disabled={isEmailTesting}
                                className="w-full bg-surface-bg border border-surface-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-primary focus:bg-surface-bg transition-all font-mono text-lg text-surface-text"
                              />
                            </div>
                          </div>

                          {isEmailTesting ? (
                            <button 
                              onClick={handleEmailStop}
                              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-3"
                            >
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Stop Operation
                            </button>
                          ) : (
                            <button 
                              onClick={handleEmailStart}
                              disabled={!email}
                              className="w-full py-4 bg-surface-text hover:opacity-90 text-surface-bg rounded-xl font-bold transition-all shadow-lg shadow-surface-text/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Play className="w-5 h-5" />
                              Initiate Sequence
                            </button>
                          )}
                        </div>
                      </div>
                      <Zap className="absolute -right-8 -bottom-8 w-32 h-32 text-surface-text/5 rotate-12" />
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-card rounded-2xl border border-surface-border p-6 shadow-sm group hover:border-brand-primary transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold text-surface-text/40 uppercase tracking-widest">Success Rate</p>
                          <Zap className="w-4 h-4 text-yellow-500" />
                        </div>
                        <p className="text-3xl font-display font-bold text-surface-text">{emailSuccessRate.toFixed(1)}%</p>
                        <div className="mt-4 h-1 bg-surface-bg rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-green-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${emailSuccessRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-surface-card rounded-2xl border border-surface-border p-6 shadow-sm group hover:border-brand-primary transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold text-surface-text/40 uppercase tracking-widest">Processed</p>
                          <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-3xl font-display font-bold text-surface-text">{emailProgress?.completed || 0}</p>
                        <p className="text-[10px] text-surface-text/40 font-bold mt-2 uppercase tracking-widest">Of {emailRequests} Requests</p>
                      </div>
                    </div>
                  </div>

                  {/* Logs Card */}
                  <div className="lg:col-span-7 flex flex-col min-h-[500px]">
                    <div className="bg-surface-text rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border border-surface-border">
                      <div className="p-6 border-b border-surface-border flex items-center justify-between bg-surface-bg/5 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-surface-bg/60">Email Telemetry</h3>
                        </div>
                        <div className="flex items-center gap-4">
                          {isEmailTesting && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              LIVE
                            </div>
                          )}
                          <button 
                            onClick={() => setEmailLogs([])}
                            className="text-[10px] font-bold text-surface-bg/40 hover:text-surface-bg/80 transition-colors uppercase tracking-widest"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto font-mono text-[11px] p-4 custom-scrollbar">
                        <div className="space-y-1.5">
                          {emailLogs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center py-32 opacity-10 text-surface-bg">
                              <Terminal className="w-16 h-16 mb-4" />
                              <p className="font-bold tracking-widest uppercase">Awaiting Signal...</p>
                            </div>
                          )}
                          <AnimatePresence initial={false}>
                            {emailLogs.map((log) => (
                              <motion.div 
                                key={log.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-4 px-3 py-2 hover:bg-surface-bg/5 rounded transition-colors group"
                              >
                                <span className="text-surface-bg/20 shrink-0">[{log.timestamp}]</span>
                                <span className="text-surface-bg/60 font-bold w-24 truncate">{log.service}</span>
                                <span className={`font-bold shrink-0 px-1.5 py-0.5 rounded text-[9px] ${log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {log.status === 'SUCCESS' ? 'OK' : 'ERR'}
                                </span>
                                <span className="text-surface-bg/40 truncate flex-1">
                                  {log.status === 'SUCCESS' ? `HTTP ${log.code}` : log.error}
                                </span>
                                <ArrowUpRight className="w-3 h-3 text-surface-bg/0 group-hover:text-surface-bg/20 transition-colors" />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                      
                      {isEmailTesting && emailProgress && (
                        <div className="h-1.5 bg-surface-bg/5 w-full">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${(emailProgress.completed / emailProgress.total) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : currentView === 'garena' ? (
              <motion.div 
                key="garena"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="bg-surface-card rounded-2xl border border-surface-border p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="bg-surface-text p-3 rounded-xl">
                        <UserCheck className="w-6 h-6 text-surface-bg" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-surface-text">Garena Account Checker</h3>
                        <p className="text-sm text-surface-text/60">Verify Garena accounts and check security status.</p>
                      </div>
                    </div>
                    <div className="flex bg-surface-bg p-1 rounded-xl border border-surface-border">
                      <button 
                        onClick={() => setGarenaTab('single')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                          garenaTab === 'single' ? "bg-surface-text text-surface-bg shadow-lg" : "text-surface-text/40 hover:text-surface-text"
                        )}
                      >
                        SINGLE
                      </button>
                      <button 
                        onClick={() => setGarenaTab('bulk')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                          garenaTab === 'bulk' ? "bg-surface-text text-surface-bg shadow-lg" : "text-surface-text/40 hover:text-surface-text"
                        )}
                      >
                        BULK
                      </button>
                    </div>
                  </div>

                  {garenaTab === 'single' ? (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold mb-2 text-surface-text/60 uppercase tracking-widest">Account (Email/Username/Phone)</label>
                        <input 
                          type="text" 
                          value={garenaAccount}
                          onChange={(e) => setGarenaAccount(e.target.value)}
                          placeholder="example@gmail.com"
                          className="w-full bg-surface-bg border border-surface-border rounded-xl py-4 px-4 focus:outline-none focus:border-brand-primary focus:bg-surface-bg transition-all font-mono text-surface-text"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-2 text-surface-text/60 uppercase tracking-widest">Password</label>
                        <input 
                          type="password" 
                          value={garenaPassword}
                          onChange={(e) => setGarenaPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-surface-bg border border-surface-border rounded-xl py-4 px-4 focus:outline-none focus:border-brand-primary focus:bg-surface-bg transition-all font-mono text-surface-text"
                        />
                      </div>

                      <button 
                        onClick={handleGarenaCheck}
                        disabled={!garenaAccount || !garenaPassword || isCheckingGarena}
                        className="w-full py-4 bg-surface-text hover:opacity-90 text-surface-bg rounded-xl font-bold transition-all shadow-lg shadow-surface-text/20 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isCheckingGarena ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                        Check Account
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="block text-xs font-bold text-surface-text/60 uppercase tracking-widest">Upload Accounts (.txt)</label>
                          <div className="relative group">
                            <input 
                              type="file" 
                              accept=".txt"
                              onChange={(e) => setGarenaBulkFile(e.target.files?.[0] || null)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full bg-surface-bg border-2 border-dashed border-surface-border rounded-2xl py-8 px-4 flex flex-col items-center justify-center gap-3 group-hover:border-brand-primary transition-all">
                              <PlusCircle className="w-8 h-8 text-surface-text/20 group-hover:text-brand-primary transition-colors" />
                              <p className="text-xs font-bold text-surface-text/40 group-hover:text-surface-text transition-colors">
                                {garenaBulkFile ? garenaBulkFile.name : "Click or drag user:pass file"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="block text-xs font-bold text-surface-text/60 uppercase tracking-widest">Custom Cookies (Optional)</label>
                          <textarea 
                            value={garenaBulkCookies}
                            onChange={(e) => setGarenaBulkCookies(e.target.value)}
                            placeholder="Paste cookies here (one per line)..."
                            className="w-full h-[116px] bg-surface-bg border border-surface-border rounded-2xl py-4 px-4 focus:outline-none focus:border-brand-primary focus:bg-surface-bg transition-all font-mono text-xs text-surface-text resize-none"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={handleGarenaBulkCheck}
                        disabled={!garenaBulkFile || isBulkCheckingGarena}
                        className="w-full py-4 bg-brand-primary hover:opacity-90 text-surface-bg rounded-xl font-bold transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isBulkCheckingGarena ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                        Start Bulk Check
                      </button>

                      {isBulkCheckingGarena && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold text-surface-text/40 uppercase tracking-widest">
                            <span>Processing Accounts...</span>
                            <span>{garenaBulkProgress.current} / {garenaBulkProgress.total}</span>
                          </div>
                          <div className="h-1.5 bg-surface-text/5 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-brand-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${(garenaBulkResults.length / garenaBulkProgress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {garenaTab === 'single' && garenaResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "mt-8 p-8 rounded-3xl border backdrop-blur-md",
                        garenaResult.status === 'SUCCESS' 
                          ? 'bg-brand-primary/5 border-brand-primary/20 shadow-lg shadow-brand-primary/5' 
                          : 'bg-red-500/5 border-red-500/20 shadow-lg shadow-red-500/5'
                      )}
                    >
                      {garenaResult.status === 'SUCCESS' ? (
                        <div className="space-y-8">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                              <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-[0_0_15px_rgba(0,255,148,0.2)]">
                                <UserCheck className="w-8 h-8" />
                              </div>
                              <div>
                                <h4 className="text-2xl font-bold text-surface-text flex items-center gap-3">
                                  {garenaResult.data.nickname}
                                  {garenaResult.data.is_clean && (
                                    <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full border border-brand-primary/30">CLEAN</span>
                                  )}
                                </h4>
                                <p className="text-sm text-surface-text/50 font-mono tracking-wider">UID: {garenaResult.data.uid}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(`Nickname: ${garenaResult.data.nickname}\nUID: ${garenaResult.data.uid}\nAccount: ${garenaResult.data.account}`);
                                }}
                                className="p-2.5 bg-surface-text/5 hover:bg-surface-text/10 rounded-xl transition-all text-surface-text/50 hover:text-surface-text border border-surface-border"
                                title="Copy Full Info"
                              >
                                <Copy className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-surface-text/2 rounded-2xl border border-surface-border">
                              <p className="text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                                <Mail className="w-3 h-3" />
                                Email
                              </p>
                              <p className="font-bold text-sm text-surface-text truncate" title={garenaResult.data.email}>{garenaResult.data.email || 'N/A'}</p>
                              <p className={cn(
                                "text-[9px] font-bold mt-1",
                                garenaResult.data.email_status === 'Verified' ? 'text-brand-primary' : 'text-orange-400'
                              )}>{garenaResult.data.email_status}</p>
                            </div>
                            <div className="p-4 bg-surface-text/2 rounded-2xl border border-surface-border">
                              <p className="text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                                <Smartphone className="w-3 h-3" />
                                Mobile
                              </p>
                              <p className="font-bold text-sm text-surface-text">{garenaResult.data.mobile_status}</p>
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full mt-2",
                                garenaResult.data.mobile_status === 'Bound' ? 'bg-brand-primary shadow-[0_0_5px_rgba(0,255,148,0.5)]' : 'bg-surface-text/10'
                              )} />
                            </div>
                            <div className="p-4 bg-surface-text/2 rounded-2xl border border-surface-border">
                              <p className="text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                                <Database className="w-3 h-3" />
                                Shells
                              </p>
                              <p className="font-bold text-xl text-brand-primary">{garenaResult.data.shell_balance}</p>
                            </div>
                            <div className="p-4 bg-surface-text/2 rounded-2xl border border-surface-border">
                              <p className="text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                                <ShieldCheck className="w-3 h-3" />
                                Status
                              </p>
                              <p className={cn(
                                "font-bold text-sm",
                                garenaResult.data.is_clean ? 'text-brand-primary' : 'text-red-400'
                              )}>{garenaResult.data.is_clean ? 'CLEAN' : 'NOT CLEAN'}</p>
                            </div>
                          </div>

                          {garenaResult.data.codm && (
                            <div className="p-6 bg-surface-text/5 rounded-2xl border border-surface-border relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Rocket className="w-24 h-24 rotate-12 text-surface-text" />
                              </div>
                              <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-surface-text/60">CODM Profile Detected</p>
                                  </div>
                                  <span className="text-[10px] font-bold bg-surface-text/10 px-2 py-1 rounded border border-surface-border text-surface-text/70">
                                    {garenaResult.data.codm.region}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                  <div>
                                    <p className="text-[10px] font-bold text-surface-text/30 uppercase tracking-widest mb-1">Nickname</p>
                                    <p className="font-bold text-base text-surface-text truncate">{garenaResult.data.codm.nickname}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-surface-text/30 uppercase tracking-widest mb-1">Level</p>
                                    <div className="flex items-end gap-1">
                                      <p className="font-bold text-2xl text-brand-primary leading-none">{garenaResult.data.codm.level}</p>
                                      <span className="text-[10px] text-surface-text/30 mb-0.5">/ 400</span>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-surface-text/30 uppercase tracking-widest mb-1">In-Game UID</p>
                                    <p className="font-mono text-xs text-surface-text/70 truncate">{garenaResult.data.codm.uid}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center py-4">
                          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 border border-red-500/20">
                            <XCircle className="w-8 h-8" />
                          </div>
                          <h4 className="text-xl font-bold text-surface-text mb-2">Check Failed</h4>
                          <p className="text-surface-text/60 font-mono text-sm bg-surface-text/5 p-3 rounded-lg border border-surface-border w-full">
                            {garenaResult.error}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {garenaTab === 'bulk' && garenaBulkResults.length > 0 && (
                    <div className="mt-8 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-surface-text/40 uppercase tracking-widest">Bulk Results</h4>
                        <div className="flex gap-4">
                          <span className="text-[10px] font-bold text-brand-primary">
                            {garenaBulkResults.filter(r => r.status === 'SUCCESS').length} SUCCESS
                          </span>
                          <span className="text-[10px] font-bold text-red-400">
                            {garenaBulkResults.filter(r => r.status === 'FAILED').length} FAILED
                          </span>
                        </div>
                      </div>
                      <div className="bg-surface-bg border border-surface-border rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-text/5 border-b border-surface-border">
                            <tr>
                              <th className="px-4 py-3 font-bold text-surface-text/40 uppercase tracking-widest">Account</th>
                              <th className="px-4 py-3 font-bold text-surface-text/40 uppercase tracking-widest">Status</th>
                              <th className="px-4 py-3 font-bold text-surface-text/40 uppercase tracking-widest">Nickname</th>
                              <th className="px-4 py-3 font-bold text-surface-text/40 uppercase tracking-widest">CODM</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border">
                            {garenaBulkResults.map((res, i) => (
                              <tr key={i} className="hover:bg-surface-text/2 transition-colors">
                                <td className="px-4 py-3 font-mono text-surface-text/70">{res.data?.account || res.account || 'N/A'}</td>
                                <td className="px-4 py-3">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-bold",
                                    res.status === 'SUCCESS' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                  )}>
                                    {res.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-bold text-surface-text">{res.data?.nickname || '-'}</td>
                                <td className="px-4 py-3">
                                  {res.data?.codm ? (
                                    <span className="text-brand-primary font-bold">LVL {res.data.codm.level}</span>
                                  ) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : currentView === 'admin' && isAdmin ? (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-surface-text flex items-center gap-3">
                      <Shield className="w-8 h-8 text-brand-primary" />
                      Admin <span className="text-brand-primary">Control Panel</span>
                    </h2>
                    <p className="text-surface-text/50 font-medium mt-1">Manage system access keys and monitor usage metrics.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {!user && (
                      <div className="flex flex-col items-end gap-2">
                        <div className="bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl px-4 py-2 flex items-center gap-2 text-brand-secondary text-[10px] font-bold uppercase tracking-widest">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Sign In Required for Database Actions
                        </div>
                        <button 
                          onClick={handleLogin}
                          className="px-4 py-2 bg-brand-primary text-surface-bg rounded-lg text-[10px] font-bold hover:bg-brand-primary/90 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,148,0.2)]"
                        >
                          <LogIn className="w-3 h-3" />
                          Sign In with Google
                        </button>
                      </div>
                    )}
                    <div className="bg-surface-card border border-surface-border rounded-2xl p-4 flex items-center gap-4 backdrop-blur-md">
                      <div>
                        <p className="text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.2em]">Total Keys</p>
                        <p className="text-2xl font-display font-bold text-surface-text">{allKeys.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center border border-brand-primary/20">
                        <Key className="w-6 h-6 text-brand-primary" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface-card rounded-3xl border border-surface-border p-8 backdrop-blur-md relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-primary/10 transition-colors" />
                      <h3 className="text-lg font-bold text-surface-text mb-6 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-brand-primary" />
                        Generate New Key
                      </h3>
                      <div className="space-y-6 relative z-10">
                        <div>
                          <label className="block text-[10px] font-bold mb-2 text-surface-text/30 uppercase tracking-[0.2em]">Duration (Hours)</label>
                          <select 
                            value={newKeyDuration}
                            onChange={(e) => setNewKeyDuration(parseInt(e.target.value))}
                            className="w-full bg-surface-bg border border-surface-border rounded-xl py-4 px-4 focus:outline-none focus:border-brand-primary text-surface-text font-bold transition-all appearance-none cursor-pointer"
                          >
                            <option value={1} className="bg-surface-card">1 Hour (Trial)</option>
                            <option value={24} className="bg-surface-card">24 Hours (Daily)</option>
                            <option value={168} className="bg-surface-card">168 Hours (Weekly)</option>
                            <option value={720} className="bg-surface-card">720 Hours (Monthly)</option>
                            <option value={8760} className="bg-surface-card">8760 Hours (Lifetime)</option>
                          </select>
                        </div>
                        
                        <button 
                          onClick={generateKey}
                          disabled={isGeneratingKey || !user}
                          className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 relative overflow-hidden ${
                            isGeneratingKey || !user
                              ? 'bg-surface-text/5 text-surface-text/20 cursor-not-allowed border border-surface-border' 
                              : 'bg-brand-primary text-surface-bg shadow-[0_0_20px_rgba(0,255,148,0.2)] hover:shadow-[0_0_30px_rgba(0,255,148,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                          }`}
                        >
                          {isGeneratingKey ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              PROCESSING...
                            </>
                          ) : (
                            <>
                              <Zap className="w-5 h-5" />
                              GENERATE ACCESS KEY
                            </>
                          )}
                        </button>

                        {adminError && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-3"
                          >
                            <AlertCircle className="w-4 h-4" />
                            {adminError}
                          </motion.div>
                        )}
                        {adminSuccess && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold flex items-center gap-3"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {adminSuccess}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bg-surface-card rounded-3xl border border-surface-border overflow-hidden backdrop-blur-md">
                      <div className="p-8 border-b border-surface-border flex items-center justify-between">
                        <h3 className="text-lg font-bold text-surface-text flex items-center gap-2">
                          <History className="w-5 h-5 text-brand-primary" />
                          Active Access Keys
                        </h3>
                        <div className="flex items-center gap-2 bg-surface-text/5 px-3 py-1.5 rounded-lg border border-surface-border">
                          <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
                          <span className="text-[10px] font-bold text-surface-text/50 uppercase tracking-widest">Live Monitor</span>
                        </div>
                      </div>
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-text/2">
                              <th className="px-8 py-4 text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.2em]">Key ID</th>
                              <th className="px-8 py-4 text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.2em]">Expires</th>
                              <th className="px-8 py-4 text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.2em]">Status</th>
                              <th className="px-8 py-4 text-[10px] font-bold text-surface-text/30 uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border">
                            {allKeys.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-8 py-12 text-center">
                                  <div className="flex flex-col items-center gap-3 opacity-20 text-surface-text">
                                    <Key className="w-12 h-12" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No keys found in database</p>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              allKeys.map((k) => {
                                const isExpired = k.expiresAt?.toMillis() <= Date.now();
                                return (
                                  <tr key={k.id} className="group hover:bg-surface-text/2 transition-colors">
                                    <td className="px-8 py-5">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-500' : 'bg-brand-primary'} shadow-[0_0_8px_rgba(0,255,148,0.3)]`} />
                                        <div className="flex items-center gap-2">
                                          <code className="bg-surface-text/5 px-2 py-1 rounded text-xs font-mono text-surface-text/70">{k.key.substring(0, 8)}...</code>
                                          <button 
                                            onClick={() => navigator.clipboard.writeText(k.key)}
                                            className="p-1 hover:bg-surface-text/10 rounded transition-colors"
                                          >
                                            <Copy className="w-3 h-3 text-surface-text/30" />
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-8 py-5">
                                      <span className="text-xs text-surface-text/50 font-medium">
                                        {k.expiresAt?.toDate().toLocaleString()}
                                      </span>
                                    </td>
                                    <td className="px-8 py-5">
                                      <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${
                                        isExpired 
                                          ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                                          : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                                      }`}>
                                        {isExpired ? 'EXPIRED' : 'ACTIVE'}
                                      </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                      <button 
                                        onClick={() => revokeKey(k.id)}
                                        className="p-2 text-surface-text/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Revoke Key"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : currentView === 'upcoming' ? (
              <motion.div 
                key="upcoming"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-card p-8 rounded-3xl border border-surface-border shadow-sm overflow-hidden relative">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-500/10 p-2 rounded-lg">
                        <Sparkles className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Roadmap 2026</span>
                    </div>
                    <h3 className="text-3xl font-display font-bold tracking-tight mb-2 text-surface-text">Upcoming Features</h3>
                    <p className="text-surface-text/60 max-lg">We're constantly working on expanding OmniToolbox. Here's a sneak peek at what's coming in the next major updates.</p>
                  </div>
                  <Rocket className="absolute -right-8 -bottom-8 w-48 h-48 text-surface-text/5 -rotate-12" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      title: "Discord Webhook Spammer",
                      desc: "High-speed Discord webhook message automation with customizable payloads and rate-limit handling.",
                      icon: <MessageCircle className="w-6 h-6 text-indigo-500" />,
                      status: "In Development",
                      progress: 65,
                      color: "indigo"
                    },
                    {
                      title: "Email Bomber v2",
                      desc: "Advanced email stress testing with multiple SMTP provider rotation and proxy support.",
                      icon: <Bomb className="w-6 h-6 text-red-500" />,
                      status: "Planning",
                      progress: 20,
                      color: "red"
                    },
                    {
                      title: "Social Media OSINT",
                      desc: "Gather public information from various social platforms using advanced search techniques.",
                      icon: <Search className="w-6 h-6 text-blue-500" />,
                      status: "Queued",
                      progress: 5,
                      color: "blue"
                    },
                    {
                      title: "Proxy Scraper & Checker",
                      desc: "Automatically find and verify high-speed proxies for your stress testing operations.",
                      icon: <Globe className="w-6 h-6 text-emerald-500" />,
                      status: "In Development",
                      progress: 45,
                      color: "emerald"
                    },
                    {
                      title: "Custom API Integration",
                      desc: "Add your own API endpoints to the SMS Bomber engine for personalized testing.",
                      icon: <Cpu className="w-6 h-6 text-orange-500" />,
                      status: "In Development",
                      progress: 80,
                      color: "orange"
                    },
                    {
                      title: "Advanced Analytics",
                      desc: "Detailed reports and graphs of your operations with export capabilities.",
                      icon: <Activity className="w-6 h-6 text-purple-500" />,
                      status: "Planning",
                      progress: 15,
                      color: "purple"
                    }
                  ].map((feature, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-surface-card p-6 rounded-2xl border border-surface-border shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-3 rounded-xl bg-${feature.color}-500/10 group-hover:scale-110 transition-transform`}>
                          {feature.icon}
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-full bg-${feature.color}-500/10 text-${feature.color}-500 uppercase tracking-wider`}>
                          {feature.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg mb-2 text-surface-text">{feature.title}</h4>
                      <p className="text-xs text-surface-text/60 leading-relaxed mb-6">{feature.desc}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-surface-text/40">
                          <span>Development Progress</span>
                          <span>{feature.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-surface-bg rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${feature.progress}%` }}
                            transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                            className={`h-full bg-${feature.color}-500`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-surface-text rounded-3xl p-8 text-surface-bg relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-display font-bold mb-2">Have a feature request?</h3>
                      <p className="text-surface-bg/60 text-sm">We're always open to suggestions from our community.</p>
                    </div>
                    <a 
                      href="https://t.me/ItsMeJeff"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-8 py-4 bg-surface-bg text-surface-text rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-xl shadow-surface-bg/10 flex items-center gap-2"
                    >
                      Submit Suggestion <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-surface-bg/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl mx-auto"
              >
                <div className="bg-surface-card rounded-2xl border border-surface-border p-8 shadow-sm space-y-8">
                  <div>
                    <h3 className="text-lg font-bold mb-1 text-surface-text">System Settings</h3>
                    <p className="text-sm text-surface-text/60">Configure the stress testing engine parameters.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-surface-bg rounded-xl border border-surface-border">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 p-2 rounded-lg">
                          <ShieldCheck className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-surface-text">Anti-DDoS Protection</p>
                          <p className="text-xs text-surface-text/40">Rate limiting and traffic analysis active.</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-blue-500 text-white rounded-full text-[10px] font-bold">
                        ACTIVE
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-surface-bg rounded-xl border border-surface-border">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500/10 p-2 rounded-lg">
                          <Lock className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-surface-text">Secure Headers (Helmet)</p>
                          <p className="text-xs text-surface-text/40">XSS and Clickjacking protection enabled.</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-bold">
                        ENABLED
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-surface-bg rounded-xl">
                      <div>
                        <p className="font-bold text-sm text-surface-text">Rate Limiting Protection</p>
                        <p className="text-xs text-surface-text/40">Automatically delay requests to avoid detection.</p>
                      </div>
                      <div className="w-12 h-6 bg-surface-text rounded-full relative p-1 cursor-pointer">
                        <div className="w-4 h-4 bg-surface-bg rounded-full absolute right-1" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-surface-bg rounded-xl">
                      <div>
                        <p className="font-bold text-sm text-surface-text">Service Randomization</p>
                        <p className="text-xs text-surface-text/40">Rotate through available API providers.</p>
                      </div>
                      <div className="w-12 h-6 bg-surface-text rounded-full relative p-1 cursor-pointer">
                        <div className="w-4 h-4 bg-surface-bg rounded-full absolute right-1" />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-surface-border">
                      <p className="text-[10px] font-bold text-surface-text/40 uppercase tracking-widest mb-4">Available Services ({availableServices.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {availableServices.map((s, i) => (
                          <span key={i} className="px-3 py-1.5 bg-surface-bg text-surface-text/70 rounded-lg text-[11px] font-medium border border-surface-border">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="h-10 bg-surface-bg border-t border-surface-border flex items-center justify-between px-6 shrink-0 text-[10px] font-bold text-surface-text/40 uppercase tracking-wider">
          <div className="flex gap-6">
            <span>Build: 2026.03.23</span>
            <span>Environment: Production</span>
            <span className="text-surface-text">Support: @ItsMeJeff</span>
          </div>
          <div className="flex gap-6">
            <span>Render Cloud</span>
            <span>API v2.4.0</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
