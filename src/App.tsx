import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Terminal, 
  Smartphone,
  Hash,
  Zap,
  Loader2,
  Settings,
  Bomb,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Lock,
  MessageCircle,
  LayoutDashboard,
  Activity,
  History,
  Globe,
  Cpu,
  ArrowUpRight,
  Clock,
  AlertCircle,
  Copy,
  ExternalLink,
  Server,
  Database,
  Wifi,
  MoreVertical,
  Search,
  RefreshCw,
  Trash2,
  Rocket,
  Shield,
  ZapOff,
  Sparkles,
  Mail,
  LogIn,
  LogOut,
  Plus,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  // Admin Panel States
  const [allKeys, setAllKeys] = useState<any[]>([]);
  const [newKeyDuration, setNewKeyDuration] = useState(24); // hours
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setIsAdmin(userDoc.data().role === 'admin');
        } else {
          // Create user doc if it doesn't exist
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            role: 'user',
            createdAt: serverTimestamp()
          });
          setIsAdmin(false);
        }
        
        // Check if user has a valid key stored in local storage
        const storedKey = localStorage.getItem('toolbox_key');
        if (storedKey) {
          validateKey(storedKey);
        }
      } else {
        setIsAdmin(false);
        setIsKeyValid(false);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const validateKey = async (key: string) => {
    setIsCheckingKey(true);
    setKeyError('');
    
    // Hardcoded Admin Key check
    if (key === 'DEVADMINKEY@021412') {
      setIsKeyValid(true);
      setIsAdmin(true);
      localStorage.setItem('toolbox_key', key);
      setIsCheckingKey(false);
      return;
    }

    try {
      const keyDoc = await getDoc(doc(db, 'keys', key));
      if (keyDoc.exists()) {
        const data = keyDoc.data();
        const now = Timestamp.now();
        if (data.expiresAt.toMillis() > now.toMillis() && data.status === 'active') {
          setIsKeyValid(true);
          localStorage.setItem('toolbox_key', key);
        } else {
          setKeyError('Key has expired or is inactive.');
          setIsKeyValid(false);
        }
      } else {
        setKeyError('Invalid key.');
        setIsKeyValid(false);
      }
    } catch (err) {
      console.error("Error validating key:", err);
      setKeyError('Error validating key.');
    } finally {
      setIsCheckingKey(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('toolbox_key');
    setCurrentView('dashboard');
  };

  const generateKey = async () => {
    if (!isAdmin) return;
    
    // Firestore requires authentication for writes
    if (!user) {
      setAdminError('Authentication Required: Please "Sign In" with Google to perform database actions.');
      return;
    }
    
    setIsGeneratingKey(true);
    setAdminError('');
    setAdminSuccess('');

    try {
      const key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + newKeyDuration);
      
      await setDoc(doc(db, 'keys', key), {
        key,
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: serverTimestamp(),
        status: 'active',
        createdBy: user.uid
      });
      
      setAdminSuccess(`Key generated successfully: ${key.substring(0, 8)}...`);
      setTimeout(() => setAdminSuccess(''), 5000);
    } catch (err: any) {
      console.error("Error generating key:", err);
      if (err.message.includes('permission-denied') || err.message.includes('insufficient permissions')) {
        setAdminError('Permission Denied: Your Google account is not authorized as a System Admin in the database.');
      } else {
        setAdminError(`Failed to generate key: ${err.message}`);
      }
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!isAdmin) return;
    if (!user) {
      setAdminError('Authentication Required: Please "Sign In" with Google to perform database actions.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'keys', keyId));
      setAdminSuccess('Key revoked successfully.');
      setTimeout(() => setAdminSuccess(''), 3000);
    } catch (err: any) {
      console.error("Error revoking key:", err);
      if (err.message.includes('permission-denied') || err.message.includes('insufficient permissions')) {
        setAdminError('Permission Denied: Your Google account is not authorized to delete keys.');
      } else {
        setAdminError(`Failed to revoke key: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    if (isAdmin && currentView === 'admin') {
      const unsubscribe = onSnapshot(collection(db, 'keys'), (snapshot) => {
        const keys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllKeys(keys);
      });
      return () => unsubscribe();
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
      .then(res => res.json())
      .then(data => setAvailableServices(data))
      .catch(err => console.error('Failed to fetch services:', err));

    fetch('/api/email-services')
      .then(res => res.json())
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

    for (let i = 0; i < totalRequests; i++) {
      if (stopRef.current) break;

      const serviceIndex = Math.floor(Math.random() * availableServices.length);
      
      try {
        const response = await fetch('/api/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number, serviceIndex }),
        });
        
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
      } catch (err: any) {
        failed++;
        setLogs(prev => [{
          id: Math.random().toString(36),
          service: 'Network',
          status: 'FAILED',
          error: err.message,
          timestamp: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 100));
      }

      completed++;
      setProgress({ completed, successful, failed, total: totalRequests });
      
      await new Promise(r => setTimeout(r, 800));
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
      
      await new Promise(r => setTimeout(r, 1200)); // Slightly slower for email
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
    <div className="flex h-screen bg-[#F8F9FA] text-[#2D3436] font-sans overflow-hidden">
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Background Grid Effect */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
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
                  className="absolute -inset-4 border border-white/10 rounded-full"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-8 border border-white/5 rounded-full border-dashed"
                />
                <div className="bg-white p-6 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] relative z-10">
                  <Zap className="w-16 h-16 text-[#0A0A0A]" />
                </div>
              </div>

              <h1 className="text-white text-4xl font-display font-bold tracking-tighter mb-4 flex items-center gap-2">
                Omni<span className="text-white/40">Toolbox</span>
              </h1>

              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-[10px] font-mono font-bold text-white/60 uppercase tracking-widest">
                    Establishing Secure Link...
                  </span>
                </div>
                
                {/* Simulated Terminal Output */}
                <div className="font-mono text-[9px] text-white/20 space-y-1 text-center max-w-xs">
                  <p className="animate-pulse">{'>'}&nbsp;INITIALIZING_CORE_MODULES...</p>
                  <p className="opacity-40">{'>'}&nbsp;ENCRYPTING_SESSION_DATA...</p>
                  <p className="opacity-20">{'>'}&nbsp;BYPASSING_RESTRICTIONS...</p>
                </div>
              </div>
            </motion.div>
            
            <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-4">
              <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: "easeInOut" }}
                  className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                />
              </div>
              <div className="flex items-center gap-6 opacity-20">
                <p className="text-[9px] font-bold text-white uppercase tracking-[0.3em]">v2.4.0 STABLE</p>
                <div className="w-1 h-1 bg-white rounded-full" />
                <p className="text-[9px] font-bold text-white uppercase tracking-[0.3em]">ENCRYPTED</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-[#E9ECEF] flex flex-col relative z-20"
      >
        <div className="p-6 border-b border-[#E9ECEF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#141414] p-2 rounded-lg shadow-lg shadow-black/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold tracking-tight text-xl">OmniToolbox</span>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">
            Overview
          </div>
          <button 
            onClick={() => changeView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentView === 'dashboard' 
                ? 'bg-[#141414] text-white shadow-lg shadow-[#141414]/10' 
                : 'text-[#6C757D] hover:bg-[#F1F3F5] hover:text-[#141414]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
            {currentView === 'dashboard' && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
          </button>

          {(isKeyValid || isAdmin) && (
            <>
              <div className="px-3 py-2 mt-6 text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">
                Main Feature
              </div>
              <button 
                onClick={() => changeView('bomber')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentView === 'bomber' 
                    ? 'bg-[#141414] text-white shadow-lg shadow-[#141414]/10' 
                    : 'text-[#6C757D] hover:bg-[#F1F3F5] hover:text-[#141414]'
                }`}
              >
                <Bomb className="w-5 h-5" />
                <span className="font-medium">SMS Bomber</span>
                {currentView === 'bomber' && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </button>

              <button 
                onClick={() => changeView('garena')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentView === 'garena' 
                    ? 'bg-[#141414] text-white shadow-lg shadow-[#141414]/10' 
                    : 'text-[#6C757D] hover:bg-[#F1F3F5] hover:text-[#141414]'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span className="font-medium">Garena Checker</span>
                {currentView === 'garena' && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </button>

              <button 
                onClick={() => changeView('email')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentView === 'email' 
                    ? 'bg-[#141414] text-white shadow-lg shadow-[#141414]/10' 
                    : 'text-[#6C757D] hover:bg-[#F1F3F5] hover:text-[#141414]'
                }`}
              >
                <Mail className="w-5 h-5" />
                <span className="font-medium">Email Bomber</span>
                {currentView === 'email' && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </button>

              <button 
                onClick={() => changeView('upcoming')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentView === 'upcoming' 
                    ? 'bg-[#141414] text-white shadow-lg shadow-[#141414]/10' 
                    : 'text-[#6C757D] hover:bg-[#F1F3F5] hover:text-[#141414]'
                }`}
              >
                <Rocket className="w-5 h-5" />
                <span className="font-medium">Upcoming</span>
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-[8px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>
                  {currentView === 'upcoming' && <ChevronRight className="w-4 h-4 opacity-50" />}
                </div>
              </button>
            </>
          )}

          <div className="px-3 py-2 mt-6 text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">
            System
          </div>
          <button 
            onClick={() => changeView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentView === 'settings' 
                ? 'bg-[#141414] text-white shadow-lg shadow-[#141414]/10' 
                : 'text-[#6C757D] hover:bg-[#F1F3F5] hover:text-[#141414]'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
            {currentView === 'settings' && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
          </button>

          {isAdmin && (
            <button 
              onClick={() => changeView('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === 'admin' 
                  ? 'bg-[#141414] text-white shadow-lg shadow-[#141414]/10' 
                  : 'text-[#6C757D] hover:bg-[#F1F3F5] hover:text-[#141414]'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">Admin Panel</span>
              {currentView === 'admin' && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
            </button>
          )}

          <a 
            href="https://t.me/ItsMeJeff"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[#6C757D] hover:bg-[#F1F3F5] hover:text-[#141414]"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Contact Support</span>
            <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
          </a>
        </nav>

        <div className="p-4 border-t border-[#E9ECEF]">
          {user ? (
            <div className="bg-[#F8F9FA] p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full border border-[#E9ECEF]" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{user.displayName}</p>
                  <p className="text-[10px] text-[#ADB5BD] truncate uppercase tracking-widest">{isAdmin ? 'Administrator' : 'User'}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-2 bg-white border border-[#E9ECEF] text-[#141414] rounded-lg text-[10px] font-bold hover:bg-[#F1F3F5] transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full py-3 bg-[#141414] text-white rounded-xl font-bold text-xs shadow-lg shadow-black/10 hover:bg-[#2D3436] transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Access System
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[#E9ECEF] flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#F1F3F5] rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="font-display font-bold text-lg capitalize tracking-tight">
              {currentView === 'dashboard' ? 'Overview' : 
               currentView === 'bomber' ? 'SMS Bomber' : 
               currentView === 'email' ? 'Email Bomber' :
               currentView === 'garena' ? 'Garena Checker' : 
               currentView === 'upcoming' ? 'Upcoming Features' : 'Settings'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg text-[11px] font-mono font-medium text-[#6C757D]">
              <Clock className="w-3.5 h-3.5" />
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                <ShieldCheck className="w-3 h-3" />
                Anti-DDoS
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-100">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Online
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
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
                  <div className="bg-white border-2 border-[#141414] rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="max-w-xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-[#141414] p-2 rounded-lg">
                            <Lock className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-[10px] font-bold text-[#141414] uppercase tracking-widest">System Locked</span>
                        </div>
                        <h2 className="text-3xl font-display font-bold mb-4">Access Key Required</h2>
                        <p className="text-[#6C757D] mb-6">To prevent abuse and maintain system performance, a valid access key is required to use the stress testing tools. You can get a key from our official channel.</p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="relative flex-1">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD]" />
                            <input 
                              type="text" 
                              placeholder="Enter Access Key"
                              value={userKey}
                              onChange={(e) => setUserKey(e.target.value)}
                              className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#141414] transition-all font-mono"
                            />
                          </div>
                          <button 
                            onClick={() => validateKey(userKey)}
                            disabled={isCheckingKey || !userKey}
                            className="px-8 py-4 bg-[#141414] text-white rounded-xl font-bold hover:bg-[#2D3436] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isCheckingKey ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            Activate
                          </button>
                        </div>
                        {keyError && <p className="mt-4 text-red-500 text-xs font-bold uppercase tracking-widest">{keyError}</p>}
                      </div>
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 bg-[#F8F9FA] rounded-full flex items-center justify-center border-2 border-[#E9ECEF]">
                          <Zap className="w-10 h-10 text-[#141414]" />
                        </div>
                        <a 
                          href="https://t.me/ItsMeJeff" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-[#141414] underline underline-offset-4"
                        >
                          Get a Key
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {isKeyValid && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500 p-2 rounded-lg">
                        <ShieldCheck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-green-800">System Access Granted</p>
                        <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Your key is active and valid</p>
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
                  <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <Activity className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">LIVE</span>
                    </div>
                    <p className="text-xs font-bold text-[#ADB5BD] uppercase tracking-widest">Total Operations</p>
                    <p className="text-3xl font-bold mt-1">{history.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-purple-50 p-2 rounded-lg">
                        <Globe className="w-5 h-5 text-purple-500" />
                      </div>
                      <span className="text-[10px] font-bold text-[#ADB5BD]">GLOBAL</span>
                    </div>
                    <p className="text-xs font-bold text-[#ADB5BD] uppercase tracking-widest">Active Services</p>
                    <p className="text-3xl font-bold mt-1">{availableServices.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-orange-50 p-2 rounded-lg">
                        <Cpu className="w-5 h-5 text-orange-500" />
                      </div>
                      <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">12% LOAD</span>
                    </div>
                    <p className="text-xs font-bold text-[#ADB5BD] uppercase tracking-widest">System Health</p>
                    <div className="mt-4 h-1.5 bg-[#F1F3F5] rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 w-[12%]" />
                    </div>
                    <p className="text-[10px] font-bold mt-2 text-[#6C757D]">STABLE</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-emerald-50 p-2 rounded-lg">
                        <Wifi className="w-5 h-5 text-emerald-500" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">24ms</span>
                    </div>
                    <p className="text-xs font-bold text-[#ADB5BD] uppercase tracking-widest">Network Latency</p>
                    <div className="mt-4 flex items-end gap-0.5 h-6">
                      {[4, 7, 5, 8, 6, 9, 7].map((h, i) => (
                        <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-sm" style={{ height: `${h * 10}%` }} />
                      ))}
                    </div>
                    <p className="text-[10px] font-bold mt-2 text-[#6C757D]">OPTIMIZED</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-[#E9ECEF] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <History className="w-5 h-5 text-[#141414]" />
                          <h3 className="font-display font-bold">Recent Activity</h3>
                        </div>
                        <button 
                          onClick={() => setHistory([])}
                          className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Clear
                        </button>
                      </div>
                      <div className="divide-y divide-[#E9ECEF]">
                        {history.length === 0 ? (
                          <div className="p-12 text-center">
                            <Clock className="w-12 h-12 text-[#DEE2E6] mx-auto mb-4" />
                            <p className="text-sm text-[#ADB5BD] font-medium">No recent activity found.</p>
                          </div>
                        ) : (
                          history.map((item) => (
                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-[#F8F9FA] transition-colors group">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg transition-transform group-hover:scale-110 ${item.type === 'SMS' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                  {item.type === 'SMS' ? <Bomb className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold">{item.target}</p>
                                  <p className="text-[10px] text-[#ADB5BD] font-medium uppercase tracking-wider">{item.type} • {item.timestamp}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.status === 'COMPLETED' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                                  {item.status}
                                </span>
                                <p className="text-[10px] text-[#6C757D] mt-1 max-w-[150px] truncate">{item.details}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-[#E9ECEF] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Terminal className="w-5 h-5 text-[#141414]" />
                          <h3 className="font-display font-bold">System Log</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">Streaming</span>
                        </div>
                      </div>
                      <div className="p-4 bg-[#141414] font-mono text-[11px] h-48 overflow-y-auto space-y-1">
                        {systemLogs.map(log => (
                          <div key={log.id} className="flex gap-2">
                            <span className="text-white/30">[{new Date().toLocaleTimeString()}]</span>
                            <span className={log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-blue-400'}>
                              {log.type.toUpperCase()}
                            </span>
                            <span className="text-white/80">{log.msg}</span>
                          </div>
                        ))}
                        <div className="flex gap-2 animate-pulse">
                          <span className="text-white/30">[{new Date().toLocaleTimeString()}]</span>
                          <span className="text-green-400">WAIT</span>
                          <span className="text-white/80">Listening for incoming requests...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-[#141414] text-white p-6 rounded-2xl shadow-xl shadow-[#141414]/20 relative overflow-hidden">
                      <div className="relative z-10">
                        <h3 className="font-bold text-lg mb-2">Omni Premium</h3>
                        <p className="text-xs text-white/60 mb-6 leading-relaxed">Get access to exclusive high-speed APIs and advanced security features.</p>
                        <button className="w-full py-3 bg-white text-[#141414] rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-all">
                          Upgrade Now <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                      <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12" />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        System Status
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6C757D]">API Gateway</span>
                          <span className="text-[10px] font-bold text-green-500">OPERATIONAL</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6C757D]">Database Cluster</span>
                          <span className="text-[10px] font-bold text-green-500">OPERATIONAL</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6C757D]">Rate Limiter</span>
                          <span className="text-[10px] font-bold text-green-500">OPERATIONAL</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    <h3 className="font-display font-bold">System Info</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                      <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest mb-1">Engine Version</p>
                      <p className="font-bold text-sm">v2.4.0 STABLE</p>
                    </div>
                    <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                      <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest mb-1">Security Level</p>
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
                    <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 shadow-sm relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="bg-[#141414] p-3 rounded-xl shadow-lg shadow-black/20">
                            <Bomb className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-display font-bold">SMS Stress Test</h3>
                            <p className="text-sm text-[#6C757D]">Configure and launch high-volume request sequences.</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-bold mb-2 text-[#ADB5BD] uppercase tracking-widest">Target Phone Number</label>
                            <div className="relative group">
                              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#141414] transition-colors" />
                              <input 
                                type="text" 
                                placeholder="09123456789"
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                disabled={isTesting}
                                className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#141414] focus:bg-white transition-all font-mono text-lg"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold mb-2 text-[#ADB5BD] uppercase tracking-widest">Request Volume</label>
                            <div className="relative group">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#141414] transition-colors" />
                              <input 
                                type="number" 
                                value={totalRequests}
                                onChange={(e) => setTotalRequests(parseInt(e.target.value))}
                                disabled={isTesting}
                                className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#141414] focus:bg-white transition-all font-mono text-lg"
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
                              className="w-full py-4 bg-[#141414] hover:bg-[#2D3436] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#141414]/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Play className="w-5 h-5" />
                              Initiate Sequence
                            </button>
                          )}
                        </div>
                      </div>
                      <Zap className="absolute -right-8 -bottom-8 w-32 h-32 text-[#F8F9FA] rotate-12" />
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl border border-[#E9ECEF] p-6 shadow-sm group hover:border-[#141414] transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">Success Rate</p>
                          <Zap className="w-4 h-4 text-yellow-500" />
                        </div>
                        <p className="text-3xl font-display font-bold">{successRate.toFixed(1)}%</p>
                        <div className="mt-4 h-1 bg-[#F1F3F5] rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-green-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${successRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-[#E9ECEF] p-6 shadow-sm group hover:border-[#141414] transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">Processed</p>
                          <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-3xl font-display font-bold">{progress?.completed || 0}</p>
                        <p className="text-[10px] text-[#ADB5BD] font-bold mt-2 uppercase tracking-widest">Of {totalRequests} Requests</p>
                      </div>
                    </div>
                  </div>

                  {/* Logs Card */}
                  <div className="lg:col-span-7 flex flex-col min-h-[500px]">
                    <div className="bg-[#141414] rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border border-white/5">
                      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Sequence Telemetry</h3>
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
                            className="text-[10px] font-bold text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto font-mono text-[11px] p-4 custom-scrollbar">
                        <div className="space-y-1.5">
                          {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center py-32 opacity-10 text-white">
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
                                className="flex items-center gap-4 px-3 py-2 hover:bg-white/5 rounded transition-colors group"
                              >
                                <span className="text-white/20 shrink-0">[{log.timestamp}]</span>
                                <span className="text-white/60 font-bold w-24 truncate">{log.service}</span>
                                <span className={`font-bold shrink-0 px-1.5 py-0.5 rounded text-[9px] ${log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {log.status === 'SUCCESS' ? 'OK' : 'ERR'}
                                </span>
                                <span className="text-white/40 truncate flex-1">
                                  {log.status === 'SUCCESS' ? `HTTP ${log.code}` : log.error}
                                </span>
                                <ArrowUpRight className="w-3 h-3 text-white/0 group-hover:text-white/20 transition-colors" />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Progress bar at bottom of logs */}
                      {isTesting && progress && (
                        <div className="h-1.5 bg-white/5 w-full">
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
                    <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 shadow-sm relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="bg-[#141414] p-3 rounded-xl shadow-lg shadow-black/20">
                            <Mail className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-display font-bold">Email Stress Test</h3>
                            <p className="text-sm text-[#6C757D]">Simulate high-volume email registration requests.</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-bold mb-2 text-[#ADB5BD] uppercase tracking-widest">Target Email Address</label>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#141414] transition-colors" />
                              <input 
                                type="email" 
                                placeholder="target@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isEmailTesting}
                                className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#141414] focus:bg-white transition-all font-mono text-lg"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold mb-2 text-[#ADB5BD] uppercase tracking-widest">Request Volume</label>
                            <div className="relative group">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#141414] transition-colors" />
                              <input 
                                type="number" 
                                value={emailRequests}
                                onChange={(e) => setEmailRequests(parseInt(e.target.value))}
                                disabled={isEmailTesting}
                                className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#141414] focus:bg-white transition-all font-mono text-lg"
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
                              className="w-full py-4 bg-[#141414] hover:bg-[#2D3436] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#141414]/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Play className="w-5 h-5" />
                              Initiate Sequence
                            </button>
                          )}
                        </div>
                      </div>
                      <Zap className="absolute -right-8 -bottom-8 w-32 h-32 text-[#F8F9FA] rotate-12" />
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl border border-[#E9ECEF] p-6 shadow-sm group hover:border-[#141414] transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">Success Rate</p>
                          <Zap className="w-4 h-4 text-yellow-500" />
                        </div>
                        <p className="text-3xl font-display font-bold">{emailSuccessRate.toFixed(1)}%</p>
                        <div className="mt-4 h-1 bg-[#F1F3F5] rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-green-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${emailSuccessRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-[#E9ECEF] p-6 shadow-sm group hover:border-[#141414] transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">Processed</p>
                          <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-3xl font-display font-bold">{emailProgress?.completed || 0}</p>
                        <p className="text-[10px] text-[#ADB5BD] font-bold mt-2 uppercase tracking-widest">Of {emailRequests} Requests</p>
                      </div>
                    </div>
                  </div>

                  {/* Logs Card */}
                  <div className="lg:col-span-7 flex flex-col min-h-[500px]">
                    <div className="bg-[#141414] rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border border-white/5">
                      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Email Telemetry</h3>
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
                            className="text-[10px] font-bold text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto font-mono text-[11px] p-4 custom-scrollbar">
                        <div className="space-y-1.5">
                          {emailLogs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center py-32 opacity-10 text-white">
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
                                className="flex items-center gap-4 px-3 py-2 hover:bg-white/5 rounded transition-colors group"
                              >
                                <span className="text-white/20 shrink-0">[{log.timestamp}]</span>
                                <span className="text-white/60 font-bold w-24 truncate">{log.service}</span>
                                <span className={`font-bold shrink-0 px-1.5 py-0.5 rounded text-[9px] ${log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {log.status === 'SUCCESS' ? 'OK' : 'ERR'}
                                </span>
                                <span className="text-white/40 truncate flex-1">
                                  {log.status === 'SUCCESS' ? `HTTP ${log.code}` : log.error}
                                </span>
                                <ArrowUpRight className="w-3 h-3 text-white/0 group-hover:text-white/20 transition-colors" />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>

                      {isEmailTesting && emailProgress && (
                        <div className="h-1.5 bg-white/5 w-full">
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
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-[#141414] p-3 rounded-xl">
                      <UserCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Garena Account Checker</h3>
                      <p className="text-sm text-[#6C757D]">Verify Garena accounts and check security status.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold mb-2 text-[#495057]">Account (Email/Username/Phone)</label>
                      <input 
                        type="text" 
                        value={garenaAccount}
                        onChange={(e) => setGarenaAccount(e.target.value)}
                        placeholder="example@gmail.com"
                        className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl py-4 px-4 focus:outline-none focus:border-[#141414] focus:bg-white transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-2 text-[#495057]">Password</label>
                      <input 
                        type="password" 
                        value={garenaPassword}
                        onChange={(e) => setGarenaPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl py-4 px-4 focus:outline-none focus:border-[#141414] focus:bg-white transition-all font-mono"
                      />
                    </div>

                    <button 
                      onClick={handleGarenaCheck}
                      disabled={!garenaAccount || !garenaPassword || isCheckingGarena}
                      className="w-full py-4 bg-[#141414] hover:bg-[#2D3436] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#141414]/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isCheckingGarena ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                      Check Account
                    </button>
                  </div>

                  {garenaResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-8 p-6 rounded-2xl border-2 ${
                        garenaResult.status === 'SUCCESS' ? 'bg-white border-green-500/20 shadow-xl shadow-green-500/5' : 'bg-white border-red-500/20 shadow-xl shadow-red-500/5'
                      }`}
                    >
                      {garenaResult.status === 'SUCCESS' ? (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                                <UserCheck className="w-8 h-8" />
                              </div>
                              <div>
                                <h4 className="text-2xl font-display font-bold text-[#141414]">{garenaResult.data.nickname}</h4>
                                <p className="text-sm text-[#6C757D] font-medium">UID: {garenaResult.data.uid}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`Nickname: ${garenaResult.data.nickname}\nUID: ${garenaResult.data.uid}`);
                              }}
                              className="p-2 hover:bg-[#F1F3F5] rounded-xl transition-colors text-[#6C757D]"
                              title="Copy Info"
                            >
                              <Copy className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                              <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest mb-1">Email Status</p>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${garenaResult.data.email_status === 1 ? 'bg-green-500' : 'bg-orange-500'}`} />
                                <p className="font-bold text-sm">{garenaResult.data.email_status === 1 ? 'Verified' : 'Unverified'}</p>
                              </div>
                            </div>
                            <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                              <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest mb-1">Mobile Status</p>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${garenaResult.data.mobile_status === 1 ? 'bg-green-500' : 'bg-orange-500'}`} />
                                <p className="font-bold text-sm">{garenaResult.data.mobile_status === 1 ? 'Verified' : 'Unverified'}</p>
                              </div>
                            </div>
                          </div>

                          {garenaResult.data.codm && (
                            <div className="p-6 bg-[#141414] rounded-2xl text-white relative overflow-hidden">
                              <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">CODM Profile Detected</p>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Nickname</p>
                                    <p className="font-bold text-sm truncate">{garenaResult.data.codm.nickname}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Level</p>
                                    <p className="font-bold text-sm">{garenaResult.data.codm.level}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-white/40 uppercase mb-1">EXP</p>
                                    <p className="font-bold text-sm">{garenaResult.data.codm.exp}</p>
                                  </div>
                                </div>
                              </div>
                              <Smartphone className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 rotate-12" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 text-red-600">
                          <div className="bg-red-50 p-3 rounded-xl">
                            <XCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold">Check Failed</p>
                            <p className="text-sm opacity-80">{garenaResult.error}</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-display font-bold">Admin Control Panel</h2>
                    <p className="text-[#6C757D]">Manage system access keys and monitor usage.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {!user && (
                      <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-2 flex items-center gap-2 text-orange-600 text-[10px] font-bold uppercase tracking-widest">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Sign In Required for Database Actions
                      </div>
                    )}
                    <div className="bg-white border border-[#E9ECEF] rounded-xl p-4 flex items-center gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">Total Keys</p>
                        <p className="text-xl font-bold">{allKeys.length}</p>
                      </div>
                      <div className="w-10 h-10 bg-[#141414] rounded-lg flex items-center justify-center">
                        <Key className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 shadow-sm">
                      <h3 className="text-lg font-bold mb-6">Generate New Key</h3>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-bold mb-2 text-[#ADB5BD] uppercase tracking-widest">Duration (Hours)</label>
                          <select 
                            value={newKeyDuration}
                            onChange={(e) => setNewKeyDuration(parseInt(e.target.value))}
                            className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl py-4 px-4 focus:outline-none focus:border-[#141414] font-bold"
                          >
                            <option value={1}>1 Hour</option>
                            <option value={12}>12 Hours</option>
                            <option value={24}>24 Hours</option>
                            <option value={168}>1 Week</option>
                            <option value={720}>1 Month</option>
                            <option value={8760}>1 Year</option>
                          </select>
                        </div>
                        <button 
                          onClick={generateKey}
                          disabled={isGeneratingKey}
                          className="w-full py-4 bg-[#141414] text-white rounded-xl font-bold hover:bg-[#2D3436] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {isGeneratingKey ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                          {isGeneratingKey ? 'Generating...' : 'Generate Key'}
                        </button>
                        {adminError && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-widest">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {adminError}
                          </div>
                        )}
                        {adminSuccess && (
                          <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2 text-green-600 text-[10px] font-bold uppercase tracking-widest">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {adminSuccess}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-[#E9ECEF] overflow-hidden shadow-sm">
                      <div className="p-6 border-b border-[#E9ECEF] flex items-center justify-between bg-[#F8F9FA]">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Active Access Keys</h3>
                        <RefreshCw className="w-4 h-4 text-[#ADB5BD]" />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-[#E9ECEF] text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">
                              <th className="px-6 py-4">Key</th>
                              <th className="px-6 py-4">Expires</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E9ECEF]">
                            {allKeys.map((k) => (
                              <tr key={k.id} className="hover:bg-[#F8F9FA] transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <code className="bg-[#F1F3F5] px-2 py-1 rounded text-xs font-mono">{k.key.substring(0, 8)}...</code>
                                    <button 
                                      onClick={() => navigator.clipboard.writeText(k.key)}
                                      className="p-1 hover:bg-[#E9ECEF] rounded transition-colors"
                                    >
                                      <Copy className="w-3 h-3 text-[#ADB5BD]" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-medium">
                                  {k.expiresAt?.toDate().toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${
                                    k.expiresAt?.toMillis() > Date.now() ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                  }`}>
                                    {k.expiresAt?.toMillis() > Date.now() ? 'ACTIVE' : 'EXPIRED'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => revokeKey(k.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {allKeys.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-[#ADB5BD] font-medium">
                                  No keys generated yet.
                                </td>
                              </tr>
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
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-8 rounded-3xl border border-[#E9ECEF] shadow-sm overflow-hidden relative">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-500/10 p-2 rounded-lg">
                        <Sparkles className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Roadmap 2026</span>
                    </div>
                    <h3 className="text-3xl font-display font-bold tracking-tight mb-2">Upcoming Features</h3>
                    <p className="text-[#6C757D] max-w-lg">We're constantly working on expanding OmniToolbox. Here's a sneak peek at what's coming in the next major updates.</p>
                  </div>
                  <Rocket className="absolute -right-8 -bottom-8 w-48 h-48 text-[#F8F9FA] -rotate-12" />
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
                      className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-3 rounded-xl bg-${feature.color}-500/10 group-hover:scale-110 transition-transform`}>
                          {feature.icon}
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-full bg-${feature.color}-50 text-${feature.color}-600 uppercase tracking-wider`}>
                          {feature.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg mb-2">{feature.title}</h4>
                      <p className="text-xs text-[#6C757D] leading-relaxed mb-6">{feature.desc}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#ADB5BD]">
                          <span>Development Progress</span>
                          <span>{feature.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-[#F1F3F5] rounded-full overflow-hidden">
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

                <div className="bg-[#141414] rounded-3xl p-8 text-white relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-display font-bold mb-2">Have a feature request?</h3>
                      <p className="text-white/60 text-sm">We're always open to suggestions from our community.</p>
                    </div>
                    <a 
                      href="https://t.me/ItsMeJeff"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-8 py-4 bg-white text-[#141414] rounded-2xl font-bold text-sm hover:bg-white/90 transition-all shadow-xl shadow-white/10 flex items-center gap-2"
                    >
                      Submit Suggestion <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
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
                <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 shadow-sm space-y-8">
                  <div>
                    <h3 className="text-lg font-bold mb-1">System Settings</h3>
                    <p className="text-sm text-[#6C757D]">Configure the stress testing engine parameters.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 p-2 rounded-lg">
                          <ShieldCheck className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Anti-DDoS Protection</p>
                          <p className="text-xs text-[#ADB5BD]">Rate limiting and traffic analysis active.</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-blue-500 text-white rounded-full text-[10px] font-bold">
                        ACTIVE
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500/10 p-2 rounded-lg">
                          <Lock className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Secure Headers (Helmet)</p>
                          <p className="text-xs text-[#ADB5BD]">XSS and Clickjacking protection enabled.</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-bold">
                        ENABLED
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-xl">
                      <div>
                        <p className="font-bold text-sm">Rate Limiting Protection</p>
                        <p className="text-xs text-[#ADB5BD]">Automatically delay requests to avoid detection.</p>
                      </div>
                      <div className="w-12 h-6 bg-[#141414] rounded-full relative p-1 cursor-pointer">
                        <div className="w-4 h-4 bg-white rounded-full absolute right-1" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-xl">
                      <div>
                        <p className="font-bold text-sm">Service Randomization</p>
                        <p className="text-xs text-[#ADB5BD]">Rotate through available API providers.</p>
                      </div>
                      <div className="w-12 h-6 bg-[#141414] rounded-full relative p-1 cursor-pointer">
                        <div className="w-4 h-4 bg-white rounded-full absolute right-1" />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-[#E9ECEF]">
                      <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest mb-4">Available Services ({availableServices.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {availableServices.map((s, i) => (
                          <span key={i} className="px-3 py-1.5 bg-[#F1F3F5] text-[#495057] rounded-lg text-[11px] font-medium border border-[#E9ECEF]">
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
        <footer className="h-10 bg-white border-t border-[#E9ECEF] flex items-center justify-between px-6 shrink-0 text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">
          <div className="flex gap-6">
            <span>Build: 2026.03.23</span>
            <span>Environment: Production</span>
            <span className="text-[#141414]">Support: @ItsMeJeff</span>
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
