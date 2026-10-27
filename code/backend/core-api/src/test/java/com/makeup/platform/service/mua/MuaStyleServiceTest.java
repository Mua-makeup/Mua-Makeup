package com.makeup.platform.service.mua;

import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.mua.AssignMuaStylesReq;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.entity.mua.*;
import com.makeup.platform.mapper.mua.MuaStyleMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.catalog.MakeupStyleRepository;
import com.makeup.platform.repository.mua.MuaStyleRepository;
import com.makeup.platform.service.mua.impl.MuaStyleServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MuaStyleServiceTest {
    @Mock MuaProfileRepository profiles;
    @Mock MakeupStyleRepository styles;
    @Mock MuaStyleRepository assignments;
    @Spy MuaStyleMapper mapper = new MuaStyleMapper();
    @InjectMocks MuaStyleServiceImpl service;
    @Test void missingProfileCannotReplaceStyles() {
        assertThrows(ResourceNotFoundException.class, () -> service.assignStyles(1L, new AssignMuaStylesReq(Set.of(1))));
        verifyNoInteractions(assignments);
    }
    @Test void assignsOnlyToAuthenticatedUsersProfile() {
        var mua = new MuaProfileEntity(); mua.setId(9L);
        var style = MakeupStyleEntity.builder().id(3).styleName("Natural").build();
        when(profiles.findByUserId(7L)).thenReturn(Optional.of(mua));
        when(styles.findById(3)).thenReturn(Optional.of(style));
        service.assignStyles(7L, new AssignMuaStylesReq(Set.of(3)));
        verify(assignments).deleteAllByMuaId(9L);
        verify(assignments).saveAll(argThat((Iterable<MuaStyleEntity> saved) -> {
            var it = saved.iterator(); if (!it.hasNext()) return false;
            var item = it.next(); return item.getMuaProfile() == mua && item.getStyle() == style && item.getIsQualified() && !it.hasNext();
        }));
    }
}
