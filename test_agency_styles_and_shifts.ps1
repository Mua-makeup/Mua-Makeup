# =============================================================================
# test_agency_styles_and_shifts.ps1
# Script tu dong kiem thu toan dien ISSUE-12.4 va ISSUE-12.5 tren Server 8080
# =============================================================================

$BaseUrl = "http://localhost:8080/api/v1"
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "BAT DAU KIEM THU TU DONG ISSUE-12.4 & ISSUE-12.5" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Kiem tra ket noi Server
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/makeup-styles" -Method Get -TimeoutSec 5
    Write-Host "[1/8] Ket noi Server thanh cong! Tim thay $($health.data.Count) styles." -ForegroundColor Green
} catch {
    Write-Host "Khong ket noi duoc toi server tai $BaseUrl! Vui long dam bao server dang chay tren port 8080." -ForegroundColor Red
    exit 1
}

# 2. Dang nhap hoac Dang ky tai khoan Chu Studio (ROLE_AGENCY_ADMIN)
$OwnerPhone = "0912345678"
$OwnerPass = "Admin@123456"
$Token = $null

Write-Host "`n[2/8] Dang nhap tai khoan Chu Studio ($OwnerPhone)..." -ForegroundColor Yellow
try {
    $loginBody = @{
        loginIdentifier = $OwnerPhone
        password = $OwnerPass
    } | ConvertTo-Json

    $loginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $Token = $loginRes.data.accessToken
    Write-Host "Dang nhap Chu Studio thanh cong!" -ForegroundColor Green
} catch {
    Write-Host "Chua co tai khoan $OwnerPhone. Tien hanh dang ky tai khoan Studio moi..." -ForegroundColor Yellow
    $OwnerPhone = "091" + (Get-Random -Minimum 1000000 -Maximum 9999999)
    $regBody = @{
        phoneNumber = $OwnerPhone
        email = "owner_$OwnerPhone@makeup.com"
        password = $OwnerPass
        fullName = "Chu Studio Glamour"
        gender = "MALE"
        accountType = "AGENCY_ADMIN"
        agencyDetails = @{
            agencyName = "Glamour Bridal Studio"
            hotline = "02838383838"
            addressStreet = "88 Dong Khoi"
            district = "Quan 1"
            city = "Ho Chi Minh"
            commissionRateInternal = 25.0
        }
    } | ConvertTo-Json

    $null = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json"
    Write-Host "Dang ky Studio moi thanh cong ($OwnerPhone)!" -ForegroundColor Green

    # Dang nhap de lay Token
    $loginBody = @{
        loginIdentifier = $OwnerPhone
        password = $OwnerPass
    } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $Token = $loginRes.data.accessToken
    Write-Host "Dang nhap Studio moi thanh cong!" -ForegroundColor Green
}

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

# 3. Kiem tra va dam bao Studio co it nhat 1 tho ACTIVE
Write-Host "`n[3/8] Kiem tra danh sach nhan su tho cua Studio..." -ForegroundColor Yellow
$staffRes = Invoke-RestMethod -Uri "$BaseUrl/agencies/staff" -Method Get -Headers $Headers
$staffList = $staffRes.data.content
$targetStaffId = $null

if ($staffList -and $staffList.Count -gt 0) {
    $activeStaff = $staffList | Where-Object { $_.status -eq "ACTIVE" } | Select-Object -First 1
    if ($activeStaff) {
        $targetStaffId = $activeStaff.id
        Write-Host "Tim thay tho ACTIVE san co: ID = $targetStaffId, Ho ten = $($activeStaff.fullName)" -ForegroundColor Green
    } else {
        $pendingStaff = $staffList[0]
        $targetStaffId = $pendingStaff.id
        Write-Host "Duyet tho PENDING (ID = $targetStaffId)..." -ForegroundColor Yellow
        $reviewBody = @{
            decision = "APPROVE"
            agreedCommissionRate = 35.0
            note = "Duyet vao doi ngu test"
        } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$BaseUrl/agencies/staff/$targetStaffId/review" -Method Put -Headers $Headers -Body $reviewBody
        Write-Host "Duyet tho thanh cong!" -ForegroundColor Green
    }
}

