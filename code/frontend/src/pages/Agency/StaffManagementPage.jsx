import React, { useState, useEffect } from 'react';
import {
  Users,
  QrCode,
  CheckCircle2,
  XCircle,
  Percent,
  Sparkles,
  Package,
  Trash2,
  Clock,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { Button } from '../../components/base/Button';
import { DataTable } from '../../components/base/DataTable';
import { ConfirmDialog } from '../../components/base/ConfirmDialog';
import { Toast } from '../../components/base/Toast';
import { StaffInvitationModal } from '../../components/features/agency/StaffInvitationModal';
import { StaffCommissionModal } from '../../components/features/agency/StaffCommissionModal';
import { StaffStyleAssignModal } from '../../components/features/agency/StaffStyleAssignModal';
import { StaffPackageAssignModal } from '../../components/features/agency/StaffPackageAssignModal';
import { formatDate } from '../../utils/formatters';
import { useI18nStore } from '../../store/useI18nStore';

export const StaffManagementPage = () => {
  const { t } = useI18nStore();
  const [activeTab, setActiveTab] = useState('active');
  const [activeStaff, setActiveStaff] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [commissionModalStaff, setCommissionModalStaff] = useState(null);
  const [styleModalStaff, setStyleModalStaff] = useState(null);
  const [packageModalStaff, setPackageModalStaff] = useState(null);
  const [removingStaff, setRemovingStaff] = useState(null);

  const [toastMessage, setToastMessage] = useState('');

  const loadStaffData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [activeRes, pendingRes] = await Promise.allSettled([
        agencyService.getStaffList('ACTIVE'),
        agencyService.getStaffList('PENDING'),
      ]);

      if (activeRes.status === 'fulfilled') {
        const aList =
          activeRes.value?.data?.content ||
          activeRes.value?.data ||
          activeRes.value?.content ||
          activeRes.value ||
          [];
        setActiveStaff(Array.isArray(aList) ? aList : []);
      } else {
        setApiError(activeRes.reason?.message || t('error_api_connection'));
        setActiveStaff([]);
      }

      if (pendingRes.status === 'fulfilled') {
        const pList =
          pendingRes.value?.data?.content ||
          pendingRes.value?.data ||
          pendingRes.value?.content ||
          pendingRes.value ||
          [];
        setPendingApplications(Array.isArray(pList) ? pList : []);
      } else {
        setPendingApplications([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData();
  }, []);

  const handleReviewApplication = async (applicationId, action) => {
    try {
      await agencyService.reviewStaffApplication(applicationId, {
        action,
        note: action === 'APPROVE' ? 'Đã duyệt gia nhập Studio' : 'Hồ sơ chưa phù hợp',
      });
      setToastMessage(
        action === 'APPROVE'
          ? 'Đã duyệt thợ gia nhập Studio thành công!'
          : 'Đã từ chối đơn xin gia nhập.'
      );
      loadStaffData();
    } catch (err) {
      setToastMessage(err.message || 'Lỗi khi xử lý đơn gia nhập');
    }
  };

  const handleConfirmRemoveStaff = async () => {
    if (!removingStaff) return;
    try {
      await agencyService.removeStaff(removingStaff.id);
      setActiveStaff((prev) => prev.filter((s) => s.id !== removingStaff.id));
      setToastMessage(`Đã xóa thợ ${removingStaff.fullName} khỏi Studio.`);
      setRemovingStaff(null);
    } catch (err) {
      setToastMessage(err.message || 'Lỗi khi xóa thợ khỏi Studio');
    }
  };

  // Columns for Active Staff
  const activeColumns = [
    {
      header: 'Thợ Make-up',
      accessor: 'fullName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white block">{row.fullName}</span>
          <span className="text-xs text-slate-400 font-mono">
            {row.phoneNumber || 'N/A'} • {row.email || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Hoa Hồng Riêng',
      accessor: 'commissionRateCustom',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 text-xs">
            {row.commissionRateCustom ?? 30}%
          </span>
          <button
            onClick={() => setCommissionModalStaff(row)}
            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1"
            title="Đàm phán hoa hồng"
          >
            <Percent className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
    {
      header: 'Tone Phong Cách',
      accessor: 'styles',
      render: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {(row.styles || []).map((st, i) => (
            <span
              key={i}
              className="text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800"
            >
              {st.styleName || st}
            </span>
          ))}
          <button
            onClick={() => setStyleModalStaff(row)}
            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
            title="Gán tone thế mạnh"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
    {
      header: 'Gói Dịch Vụ',
      accessor: 'packageCount',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            {row.packageCount ?? 0} gói được giao
          </span>
          <button
            onClick={() => setPackageModalStaff(row)}
            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1"
            title="Gán gói dịch vụ"
          >
            <Package className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
    {
      header: 'Gia Nhập',
      accessor: 'joinedAt',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {row.joinedAt ? formatDate(row.joinedAt) : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Thao Tác',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => setRemovingStaff(row)}
          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
          title="Xóa thợ khỏi Studio"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // Columns for Pending Applications
  const pendingColumns = [
    {
      header: 'Người Nộp Đơn',
      accessor: 'fullName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white block">{row.fullName}</span>
          <span className="text-xs text-slate-400 font-mono">
            {row.phoneNumber || 'N/A'} • {row.email || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Mã Mời Đã Dùng',
      accessor: 'inviteCodeUsed',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {row.inviteCodeUsed || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Ghi Chú Của Thợ',
      accessor: 'note',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 max-w-sm block truncate" title={row.note}>
          {row.note || 'Không có ghi chú'}
        </span>
      ),
    },
    {
      header: 'Thời Gian Xin Vào',
      accessor: 'appliedAt',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {row.appliedAt ? formatDate(row.appliedAt) : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Thao Tác',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={CheckCircle2}
            onClick={() => handleReviewApplication(row.id, 'APPROVE')}
          >
            Chấp Nhận
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={XCircle}
            onClick={() => handleReviewApplication(row.id, 'REJECT')}
          >
            Từ Chối
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Real API Error Alert */}
      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-sm">
              {t('error_api_connection')}
            </strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-mono">
              {apiError}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadStaffData}>
            Thử Lại
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Quản Lý Thợ Make-up & Tuyển Dụng
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản lý đội ngũ thợ trực thuộc Studio, sinh mã mời QR 72h, phân bổ hoa hồng, tone make-up và gói dịch vụ
          </p>
        </div>

        <Button
          variant="primary"
          icon={QrCode}
          onClick={() => setIsInviteModalOpen(true)}
        >
          Tuyển Thợ Mới (Mã QR 72h)
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'active'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Thợ Đang Hoạt Động ({activeStaff.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'pending'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Đơn Xin Gia Nhập Chờ Duyệt ({pendingApplications.length})</span>
        </button>
      </div>

      {/* Tables based on active tab */}
      {activeTab === 'active' && (
        <DataTable
          columns={activeColumns}
          data={activeStaff}
          isLoading={isLoading}
          emptyMessage="Studio chưa có thợ nào trong cơ sở dữ liệu. Bấm 'Tuyển Thợ Mới' để sinh mã QR mời thợ."
        />
      )}

      {activeTab === 'pending' && (
        <DataTable
          columns={pendingColumns}
          data={pendingApplications}
          isLoading={isLoading}
          emptyMessage="Không có đơn xin gia nhập nào đang chờ duyệt trong cơ sở dữ liệu."
        />
      )}

      {/* Modals */}
      <StaffInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onStaffAdded={loadStaffData}
      />

      <StaffCommissionModal
        isOpen={Boolean(commissionModalStaff)}
        onClose={() => setCommissionModalStaff(null)}
        staff={commissionModalStaff}
        onSuccess={({ staffId, commissionRate }) => {
          setActiveStaff((prev) =>
            prev.map((s) =>
              s.id === staffId ? { ...s, commissionRateCustom: commissionRate } : s
            )
          );
          setToastMessage('Đã cập nhật hoa hồng cá nhân thành công!');
        }}
      />

      <StaffStyleAssignModal
        isOpen={Boolean(styleModalStaff)}
        onClose={() => setStyleModalStaff(null)}
        staff={styleModalStaff}
        onSuccess={() => {
          setToastMessage('Đã cập nhật tone phong cách cho thợ thành công!');
          loadStaffData();
        }}
      />

      <StaffPackageAssignModal
        isOpen={Boolean(packageModalStaff)}
        onClose={() => setPackageModalStaff(null)}
        staff={packageModalStaff}
        onSuccess={() => {
          setToastMessage('Đã gán gói dịch vụ cho thợ thành công!');
          loadStaffData();
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(removingStaff)}
        onClose={() => setRemovingStaff(null)}
        onConfirm={handleConfirmRemoveStaff}
        title="Xóa Thợ Khỏi Studio"
        message={`Bạn có chắc chắn muốn xóa thợ "${removingStaff?.fullName}" khỏi danh sách Studio? Thợ sẽ không thể tiếp tục nhận các đơn hàng của Studio.`}
        confirmText="Xác Nhận Xóa"
        isDangerous
      />

      <Toast
        message={toastMessage}
        type="success"
        onClose={() => setToastMessage('')}
      />
    </div>
  );
};
