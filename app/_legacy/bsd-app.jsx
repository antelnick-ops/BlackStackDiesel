import React, { useState } from 'react';
import {
  Home, Wrench, MessageSquare, User, Bell, Zap, Search, ChevronRight, ChevronDown,
  Star, ShieldCheck, Cog, Fuel, Wind, Snowflake, Filter, Gauge, ArrowRight,
  Truck, Plus, Minus, ChevronLeft, Check, Send, Sparkles,
  Package, MapPin, Settings, LogOut, Heart, X, ShoppingCart
} from 'lucide-react';

const AMBER = '#f59e0b';
const AMBER_DEEP = '#d97706';
const BG = '#16161a';
const SURFACE = '#1f1f24';
const SURFACE_2 = '#2a2a30';
const BORDER = '#2e2e35';
const TEXT = '#e8e6e3';
const TEXT_MUTED = '#8b8a87';
const TEXT_DIM = '#5c5b58';
const GREEN = '#6ee7b7';
const GREEN_BG = '#0d3221';

const initialGarage = [
  { id: 1, name: 'Bertha', year: 1999, make: 'Ford', model: 'F-250', engine: '7.3L Power Stroke', drivetrain: '4WD', primary: true },
  { id: 2, name: 'Shop Truck', year: 2008, make: 'GMC', model: 'Sierra 2500', engine: '6.6L Duramax LMM', drivetrain: '4WD', primary: false },
];

function TopBar({ showBack, onBack }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl border-b" style={{ background: `${BG}cc`, borderColor: BORDER }}>
      <div className="flex items-center justify-between px-4 py-3">
        {showBack ? (
          <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center active:opacity-70" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <ChevronLeft size={18} style={{ color: TEXT }} />
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}>
              <Zap size={16} style={{ color: AMBER }} fill={AMBER} />
            </div>
            <span className="font-bold tracking-wide text-[15px]" style={{ color: TEXT }}>
              BLACK<span style={{ color: AMBER }}>/</span>STACK
            </span>
          </div>
        )}
        <button className="w-10 h-10 rounded-full flex items-center justify-center active:opacity-70 relative" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <Bell size={16} style={{ color: TEXT_MUTED }} />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full" style={{ background: AMBER }} />
        </button>
      </div>
    </header>
  );
}

function VehicleBar({ vehicle, onOpenSwitcher }) {
  return (
    <button onClick={onOpenSwitcher} className="w-full px-4 py-2.5 flex items-center gap-2.5 border-b active:opacity-70" style={{ background: SURFACE, borderColor: BORDER }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: SURFACE_2 }}>
        <Truck size={13} style={{ color: AMBER }} />
      </div>
      <div className="flex-1 text-left flex items-baseline gap-1.5 min-w-0">
        <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: TEXT_DIM }}>Shopping for</span>
        <span className="text-xs font-semibold truncate" style={{ color: TEXT }}>{vehicle.year} {vehicle.make} {vehicle.model}</span>
        <span className="text-[10px] flex-shrink-0" style={{ color: TEXT_MUTED }}>· {vehicle.engine.split(' ')[0]}</span>
      </div>
      <span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: AMBER }}>
        SWITCH <ChevronDown size={11} />
      </span>
    </button>
  );
}