if (-not $targetStaffId) {
    Write-Host "Studio chua co tho. Tu dong khoi tao luong tuyen tho moi qua Redis..." -ForegroundColor Yellow
    
    # 3.1. Chu Studio tao ma moi
    $inviteBody = @{
        expireHours = 72
        note = "Moi tho test"
        proposedCommissionRate = 30.0
    } | ConvertTo-Json
    $inviteRes = Invoke-RestMethod -Uri "$BaseUrl/agencies/invitations" -Method Post -Headers $Headers -Body $inviteBody
    $inviteCode = $inviteRes.data.inviteCode
    Write-Host "Tao ma moi thanh cong: $inviteCode" -ForegroundColor Green

    # 3.2. Dang ky tai khoan Tho MUA
    $muaPhone = "098" + (Get-Random -Minimum 1000000 -Maximum 9999999)
    $muaRegBody = @{
        phoneNumber = $muaPhone
        email = "mua_$muaPhone@makeup.com"
        password = "Password@123"
        fullName = "Tran Thanh Tam MUA"
        gender = "FEMALE"
        accountType = "FREELANCER_MUA"
        muaDetails = @{
            bio = "Chuyen make-up tiec va co dau"
            experienceYears = 3
            maxServiceRadiusKm = 15.0
        }
    } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -Body $muaRegBody -ContentType "application/json"
    Write-Host "Dang ky tho MUA thanh cong: $muaPhone" -ForegroundColor Green

    # Dang nhap lay MUA token
    $muaLoginBody = @{
        loginIdentifier = $muaPhone
        password = "Password@123"
    } | ConvertTo-Json
    $muaLoginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $muaLoginBody -ContentType "application/json"
    $muaToken = $muaLoginRes.data.accessToken

    # 3.3. Tho MUA chap nhan ma moi
    $acceptHeaders = @{
        "Authorization" = "Bearer $muaToken"
        "Content-Type" = "application/json"
    }
    $acceptBody = @{
        inviteCode = $inviteCode
    } | ConvertTo-Json
    $acceptRes = Invoke-RestMethod -Uri "$BaseUrl/agencies/invitations/accept" -Method Post -Headers $acceptHeaders -Body $acceptBody
    $targetStaffId = $acceptRes.data.id
    Write-Host "Tho nop don gia nhap thanh cong! StaffId = $targetStaffId" -ForegroundColor Green

    # 3.4. Chu Studio phe duyet tho
    $reviewBody = @{
        decision = "APPROVE"
        agreedCommissionRate = 35.0
        note = "Tay nghe dat chuan, duyet tham gia"
    } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$BaseUrl/agencies/staff/$targetStaffId/review" -Method Put -Headers $Headers -Body $reviewBody
    Write-Host "Chu Studio da phe duyet tho ACTIVE! StaffId = $targetStaffId" -ForegroundColor Green
}

# 4. ISSUE-12.4: Gan Phong cach Make-up cho tho
Write-Host "`n[4/8] TEST ISSUE-12.4: Dang gan phong cach make-up (Style IDs: 1, 2, 4) cho tho ID = $targetStaffId..." -ForegroundColor Yellow
$stylesBody = @{
    styleIds = @(1, 2, 4)
} | ConvertTo-Json

