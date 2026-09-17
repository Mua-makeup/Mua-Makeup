import React, { useState } from 'react';
import { Database, Cpu, Radio, ShieldCheck, Sparkles } from 'lucide-react';

export const IsometricArchitectureStack = () => {
  const [activeLayer, setActiveLayer] = useState(3); // Default to Top Layer

  const layers = [
    {
      id: 0,
      title: 'Tầng 1: CSDL Phân Vùng Độc Lập (Storage Layer)',
      subtitle: 'PostgreSQL 16 + PostGIS Extension + 8 Schemas',
      icon: Database,
      accent: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/30',
      tagColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      description:
        '1 Database duy nhất phân vùng 8 schemas: auth_schema, agency_schema, mua_schema, catalog_schema, booking_schema, telemetry_schema, wallet_schema, interaction_schema.',
      specs: [
        'PostGIS Geometry Point (EPSG:4326)',
        'Giao dịch ACID trọn vẹn trong 1 DB',
        'Flyway Timestamp Versioning Migration',
      ],
    },
    {
      id: 1,
      title: 'Tầng 2: Nghiệp Vụ Lõi Monolith (Core Engine)',
      subtitle: 'Spring Boot Core API + Redlock + Escrow Ledger',
      icon: Cpu,
      accent: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30',
      tagColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      description:
        'Layered Architecture Monolith kết hợp Spring In-Memory EventBus (<5ms latency), Redisson Distributed Lock chống race-condition nhận đơn khẩn và DoubleEntryLedger tự động giải ngân quỹ cọc.',
      specs: [
        'Pure Service Logic 100%',
        'Double-Entry Escrow Ledger',
        'Redis Token Blacklist & White-listing',
      ],
    },
    {
      id: 2,
      title: 'Tầng 3: Realtime Telemetry & Dispatching',
      subtitle: 'Embedded WebSocket STOMP + Redis GEO (Port 8080)',
      icon: Radio,
      accent: 'border-amber-500/40 text-amber-400 bg-amber-950/30',
      tagColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      description:
        'Quét thợ rảnh trong bán kính 5-15km qua Redis GEO, broadcast đơn khẩn cấp 30s với đồng hồ đếm ngược, stream GPS telemetry vị trí thợ di chuyển theo chu kỳ 5s tới khách hàng.',
      specs: [
        'STOMP endpoint: /ws-makeup',
        'Redis GEO Radius Search (5-15km)',
        '30s Instant Countdown Broadcast',
      ],
    },
    {
      id: 3,
      title: 'Tầng 4: Cổng Quản Trị Vận Hành (Management Portals)',
      subtitle: 'Super Admin & Agency Admin Single Page Application',
      icon: ShieldCheck,
      accent: 'border-rose-500/50 text-rose-400 bg-rose-950/40',
      tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      description:
        'Hệ sinh thái quản trị tối giản mật độ dữ liệu cao: Super Admin kiểm duyệt bằng cấp MUA & Master Taxonomy; Agency Admin quản lý Studio, tuyển thợ QR 72h, hoa hồng, và xếp ca tuần chống trùng giờ.',
      specs: [
        'Zod Form & Payload Validation 100%',
        'ZXing QR Code Tuyển Dụng 72h',
        'Realtime Shift Conflict Detection',
      ],
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto my-12 p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-slate-100 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Kiến Trúc Đa Tầng 3D Nền Tảng
        </div>
        <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Toàn Cảnh Hệ Thống Kỹ Thuật Đặt Lịch Make-up
        </h3>
        <p className="mt-2 text-sm text-slate-400 max-w-2xl mx-auto">
          Mô hình hóa 4 lớp công nghệ từ CSDL PostgreSQL 8 Schemas tới Cổng Quản Trị Super Admin & Agency Admin
        </p>
      </div>

      {/* Grid: 3D Stack Visualization + Detail Panel */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Interactive 3D Layers Column */}
        <div className="lg:col-span-6 flex flex-col gap-3.5">
          {layers
            .slice()
            .reverse()
            .map((layer) => {
              const Icon = layer.icon;
              const isSelected = activeLayer === layer.id;

              return (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  onMouseEnter={() => setActiveLayer(layer.id)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 transform ${
                    isSelected
                      ? `scale-[1.02] shadow-xl ${layer.accent} ring-1 ring-white/20 translate-x-2`
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                          isSelected
                            ? layer.tagColor
                            : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4
                          className={`text-sm font-bold tracking-tight ${
                            isSelected ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {layer.title}
                        </h4>
                        <p className="text-xs text-slate-400">{layer.subtitle}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                        isSelected
                          ? layer.tagColor
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      L{layer.id + 1}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Detailed Spec Panel */}
        <div className="lg:col-span-6 bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
          {(() => {
            const current = layers[activeLayer];
            const Icon = current.icon;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border ${current.tagColor}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mb-1 ${current.tagColor}`}
                    >
                      Chi Tiết Kiến Trúc
                    </span>
                    <h4 className="text-base font-bold text-white">
                      {current.title}
                    </h4>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {current.description}
                </p>

                <div className="pt-3 border-t border-slate-700/60">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Đặc Điểm Kỹ Thuật Nổi Bật:
                  </p>
                  <ul className="space-y-2 text-xs text-slate-200">
                    {current.specs.map((s, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
