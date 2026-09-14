package com.makeup.platform.service.agency;

import com.makeup.platform.dto.request.agency.AcceptInvitationReq;
import com.makeup.platform.dto.request.agency.CreateInvitationReq;
import com.makeup.platform.dto.request.agency.ReviewStaffApplicationReq;
import com.makeup.platform.dto.request.agency.UpdateStaffCommissionReq;
import com.makeup.platform.dto.request.agency.UpdateStaffStatusReq;
import com.makeup.platform.dto.response.agency.AgencyInvitationRes;
import com.makeup.platform.dto.response.agency.AgencyStaffDetailRes;
import com.makeup.platform.dto.response.agency.AgencyStaffRes;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AgencyStaffService {

    // Studio Admin: Tạo mã mời lưu Redis
    AgencyInvitationRes createInvitation(Long userId, CreateInvitationReq req);

    // Studio Admin: Danh sách mã mời đang mở trong Redis
    List<AgencyInvitationRes> getInvitations(Long userId);

    // Studio Admin: Hủy mã mời khỏi Redis
    void cancelInvitation(Long userId, String inviteCode);

    // MUA: Nộp đơn xin gia nhập Studio qua mã mời Redis (trạng thái PENDING)
    AgencyStaffRes acceptInvitation(Long muaUserId, AcceptInvitationReq req);

    // Studio Admin: Phê duyệt (APPROVE) hoặc Từ chối (REJECT) đơn gia nhập
    AgencyStaffRes reviewStaffApplication(Long userId, Long staffId, ReviewStaffApplicationReq req);

    // Studio Admin: Danh sách nhân viên (phân trang, lọc theo status)
    Page<AgencyStaffRes> getStaffList(Long userId, String status, Pageable pageable);

    // Studio Admin: Danh sách nhân viên (phân trang tất cả)
    Page<AgencyStaffRes> getStaffList(Long userId, Pageable pageable);

    // Studio Admin: Chi tiết nhân viên
    AgencyStaffDetailRes getStaffDetail(Long userId, Long staffId);

    // Studio Admin: Cập nhật trạng thái nhân viên (ACTIVE, SUSPENDED, LEFT)
    AgencyStaffRes updateStaffStatus(Long userId, Long staffId, UpdateStaffStatusReq req);

    // Studio Admin: Cập nhật hoa hồng riêng cho thợ (ISSUE-12.3)
    AgencyStaffRes updateStaffCommission(Long userId, Long staffId, UpdateStaffCommissionReq req);

    // Studio Admin: Xóa nhân viên khỏi Studio
    void removeStaff(Long userId, Long staffId);
}
