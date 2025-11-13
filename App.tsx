import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import CryptoJS from 'crypto-js';
import LogoMarkV from './imports/LogoMarkV1';
import welcomeAudio from './assets/advertising-logo-199582.mp3';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Card } from './components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import Lenis from 'lenis';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { NotFound } from './components/NotFound';
import { Toaster } from './components/ui/sonner';
import { IconPlaceholder } from './components/IconPlaceholder';
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './components/ui/carousel';
import { Check, Database as DatabaseIcon, Zap, Shield, Server, Code, Package, Cloud, Snowflake, Archive, GitBranch, Code2, Layers, Github, Rss, Link2, Lock, Unlock } from 'lucide-react';
import { CustomCursor } from './components/CustomCursor';

const LottiePlayer = 'lottie-player' as any;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type View = 'landing' | 'login' | 'dashboard' | 'blog' | 'not-found';
type Article = {
  id: string;
  title: string;
  contentHtml: string;
  imageUrl: string;
  videoUrl: string;
  createdAt: string;
  authorName: string;
  authorTitle: string;
  authorAvatar: string;
};

type WaitlistEntry = {
  id: string;
  email: string;
  timestamp: string;
};

const BLOG_EDITOR_PASSWORD_HASH = '1a7bf9ce919484c0709c54b0c9a263347813fcd77f67ed9f4f2d9b7381147554';
const DB_ENCRYPTION_SECRET = 'e59680c4e9c618379cacd3cd8f6344e353d2177c4d2d5638b9070d41e1d52bbf';
const DB_STORAGE_KEY = 'glacia_sqlite_db';
const VIEW_STORAGE_KEY = 'glacia_current_view';
const LEGACY_WAITLIST_STORAGE_KEY = 'waitlist';
const LEGACY_ARTICLES_STORAGE_KEY = 'glaciaArticles';

const getStoredWaitlistEntries = (): WaitlistEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_WAITLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry.email === 'string' &&
          entry.email.trim().length > 0 &&
          typeof entry.timestamp === 'string'
      )
      .map((entry) => ({
        id: typeof entry.id === 'string' ? entry.id : crypto.randomUUID(),
        email: entry.email,
        timestamp: entry.timestamp,
      }));
  } catch (error) {
    console.error('Failed to parse waitlist entries', error);
    return [];
  }
};

const createEmptyDraft = (): Omit<Article, 'id' | 'createdAt'> => ({
  title: '',
  contentHtml: '',
  imageUrl: '',
  videoUrl: '',
  authorName: '',
  authorTitle: '',
  authorAvatar: '',
});

const uint8ToBase64 = (data: Uint8Array) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const base64ToUint8 = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const encryptBase64 = (base64: string) => {
  return CryptoJS.AES.encrypt(base64, DB_ENCRYPTION_SECRET).toString();
};

const decryptToBase64 = (payload: string) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(payload, DB_ENCRYPTION_SECRET).toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      return null;
    }
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt database payload', error);
    return null;
  }
};

