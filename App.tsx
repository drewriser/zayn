
import React, { useState, useMemo } from 'react';
import { Upload, ExternalLink, Search, Video, Users, User, X, ShoppingBag, Sparkles, Play, Hash, Clock, PieChart, Layers, FileOutput, ArrowRight, BarChart3, Package, ChevronRight, List, ExternalLink as LinkIcon, Copy, TrendingUp, Monitor } from 'lucide-react';
import { CsvRow, ProcessedData } from './types';

type ViewMode = 'product' | 'creator' | 'video';

// --- 工具函数 ---
const parseCsv = (text: string): ProcessedData => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string) => {
    const result = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.trim().replace(/\uFEFF/g, ""));

  const rows = lines.slice(1).map(line => {
    const values = parseLine(line);
    const obj: CsvRow = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || "").trim();
    });
    return obj;
  });

  return { headers, rows };
};

const parseSafeNum = (val: string): number => {
  if (!val) return 0;
  const cleaned = val.toString().replace(/,/g, '');
  const num = parseInt(cleaned.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
};

// 视频预览组件
const LazyVideo = ({ id, mode = 'compact' }: { id: string; mode?: 'compact' | 'expanded' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  const cleanId = useMemo(() => {
    const match = id.match(/\d{15,}/);
    return match ? match[0] : id.trim();
  }, [id]);

  const widthClass = mode === 'expanded' ? 'w-[320px]' : 'w-[200px]';

  return (
    <div className={`${widthClass} aspect-[9/16] bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative group shrink-0 border border-slate-800 transition-all duration-500 hover:ring-8 hover:ring-indigo-500/20`}>
      {!isLoaded ? (
        <div 
          onClick={() => setIsLoaded(true)}
          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-all z-10 p-6 text-center"
        >
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl shadow-indigo-600/40 animate-pulse">
            <Play size={24} className="fill-white text-white ml-1" />
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 font-mono opacity-60">
            VIDEO ID: {cleanId}
          </p>
          <div className="px-6 py-2.5 bg-white/10 text-white rounded-xl text-[11px] font-black uppercase tracking-widest backdrop-blur-sm">
            点击载入预览
          </div>
        </div>
      ) : (
        <iframe 
          src={`https://www.tiktok.com/embed/v2/${cleanId}`} 
          className="w-full h-full border-none" 
          title={`Video-${cleanId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowFullScreen
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [allRows, setAllRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('creator'); 
  const [searchTerm, setSearchTerm] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    let combinedRows: CsvRow[] = [];
    let detectedHeaders: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const text = await files[i].text();
        const { headers: fileHeaders, rows: fileRows } = parseCsv(text);
        if (i === 0) detectedHeaders = fileHeaders;
        combinedRows = [...combinedRows, ...fileRows];
      } catch (err) { console.error(err); }
    }
    setHeaders(detectedHeaders);
    setAllRows(combinedRows);
    setSearchTerm('');
  };

  const jumpTo = (mode: ViewMode, term: string) => {
    setViewMode(mode);
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        const lowerTerm = term.toLowerCase();
        if (!lowerSearch.includes(lowerTerm)) {
            setSearchTerm(prev => `${prev.trim()} ${term}`);
        }
    } else {
        setSearchTerm(term);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getHeaderKey = (patterns: string[]) => {
    for (const p of patterns) {
      const found = headers.find(h => h.toLowerCase().includes(p.toLowerCase()));
      if (found) return found;
    }
    return patterns[0];
  };

  const keys = useMemo(() => ({
    id: getHeaderKey(["内容ID", "Content ID", "video_id"]),
    date: getHeaderKey(["日期", "Date", "created_time"]),
    order: getHeaderKey(["订单", "Order ID", "order_id"]),
    creator: getHeaderKey(["达人", "username", "Handle"]),
    skuName: getHeaderKey(["商品名称", "Product Name", "title"]),
    qty: getHeaderKey(["件数", "Quantity", "Sold", "销量"]),
    skuId: getHeaderKey(["Seller Sku", "SKU ID"]),
  }), [headers]);

  const searchWords = useMemo(() => {
    return searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  }, [searchTerm]);

  const filteredRows = useMemo(() => {
    if (searchWords.length === 0) return allRows;
    return allRows.filter(row => {
      return searchWords.every(word => {
        const matchId = (row[keys.id] || "").toLowerCase().includes(word);
        const matchCreator = (row[keys.creator] || "").toLowerCase().includes(word);
        const matchSkuId = (row[keys.skuId] || "").toLowerCase().includes(word);
        const matchSkuName = (row[keys.skuName] || "").toLowerCase().includes(word);
        return matchId || matchCreator || matchSkuId || matchSkuName;
      });
    });
  }, [allRows, searchWords, keys]);

  const metrics = useMemo(() => {
    const ordersSet = new Set();
    const creatorsSet = new Set();
    const contentsSet = new Set();
    let totalQty = 0;
    filteredRows.forEach(row => {
      if (row[keys.order]) ordersSet.add(row[keys.order]);
      if (row[keys.creator]) creatorsSet.add(row[keys.creator]);
      if (row[keys.id]) contentsSet.add(row[keys.id]);
      totalQty += parseSafeNum(row[keys.qty]);
    });
    return { orders: ordersSet.size, qty: totalQty, creators: creatorsSet.size, contents: contentsSet.size };
  }, [filteredRows, keys]);

  const aggregatedData = useMemo(() => {
    const vMap: Record<string, any> = {};
    const cMap: Record<string, any> = {};
    const pMap: Record<string, any> = {};

    filteredRows.forEach(row => {
      const vid = (row[keys.id] || "未知ID").trim();
      const creator = (row[keys.creator] || "未知达人").trim();
      const skuId = (row[keys.skuId] || "无SKU").trim();
      const skuName = (row[keys.skuName] || "未命名商品").trim();
      const qty = parseSafeNum(row[keys.qty]);
      const date = row[keys.date] || "";

      if (!vMap[vid]) vMap[vid] = { id: vid, creator, date, contextQty: 0, skus: {} };
      vMap[vid].contextQty += qty;
      if (!vMap[vid].skus[skuId]) vMap[vid].skus[skuId] = { name: skuName, qty: 0 };
      vMap[vid].skus[skuId].qty += qty;

      if (!cMap[creator]) cMap[creator] = { id: creator, contextQty: 0, videos: {}, skus: {} };
      cMap[creator].contextQty += qty;
      if (!cMap[creator].videos[vid]) cMap[creator].videos[vid] = { qty: 0, date, skus: {} };
      cMap[creator].videos[vid].qty += qty;
      if (!cMap[creator].videos[vid].skus[skuId]) cMap[creator].videos[vid].skus[skuId] = 0;
      cMap[creator].videos[vid].skus[skuId] += qty;
      if (!cMap[creator].skus[skuId]) cMap[creator].skus[skuId] = 0;
      cMap[creator].skus[skuId] += qty;

      if (!pMap[skuName]) pMap[skuName] = { id: skuName, contextQty: 0, variants: {} };
      pMap[skuName].contextQty += qty;
      if (!pMap[skuName].variants[skuId]) pMap[skuName].variants[skuId] = 0;
      pMap[skuName].variants[skuId] += qty;
    });

    const sortFn = (a: any, b: any) => b.contextQty - a.contextQty;

    return {
      creator: Object.values(cMap).sort(sortFn).map((c: any) => ({
        ...c,
        rankedSkus: Object.entries(c.skus).map(([id, qty]) => ({ id, qty: qty as number })).sort((a, b) => b.qty - a.qty),
        rankedVideos: Object.entries(c.videos).map(([id, data]: any) => ({ id, ...data })).sort((a, b) => b.qty - a.qty)
      })),
      video: Object.values(vMap).sort(sortFn).map((v: any) => ({
        ...v,
        rankedSkus: Object.entries(v.skus).map(([id, data]: any) => ({ id, ...data })).sort((a, b) => b.qty - a.qty)
      })),
      product: Object.values(pMap).sort(sortFn).map((p: any) => ({
        ...p,
        rankedVariants: Object.entries(p.variants).map(([id, qty]) => ({ id, qty: qty as number })).sort((a, b) => b.qty - a.qty)
      }))
    };
  }, [filteredRows, keys, viewMode]);

  const displayList = useMemo(() => {
    return viewMode === 'creator' ? aggregatedData.creator : viewMode === 'video' ? aggregatedData.video : aggregatedData.product;
  }, [aggregatedData, viewMode]);

  const formatNum = (num: number) => num.toLocaleString();

  // --- 深度优化的导出逻辑 ---
  const handleExport = () => {
    if (displayList.length === 0) return;

    let csvContent = "";
    const dateStr = new Date().toISOString().split('T')[0];
    let modeName = viewMode === 'product' ? '商品聚合' : viewMode === 'creator' ? '达人矩阵' : '深度视频';
    let fileName = `Matrix_Analytics_${modeName}_${dateStr}.csv`;

    const escape = (val: any) => {
        const str = String(val === null || val === undefined ? "" : val).trim();
        // 处理换行符、逗号和双引号，确保在 Excel 中布局整洁
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
            return `"${str.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
        }
        return str;
    };

    // 针对不同视图模式，设计最合理的列布局（核心数据靠前，详细构造成后）
    if (viewMode === 'product') {
        csvContent = "商品全名,当前销量,大盘占比,SKU明细分布\n";
        displayList.forEach((item: any) => {
            const share = metrics.qty > 0 ? ((item.contextQty / metrics.qty) * 100).toFixed(1) : "0.0";
            const skuDetails = item.rankedVariants.map((v: any) => `${v.id}(${v.qty}件)`).join(" | ");
            csvContent += `${escape(item.id)},${item.contextQty},${share}%,${escape(skuDetails)}\n`;
        });
    } else if (viewMode === 'creator') {
        csvContent = "达人账号,筛选销量,贡献占比,视频总数,TOP_SKU,主要关联视频ID\n";
        displayList.forEach((item: any) => {
            const share = metrics.qty > 0 ? ((item.contextQty / metrics.qty) * 100).toFixed(1) : "0.0";
            const skus = item.rankedSkus.map((s: any) => `${s.id}(${s.qty}件)`).join(" | ");
            const videos = item.rankedVideos.map((v: any) => v.id).join(" | ");
            csvContent += `${escape(item.id)},${item.contextQty},${share}%,${item.rankedVideos.length},${escape(skus)},${escape(videos)}\n`;
        });
    } else if (viewMode === 'video') {
        csvContent = "内容ID,关联达人,筛选销量,贡献占比,发布日期,SKU转化详情\n";
        displayList.forEach((item: any) => {
            const share = metrics.qty > 0 ? ((item.contextQty / metrics.qty) * 100).toFixed(1) : "0.0";
            const skuDetails = item.rankedSkus.map((s: any) => `${s.name}(${s.qty}件)`).join(" | ");
            csvContent += `${escape(item.id)},${escape(item.creator)},${item.contextQty},${share}%,${escape(item.date)},${escape(skuDetails)}\n`;
        });
    }

    // 关键优化：添加 UTF-8 BOM (\uFEFF)，解决 Excel 中文乱码顽疾
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F1F5F9] text-slate-900 font-sans">
      <header className="sticky top-0 z-50 bg-[#0F172A] border-b border-white/10 shadow-xl">
        <div className="px-8 py-3.5 flex items-center justify-between max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl"><Layers size={18} className="text-white" /></div>
            <div>
              <h1 className="text-lg font-black text-white italic uppercase tracking-tighter">Matrix Analytics</h1>
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Pro Dashboard</p>
            </div>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-xl border border-white/5">
             <TabBtn active={viewMode === 'product'} onClick={() => setViewMode('product')} label="商品聚合" icon={<ShoppingBag size={14}/>} />
             <TabBtn active={viewMode === 'creator'} onClick={() => setViewMode('creator')} label="达人矩阵" icon={<Users size={14}/>} />
             <TabBtn active={viewMode === 'video'} onClick={() => setViewMode('video')} label="深度视频" icon={<Video size={14}/>} />
          </div>
          <button 
            onClick={handleExport}
            disabled={allRows.length === 0}
            className={`bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-[12px] font-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 ${allRows.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 hover:-translate-y-0.5'}`}
          >
            <FileOutput size={16} /> 导出分析报表
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto w-full p-6 space-y-8">
        {allRows.length === 0 ? (
          <div className="h-[70vh] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-[3rem] bg-white">
            <label className="cursor-pointer flex flex-col items-center p-16 group">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 shadow-inner ring-1 ring-slate-100 group-hover:ring-indigo-300 transition-all"><Upload size={32} className="text-indigo-600" /></div>
              <p className="text-3xl font-black mb-2">载入 CSV 数据源</p>
              <p className="text-slate-400 text-sm mb-8">支持点击跳转实现“商品 + 达人”精准穿透</p>
              <div className="px-10 py-4 bg-[#0F172A] text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl">选择文件</div>
              <input type="file" accept=".csv" multiple onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
               <CompactMetric label="专项订单 (筛选)" value={formatNum(metrics.orders)} icon={<BarChart3 size={18}/>}/>
               <CompactMetric label="专项销量 (筛选)" value={formatNum(metrics.qty)} highlight icon={<Package size={18}/>}/>
               <CompactMetric label="关联达人" value={formatNum(metrics.creators)} icon={<Users size={18}/>}/>
               <CompactMetric label="素材深度" value={formatNum(metrics.contents)} icon={<Video size={18}/>}/>
            </div>

            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="键入关键词（空格分隔）：商品名 [空格] 达人名... 实现交集筛选"
                className="w-full bg-white border border-slate-200 rounded-3xl pl-16 pr-12 py-5 font-bold text-xl shadow-sm focus:border-indigo-500 outline-none"
              />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X size={24}/></button>}
            </div>

            <div className="space-y-8 pb-24">
              {displayList.map((item: any) => {
                const sharePercent = metrics.qty > 0 ? ((item.contextQty / metrics.qty) * 100).toFixed(1) : "0.0";
                
                return (
                <div key={item.id} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-500 group/card">
                  
                  {viewMode === 'product' && (
                    <div className="flex items-center gap-10">
                       <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100"><ShoppingBag size={32} /></div>
                       <div className="flex-1 min-w-0">
                          <h3 onClick={() => jumpTo('creator', item.id)} className="text-2xl font-black text-slate-900 truncate cursor-pointer hover:text-indigo-600 mb-6">{item.id}</h3>
                          <div className="flex flex-wrap gap-3">
                             {item.rankedVariants.map((v: any, i: number) => (
                               <span key={i} onClick={() => jumpTo('creator', v.id)} className="px-5 py-2.5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl text-[12px] font-bold cursor-pointer border border-slate-100 transition-all flex items-center gap-2">
                                 <Hash size={12} className="opacity-40"/> {v.id} <span className="ml-2 font-mono opacity-60">{formatNum(v.qty)}</span>
                               </span>
                             ))}
                          </div>
                       </div>
                       <div className="text-right border-l-4 border-slate-50 pl-12 shrink-0 flex flex-col justify-center">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">当前成交</p>
                          <div className="text-6xl font-black text-emerald-600 tracking-tighter mb-4">{formatNum(item.contextQty)}</div>
                          <div className="bg-[#0F172A] text-white px-4 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-2">
                             占大盘 {sharePercent}%
                          </div>
                       </div>
                    </div>
                  )}

                  {viewMode === 'creator' && (
                    <div className="flex flex-col xl:flex-row gap-12">
                       <div className="flex items-center gap-8 shrink-0 xl:w-[350px]">
                         <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center border-4 border-white shadow-xl shrink-0"><User size={40} /></div>
                         <div className="min-w-0 flex-1">
                            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter truncate">{item.id}</h3>
                            <div className="flex gap-4">
                               <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-xl text-[11px] font-black uppercase flex items-center gap-2"><Video size={14}/> {formatNum(item.rankedVideos.length)}</span>
                               <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-xl text-[11px] font-black uppercase flex items-center gap-2"><Package size={14}/> {formatNum(item.contextQty)}</span>
                            </div>
                         </div>
                       </div>
                       <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-12 border-l-0 xl:border-l-4 xl:pl-12 border-slate-50">
                          <div className="flex flex-col">
                             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={16} className="text-indigo-500"/> SKU 占比</p>
                             <div className="space-y-3 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">
                                {item.rankedSkus.map((s: any, i: number) => (
                                   <div key={i} className="flex justify-between items-center text-sm p-5 rounded-2xl border bg-slate-50 border-slate-100">
                                      <span className="truncate font-black font-mono">{s.id}</span>
                                      <span className="font-black ml-8 shrink-0 px-4 py-1.5 rounded-xl bg-white shadow-sm">{formatNum(s.qty)}</span>
                                   </div>
                                ))}
                             </div>
                          </div>
                          <div className="flex flex-col">
                             <div className="flex items-center justify-between mb-6">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Play size={16} className="text-indigo-500"/> 关联视频</p>
                                <button onClick={() => jumpTo('video', item.id)} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-all">穿透详情 <ArrowRight size={14} /></button>
                             </div>
                             <div className="flex-1 space-y-4 overflow-y-auto max-h-[350px] pr-4 custom-scrollbar">
                                {item.rankedVideos.map((v: any, i: number) => (
                                   <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:bg-white transition-all">
                                      <div className="flex justify-between items-start mb-4 gap-6">
                                         <div className="min-w-0 flex-1">
                                            <a href={`https://www.tiktok.com/@/video/${v.id}`} target="_blank" className="text-sm font-black text-indigo-600 hover:underline flex items-center gap-2 font-mono truncate">{v.id} <LinkIcon size={14} /></a>
                                            <span className="text-[10px] text-slate-400 block mt-1">{v.date}</span>
                                         </div>
                                         <div className="text-right shrink-0"><div className="text-xl font-black text-emerald-600 leading-none">{formatNum(v.qty)}</div></div>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                         {Object.entries(v.skus || {}).map(([skuId, qty]: any, j) => (
                                            <div key={j} className="px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-200 bg-white text-slate-500">{skuId}: {formatNum(qty)}</div>
                                         ))}
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                       <div className="text-right border-l-0 xl:border-l-4 xl:pl-12 shrink-0 flex flex-col justify-center min-w-[220px]">
                          <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100">
                            <p className="text-xs font-black text-indigo-600 uppercase mb-4 tracking-widest">交集筛选成交</p>
                            <div className="text-7xl font-black text-emerald-600 tracking-tighter">{formatNum(item.contextQty)}</div>
                            <div className="mt-8 pt-6 border-t border-indigo-100 flex flex-col gap-3">
                               <span className="text-[10px] font-bold text-slate-400 uppercase">当前筛选总计: {formatNum(metrics.qty)}</span>
                               <div className="bg-[#0F172A] text-white px-4 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-2">
                                 占比 {sharePercent}%
                               </div>
                            </div>
                          </div>
                       </div>
                    </div>
                  )}

                  {viewMode === 'video' && (
                    <div className="flex flex-col lg:flex-row gap-16">
                       <LazyVideo id={item.id} mode="expanded" />
                       <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row justify-between items-start border-b-4 border-slate-50 pb-10 mb-10 gap-8">
                             <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-5 mb-8">
                                   <a href={`https://www.tiktok.com/@/video/${item.id}`} target="_blank" className="bg-[#0F172A] text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-3 hover:bg-indigo-600 transition-all font-mono shadow-xl"><ExternalLink size={18}/> {item.id}</a>
                                   <button onClick={() => { 
                                     const match = item.id.match(/\d{15,}/);
                                     const idToCopy = match ? match[0] : item.id;
                                     navigator.clipboard.writeText(idToCopy);
                                     alert('视频 ID 已复制'); 
                                   }} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><Copy size={18}/></button>
                                   <span className="text-xs font-bold text-slate-400 bg-white px-5 py-3 rounded-2xl border border-slate-100">日期: {item.date || '未知'}</span>
                                </div>
                                <h3 onClick={() => jumpTo('creator', item.creator)} className="text-5xl font-black text-slate-900 truncate hover:text-indigo-600 cursor-pointer tracking-tighter leading-tight">{item.creator}</h3>
                             </div>
                             <div className="text-right">
                                <p className="text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">当前交集成交</p>
                                <div className="text-8xl font-black text-emerald-600 leading-none mb-4">{formatNum(item.contextQty)}</div>
                                <div className="bg-[#0F172A] text-white px-4 py-2 rounded-xl text-[11px] font-black inline-flex items-center gap-2">
                                   贡献率 {sharePercent}%
                                </div>
                             </div>
                          </div>
                          <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100">
                             <p className="text-sm font-black text-slate-600 uppercase tracking-widest mb-8 flex items-center gap-4"><List size={22} className="text-indigo-600" /> 出单 SKU 构成</p>
                             <div className="space-y-4 max-h-[450px] overflow-y-auto pr-6 custom-scrollbar">
                                {item.rankedSkus.map((s: any, i: number) => (
                                   <div key={i} onClick={() => jumpTo('creator', s.id)} className="px-8 py-6 border rounded-3xl bg-white border-slate-100 hover:border-indigo-400 transition-all cursor-pointer flex items-center justify-between shadow-sm hover:shadow-md">
                                      <div className="flex-1 truncate pr-10">
                                         <div className="text-[11px] font-mono mb-2 text-indigo-600 font-bold opacity-70">ID: {s.id}</div>
                                         <h4 className="text-xl font-black truncate text-slate-900">{s.name}</h4>
                                      </div>
                                      <div className="text-right shrink-0">
                                         <div className="text-3xl font-black font-mono text-slate-900">{formatNum(s.qty)} <small className="text-xs font-sans opacity-40 font-bold">Sold</small></div>
                                         <div className="text-[10px] font-black px-4 py-1.5 rounded-xl mt-3 inline-block bg-slate-100 text-slate-500">占比 {((s.qty/item.contextQty)*100).toFixed(1)}%</div>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4F46E5; }
        body::-webkit-scrollbar { width: 12px; }
        body::-webkit-scrollbar-track { background: #F8FAFC; }
        body::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 20px; border: 3px solid #F8FAFC; }
      `}</style>
    </div>
  );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-xs font-black transition-all uppercase tracking-widest relative overflow-hidden ${active ? 'bg-white text-indigo-600 shadow-xl scale-105 border border-slate-200' : 'text-slate-400 hover:text-white active:scale-95'}`}>
    {icon} <span className="hidden md:inline">{label}</span>
  </button>
);

const CompactMetric = ({ label, value, highlight, icon }: any) => (
  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:translate-y-[-8px] hover:shadow-2xl group">
    <div className="flex items-center gap-4 text-slate-400 mb-6">
      <div className={`${highlight ? 'text-indigo-600 bg-indigo-50' : 'bg-slate-50'} p-4 rounded-2xl transition-all group-hover:rotate-12`}>{icon}</div>
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <span className={`text-4xl font-black tracking-tighter ${highlight ? 'text-indigo-600' : 'text-slate-900'}`}>{value}</span>
  </div>
);

export default App;
