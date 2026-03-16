import { Link } from "wouter";

export default function MineriaPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          MÓDULO MINERÍA
        </h1>
        <p className="text-[#6A7A8A] text-xs font-mono mt-1">Gestión de contratos y cumplimiento normativo minero</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CODELCO */}
        <Link href="/mineria/codelco">
          <a className="block bg-[#1C2B3A] border border-[rgba(193,127,58,0.2)] p-8 hover:border-[#C17F3A] transition-colors cursor-pointer group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-[rgba(193,127,58,0.15)] border border-[rgba(193,127,58,0.3)] flex items-center justify-center">
                <span className="text-[#C17F3A] font-black text-lg">CO</span>
              </div>
              <div>
                <h2 className="text-white font-black text-xl tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>CODELCO</h2>
                <p className="text-[#C17F3A] text-[10px] font-mono tracking-widest">CORPORACIÓN NACIONAL DEL COBRE</p>
              </div>
            </div>
            <p className="text-[#6A7A8A] text-xs font-mono mb-6">
              Gestión de contratos bajo normativa RESSO, REMA y ECF. Registro de incidentes, KPIs y Estados de Pago.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["Contratos", "Incidentes RESSO", "KPIs", "EDP"].map(item => (
                <div key={item} className="flex items-center gap-2 text-[#6A7A8A] text-[10px] font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C17F3A]" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 text-[#C17F3A] text-xs font-mono tracking-widest group-hover:translate-x-1 transition-transform">
              ACCEDER →
            </div>
          </a>
        </Link>

        {/* BHP */}
        <Link href="/mineria/bhp">
          <a className="block bg-[#1C2B3A] border border-[rgba(193,127,58,0.2)] p-8 hover:border-[#C17F3A] transition-colors cursor-pointer group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-[rgba(193,127,58,0.15)] border border-[rgba(193,127,58,0.3)] flex items-center justify-center">
                <span className="text-[#C17F3A] font-black text-lg">BHP</span>
              </div>
              <div>
                <h2 className="text-white font-black text-xl tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>BHP</h2>
                <p className="text-[#C17F3A] text-[10px] font-mono tracking-widest">BROKEN HILL PROPRIETARY</p>
              </div>
            </div>
            <p className="text-[#6A7A8A] text-xs font-mono mb-6">
              Gestión de contratos en portal GCMS. Control de RFQ/RFI, scorecard de desempeño y comunicaciones oficiales.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["Contratos", "RFQ/RFI", "Scorecard", "Comunicaciones"].map(item => (
                <div key={item} className="flex items-center gap-2 text-[#6A7A8A] text-[10px] font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C17F3A]" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 text-[#C17F3A] text-xs font-mono tracking-widest group-hover:translate-x-1 transition-transform">
              ACCEDER →
            </div>
          </a>
        </Link>
      </div>
    </div>
  );
}