function VehicleSwitcher({ open, onClose, garage, activeId, onSelect }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: '#000000aa' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-5 pb-8" style={{ background: BG, borderTop: `1px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: TEXT }}>Switch vehicle</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: SURFACE }}>
            <X size={16} style={{ color: TEXT_MUTED }} />
          </button>
        </div>
        <div className="space-y-2">
          {garage.map((t) => {
            const active = t.id === activeId;
            return (
              <button key={t.id} onClick={() => { onSelect(t.id); onClose(); }} className="w-full p-3 rounded-2xl flex items-center gap-3 text-left active:opacity-70" style={{ background: SURFACE, border: `1px solid ${active ? AMBER : BORDER}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: SURFACE_2 }}>
                  <Truck size={18} style={{ color: active ? AMBER : TEXT_MUTED }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{t.name}</p>
                    {t.primary && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: AMBER, background: `${AMBER}15`, border: `1px solid ${AMBER}30` }}>PRIMARY</span>}
                  </div>
                  <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{t.year} {t.make} {t.model}</p>
                  <p className="text-[11px]" style={{ color: TEXT_DIM }}>{t.engine}</p>
                </div>
                {active && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: AMBER }}>
                    <Check size={12} style={{ color: '#1a1207' }} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
          <button className="w-full p-3 rounded-2xl flex items-center justify-center gap-2 mt-3" style={{ background: SURFACE_2, border: `1px dashed ${BORDER}` }}>
            <Plus size={16} style={{ color: AMBER }} />
            <span className="text-sm font-semibold" style={{ color: AMBER }}>Add a truck</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ current, onNavigate, cartCount }) {
  const tabs = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'parts', label: 'Parts', Icon: Wrench, badge: cartCount },
    { id: 'diagnose', label: 'Diagnose', Icon: MessageSquare },
    { id: 'account', label: 'Account', Icon: User },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t z-30" style={{ background: `${BG}f5`, borderColor: BORDER }}>
      <div className="flex items-center justify-around px-2 py-2 pb-4">
        {tabs.map(({ id, label, Icon, badge }) => {
          const active = current === id;
          return (
            <button key={id} onClick={() => onNavigate(id)} className="flex flex-col items-center gap-1 px-4 py-1.5 min-w-[64px]">
              <div className="relative">
                <Icon size={20} style={{ color: active ? AMBER : TEXT_DIM }} strokeWidth={active ? 2.5 : 2} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: AMBER, color: '#1a1207' }}>
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium" style={{ color: active ? AMBER : TEXT_DIM }}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HomeScreen({ vehicle, onNavigate, onOpenProduct, onOpenSwitcher }) {
  const categories = [
    { name: 'Engine', Icon: Cog, fits: 142, total: 180 },
    { name: 'Fuel System', Icon: Fuel, fits: 89, total: 124 },
    { name: 'Exhaust', Icon: Wind, fits: 54, total: 78 },
    { name: 'Cooling', Icon: Snowflake, fits: 38, total: 51 },
    { name: 'Air Intake', Icon: Filter, fits: 27, total: 39 },
    { name: 'Tuning', Icon: Gauge, fits: 19, total: 28 },
  ];
  const trending = [
    { brand: 'S&B FILTERS', tag: 'BEST SELLER', name: 'S&B Cold Air Intake Kit', rating: 4.9, reviews: 1284, price: '$450', stock: 'In stock' },
    { brand: 'BD DIESEL', name: 'BD Diesel Performance Tuner', rating: 4.8, reviews: 612, price: '$799', stock: 'In stock' },
    { brand: 'MAGNAFLOW', tag: 'NEW', name: 'MagnaFlow 5" Turbo-Back Exhaust', rating: 4.7, reviews: 421, price: '$1290', stock: 'In stock' },
  ];

  return (
    <>
      <TopBar />
      <VehicleBar vehicle={vehicle} onOpenSwitcher={onOpenSwitcher} />
      <div className="pb-32">
        <button onClick={() => onNavigate('diagnose')} className="mx-4 mt-4 p-4 rounded-2xl w-[calc(100%-2rem)] text-left active:scale-[0.99] transition-transform" style={{ background: SURFACE, border: `1px solid ${AMBER}33` }}>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${AMBER}1a`, border: `1px solid ${AMBER}33` }}>
              <Sparkles size={18} style={{ color: AMBER }} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: AMBER }}>AI Diagnostics</p>
              <p className="font-semibold text-[17px] leading-tight mt-1" style={{ color: TEXT }}>{vehicle.name} acting up?</p>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: TEXT_MUTED }}>Describe the symptoms. Get likely causes, repair steps, and the exact parts you'll need.</p>
            </div>
            <ArrowRight size={18} style={{ color: AMBER }} className="mt-2" />
          </div>
        </button>

        <div className="mt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ color: TEXT }}>Shop by category</h2>
            <button onClick={() => onNavigate('parts')} className="text-xs font-semibold flex items-center gap-1" style={{ color: AMBER }}>SEE ALL <ArrowRight size={12} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(({ name, Icon, fits, total }) => (
              <button key={name} onClick={() => onNavigate('parts')} className="rounded-2xl p-3 text-left active:opacity-70" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: SURFACE_2 }}>
                    <Icon size={16} style={{ color: TEXT_MUTED }} />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: GREEN, background: GREEN_BG }}>{fits} FIT</span>
                </div>
                <p className="text-sm font-semibold leading-tight" style={{ color: TEXT }}>{name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: TEXT_DIM }}>{fits} of {total} parts</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 px-4">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-base font-bold" style={{ color: TEXT }}>Popular for the 7.3L</h2>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_DIM }}>What other {vehicle.year} F-250 owners buy</p>
            </div>
            <button className="text-xs font-semibold flex items-center gap-1" style={{ color: AMBER }}>SEE ALL <ArrowRight size={12} /></button>
          </div>
          <div className="space-y-2">
            {trending.map((p, i) => (
              <button key={i} onClick={onOpenProduct} className="w-full p-3 rounded-2xl flex items-center gap-3 active:opacity-70" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: SURFACE_2 }}>
                  <ShieldCheck size={16} style={{ color: TEXT_MUTED }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: TEXT_DIM }}>{p.brand}</span>
                    {p.tag && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: AMBER, background: `${AMBER}15`, border: `1px solid ${AMBER}30` }}>{p.tag}</span>}
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>{p.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star size={10} style={{ color: TEXT_MUTED }} fill={TEXT_MUTED} />
                    <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{p.rating} · {p.reviews}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold" style={{ color: TEXT }}>{p.price}</p>
                  <p className="text-[10px]" style={{ color: GREEN }}>{p.stock}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 px-4">
          <h2 className="text-base font-bold mb-3" style={{ color: TEXT }}>Pick up where you left off</h2>
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2">
              {[
                { name: 'Rough Country Vertex 2.5', price: '$899.95' },
                { name: 'JS 320A Alternator', price: '$649.00' },
                { name: 'Bully Dog GT Tuner', price: '$549.00' },
              ].map((p, i) => (
                <button key={i} onClick={onOpenProduct} className="flex-shrink-0 w-32 rounded-xl overflow-hidden text-left active:opacity-80" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="aspect-square" style={{ background: '#f5f4f1' }} />
                  <div className="p-2">
                    <p className="text-[11px] font-semibold leading-tight line-clamp-2 min-h-[2rem]" style={{ color: TEXT }}>{p.name}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: TEXT }}>{p.price}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PartsScreen({ vehicle, onOpenProduct, onOpenSwitcher }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [fitsOnly, setFitsOnly] = useState(true);
  const cats = ['All', 'Engine', 'Fuel', 'Exhaust', 'Cooling', 'Intake', 'Tuning'];

  const allProducts = [
    { brand: 'ROUGH COUNTRY', name: 'Vertex 2.5 Reservoir Front Shocks 4.5–8" Lift', price: '$899.95', rating: 4.8, reviews: 234, fits: true },
    { brand: 'BD DIESEL', name: 'BD Diesel Performance Tuner', price: '$799.00', rating: 4.8, reviews: 612, fits: true },
    { brand: 'S&B FILTERS', name: 'S&B Cold Air Intake Kit', price: '$450.00', rating: 4.9, reviews: 1284, fits: true },
    { brand: 'MAGNAFLOW', name: 'MagnaFlow 5" Turbo-Back Exhaust', price: '$1,290.00', rating: 4.7, reviews: 421, fits: false },
    { brand: 'BULLY DOG', name: 'GT Platinum Gauge Tuner', price: '$549.00', rating: 4.6, reviews: 893, fits: true },
    { brand: 'EDGE PRODUCTS', name: 'Insight CTS3 Monitor', price: '$429.00', rating: 4.7, reviews: 567, fits: true },
  ];

  const products = fitsOnly ? allProducts.filter((p) => p.fits) : allProducts;

  return (
    <>
      <TopBar />
      <VehicleBar vehicle={vehicle} onOpenSwitcher={onOpenSwitcher} />
      <div className="pb-28">
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <Search size={18} style={{ color: TEXT_DIM }} />
            <input type="text" placeholder="Search parts, brands, part #..." className="flex-1 bg-transparent text-sm outline-none" style={{ color: TEXT }} />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-4 pb-1">
            {cats.map((c) => {
              const active = activeCategory === c;
              return (
                <button key={c} onClick={() => setActiveCategory(c)} className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap" style={active ? { background: TEXT, color: BG, border: `1px solid ${TEXT}` } : { background: SURFACE, color: TEXT_MUTED, border: `1px solid ${BORDER}` }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-4 mt-4 flex items-center justify-between">
          <button onClick={() => setFitsOnly(!fitsOnly)} className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: fitsOnly ? GREEN_BG : SURFACE, border: `1px solid ${fitsOnly ? GREEN : BORDER}` }}>
            <div className="w-3.5 h-3.5 rounded-sm flex items-center justify-center" style={{ background: fitsOnly ? GREEN : 'transparent', border: fitsOnly ? 'none' : `1px solid ${TEXT_MUTED}` }}>
              {fitsOnly && <Check size={10} style={{ color: GREEN_BG }} strokeWidth={3} />}
            </div>
            <span className="text-xs font-semibold" style={{ color: fitsOnly ? GREEN : TEXT_MUTED }}>Fits my truck only</span>
          </button>
          <button className="text-xs font-semibold flex items-center gap-1" style={{ color: TEXT_MUTED }}>
            <Filter size={12} /> Sort
          </button>
        </div>

        <div className="px-4 mt-3 mb-3">
          <p className="text-xs" style={{ color: TEXT_DIM }}>{products.length} of {allProducts.length} parts</p>
        </div>

        <div className="px-4 grid grid-cols-2 gap-3">
          {products.map((p, i) => (
            <button key={i} onClick={onOpenProduct} className="rounded-2xl overflow-hidden text-left active:opacity-80" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="aspect-square relative" style={{ background: '#f5f4f1' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-2/3 h-2/3 opacity-80">
                    <rect x="42" y="20" width="16" height="30" rx="2" fill="#6b7280" />
                    <rect x="46" y="50" width="8" height="40" fill="#9ca3af" />
                    <circle cx="50" cy="90" r="4" fill="#374151" />
                  </svg>
                </div>
                {p.fits && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5" style={{ background: BG, color: TEXT }}>
                    <Check size={9} style={{ color: GREEN }} /> FITS
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-[9px] font-bold tracking-wider uppercase" style={{ color: TEXT_DIM }}>{p.brand}</p>
                <p className="text-xs font-semibold leading-tight mt-1 line-clamp-2 min-h-[2.5rem]" style={{ color: TEXT }}>{p.name}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Star size={9} style={{ color: TEXT_MUTED }} fill={TEXT_MUTED} />
                  <span className="text-[10px]" style={{ color: TEXT_MUTED }}>{p.rating} · {p.reviews}</span>
                </div>
                <p className="text-sm font-bold mt-1.5" style={{ color: TEXT }}>{p.price}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ProductScreen({ vehicle, onBack, onAddToCart }) {
  const [qty, setQty] = useState(1);
  const fitment = [
    { model: 'Ford F-250 Super Duty', years: '2005–2026', drivetrain: '4WD' },
    { model: 'Ford F-350 Super Duty', years: '2005–2026', drivetrain: '4WD' },
  ];
  const specs = [
    { label: 'Brand', value: 'Rough Country' }, { label: 'MFG Part #', value: '699004' },
    { label: 'UPC', value: '843030147501' }, { label: 'Category', value: 'Suspension' },
    { label: 'Type', value: 'Shock Absorber' }, { label: 'Lift Range', value: '4.5"–8"' },
  ];

  return (
    <>
      <TopBar showBack onBack={onBack} />
      <div className="pb-44">
        <div className="mx-4 mt-4 rounded-2xl aspect-square relative overflow-hidden" style={{ background: '#f5f4f1' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-3/5 h-3/5">
              <rect x="85" y="30" width="30" height="60" rx="4" fill="#6b7280" />
              <rect x="92" y="90" width="16" height="80" fill="#9ca3af" />
              <circle cx="100" cy="180" r="8" fill="#374151" stroke={AMBER} strokeWidth="2" />
              <rect x="80" y="50" width="40" height="6" fill="#dc2626" />
            </svg>
          </div>
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg backdrop-blur" style={{ background: `${BG}d0` }}>
            <span className="text-[10px] font-bold tracking-widest" style={{ color: TEXT }}>ROUGH COUNTRY</span>
          </div>
          <button className="absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur flex items-center justify-center" style={{ background: `${BG}d0` }}>
            <Heart size={14} style={{ color: TEXT }} />
          </button>
        </div>

        <div className="px-4 pt-5">
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: TEXT_DIM }}>Suspension · Shocks & Struts</p>
          <h1 className="text-2xl font-bold leading-tight mt-1.5" style={{ color: TEXT }}>Vertex 2.5 Reservoir Front Shocks</h1>
          <p className="text-sm mt-1" style={{ color: TEXT_MUTED }}>F-250 Super Duty 4WD · 4.5"–8" Lift</p>
        </div>

        <div className="mx-4 mt-5 p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: TEXT }}>$899</span>
            <span className="text-xl font-bold" style={{ color: TEXT_MUTED }}>.95</span>
          </div>
          <div className="mt-3 p-3 rounded-xl flex items-center gap-2.5" style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: GREEN_BG }}>
              <Check size={14} style={{ color: GREEN }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: TEXT }}>Fits your {vehicle.year} {vehicle.model}</p>
              <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Verified by BSD fitment data</p>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-bold" style={{ color: TEXT }}>Fitment</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: TEXT_MUTED, background: SURFACE_2, border: `1px solid ${BORDER}` }}>{fitment.length} MODELS</span>
          </div>
          <div className="space-y-2">
            {fitment.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{f.model}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: TEXT_MUTED }}>{f.years} · {f.drivetrain}</p>
                </div>
                <Check size={14} style={{ color: GREEN }} />
              </div>
            ))}
          </div>
        </div>

        <div className="mx-4 mt-4">
          <h3 className="text-sm font-bold mb-2.5" style={{ color: TEXT }}>Details</h3>
          <div className="rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {specs.map((s, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-2.5" style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                <span className="text-xs" style={{ color: TEXT_MUTED }}>{s.label}</span>
                <span className="text-sm font-semibold" style={{ color: TEXT }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-[72px] left-0 right-0 px-4 pb-3 pt-3 z-20" style={{ background: `linear-gradient(to top, ${BG} 60%, ${BG}00 100%)` }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-12 flex items-center justify-center"><Minus size={14} style={{ color: TEXT }} /></button>
            <span className="w-8 text-center text-sm font-bold" style={{ color: TEXT }}>{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-10 h-12 flex items-center justify-center"><Plus size={14} style={{ color: TEXT }} /></button>
          </div>
          <button onClick={() => { onAddToCart(qty); onBack(); }} className="flex-1 h-12 rounded-2xl font-bold" style={{ background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DEEP} 100%)`, color: '#1a1207' }}>
            Add to cart · $899.95
          </button>
        </div>
      </div>
    </>
  );
}

function PartCardInline({ part, onAdd, onView }) {
  return (
    <div className="rounded-xl overflow-hidden mt-2" style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}>
      <div className="flex gap-3 p-3">
        <button onClick={onView} className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: '#f5f4f1' }}>
          <svg viewBox="0 0 100 100" className="w-3/4 h-3/4 opacity-80">
            <rect x="42" y="20" width="16" height="30" rx="2" fill="#6b7280" />
            <rect x="46" y="50" width="8" height="40" fill="#9ca3af" />
            <circle cx="50" cy="90" r="4" fill="#374151" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold tracking-wider uppercase" style={{ color: TEXT_DIM }}>{part.brand}</p>
          <p className="text-xs font-semibold leading-tight mt-0.5 line-clamp-2" style={{ color: TEXT }}>{part.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Check size={9} style={{ color: GREEN }} />
            <span className="text-[10px]" style={{ color: GREEN }}>Fits your truck</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-sm font-bold" style={{ color: TEXT }}>{part.price}</p>
            <button onClick={onAdd} className="px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1" style={{ background: AMBER, color: '#1a1207' }}>
              <Plus size={11} strokeWidth={3} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiagnoseScreen({ vehicle, onOpenSwitcher, onAddToCart, onOpenProduct }) {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState('initial');
  const suggestions = ['Hard start when cold', 'White smoke at idle', 'Glow plug code', 'Boost leak'];
  const recommendedParts = [
    { id: 'ipr-1', brand: 'INTERNATIONAL', name: 'IPR Valve OEM Replacement 7.3L Power Stroke', price: '$189.95' },
    { id: 'edge-1', brand: 'EDGE PRODUCTS', name: 'Insight CTS3 — diagnostic monitor', price: '$429.00' },
    { id: 'fuel-1', brand: 'MOTORCRAFT', name: 'Fuel Pressure Sensor (ICP) — diagnostic part', price: '$92.50' },
  ];

  const [messages, setMessages] = useState([
    { role: 'ai', text: `Hey — describe what's going on with ${vehicle.name}. Sound, smell, when it happens, any codes you've pulled. The more detail, the better the diagnosis.` },
  ]);

  const send = (text) => {
    if (!text.trim() || stage !== 'initial') return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setStage('thinking');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `Hard cold-starts on a 7.3L almost always come down to one of three things: the IPR (Injection Pressure Regulator) valve sticking, the ICP (Injection Control Pressure) sensor going bad, or stuck injectors from fuel sitting too long. Most likely culprit on a truck Bertha's age: IPR valve.`,
          confidence: 'High confidence',
        },
        {
          role: 'ai-steps',
          title: 'Diagnostic steps',
          steps: [
            'Hook up a scan tool (your Bully Dog GT works) and pull live ICP readings',
            'At cranking, ICP should hit 500+ PSI within 1–2 seconds',
            'If pressure builds slow or stalls, IPR is your culprit',
            'If pressure builds but truck won\'t start, suspect ICP sensor or injectors',
          ],
        },
        {
          role: 'ai-parts',
          text: 'Here\'s what you\'ll likely need. All confirmed to fit your 1999 F-250 7.3L:',
          parts: recommendedParts,
        },
      ]);
      setStage('diagnosed');
    }, 1200);
  };

  const addAll = () => {
    recommendedParts.forEach(() => onAddToCart(1));
    setMessages((prev) => [...prev, { role: 'system', text: `Added ${recommendedParts.length} parts to cart.` }]);
  };

  return (
    <>
      <TopBar />
      <VehicleBar vehicle={vehicle} onOpenSwitcher={onOpenSwitcher} />
      <div className="pb-40">
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: SURFACE, border: `1px solid ${AMBER}33` }}>
              <Sparkles size={20} style={{ color: AMBER }} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: AMBER }}>AI Diagnostics</p>
              <h1 className="text-xl font-bold" style={{ color: TEXT }}>Diagnose {vehicle.name}</h1>
            </div>
          </div>
        </div>

        <div className="px-4 mt-5 space-y-3">
          {messages.map((m, i) => {
            if (m.role === 'user') {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] p-3 rounded-2xl" style={{ background: AMBER, color: '#1a1207', borderBottomRightRadius: '0.5rem' }}>
                    <p className="text-sm leading-relaxed">{m.text}</p>
                  </div>
                </div>
              );
            }
            if (m.role === 'system') {
              return (
                <div key={i} className="flex justify-center">
                  <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: GREEN_BG, border: `1px solid ${GREEN}33` }}>
                    <Check size={11} style={{ color: GREEN }} />
                    <span className="text-[11px] font-semibold" style={{ color: GREEN }}>{m.text}</span>
                  </div>
                </div>
              );
            }
            if (m.role === 'ai-steps') {
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderBottomLeftRadius: '0.5rem' }}>
                    <div className="px-3 pt-3 pb-2 flex items-center gap-2">
                      <Wrench size={13} style={{ color: AMBER }} />
                      <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color: AMBER }}>{m.title}</p>
                    </div>
                    <div className="px-3 pb-3 space-y-2">
                      {m.steps.map((s, j) => (
                        <div key={j} className="flex gap-2.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}>
                            <span className="text-[10px] font-bold" style={{ color: AMBER }}>{j + 1}</span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: TEXT }}>{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            if (m.role === 'ai-parts') {
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[90%] w-full p-3 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderBottomLeftRadius: '0.5rem' }}>
                    <p className="text-sm leading-relaxed" style={{ color: TEXT }}>{m.text}</p>
                    {m.parts.map((p) => (
                      <PartCardInline key={p.id} part={p} onAdd={() => onAddToCart(1)} onView={onOpenProduct} />
                    ))}
                    <button onClick={addAll} className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DEEP} 100%)`, color: '#1a1207' }}>
                      <ShoppingCart size={14} /> Add all {m.parts.length} parts
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderBottomLeftRadius: '0.5rem' }}>
                  {m.confidence && (
                    <div className="flex items-center gap-1 mb-2">
                      <Sparkles size={10} style={{ color: AMBER }} />
                      <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: AMBER }}>{m.confidence}</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed" style={{ color: TEXT }}>{m.text}</p>
                </div>
              </div>
            );
          })}
          {stage === 'thinking' && (
            <div className="flex justify-start">
              <div className="p-3 rounded-2xl flex items-center gap-2" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderBottomLeftRadius: '0.5rem' }}>
                <Sparkles size={14} style={{ color: AMBER }} className="animate-pulse" />
                <span className="text-xs" style={{ color: TEXT_MUTED }}>Diagnosing...</span>
              </div>
            </div>
          )}
        </div>

        {stage === 'initial' && (
          <div className="px-4 mt-5">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: TEXT_DIM }}>Common 7.3L issues</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="px-3 py-2 rounded-full text-xs font-medium" style={{ background: SURFACE, color: TEXT_MUTED, border: `1px solid ${BORDER}` }}>{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-[72px] left-0 right-0 px-4 pb-3 pt-3 z-20" style={{ background: `linear-gradient(to top, ${BG} 60%, ${BG}00 100%)` }}>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(input)} placeholder={stage === 'diagnosed' ? 'Ask a follow-up...' : 'Describe the issue...'} className="flex-1 bg-transparent text-sm outline-none" style={{ color: TEXT }} />
          <button onClick={() => send(input)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DEEP} 100%)` }}>
            <Send size={14} style={{ color: '#1a1207' }} />
          </button>
        </div>
      </div>
    </>
  );
}

