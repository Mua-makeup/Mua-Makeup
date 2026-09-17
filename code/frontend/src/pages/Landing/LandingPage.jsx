import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowRight,
  HeartHandshake,
  CheckCircle2,
  CalendarCheck,
  Palette,
  Clock,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../constants/roles.constant';

export const LandingPage = () => {
  const { isAuthenticated, role } = useAuth();

  const getDashboardPath = () => {
    if (!isAuthenticated) return '/login';
    return role === USER_ROLES.SUPER_ADMIN ? '/admin/dashboard' : '/agency/dashboard';
  };

  const makeupStyles = [
    {
      title: 'Make-up Cô Dâu VIP',
      tag: 'Hoàng Gia & Kiêu Sa',
      desc: 'Lớp nền khóa ẩm căng mịn bền màu 16h, tôn vinh nét đẹp rạng rỡ và quý phái nhất trong ngày trọng đại.',
      color: 'from-rose-500/10 to-pink-500/10 border-rose-200 text-rose-600',
    },
    {
      title: 'Tone Douyin / Hàn Quốc',
      tag: 'Căng Bóng Glass-Skin',
      desc: 'Tạo hiệu ứng da mọng nước trong trẻo, bọng mắt cười ngọt ngào và môi bóng ombre thịnh hành.',
      color: 'from-amber-500/10 to-rose-500/10 border-amber-200 text-amber-600',
    },
    {
      title: 'Dạ Tiệc & Gala VIP',
      tag: 'Quyến Rũ & Sắc Sảo',
      desc: 'Nhấn mắt khói ấn tượng, đường eyeliner sắc sảo và tạo khối chuẩn tỉ lệ vàng bắt trọn ánh đèn sự kiện.',
      color: 'from-purple-500/10 to-rose-500/10 border-purple-200 text-purple-600',
    },
    {
      title: 'Tone Nude Tây Glamour',
      tag: 'Thời Thượng & Cá Tính',
      desc: 'Kỹ thuật cut-crease kinh điển, tạo khối gò má nổi bật kết hợp son nude lì thời thượng chuẩn sao quốc tế.',
      color: 'from-amber-600/10 to-orange-500/10 border-amber-200 text-amber-700',
    },
  ];

  const highlights = [
    {
      icon: ShieldCheck,
      title: '100% Thợ Có Chứng Chỉ',
      desc: 'Nghệ sĩ trang điểm đều được ban chuyên môn thẩm định bằng cấp, kiểm duyệt CCCD và Portfolio thực tế.',
    },
    {
      icon: Clock,
      title: 'Bảng Phụ Phí Minh Bạch',
      desc: 'Định mức phụ phí cự ly km di chuyển, ca đêm muộn hay ngày nghỉ lễ tết đều được niêm yết rõ ràng.',
    },
    {
      icon: CalendarCheck,
      title: 'Điều Phối Lịch Đúng Hẹn',
      desc: 'Thuật toán xếp ca thông minh ngăn ngừa trùng lịch, đảm bảo chuyên viên make-up luôn có mặt đúng giờ.',
    },
    {
      icon: HeartHandshake,
      title: 'Hệ Sinh Thái Studio Agency',
      desc: 'Hỗ trợ các Studio tuyển chọn thợ qua mã QR 72h, phân bổ hoa hồng linh hoạt và mở rộng kinh doanh.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/40 via-white to-pink-50/30 text-slate-900 selection:bg-rose-500 selection:text-white flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-rose-100/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-xl block">
                MUA MAKEUP
              </span>
              <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block -mt-1">
                Luxury Beauty Platform
              </span>
            </div>
          </Link>

          {/* Quick Nav & Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/register"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-600 hover:bg-rose-50/50 transition-colors"
            >
              <Building2 className="w-4 h-4 text-rose-500" />
              <span>Đăng Ký Mở Studio</span>
            </Link>

            <Link
              to={getDashboardPath()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <span>{isAuthenticated ? 'Vào Bảng Điều Khiển' : 'Đăng Nhập Quản Trị'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative max-w-6xl mx-auto px-6 pt-14 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>Nền Tảng Đặt Lịch & Quản Lý Studio Make-up Chuyên Nghiệp</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Tôn Vinh Nét Đẹp Rạng Ngời <br />
            <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 bg-clip-text text-transparent">
              Cho Mọi Khoảnh Khắc Của Bạn
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            Kết nối trực tiếp khách hàng với đội ngũ nghệ sĩ trang điểm hàng đầu và các Studio chuyên nghiệp.
            Bảo đảm chất lượng qua kiểm duyệt tay nghề khắt khe, minh bạch bảng giá và dịch vụ tận tâm.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-sm shadow-xl shadow-rose-600/25 transition-all hover:scale-105 active:scale-95"
            >
              <span>Đăng Nhập Cổng Quản Trị</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 shadow-xs hover:border-rose-300 transition-all hover:scale-105 active:scale-95"
            >
              <Building2 className="w-4 h-4 text-rose-600" />
              <span>Đăng Ký Đối Tác Studio</span>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>100% Chuyên Viên Kiểm Duyệt</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Bảng Giá & Phụ Phí Rõ Ràng</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Tuyển Thợ Mã QR 72h</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Bảo Vệ Đơn Hàng Uy Tín</span>
            </div>
          </div>
        </section>

        {/* Section 2: Trending Makeup Styles */}
        <section className="py-16 bg-white border-y border-rose-100/60">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">
                <Palette className="w-4 h-4" />
                <span>Bộ Sưu Tập Xu Hướng</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Phong Cách Trang Điểm Nổi Bật
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">
                Lựa chọn tone make-up phù hợp với sự kiện và cá tính riêng của bạn
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {makeupStyles.map((style, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-500/10 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-4 ${style.color}`}>
                      {style.tag}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                      {style.title}
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed font-normal">
                      {style.desc}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-600">
                    <span>Xem thêm chi tiết</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Platform Highlights */}
        <section className="py-16 bg-slate-50/50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">
                <Flame className="w-4 h-4" />
                <span>Giá Trị Vượt Trội</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Tại Sao Chọn MUA MAKEUP?
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">
                Tiêu chuẩn dịch vụ cao cấp và tiện ích quản trị tối ưu dành cho cả khách hàng và chủ tiệm
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col items-start"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Dual Role Gateways */}
        <section className="py-16 max-w-5xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              Cổng Quản Trị Phân Quyền
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Dành Riêng Cho Ban Quản Trị & Đối Tác
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Super Admin Card */}
            <div className="p-8 rounded-3xl bg-white border border-rose-200 shadow-md shadow-rose-100/50 flex flex-col justify-between hover:border-rose-300 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">
                  Cổng Super Admin
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Quản lý tổng quan hệ sinh thái, thẩm định hồ sơ MUA, phê duyệt chứng chỉ hành nghề, cấu hình danh mục make-up và kiểm soát chất lượng dịch vụ.
                </p>
              </div>
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
              >
                <span>Đăng Nhập Quản Trị Sàn</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Agency Admin Card */}
            <div className="p-8 rounded-3xl bg-white border border-indigo-200 shadow-md shadow-indigo-100/50 flex flex-col justify-between hover:border-indigo-300 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">
                  Cổng Studio Agency
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Dành cho Chủ tiệm trang điểm: Quản lý đội thợ, sinh mã QR 72h tuyển dụng nhân sự, phân bổ hoa hồng, xếp ca tuần chống trùng lịch và tạo gói dịch vụ.
                </p>
              </div>
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <span>Đăng Nhập Studio Agency</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black">
              M
            </div>
            <span className="font-bold text-slate-800">MUA MAKEUP PLATFORM</span>
          </div>
          <p>© 2026 MUA MAKEUP. Nền tảng đặt lịch make-up & quản lý studio chuyên nghiệp.</p>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <Link to="/login" className="hover:text-rose-600">Đăng Nhập</Link>
            <Link to="/register" className="hover:text-rose-600">Đăng Ký Studio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