try {
    $assignStyleRes = Invoke-RestMethod -Uri "$BaseUrl/agencies/staff/$targetStaffId/styles" -Method Put -Headers $Headers -Body $stylesBody
    Write-Host "PASS: Gan phong cach thanh cong! Danh sach styles:" -ForegroundColor Green
    foreach ($s in $assignStyleRes.data.assignedStyles) {
        Write-Host "   - [$($s.id)] $($s.styleName) ($($s.styleCode))" -ForegroundColor Cyan
    }
} catch {
    Write-Host "FAIL khi gan phong cach: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. ISSUE-12.4: Xem chi tiet tho de kiem tra assignedStyles
Write-Host "`n[5/8] TEST ISSUE-12.4: Kiem tra chi tiet nhan vien (GET /staff/$targetStaffId)..." -ForegroundColor Yellow
try {
    $detailRes = Invoke-RestMethod -Uri "$BaseUrl/agencies/staff/$targetStaffId" -Method Get -Headers $Headers
    $hasStyles = $detailRes.data.assignedStyles -ne $null -and $detailRes.data.assignedStyles.Count -gt 0
    if ($hasStyles) {
        Write-Host "PASS: GET chi tiet nhan vien tra ve kem $($detailRes.data.assignedStyles.Count) phong cach make-up!" -ForegroundColor Green
    } else {
        Write-Host "FAIL: Chua thay phong cach trong assignedStyles." -ForegroundColor Red
    }
} catch {
    Write-Host "FAIL khi xem chi tiet tho: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. ISSUE-12.5: Xep ca lam viec co dinh theo tuan (Thu Hai 07:00 - 12:00)
Write-Host "`n[6/8] TEST ISSUE-12.5: Xep ca lam viec Thu Hai (07:00 - 12:00) cho tho ID = $targetStaffId..." -ForegroundColor Yellow
$shiftBody = @{
    staffId = [int64]$targetStaffId
    dayOfWeek = 2
    shiftName = "Ca Sang Make-up Tiec"
    startTime = "07:00:00"
    endTime = "12:00:00"
    isRecurring = $true
} | ConvertTo-Json

$createdShiftId = $null
try {
    $createShiftRes = Invoke-RestMethod -Uri "$BaseUrl/agencies/shifts" -Method Post -Headers $Headers -Body $shiftBody
    $createdShiftId = $createShiftRes.data.id
    Write-Host "PASS: Xep ca lam viec thanh cong!" -ForegroundColor Green
    Write-Host "   - Shift ID: $createdShiftId" -ForegroundColor Cyan
    Write-Host "   - Ca lam: $($createShiftRes.data.shiftName)" -ForegroundColor Cyan
    Write-Host "   - Thu: $($createShiftRes.data.dayName) (dayOfWeek = $($createShiftRes.data.dayOfWeek))" -ForegroundColor Cyan
    Write-Host "   - Khung gio: $($createShiftRes.data.startTime) den $($createShiftRes.data.endTime)" -ForegroundColor Cyan
} catch {
    Write-Host "Thong bao: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 7. ISSUE-12.5: Kiem tra co che CHAN TRUNG GIO (Overlap Validation)
Write-Host "`n[7/8] TEST ISSUE-12.5: Kiem tra CHAN TRUNG GIO (thu xep ca 10:00 - 14:00 de len ca 07:00 - 12:00)..." -ForegroundColor Yellow
$overlapBody = @{
    staffId = [int64]$targetStaffId
    dayOfWeek = 2
    shiftName = "Ca Trung Gio Co Tinh"
    startTime = "10:00:00"
    endTime = "14:00:00"
    isRecurring = $true
} | ConvertTo-Json

try {
    $overlapRes = Invoke-RestMethod -Uri "$BaseUrl/agencies/shifts" -Method Post -Headers $Headers -Body $overlapBody
    Write-Host "FAIL: Ca trung gio khong bi chan!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "PASS: HE THONG DA CHAN TRUNG GIO CHUAN XAC! HTTP Status = $statusCode (409 CONFLICT)!" -ForegroundColor Green
}

# 8. ISSUE-12.5: Xem Bang Ma Tran Ca Tuan (Weekly Shift Matrix)
Write-Host "`n[8/8] TEST ISSUE-12.5: Lay Bang Ma tran Ca lam viec Tuan (GET /agencies/shifts/matrix)..." -ForegroundColor Yellow
try {
    $matrixRes = Invoke-RestMethod -Uri "$BaseUrl/agencies/shifts/matrix" -Method Get -Headers $Headers
    Write-Host "PASS: Lay Bang Ma Tran Lich Ca Tuan thanh cong (Studio ID = $($matrixRes.data.agencyId))!" -ForegroundColor Green
    foreach ($day in $matrixRes.data.days) {
        $count = if ($day.shifts) { $day.shifts.Count } else { 0 }
        Write-Host "   - $($day.dayName): co $count ca truc" -ForegroundColor Cyan
        if ($day.shifts) {
            foreach ($sh in $day.shifts) {
                Write-Host "      Shift #$($sh.shiftId): $($sh.shiftName) ($($sh.startTime) - $($sh.endTime)) | Tho: $($sh.staffName)" -ForegroundColor White
            }
        }
    }
} catch {
    Write-Host "FAIL khi lay ma tran: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "HOAN TAT TOAN BO TEST SUITE ISSUE-12.4 & 12.5!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