const ensureSchema = (db: Database) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      contentHtml TEXT NOT NULL,
      imageUrl TEXT,
      videoUrl TEXT,
      createdAt TEXT NOT NULL,
      authorName TEXT NOT NULL,
      authorTitle TEXT,
      authorAvatar TEXT
    );
  `);
};

const loadWaitlistFromDb = (db: Database): WaitlistEntry[] => {
  const entries: WaitlistEntry[] = [];
  const stmt = db.prepare('SELECT id, email, timestamp FROM waitlist ORDER BY datetime(timestamp) DESC');
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, string>;
    entries.push({
      id: row.id,
      email: row.email,
      timestamp: row.timestamp,
    });
  }
  stmt.free();
  return entries;
};

const loadArticlesFromDb = (db: Database): Article[] => {
  const results: Article[] = [];
  const stmt = db.prepare(
    'SELECT id, title, contentHtml, imageUrl, videoUrl, createdAt, authorName, authorTitle, authorAvatar FROM articles ORDER BY datetime(createdAt) DESC',
  );
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, string>;
    results.push({
      id: row.id,
      title: row.title,
      contentHtml: row.contentHtml,
      imageUrl: row.imageUrl ?? '',
      videoUrl: row.videoUrl ?? '',
      createdAt: row.createdAt,
      authorName: row.authorName,
      authorTitle: row.authorTitle ?? '',
      authorAvatar: row.authorAvatar ?? '',
    });
  }
  stmt.free();
  return results;
};

const persistDatabase = (db: Database) => {
  if (typeof window === 'undefined') return;
  const data = db.export();
  const base64 = uint8ToBase64(data);
  const encrypted = encryptBase64(base64);
  window.localStorage.setItem(DB_STORAGE_KEY, encrypted);
};

const getDatabaseBytes = (payload: string): { bytes: Uint8Array | null; legacy: boolean } => {
  const decrypted = decryptToBase64(payload);
  if (decrypted) {
    return { bytes: base64ToUint8(decrypted), legacy: false };
  }
  try {
    return { bytes: base64ToUint8(payload), legacy: true };
  } catch (error) {
    console.error('Stored database payload is invalid', error);
    return { bytes: null, legacy: false };
  }
};

const getLegacyArticles = (): Article[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(LEGACY_ARTICLES_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((article: any) => ({
      id: typeof article.id === 'string' ? article.id : crypto.randomUUID(),
      title: article.title || '',
      contentHtml: article.contentHtml || article.content || '',
      imageUrl: article.imageUrl || '',
      videoUrl: article.videoUrl || '',
      createdAt: article.createdAt || new Date().toISOString(),
      authorName: article.authorName || 'Glacia Team',
      authorTitle: article.authorTitle || 'Editorial',
      authorAvatar: article.authorAvatar || '',
    }));
  } catch (error) {
    console.error('Failed to parse legacy articles', error);
    return [];
  }
};

const migrateLegacyData = (db: Database) => {
  const legacyWaitlist = getStoredWaitlistEntries();
  if (legacyWaitlist.length) {
    const insertWaitlist = db.prepare('INSERT OR IGNORE INTO waitlist (id, email, timestamp) VALUES (?, ?, ?)');
    legacyWaitlist.forEach((entry) => {
      insertWaitlist.run([entry.id, entry.email, entry.timestamp]);
    });
    insertWaitlist.free();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LEGACY_WAITLIST_STORAGE_KEY);
    }
  }

  const legacyArticles = getLegacyArticles();
  if (legacyArticles.length) {
    const insertArticle = db.prepare(
      'INSERT OR REPLACE INTO articles (id, title, contentHtml, imageUrl, videoUrl, createdAt, authorName, authorTitle, authorAvatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    legacyArticles.forEach((article) => {
      insertArticle.run([
        article.id,
        article.title,
        article.contentHtml,
        article.imageUrl,
        article.videoUrl,
        article.createdAt,
        article.authorName,
        article.authorTitle,
        article.authorAvatar,
      ]);
    });
    insertArticle.free();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LEGACY_ARTICLES_STORAGE_KEY);
    }
  }
};

const pathToView = (path: string): View | null => {
  const normalized = path.replace(/\/+$/, '') || '/';
  switch (normalized) {
    case '/':
      return null;
    case '/blog':
      return 'blog';
    case '/demo':
      return 'login';
    case '/dashboard':
      return 'dashboard';
    case '/404':
      return 'not-found';
    default:
      return null;
  }
};

const getInitialView = (): View => {
  if (typeof window === 'undefined') return 'landing';
  const pathView = pathToView(window.location.pathname);
  if (pathView === 'not-found') return 'not-found';
  if (pathView) return pathView;
  const stored = window.sessionStorage.getItem(VIEW_STORAGE_KEY);
  if (stored === 'landing' || stored === 'login' || stored === 'dashboard' || stored === 'blog') {
    return stored;
  }
  return 'landing';
};

export default function App() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [currentView, setCurrentView] = useState<View>(() => getInitialView());
  const [showLottie, setShowLottie] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  const [mobileLinksOpen, setMobileLinksOpen] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [articleDraft, setArticleDraft] = useState<Omit<Article, 'id' | 'createdAt'>>(() => createEmptyDraft());
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [editorPassword, setEditorPassword] = useState('');
  const [isEditorUnlocked, setIsEditorUnlocked] = useState(false);
  const [showLockPrompt, setShowLockPrompt] = useState(false);
  const [pendingSection, setPendingSection] = useState<string | null>(null);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [isImportingDatabase, setIsImportingDatabase] = useState(false);
  const [isExportingDatabase, setIsExportingDatabase] = useState(false);
  const [cursorVersion, setCursorVersion] = useState(0);
  const lenisRef = useRef<Lenis | null>(null);
  const sectionNodesRef = useRef<HTMLElement[]>([]);
  const isAutoScrollingRef = useRef(false);
  const scrollLockTimeoutRef = useRef<number | undefined>(undefined);
  const touchStartYRef = useRef(0);
  const currentViewRef = useRef<View>('landing');
  const techSectionRef = useRef<HTMLDivElement | null>(null);
  const editorSectionRef = useRef<HTMLDivElement | null>(null);
  const sqlJsRef = useRef<SqlJsStatic | null>(null);
  const databaseRef = useRef<Database | null>(null);
  const dbFileInputRef = useRef<HTMLInputElement | null>(null);
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);

  const refreshWaitlistFromDb = useCallback(() => {
    const db = databaseRef.current;
    if (!db) return;
    setWaitlistEntries(loadWaitlistFromDb(db));
  }, []);

  const refreshArticlesFromDb = useCallback(() => {
    const db = databaseRef.current;
    if (!db) return;
    setArticles(loadArticlesFromDb(db));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    const db = databaseRef.current;
    if (!db) {
      toast.error('Database not ready yet');
      return;
    }

    const existsStmt = db.prepare('SELECT 1 FROM waitlist WHERE lower(email) = lower(?) LIMIT 1');
    existsStmt.bind([trimmedEmail]);
    const alreadyExists = existsStmt.step();
    existsStmt.free();

    if (alreadyExists) {
      toast.message('This email is already on the waitlist');
      setEmail('');
      return;
    }

    const newEntry: WaitlistEntry = {
      id: crypto.randomUUID(),
      email: trimmedEmail,
      timestamp: new Date().toISOString(),
    };

    const insertStmt = db.prepare('INSERT INTO waitlist (id, email, timestamp) VALUES (?, ?, ?)');
    insertStmt.run([newEntry.id, newEntry.email, newEntry.timestamp]);
    insertStmt.free();
    persistDatabase(db);
    refreshWaitlistFromDb();

    setIsSubmitted(true);
    toast.success('Successfully joined the waitlist!');
    setEmail('');
    setShowLottie(true);
  };

  const handleLogin = () => {
    setCurrentView('login');
  };

  const handleLoginSuccess = () => {
    setCurrentView('dashboard');
    toast.success('Welcome back!');
  };

  const handleLogout = () => {
    setCurrentView('landing');
    toast.success('Logged out successfully');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  const handleGoToBlog = () => {
    if (currentView !== 'blog') {
      setCurrentView('blog');
    }
    setIsMenuOpen(false);
    setPendingSection(null);
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { duration: 0.9, easing: (t: number) => 1 - Math.pow(2, -10 * t) });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToEditor = () => {
    const section = editorSectionRef.current;
    if (!section) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(section, { offset: -80, duration: 0.9, easing: (t: number) => 1 - Math.pow(2, -10 * t) });
    } else {
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDatabaseDownload = () => {
    const db = databaseRef.current;
    if (!db) {
      toast.error('Database not ready yet');
      return;
    }
    setIsExportingDatabase(true);
    try {
      const data = db.export();
      const binary = new Uint8Array(data);
      const blob = new Blob([binary], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `glacia-${new Date().toISOString().split('T')[0]}.sqlite`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export database', error);
      setDatabaseError('Failed to export database');
      toast.error('Failed to export database');
    } finally {
      setIsExportingDatabase(false);
    }
  };

  const handleDatabaseUploadClick = () => {
    if (!sqlJsRef.current) {
      toast.error('Database not ready yet');
      return;
    }
    dbFileInputRef.current?.click();
  };

  const handleDatabaseFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sqlJsRef.current) {
      return;
    }
    setIsImportingDatabase(true);
    try {
      const buffer = await file.arrayBuffer();
      const SQL = sqlJsRef.current;
      const importedDb = new SQL.Database(new Uint8Array(buffer));
      ensureSchema(importedDb);
      databaseRef.current?.close();
      databaseRef.current = importedDb;
      persistDatabase(importedDb);
      refreshWaitlistFromDb();
      refreshArticlesFromDb();
      setIsDatabaseReady(true);
      setDatabaseError(null);
      toast.success('Database imported successfully');
    } catch (error) {
      console.error('Failed to import database', error);
      setDatabaseError('Failed to import database');
      toast.error('Failed to import database');
    } finally {
      setIsImportingDatabase(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(VIEW_STORAGE_KEY, currentView);
    }

    if (typeof window !== 'undefined') {
      const viewToPath: Partial<Record<View, string>> = {
        landing: '/',
        blog: '/blog',
        login: '/demo',
        dashboard: '/dashboard',
        'not-found': '/404',
      };
      const desiredPath = viewToPath[currentView];
      if (desiredPath && window.location.pathname !== desiredPath) {
        window.history.replaceState(null, '', desiredPath);
      }
    }

    if (currentView === 'landing') {
      setCursorVersion((prev) => prev + 1);
    }
  }, [currentView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateSnapMode = () => {
      const shouldSnap = window.innerWidth <= 768 && currentView === 'landing';
      document.body.classList.toggle('glacia-snap', shouldSnap);
    };
    updateSnapMode();
    window.addEventListener('resize', updateSnapMode);
    return () => {
      window.removeEventListener('resize', updateSnapMode);
      document.body.classList.remove('glacia-snap');
    };
  }, [currentView]);

  useEffect(() => {
    const audio = new Audio(welcomeAudio);
    audio.preload = 'auto';
    welcomeAudioRef.current = audio;
    return () => {
      welcomeAudioRef.current?.pause();
      welcomeAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentView !== 'landing') return;
    const audio = welcomeAudioRef.current;
    if (!audio) return;

    let isDisposed = false;

    const detachInteractionHandlers = () => {
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('pointermove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    const detachEnvironmentHandlers = () => {
      window.removeEventListener('focus', handleEnvironmentTrigger);
      window.removeEventListener('pageshow', handleEnvironmentTrigger);
      document.removeEventListener('visibilitychange', handleVisibilityVisibility);
    };

    const handleInteraction = () => {
      if (isDisposed || hasStarted) return;
      attemptPlayback(false);
    };

    const attachInteractionHandlers = () => {
      if (hasStarted) return;
      detachInteractionHandlers();
      const onceOptions = { once: true } as const;
      window.addEventListener('pointerdown', handleInteraction, onceOptions);
      window.addEventListener('pointermove', handleInteraction, onceOptions);
      window.addEventListener('touchstart', handleInteraction, onceOptions);
      window.addEventListener('keydown', handleInteraction, onceOptions);
    };

    const handleEnvironmentTrigger = () => {
      if (document.hidden) return;
      attemptPlayback(true);
    };

    const handleVisibilityVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleEnvironmentTrigger();
      }
    };

    let hasStarted = false;

    const finalizePlayback = () => {
      hasStarted = true;
      detachInteractionHandlers();
      detachEnvironmentHandlers();
    };

    const attemptPlayback = (allowMuted: boolean) => {
      if (isDisposed || hasStarted) return;
      audio.currentTime = 0;
      audio.volume = 0.225;
      audio.muted = allowMuted;
      audio.play()
        .then(() => {
          if (isDisposed || hasStarted) return;
          if (allowMuted) {
            setTimeout(() => {
              if (!isDisposed) {
                audio.muted = false;
              }
            }, 120);
          }
          finalizePlayback();
        })
        .catch((error) => {
          if (!allowMuted) {
            console.warn('Failed to play welcome audio after interaction', error);
          } else {
            console.warn('Autoplay blocked for welcome audio, waiting for interaction', error);
          }
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          if (!hasStarted) {
            attachInteractionHandlers();
          }
        });
    };

    window.addEventListener('focus', handleEnvironmentTrigger);
    window.addEventListener('pageshow', handleEnvironmentTrigger);
    document.addEventListener('visibilitychange', handleVisibilityVisibility);

    attemptPlayback(true);
    attachInteractionHandlers();

    return () => {
      isDisposed = true;
      detachInteractionHandlers();
      detachEnvironmentHandlers();
    };
  }, [currentView]);

  useEffect(() => {
    let isCancelled = false;

    const initializeDatabase = async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: (file: string) => `/sql-wasm.wasm`,
        });
        if (isCancelled) return;

        sqlJsRef.current = SQL;

        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(DB_STORAGE_KEY) : null;
        let db: Database;
        if (stored) {
          const { bytes, legacy } = getDatabaseBytes(stored);
          if (bytes) {
            db = new SQL.Database(bytes);
            ensureSchema(db);
            if (legacy) {
              persistDatabase(db);
            }
          } else {
            db = new SQL.Database();
            ensureSchema(db);
            migrateLegacyData(db);
            persistDatabase(db);
          }
        } else {
          db = new SQL.Database();
          ensureSchema(db);
          migrateLegacyData(db);
          persistDatabase(db);
        }

        databaseRef.current = db;
        refreshWaitlistFromDb();
        refreshArticlesFromDb();
        setIsDatabaseReady(true);
        setDatabaseError(null);
      } catch (error) {
        console.error('Failed to initialize database', error);
        setDatabaseError('Unable to initialize local database');
        toast.error('Failed to initialize database');
      }
    };

    initializeDatabase();

    return () => {
      isCancelled = true;
      databaseRef.current?.close();
      databaseRef.current = null;
    };
  }, [refreshArticlesFromDb, refreshWaitlistFromDb]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DB_STORAGE_KEY && event.newValue && sqlJsRef.current) {
        try {
          const { bytes } = getDatabaseBytes(event.newValue);
          if (bytes) {
            const newDb = new sqlJsRef.current.Database(bytes);
            ensureSchema(newDb);
            databaseRef.current?.close();
            databaseRef.current = newDb;
            refreshWaitlistFromDb();
            refreshArticlesFromDb();
            setIsDatabaseReady(true);
          }
        } catch (error) {
          console.error('Failed to sync database across tabs', error);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshArticlesFromDb, refreshWaitlistFromDb]);

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(section, { offset: -90, duration: 1.1 });
      } else {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleNavClick = (id: string) => {
    if (currentView !== 'landing') {
      setPendingSection(id);
      setCurrentView('landing');
      setIsMenuOpen(false);
      return;
    }
    scrollToSection(id);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (pendingSection && currentView === 'landing') {
      const sectionId = pendingSection;
      requestAnimationFrame(() => {
        scrollToSection(sectionId);
      });
      setPendingSection(null);
    }
  }, [pendingSection, currentView]);

  const triggerSectionSnap = useCallback((delta: number) => {
    if (typeof window === 'undefined') return false;
    if (currentViewRef.current !== 'landing') return false;
    const sections = sectionNodesRef.current;
    if (!sections.length || delta === 0) return false;

    const direction = delta > 0 ? 1 : -1;
    const currentScroll = window.scrollY;
    let closestIndex = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;

    sections.forEach((section, index) => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      const distance = Math.abs(top - 120 - currentScroll);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestIndex = index;
      }
    });

    const targetIndex = clamp(closestIndex + direction, 0, sections.length - 1);
    if (targetIndex === closestIndex) return false;

    const easing = (t: number) => 1 - Math.pow(2, -10 * t);
    const target = sections[targetIndex];

    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: -90, duration: 1.15, easing });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    isAutoScrollingRef.current = true;
    if (scrollLockTimeoutRef.current) {
      window.clearTimeout(scrollLockTimeoutRef.current);
    }
    scrollLockTimeoutRef.current = window.setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 1300);

    return true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateSections = () => {
      if (currentView !== 'landing') {
        sectionNodesRef.current = [];
        return;
      }
      sectionNodesRef.current = Array.from(document.querySelectorAll<HTMLElement>('[data-snap-section="true"]'));
    };
    updateSections();
    window.addEventListener('resize', updateSections);
    return () => window.removeEventListener('resize', updateSections);
  }, [currentView]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      touchMultiplier: 1.15,
      easing: (t: number) => 1 - Math.pow(2, -10 * t)
    });
    lenisRef.current = lenis;
    let frameId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };
    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scriptId = 'lottie-player-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
      script.type = 'module';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!showLottie) return;
    const timeout = window.setTimeout(() => setShowLottie(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [showLottie]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleWheel = (event: WheelEvent) => {
      if (isAutoScrollingRef.current) {
        event.preventDefault();
        return;
      }
      if (Math.abs(event.deltaY) < 40) return;
      if (triggerSectionSnap(event.deltaY)) {
        event.preventDefault();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [triggerSectionSnap]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? 0;
    };
    const handleTouchEnd = (event: TouchEvent) => {
      const endY = event.changedTouches[0]?.clientY ?? 0;
      const deltaY = touchStartYRef.current - endY;
      if (Math.abs(deltaY) < 50) return;
      if (triggerSectionSnap(deltaY)) {
        event.preventDefault();
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [triggerSectionSnap]);

  useEffect(() => {
    return () => {
      if (scrollLockTimeoutRef.current) {
        window.clearTimeout(scrollLockTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentView !== 'landing') return;
    const node = techSectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowQuickLinks(entry.isIntersecting || entry.boundingClientRect.top < 0);
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [currentView]);

  useEffect(() => {
    if (!showQuickLinks) {
      setMobileLinksOpen(false);
    }
  }, [showQuickLinks]);

  useEffect(() => {
    if (currentView !== 'landing') {
      setShowQuickLinks(false);
    }
    if (currentView !== 'blog') {
      setShowLockPrompt(false);
    }
  }, [currentView]);

  // Render Login Page
  if (currentView === 'login') {
    return <Login onLogin={handleLoginSuccess} onBack={handleBackToLanding} />;
  }

  // Render Dashboard
  if (currentView === 'dashboard') {
    return <Dashboard onLogout={handleLogout} />;
  }

  if (currentView === 'not-found') {
    return <NotFound onBackHome={handleBackToLanding} />;
  }

  // Render Landing Page
  const navLinks = [
    { label: 'Home', target: 'hero' },
    { label: 'Features', target: 'features' },
    { label: 'Product', target: 'showcase' },
  ];

  const lucideIcons = { Check, Database: DatabaseIcon, Zap, Shield, Server, Code, Package, Cloud };

  const features = [
    {
      icon: lucideIcons.Server,
      title: 'Own Your Infrastructure',
      description: 'Take control of your data storage with plug-and-play installation on your own infrastructure.'
    },
    {
      icon: lucideIcons.Zap,
      title: 'Effortless Setup',
      description: 'Get up and running in minutes with our streamlined installation process.'
    },
    {
      icon: lucideIcons.Shield,
      title: 'Secure & Private',
      description: 'Your memories stay on your infrastructure, ensuring complete privacy and security.'
    },
    {
      icon: lucideIcons.Package,
      title: 'Cost Efficient',
      description: 'Stop paying premium prices for cloud storage. Control costs with your own infrastructure.'
    }
  ];

  const glaciaLetters = ['G', 'l', 'a', 'c', 'i', 'a'];
  const wordReveal = {
    hidden: { opacity: 0, y: 30, filter: 'blur(12px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const, staggerChildren: 0.08 }
    }
  };
  const letterLazy = {
    hidden: { opacity: 0, y: 40, filter: 'blur(18px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1] as const }
    }
  };

  const technologies = [
    { name: 'AWS Glacier Deep Archive', icon: Snowflake },
    { name: 'Amazon S3 Buckets', icon: Archive },
    { name: 'Terraform Infrastructure as Code', icon: Layers },
    { name: 'GitOps Workflows', icon: GitBranch },
    { name: 'Dockerized Microservices', icon: Package },
    { name: 'TypeScript Runtime Safety', icon: Code2 },
  ];

  const showcaseVideos = [
    {
      title: 'Mobile & Desktop Views',
      description: 'Switch seamlessly between responsive layouts optimized for every device.',
      src: '',
      poster: ''
    },
    {
      title: 'Secure Encryption',
      description: 'Layered encryption keeps your archives locked behind your own infra.',
      src: '',
      poster: ''
    },
    {
      title: 'Transparent Billing',
      description: 'Only pay for what you store—no surprise fees or dark patterns.',
      src: '',
      poster: ''
    }
  ];

  const quickLinks = [
    { label: 'GitHub', href: 'https://github.com/JebinAbraham/Glacia', icon: Github },
    { label: 'Blog', icon: Rss, action: handleGoToBlog },
  ];

  const handleUnlockEditor = () => {
    const trimmed = editorPassword.trim();
    if (!trimmed) {
      toast.error('Password required');
      return;
    }
    const hashedInput = CryptoJS.SHA256(trimmed).toString();
    if (hashedInput === BLOG_EDITOR_PASSWORD_HASH) {
      setIsEditorUnlocked(true);
      setShowLockPrompt(false);
      setEditorPassword('');
      toast.success('Editor unlocked');
      setTimeout(() => scrollToEditor(), 100);
    } else {
      toast.error('Incorrect password');
    }
  };

  const handleLockEditor = () => {
    setIsEditorUnlocked(false);
    setEditorPassword('');
    setShowLockPrompt(false);
    setArticleDraft(createEmptyDraft());
    setEditingArticleId(null);
    toast.message('Editor locked');
  };

  const handlePublishArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleDraft.title.trim() || !articleDraft.contentHtml.trim()) {
      toast.error('Title and content are required');
      return;
    }
    if (!articleDraft.authorName.trim()) {
      toast.error('Author name is required');
      return;
    }

    const db = databaseRef.current;
    if (!db) {
      toast.error('Database not ready yet');
      return;
    }

    const newArticle: Article = {
      id: editingArticleId ?? crypto.randomUUID(),
      title: articleDraft.title.trim(),
      contentHtml: articleDraft.contentHtml.trim(),
      imageUrl: articleDraft.imageUrl.trim(),
      videoUrl: articleDraft.videoUrl.trim(),
      createdAt: editingArticleId
        ? articles.find((a) => a.id === editingArticleId)?.createdAt ?? new Date().toISOString()
        : new Date().toISOString(),
      authorName: articleDraft.authorName.trim(),
      authorTitle: articleDraft.authorTitle.trim() || 'Contributor',
      authorAvatar: articleDraft.authorAvatar.trim(),
    };

    if (editingArticleId) {
      const updateStmt = db.prepare(
        `UPDATE articles
         SET title = ?, contentHtml = ?, imageUrl = ?, videoUrl = ?, createdAt = ?, authorName = ?, authorTitle = ?, authorAvatar = ?
         WHERE id = ?`,
      );
      updateStmt.run([
        newArticle.title,
        newArticle.contentHtml,
        newArticle.imageUrl,
        newArticle.videoUrl,
        newArticle.createdAt,
        newArticle.authorName,
        newArticle.authorTitle,
        newArticle.authorAvatar,
        newArticle.id,
      ]);
      updateStmt.free();
    } else {
      const insertStmt = db.prepare(
        `INSERT INTO articles
        (id, title, contentHtml, imageUrl, videoUrl, createdAt, authorName, authorTitle, authorAvatar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      insertStmt.run([
        newArticle.id,
        newArticle.title,
        newArticle.contentHtml,
        newArticle.imageUrl,
        newArticle.videoUrl,
        newArticle.createdAt,
        newArticle.authorName,
        newArticle.authorTitle,
        newArticle.authorAvatar,
      ]);
      insertStmt.free();
    }

    persistDatabase(db);
    refreshArticlesFromDb();

    setArticleDraft(createEmptyDraft());
    setEditingArticleId(null);
    toast.success(editingArticleId ? 'Article updated' : 'Article published');
  };

  const handleDeleteArticle = (articleId: string) => {
    const db = databaseRef.current;
    if (!db) {
      toast.error('Database not ready yet');
      return;
    }
    const deleteStmt = db.prepare('DELETE FROM articles WHERE id = ?');
    deleteStmt.run([articleId]);
    deleteStmt.free();
    persistDatabase(db);
    refreshArticlesFromDb();
    if (editingArticleId === articleId) {
      setArticleDraft(createEmptyDraft());
      setEditingArticleId(null);
    }
    toast.success('Article deleted');
  };

  const handleClearWaitlist = () => {
    const db = databaseRef.current;
    if (!db) {
      toast.error('Database not ready yet');
      return;
    }
    const deleteStmt = db.prepare('DELETE FROM waitlist');
    deleteStmt.run();
    deleteStmt.free();
    persistDatabase(db);
    refreshWaitlistFromDb();
    toast.success('Waitlist cleared');
  };

  const formatArticleDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatWaitlistTimestamp = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getInitials = (name: string) => {
    if (!name) return 'GL';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleFloatingLockClick = () => {
    if (currentView !== 'blog') {
      handleGoToBlog();
      setTimeout(() => {
        scrollToEditor();
        if (!isEditorUnlocked) {
          setShowLockPrompt(true);
        }
      }, 400);
      return;
    }
    if (isEditorUnlocked) {
      handleLockEditor();
    } else {
      scrollToEditor();
      setShowLockPrompt((prev) => !prev);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50/40">
      <CustomCursor key={cursorVersion} enabled={currentView === 'landing'} />
      {currentView === 'landing' && showQuickLinks && (
        <>
          <div className="fixed bottom-6 right-6 z-40 hidden sm:flex flex-col items-end gap-2 transition duration-300">
            {quickLinks.map((link) => {
              const LinkIcon = link.icon;
              const isAction = typeof link.action === 'function';
              const commonClasses = "group flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.1)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white";
              if (isAction) {
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={link.action}
                    className={commonClasses}
                  >
                    <LinkIcon className="size-4 text-blue-600" strokeWidth={1.6} />
                    <span>{link.label}</span>
                  </button>
                );
              }
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href?.startsWith('http') ? '_blank' : undefined}
                  rel={link.href?.startsWith('http') ? 'noreferrer' : undefined}
                  className={commonClasses}
                >
                  <LinkIcon className="size-4 text-blue-600" strokeWidth={1.6} />
                  <span>{link.label}</span>
                </a>
              );
            })}
          </div>
          <div className="fixed bottom-5 right-5 z-40 sm:hidden">
            <button
              type="button"
              aria-expanded={mobileLinksOpen}
              onClick={() => setMobileLinksOpen((prev) => !prev)}
              className="flex size-14 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition active:scale-95"
            >
              <Link2 className="size-6 text-blue-600" strokeWidth={1.6} />
            </button>
            {mobileLinksOpen && (
              <div className="mt-3 space-y-2 rounded-2xl border border-white/60 bg-white/80 p-3 shadow-[0_15px_35px_rgba(15,23,42,0.15)] backdrop-blur-2xl">
                {quickLinks.map((link) => {
                  const LinkIcon = link.icon;
                  const baseClasses = "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-white w-full text-left";
                  if (typeof link.action === 'function') {
                    return (
                      <button
                        key={`mobile-${link.label}`}
                        type="button"
                        onClick={() => {
                          link.action?.();
                          setMobileLinksOpen(false);
                        }}
                        className={baseClasses}
                      >
                        <LinkIcon className="size-4 text-blue-600" strokeWidth={1.6} />
                        <span>{link.label}</span>
                      </button>
                    );
                  }
                  return (
                    <a
                      key={`mobile-${link.label}`}
                      href={link.href}
                      target={link.href?.startsWith('http') ? '_blank' : undefined}
                      rel={link.href?.startsWith('http') ? 'noreferrer' : undefined}
                      className={baseClasses}
                      onClick={() => setMobileLinksOpen(false)}
                    >
                      <LinkIcon className="size-4 text-blue-600" strokeWidth={1.6} />
                      <span>{link.label}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      {currentView === 'blog' && (
        <button
          type="button"
          onClick={handleFloatingLockClick}
          aria-label={isEditorUnlocked ? 'Lock editor' : 'Unlock editor'}
          className="fixed bottom-24 right-5 z-40 flex size-14 items-center justify-center rounded-full border border-white/60 bg-white/60 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.15)] backdrop-blur-2xl transition hover:bg-white/80 active:scale-95 sm:bottom-28 sm:right-6"
        >
          {isEditorUnlocked ? <Unlock className="size-6 text-blue-700" strokeWidth={1.6} /> : <Lock className="size-6 text-blue-700" strokeWidth={1.6} />}
        </button>
      )}
      {currentView === 'blog' && showLockPrompt && !isEditorUnlocked && (
        <div className="fixed bottom-[190px] right-5 z-40 w-[300px] rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.15)] backdrop-blur-2xl sm:right-6 sm:bottom-[210px]">
          <p className="mb-3 text-sm font-medium text-slate-700">Enter editor password</p>
          <div className="flex flex-col gap-3">
            <Input
              type="password"
              placeholder="••••••••"
              value={editorPassword}
              onChange={(e) => setEditorPassword(e.target.value)}
              className="bg-white/90"
            />
            <div className="flex gap-2">
              <Button onClick={handleUnlockEditor} className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
                Unlock
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-slate-600 hover:text-slate-900"
                onClick={() => {
                  setShowLockPrompt(false);
                  setEditorPassword('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="relative">
            <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/30 px-4 py-2 sm:px-6 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-white/60 shadow-inner">
                  <div className="scale-[0.45]">
                    <LogoMarkV />
                  </div>
                </div>
                <span className="hidden sm:block font-['Inter',sans-serif] text-sm tracking-[0.3em] text-slate-700 uppercase">
                  Glacia
                </span>
              </div>
              <div className="hidden md:flex flex-1 items-center justify-center gap-6 text-sm font-medium text-slate-700 -translate-x-[20px] transform">
                {navLinks.map((link) => (
                  <button
                    key={link.target}
                    type="button"
                    onClick={() => handleNavClick(link.target)}
                    className="transition hover:text-slate-900"
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleGoToBlog}
                  className={`transition hover:text-slate-900 ${currentView === 'blog' ? 'text-slate-900 font-semibold' : ''}`}
                >
                  Blogs
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-expanded={isMenuOpen}
                  aria-label="Toggle navigation"
                  className="md:hidden flex size-10 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-700 transition hover:bg-white"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                >
                  <span className="relative block h-[14px] w-5">
                    <span
                      className={`absolute left-0 block h-[2px] w-full rounded-full bg-current transition-all duration-300 ${
                        isMenuOpen ? 'top-1/2 rotate-45' : 'top-0'
                      }`}
                    />
                    <span
                      className={`absolute left-0 block h-[2px] w-full rounded-full bg-current transition-all duration-300 ${
                        isMenuOpen ? 'opacity-0' : 'top-1/2 -translate-y-1/2'
                      }`}
                    />
                    <span
                      className={`absolute left-0 block h-[2px] w-full rounded-full bg-current transition-all duration-300 ${
                        isMenuOpen ? 'top-1/2 -rotate-45' : 'bottom-0'
                      }`}
                    />
                  </span>
                </button>
                <Button
                  onClick={handleLogin}
                  className="hidden md:inline-flex bg-blue-600 text-white hover:bg-blue-700"
                >
                  Demo
                </Button>
              </div>
            </div>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  key="mobile-menu"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 rounded-2xl border border-white/40 bg-white/70 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.12)] backdrop-blur-2xl md:hidden"
                >
                  <div className="flex flex-col gap-3 text-base font-medium text-slate-800">
                    {navLinks.map((link) => (
                      <button
                        key={`mobile-${link.target}`}
                        type="button"
                        onClick={() => handleNavClick(link.target)}
                        className="rounded-xl px-3 py-2 text-left hover:bg-white"
                      >
                        {link.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        handleGoToBlog();
                        setIsMenuOpen(false);
                      }}
                      className={`rounded-xl px-3 py-2 text-left hover:bg-white ${currentView === 'blog' ? 'text-slate-900 font-semibold' : ''}`}
                    >
                      Blogs
                    </button>
                    <Button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleLogin();
                      }}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Demo
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.nav>

      {currentView === 'landing' && (
        <>
      {/* Hero Section */}
      <div
        id="hero"
        data-snap-section="true"
        className="glacia-snap-section container mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32 pb-16 sm:pb-20 lg:pb-24"
      >
        <div className="max-w-4xl mx-auto">
          {/* Logo */}
          <motion.div 
            className="mx-auto mb-6 sm:mb-10 h-[clamp(120px,40vw,256px)] w-[clamp(120px,40vw,256px)]"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <LogoMarkV />
          </motion.div>

          <motion.div
            className="mb-8 -mt-8 sm:-mt-10 lg:-mt-12 flex justify-center"
            initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <motion.div
              className="font-['Inter:Light',sans-serif] font-light leading-none text-black text-[clamp(72px,18vw,160px)]"
              animate={{ scale: [0.98, 1, 0.995, 1], letterSpacing: ['-1px', '-0.5px', '-1px', '-0.8px'] }}
              transition={{ duration: 6, repeat: Infinity, repeatType: 'mirror' }}
            >
              <motion.div
                className="relative inline-flex"
                initial="hidden"
                animate="visible"
                variants={wordReveal}
              >
                {glaciaLetters.map((letter, index) => (
                  <motion.span
                    key={`${letter}-${index}`}
                    className="inline-block"
                    variants={letterLazy}
                  >
                    {letter}
                  </motion.span>
                ))}
                <motion.span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent mix-blend-overlay"
                  initial={{ x: '-80%' }}
                  animate={{ x: '80%' }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Hero Content */}
          <motion.div 
            className="text-center mb-16 sm:mb-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h1 className="mb-6 sm:mb-8 bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent leading-tight">
              Store Your Memories Forever,<br />On Your Terms
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6 leading-relaxed">
              Glacia empowers you to preserve your precious memories with long-term storage solutions that don't break the bank. 
              Install on your own infrastructure with plug-and-play simplicity.
            </p>

            {/* Waitlist Form */}
            <div id="waitlist">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Join Waitlist
                    </Button>
                  </div>
                </form>
              ) : (
                <motion.div 
                  className="max-w-md mx-auto mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 justify-center text-green-700"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                >
                  <IconPlaceholder label="OK" className="size-5 border-green-200 text-green-700 bg-green-50" />
                  <span>You're on the list! We'll be in touch soon.</span>
                </motion.div>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              Join our waiting list for early access
            </p>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" data-snap-section="true" className="glacia-snap-section bg-white py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.h2 
              className="text-center mb-12 sm:mb-16 text-gray-900 text-4xl sm:text-5xl font-semibold"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Why Choose Glacia?
            </motion.h2>
            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <Card className="p-6 lg:p-8 hover:shadow-lg transition-shadow h-full">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-blue-600 text-white shrink-0">
                        <feature.icon className="size-6 text-white" strokeWidth={1.6} />
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-3 text-gray-900 leading-tight">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* UI Showcase Section */}
      <div id="showcase" data-snap-section="true" className="glacia-snap-section py-16 sm:py-20 lg:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.h2 
              className="text-center mb-6 sm:mb-8 text-gray-900 text-4xl sm:text-5xl font-semibold"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Beautiful Interface, Powerful Features
            </motion.h2>
            <motion.p 
              className="text-center text-gray-600 mb-12 sm:mb-16 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Experience a seamless interface designed for both mobile and desktop. 
              Manage your memories with ease, wherever you are.
            </motion.p>
            
            <Carousel
              className="relative"
              opts={{ align: 'center', loop: true }}
            >
              <CarouselContent className="-ml-4 pb-10">
                {showcaseVideos.map((clip, index) => (
                  <CarouselItem
                    key={clip.title}
                    className="pl-4 md:basis-3/4 lg:basis-1/2"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 25 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden border border-white/40 bg-white/80 shadow-xl backdrop-blur-lg">
                        <div className="relative rounded-3xl overflow-hidden bg-white">
                          <div className="h-[420px] w-full bg-white flex flex-col items-center justify-center text-center px-8">
                            <p className="text-5xl font-light tracking-[0.4em] mb-4 bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">
                              GLACIA
                            </p>
                            <p className="text-gray-400 uppercase tracking-[0.3em]">
                              Preview Coming Soon
                            </p>
                          </div>
                          <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/50 bg-white/50 p-6 text-slate-900 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
                            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-slate-600">
                              {index + 1 < 10 ? `0${index + 1}` : index + 1}
                            </p>
                            <h3 className="text-2xl font-semibold mb-2 text-slate-900">{clip.title}</h3>
                            <p className="text-slate-700 text-sm leading-relaxed max-w-2xl">
                              {clip.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex bg-white/80 text-slate-900 hover:bg-white" />
              <CarouselNext className="hidden sm:flex bg-white/80 text-slate-900 hover:bg-white" />
            </Carousel>
          </div>
        </div>
      </div>

      {/* Technologies Section */}
      <div data-snap-section="true" ref={techSectionRef} className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.h2 
              className="text-center mb-6 sm:mb-8 text-gray-900 text-4xl sm:text-5xl font-semibold"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Built with Industry-Leading Technologies
            </motion.h2>
            <motion.p 
              className="text-center text-gray-600 mb-12 sm:mb-16 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Glacia runs on AWS-native infrastructure—combining Glacier for deep-freeze archives, 
              S3 for hot retrievals, Terraform-managed deployments, Git-verified workflows, 
              Dockerized services, and end-to-end TypeScript tooling to keep data protection, 
              reliability, and scale firmly under your control.
            </motion.p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
              {technologies.map((tech, index) => {
                const TechIcon = tech.icon;
                return (
                <motion.div
                  key={tech.name}
                  className="flex flex-col items-center gap-4 p-6 rounded-lg hover:bg-gray-50 transition-colors"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-blue-600">
                    <TechIcon className="size-10" strokeWidth={1.5} />
                  </div>
                  <span className="text-gray-900 text-center text-sm font-medium">{tech.name}</span>
                </motion.div>
              )})}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div data-snap-section="true" className="py-16 sm:py-20 lg:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.h2 
              className="text-center mb-12 sm:mb-16 text-gray-900 text-4xl sm:text-5xl font-semibold"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Simple Setup, Powerful Results
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {[
                { step: '01', title: 'Install', description: 'Deploy Glacia on your infrastructure with our one-click installer' },
                { step: '02', title: 'Configure', description: 'Customize your storage preferences and retention policies' },
                { step: '03', title: 'Upload', description: 'Start preserving your memories with complete control and transparency' }
              ].map((item, index) => (
                <motion.div 
                  key={index} 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                >
                  <div className="inline-block mb-6 px-5 py-2 rounded-full bg-blue-600 text-white">
                    {item.step}
                  </div>
                  <h3 className="mb-3 text-gray-900 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <motion.div 
        data-snap-section="true"
        className="glacia-snap-section bg-blue-600 py-16 sm:py-20 lg:py-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="mb-6 text-white leading-tight">
            Ready to Take Control?
          </h2>
          <p className="text-white/90 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
            Be among the first to experience a new way of storing your memories. 
            Join our waitlist today.
          </p>
          {!isSubmitted && (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-white"
                />
                <Button type="submit" variant="secondary" className="bg-white hover:bg-gray-100 text-blue-600">
                  Join Waitlist
                </Button>
              </div>
            </form>
          )}
        </div>
      </motion.div>

      {/* Footer */}
      <footer data-snap-section="true" className="glacia-snap-section bg-gray-900 text-gray-400 py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm leading-relaxed">
            © 2025 Glacia. Your memories, your infrastructure.
          </p>
        </div>
      </footer>
        </>
      )}

      {currentView === 'blog' && (
        <div className="bg-gradient-to-b from-white via-slate-50 to-blue-50/40 min-h-screen flex flex-col">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 flex-1 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center mb-16"
            >
              <p className="text-sm uppercase tracking-[0.5em] text-blue-600 mb-3">Glacia Journal</p>
              <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 mb-4">
                Stories, Releases, and Infrastructure Notes
              </h1>
              <p className="text-slate-600">
                Dive into product updates, storage strategies, and behind-the-scenes drops curated directly by the Glacia team.
              </p>
            </motion.div>

            <div className="max-w-5xl mx-auto space-y-8">
              {isEditorUnlocked && (
                <Card className="p-6 border-blue-100 bg-white/90 backdrop-blur">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-blue-600">Waitlist</p>
                      <h2 className="text-xl font-semibold text-slate-900">Waitlist entries</h2>
                      <p className="text-sm text-slate-500">Captured emails from the public signup form.</p>
                    </div>
                    <div className="flex flex-col items-stretch gap-2 sm:items-end">
                      <span className="text-sm font-semibold text-blue-700">
                        {waitlistEntries.length} {waitlistEntries.length === 1 ? 'entry' : 'entries'}
                      </span>
                      {waitlistEntries.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Delete all waitlist entries?')) {
                              handleClearWaitlist();
                            }
                          }}
                        >
                          Clear waitlist
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-100 overflow-hidden">
                    {waitlistEntries.length ? (
                      <div className="divide-y divide-slate-100">
                        {waitlistEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="grid gap-3 px-4 py-3 text-sm bg-white/70 sm:grid-cols-[2fr,1fr]"
                          >
                            <span className="font-medium text-slate-900 break-words">{entry.email}</span>
                            <span className="text-slate-500 sm:text-right">
                              {formatWaitlistTimestamp(entry.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-sm text-slate-500">
                        No waitlist entries yet. Captured emails appear here automatically.
                      </div>
                    )}
                  </div>
                </Card>
              )}
              {articles.length === 0 ? (
                <Card className="p-8 text-center bg-white/80 backdrop-blur border border-slate-100 shadow-sm">
                  <p className="text-slate-500">No articles yet. Check back soon for fresh updates.</p>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {articles.map((article) => (
                    <Card key={article.id} className="overflow-hidden border border-slate-100 bg-white shadow-sm">
                      <div className="p-6 space-y-4">
                        <div className="text-xs uppercase tracking-[0.4em] text-blue-600">
                          {formatArticleDate(article.createdAt)}
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-semibold text-slate-900">{article.title}</h3>
                          </div>
                          {isEditorUnlocked && (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => {
                                  setArticleDraft({
                                    title: article.title,
                                    contentHtml: article.contentHtml,
                                    imageUrl: article.imageUrl,
                                    videoUrl: article.videoUrl,
                                    authorName: article.authorName,
                                    authorTitle: article.authorTitle,
                                    authorAvatar: article.authorAvatar,
                                  });
                                  setEditingArticleId(article.id);
                                  setIsEditorUnlocked(true);
                                  scrollToEditor();
                                }}
                              >
                                Edit
                              </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => {
                                      if (confirm('Delete this article?')) {
                                        handleDeleteArticle(article.id);
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {article.authorAvatar ? (
                            <img
                              src={article.authorAvatar}
                              alt={article.authorName}
                              className="size-12 rounded-full object-cover border border-slate-100"
                            />
                          ) : (
                            <div className="flex size-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600">
                              {getInitials(article.authorName)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{article.authorName}</p>
                            {article.authorTitle && (
                              <p className="text-sm text-slate-500">{article.authorTitle}</p>
                            )}
                          </div>
                        </div>
                        {article.imageUrl && (
                          <div className="rounded-2xl overflow-hidden border border-slate-100">
                            <img src={article.imageUrl} alt={article.title} className="w-full h-72 object-cover" />
                          </div>
                        )}
                        {article.videoUrl && (
                          <div className="rounded-2xl overflow-hidden border border-slate-100">
                            <video controls className="w-full" poster={article.imageUrl || undefined}>
                              <source src={article.videoUrl} />
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        )}
                        <div
                          className="prose prose-slate max-w-none text-slate-700"
                          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

      <div ref={editorSectionRef}>
      {isEditorUnlocked && (
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur p-6 sm:p-8 shadow-lg space-y-6">
          <form className="space-y-5" onSubmit={handlePublishArticle}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingArticleId ? 'Edit Article' : 'New Article'}
              </h2>
              <Button
                type="button"
                variant="ghost"
                onClick={handleLockEditor}
                className="text-slate-600 hover:text-slate-900"
              >
                <Lock className="mr-2 size-4" />
                Lock Editor
              </Button>
            </div>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-slate-700">Title</label>
                        <Input
                          value={articleDraft.title}
                          onChange={(e) => setArticleDraft((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter article title"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-slate-700">Content</label>
                        <Suspense
                          fallback={
                            <div className="min-h-[200px] rounded-2xl border border-slate-200 bg-white/50 p-4 text-sm text-slate-500 animate-pulse">
                              Loading editor…
                            </div>
                          }
                        >
                          <RichTextEditor
                            value={articleDraft.contentHtml}
                            onChange={(html) => setArticleDraft((prev) => ({ ...prev, contentHtml: html }))}
                            placeholder="Write your story..."
                          />
                        </Suspense>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-slate-700">Image URL (optional)</label>
                        <Input
                          type="url"
                          value={articleDraft.imageUrl}
                          onChange={(e) => setArticleDraft((prev) => ({ ...prev, imageUrl: e.target.value }))}
                          placeholder="https://"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-slate-700">Video URL (optional)</label>
                        <Input
                          type="url"
                          value={articleDraft.videoUrl}
                          onChange={(e) => setArticleDraft((prev) => ({ ...prev, videoUrl: e.target.value }))}
                          placeholder="https://"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-slate-700">Author Name</label>
                        <Input
                          value={articleDraft.authorName}
                          onChange={(e) => setArticleDraft((prev) => ({ ...prev, authorName: e.target.value }))}
                          placeholder="Jane Doe"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-slate-700">Author Title (optional)</label>
                        <Input
                          value={articleDraft.authorTitle}
                          onChange={(e) => setArticleDraft((prev) => ({ ...prev, authorTitle: e.target.value }))}
                          placeholder="Glacia Contributor"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-slate-700">Author Avatar URL (optional)</label>
                        <Input
                          type="url"
                          value={articleDraft.authorAvatar}
                          onChange={(e) => setArticleDraft((prev) => ({ ...prev, authorAvatar: e.target.value }))}
                          placeholder="https://"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                      {editingArticleId ? 'Update Article' : 'Publish Article'}
                    </Button>
          </form>
          <Card className="border border-slate-200 bg-white/70 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-slate-900">Database Tools</h3>
                <p className="text-sm text-slate-500">
                  Download a backup of the SQLite database or upload a saved copy.
                </p>
              </div>
              {databaseError && (
                <p className="text-sm text-red-600">
                  {databaseError}
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleDatabaseDownload}
                disabled={!isDatabaseReady || isExportingDatabase}
                className="flex-1"
              >
                {isExportingDatabase ? 'Preparing download...' : 'Download .sqlite'}
              </Button>
              <Button
                type="button"
                onClick={handleDatabaseUploadClick}
                disabled={!isDatabaseReady || isImportingDatabase}
                className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
              >
                {isImportingDatabase ? 'Importing...' : 'Upload Backup'}
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Uploading replaces the current waitlist and articles with the contents of the selected database file.
            </p>
            <input
              ref={dbFileInputRef}
              type="file"
              accept=".sqlite,.db,application/x-sqlite3"
              className="hidden"
              onChange={handleDatabaseFileChange}
            />
          </Card>
        </div>
      )}
              </div>
            </div>
          </div>
          <footer className="mt-auto bg-gray-900 text-gray-400 py-8 sm:py-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-sm">© 2025 Glacia. Built for creators who own their data.</p>
            </div>
          </footer>
        </div>
      )}

      {showLottie && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/40 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-cyan-100/70 to-blue-100/80 opacity-80 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center gap-4 text-gray-900">
            <div className="text-2xl font-semibold uppercase tracking-[0.3em] text-blue-700 drop-shadow">
              Success Lottie
            </div>
            <LottiePlayer
              src="/success-lottie.json"
              background="transparent"
              style={{ width: '100vw', height: '100vh' }}
              autoplay
              loop
            />
            <Button variant="secondary" onClick={() => setShowLottie(false)} className="text-blue-700">
              Close
            </Button>
          </div>
        </div>
      )}
      <Toaster richColors position="top-center" />
    </div>
  );
}
