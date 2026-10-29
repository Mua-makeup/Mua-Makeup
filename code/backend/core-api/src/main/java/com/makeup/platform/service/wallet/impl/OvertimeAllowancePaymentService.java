package com.makeup.platform.service.wallet.impl;

import com.makeup.platform.entity.agency.AgencyStaffOvertimeReportEntity;
import com.makeup.platform.entity.agency.OvertimeReportStatus;
import com.makeup.platform.entity.agency.OvertimeAllowancePaymentStatus;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.repository.AgencyStaffOvertimeReportRepository;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.interaction.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class OvertimeAllowancePaymentService {
    private final AgencyStaffOvertimeReportRepository reports;
    private final WalletRepository wallets;
    private final LedgerEntryRepository ledger;
    private final NotificationService notifications;

    @Transactional(readOnly = true)
    public OvertimeAllowancePaymentStatus status(AgencyStaffOvertimeReportEntity report) {
        if (report.getStatus() != OvertimeReportStatus.APPROVED_WAIVED
                || report.getPenaltyAmountApplied() == null || report.getPenaltyAmountApplied().signum() <= 0) {
            return OvertimeAllowancePaymentStatus.NOT_APPLICABLE;
        }
        if (report.getAgency() == null || report.getAgency().getOwner() == null
                || report.getStaff() == null || report.getStaff().getMua() == null
                || report.getStaff().getMua().getUser() == null
                || report.getAgency().getOwner().getId().equals(report.getStaff().getMua().getUser().getId())) {
            return OvertimeAllowancePaymentStatus.RECONCILIATION_REQUIRED;
        }
        // Read by report reference, including historical entries with booking/staff keys.
        var debits = ledger.findByReferenceIdAndReferenceTypeAndEntryType(report.getId(), "OVERTIME_PAYMENT", "DEBIT");
        var credits = ledger.findByReferenceIdAndReferenceTypeAndEntryType(report.getId(), "OVERTIME_ALLOWANCE", "CREDIT");
        if (debits.isEmpty() && credits.isEmpty()) return OvertimeAllowancePaymentStatus.PENDING_FUNDS;
        BigDecimal expected = report.getPenaltyAmountApplied();
        if (sum(debits).compareTo(expected) == 0 && sum(credits).compareTo(expected) == 0) return OvertimeAllowancePaymentStatus.PAID;
        return OvertimeAllowancePaymentStatus.RECONCILIATION_REQUIRED;
    }

    private BigDecimal sum(List<LedgerEntryEntity> entries) {
        return entries.stream().map(LedgerEntryEntity::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public OvertimeAllowancePaymentStatus pay(Long reportId) {
        if (reportId == null) {
            return OvertimeAllowancePaymentStatus.NOT_APPLICABLE;
        }
        var reportOpt = reports.findByIdForPayment(reportId);
        if (reportOpt.isEmpty()) {
            return OvertimeAllowancePaymentStatus.NOT_APPLICABLE;
        }
        var report = reportOpt.get();
        OvertimeAllowancePaymentStatus current = status(report);
        if (current != OvertimeAllowancePaymentStatus.PENDING_FUNDS) return current;
        var owner = report.getAgency().getOwner();
        var staff = report.getStaff().getMua().getUser();
        BigDecimal amount = report.getPenaltyAmountApplied();
        var source = wallets.findByUserIdWithLock(owner.getId()).orElse(null);
        if (source == null || source.getAvailableBalance() == null
                || source.getAvailableBalance().compareTo(amount) < 0) return OvertimeAllowancePaymentStatus.PENDING_FUNDS;
        var destination = wallets.findByUserIdWithLock(staff.getId()).orElseGet(() -> wallets.save(
                WalletEntity.builder().user(staff).availableBalance(BigDecimal.ZERO)
                        .frozenBalance(BigDecimal.ZERO).currency("VND").build()));
        source.setAvailableBalance(source.getAvailableBalance().subtract(amount));
        destination.setAvailableBalance((destination.getAvailableBalance() != null
                ? destination.getAvailableBalance() : BigDecimal.ZERO).add(amount));
        wallets.save(source);
        wallets.save(destination);
        // Both wallet updates and both entries commit or roll back together.
        ledger.save(entry(report, source, amount, "DEBIT", "OVERTIME_PAYMENT"));
        ledger.save(entry(report, destination, amount, "CREDIT", "OVERTIME_ALLOWANCE"));
        Runnable notifyPaid = () -> {
            try {
                notifications.createOvertimeApprovedNotification(staff, report.getAgency(),
                        String.valueOf(report.getBookingId()), report.getOvertimeMinutes(), amount);
            } catch (Exception ex) {
                log.warn("Overtime payment notification failed for report {}", reportId, ex);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { notifyPaid.run(); }
            });
        } else {
            notifyPaid.run();
        }
        return OvertimeAllowancePaymentStatus.PAID;
    }

    private LedgerEntryEntity entry(AgencyStaffOvertimeReportEntity report, WalletEntity wallet,
                                     BigDecimal amount, String type, String referenceType) {
        String bookingRef = report.getBookingId() != null ? String.valueOf(report.getBookingId()) : "";
        return LedgerEntryEntity.builder().wallet(wallet).entryType(type).amount(amount)
                .balanceAfter(wallet.getAvailableBalance()).referenceType(referenceType).referenceId(report.getId())
                .idempotencyKey("ot:report:" + report.getId() + ":" + type.toLowerCase(Locale.ROOT))
                .description("Thanh toán tăng ca đơn #" + bookingRef + " - báo cáo #" + report.getId()).build();
    }
}
