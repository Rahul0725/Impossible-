
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import JSZip from 'jszip';
import { 
  Smartphone, 
  Download, 
  Settings, 
  Image as ImageIcon, 
  Code, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Copy,
  FolderZip,
  Android,
  Zap
} from 'lucide-react';

interface AppAssets {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  packageName: string;
  mainActivity: string;
  manifestXml: string;
  buildGradle: string;
}

function parseJsonResponse(text: string) {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Invalid AI response. Please try again.");
  }
}

function AppifyAI() {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<AppAssets | null>(null);
  const [iconBase64, setIconBase64] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'source'>('pwa');

  const handleGenerate = async () => {
    if (!url.trim()) return setError("Please enter a valid URL.");
    
    setError(null);
    setIsProcessing(true);
    setAssets(null);
    setIconBase64(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 1. Generate Complete Native Android Project Source
      const projectResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create a full Android WebView project configuration for this URL: ${url}.
        Return ONLY a JSON object with these EXACT keys:
        - "name": App name
        - "shortName": Short name (12 chars)
        - "description": Short description
        - "packageName": unique package like com.myapp.ai
        - "themeColor": Hex color
        - "backgroundColor": Hex color
        - "mainActivity": The full Kotlin code for MainActivity.kt that opens this URL in a WebView with Javascript enabled.
        - "manifestXml": The full content for AndroidManifest.xml.
        - "buildGradle": The full content for app/build.gradle.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              shortName: { type: Type.STRING },
              description: { type: Type.STRING },
              packageName: { type: Type.STRING },
              themeColor: { type: Type.STRING },
              backgroundColor: { type: Type.STRING },
              mainActivity: { type: Type.STRING },
              manifestXml: { type: Type.STRING },
              buildGradle: { type: Type.STRING }
            },
            required: ["name", "shortName", "description", "packageName", "themeColor", "backgroundColor", "mainActivity", "manifestXml", "buildGradle"]
          }
        }
      });

      const data = parseJsonResponse(projectResponse.text);
      setAssets(data);

      // 2. Generate Professional App Icon
      const iconResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A professional Android app icon for "${data.name}". Modern, flat design, vector style, centered glyph, white background. ${data.description}` }]
        },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      const iconPart = iconResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (iconPart?.inlineData) {
        setIconBase64(iconPart.inlineData.data);
      }

    } catch (err: any) {
      setError(err.message || "Failed to generate assets.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadProjectZip = async () => {
    if (!assets || !iconBase64) return;
    
    const zip = new JSZip();
    const pkgPath = assets.packageName.replace(/\./g, '/');

    zip.file("app/src/main/AndroidManifest.xml", assets.manifestXml);
    zip.file("app/build.gradle", assets.buildGradle);
    zip.file(`app/src/main/java/${pkgPath}/MainActivity.kt`, assets.mainActivity);
    
    // Add icon
    const binaryIcon = atob(iconBase64);
    const array = new Uint8Array(binaryIcon.length);
    for (let i = 0; i < binaryIcon.length; i++) array[i] = binaryIcon.charCodeAt(i);
    zip.file("app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", array);

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${assets.shortName}_Android_Project.zip`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-800 p-4 sticky top-0 bg-slate-950/80 backdrop-blur-lg z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30">
              <Android className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tighter">APPIFY.AI</h1>
          </div>
          <div className="flex gap-4">
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">v2.0 Native Build</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Intro */}
        <section className="mb-12 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Turn Any Web Link into an App.</h2>
          <p className="text-slate-400 text-lg">Generate native Android source code or install instantly as a PWA.</p>
        </section>

        {/* Action Card */}
        <div className="glass rounded-3xl p-8 mb-12">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste your AI Studio or Web URL here..."
              className="flex-1 bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder:text-slate-600"
            />
            <button 
              onClick={handleGenerate}
              disabled={isProcessing || !url}
              className="bg-white text-black hover:bg-slate-200 disabled:opacity-50 px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
              BUILD APP
            </button>
          </div>
          {error && <p className="mt-4 text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</p>}
        </div>

        {isProcessing && (
          <div className="py-20 flex flex-col items-center animate-pulse">
            <div className="w-16 h-16 bg-indigo-600 rounded-full animate-bounce flex items-center justify-center mb-6">
              <Settings className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-2xl font-bold">Compiling Assets...</h3>
            <p className="text-slate-500 mt-2 text-center">Writing Kotlin code, structuring Gradle files,<br/>and painting high-res app icons.</p>
          </div>
        )}

        {assets && !isProcessing && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in">
            {/* Left: Mockup */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-72 h-[580px] bg-slate-900 border-[10px] border-slate-800 rounded-[3rem] relative shadow-2xl overflow-hidden group">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
                <div className="h-full bg-slate-950 p-8 flex flex-col items-center pt-16">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 mb-6 group-hover:scale-110 transition-transform duration-500">
                    {iconBase64 && <img src={`data:image/png;base64,${iconBase64}`} className="w-full h-full object-cover" alt="Icon" />}
                  </div>
                  <h4 className="text-xl font-bold text-center">{assets.name}</h4>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">{assets.packageName}</p>
                  
                  <div className="mt-12 w-full space-y-3">
                    <div className="h-2 w-3/4 bg-slate-800 rounded-full"></div>
                    <div className="h-2 w-full bg-slate-800 rounded-full"></div>
                    <div className="h-2 w-1/2 bg-slate-800 rounded-full"></div>
                  </div>

                  <div className="mt-auto mb-4 w-1/3 h-1.5 bg-slate-800 rounded-full"></div>
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-4 uppercase font-bold tracking-widest">Live Android Preview</p>
            </div>

            {/* Right: Tools */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="flex p-1 bg-slate-900/50 rounded-2xl border border-slate-800">
                <button onClick={() => setActiveTab('pwa')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'pwa' ? 'bg-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Instant PWA</button>
                <button onClick={() => setActiveTab('apk')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'apk' ? 'bg-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Build APK</button>
                <button onClick={() => setActiveTab('source')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'source' ? 'bg-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Source Code</button>
              </div>

              <div className="glass rounded-3xl p-8 flex-1">
                {activeTab === 'pwa' && (
                  <div className="space-y-6">
                    <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-2xl">
                      <h4 className="font-bold flex items-center gap-2 text-indigo-400"><ExternalLink className="w-5 h-5" /> Install Instantly</h4>
                      <p className="text-sm text-slate-400 mt-2 leading-relaxed">Browsers allow you to install this web app as a native-feeling shortcut without downloading an APK. This is the fastest way.</p>
                      <ol className="mt-4 space-y-2 text-xs text-slate-300 list-decimal pl-4">
                        <li>Launch the app below on your Android Chrome.</li>
                        <li>Tap the menu button (⋮).</li>
                        <li>Select "Add to Home Screen" or "Install".</li>
                      </ol>
                    </div>
                    <a href={url} target="_blank" className="w-full bg-white text-black py-4 rounded-2xl font-black text-center block transition-transform hover:scale-[1.02]">LAUNCH IN BROWSER</a>
                  </div>
                )}

                {activeTab === 'apk' && (
                  <div className="space-y-6">
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-500/10 rounded-xl text-green-500"><Android className="w-6 h-6" /></div>
                        <div>
                          <h4 className="font-bold">Android Project ZIP</h4>
                          <p className="text-xs text-slate-500">Ready for Android Studio</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 mb-6">We've generated the full Kotlin source, Android Manifest, and Gradle config. Download this bundle and open it in Android Studio to build your final **.apk** file.</p>
                      <button 
                        onClick={downloadProjectZip}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black transition-all"
                      >
                        <FolderZip className="w-5 h-5" /> DOWNLOAD PROJECT (.ZIP)
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'source' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">MainActivity.kt</label>
                      <button onClick={() => navigator.clipboard.writeText(assets.mainActivity)} className="text-xs text-indigo-400 hover:underline">Copy Code</button>
                    </div>
                    <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[10px] text-indigo-300 font-mono overflow-auto max-h-60 leading-relaxed">
                      {assets.mainActivity}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-slate-900 text-center text-slate-600 text-xs font-medium uppercase tracking-[0.2em]">
        Built with Google Gemini Pro • APK Pipeline v2
      </footer>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<AppifyAI />);
}