function AccountScreen({ garage, activeVehicleId }) {
  const orders = [
    { id: 'BSD-1042', date: 'May 12', total: '$899.95', status: 'Shipped' },
    { id: 'BSD-1031', date: 'Apr 28', total: '$234.50', status: 'Delivered' },
  ];

  return (
    <>
      <TopBar />
      <div className="pb-28">
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{ background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}` }}>N</div>
            <div>
              <p className="text-lg font-bold" style={{ color: TEXT }}>Nantel</p>
              <p className="text-xs" style={{ color: TEXT_MUTED }}>Winona, MO</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: AMBER }} />
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: AMBER }}>BSD Member</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold" style={{ color: TEXT }}>My Garage</h2>
            <button className="text-xs font-semibold" style={{ color: AMBER }}>+ Add truck</button>
          </div>
          <div className="space-y-2">
            {garage.map((t) => {
              const active = t.id === activeVehicleId;
              return (
                <div key={t.id} className="p-3 rounded-2xl flex items-center gap-3" style={{ background: SURFACE, border: `1px solid ${active ? AMBER : BORDER}` }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: SURFACE_2 }}>
                    <Truck size={18} style={{ color: active ? AMBER : TEXT_MUTED }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: TEXT }}>{t.name}</p>
                      {active && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: AMBER, background: `${AMBER}15`, border: `1px solid ${AMBER}30` }}>ACTIVE</span>}
                    </div>
                    <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{t.year} {t.make} {t.model}</p>
                    <p className="text-[11px]" style={{ color: TEXT_DIM }}>{t.engine}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: TEXT_DIM }} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 mt-6">
          <h2 className="text-sm font-bold mb-2.5" style={{ color: TEXT }}>Recent orders</h2>
          <div className="space-y-2">
            {orders.map((o, i) => (
              <div key={i} className="p-3 rounded-2xl flex items-center gap-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: SURFACE_2 }}><Package size={16} style={{ color: TEXT_MUTED }} /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{o.id}</p>
                  <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{o.date} · {o.total}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: GREEN, background: GREEN_BG, border: `1px solid #1d5238` }}>{o.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 mt-6">
          <h2 className="text-sm font-bold mb-2.5" style={{ color: TEXT }}>Settings</h2>
          <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {[
              { label: 'Shipping address', Icon: MapPin },
              { label: 'Notifications', Icon: Bell },
              { label: 'Preferences', Icon: Settings },
              { label: 'Sign out', Icon: LogOut, danger: true },
            ].map((s, i) => (
              <button key={i} className="w-full flex items-center gap-3 px-4 py-3 active:opacity-70" style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                <s.Icon size={16} style={{ color: s.danger ? '#f87171' : TEXT_MUTED }} />
                <span className="text-sm flex-1 text-left" style={{ color: s.danger ? '#f87171' : TEXT }}>{s.label}</span>
                {!s.danger && <ChevronRight size={14} style={{ color: TEXT_DIM }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function BSDApp() {
  const [screen, setScreen] = useState('home');
  const [previousScreen, setPreviousScreen] = useState('home');
  const [activeVehicleId, setActiveVehicleId] = useState(1);
  const [garage] = useState(initialGarage);
  const [cartCount, setCartCount] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const vehicle = garage.find((t) => t.id === activeVehicleId);
  const handleNavigate = (next) => { setPreviousScreen(screen); setScreen(next); };
  const openProduct = () => { setPreviousScreen(screen); setScreen('product'); };
  const addToCart = (qty = 1) => setCartCount((c) => c + qty);

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {screen === 'home' && <HomeScreen vehicle={vehicle} onNavigate={handleNavigate} onOpenProduct={openProduct} onOpenSwitcher={() => setSwitcherOpen(true)} />}
      {screen === 'parts' && <PartsScreen vehicle={vehicle} onOpenProduct={openProduct} onOpenSwitcher={() => setSwitcherOpen(true)} />}
      {screen === 'product' && <ProductScreen vehicle={vehicle} onBack={() => setScreen(previousScreen)} onAddToCart={addToCart} />}
      {screen === 'diagnose' && <DiagnoseScreen vehicle={vehicle} onOpenSwitcher={() => setSwitcherOpen(true)} onAddToCart={addToCart} onOpenProduct={openProduct} />}
      {screen === 'account' && <AccountScreen garage={garage} activeVehicleId={activeVehicleId} />}

      {screen !== 'product' && <BottomNav current={screen} onNavigate={handleNavigate} cartCount={cartCount} />}

      <VehicleSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} garage={garage} activeId={activeVehicleId} onSelect={setActiveVehicleId} />
    </div>
  );
}
