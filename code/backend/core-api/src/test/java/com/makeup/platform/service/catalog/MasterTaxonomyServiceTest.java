package com.makeup.platform.service.catalog;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.catalog.*;
import com.makeup.platform.entity.catalog.*;
import com.makeup.platform.mapper.catalog.MasterTaxonomyMapper;
import com.makeup.platform.repository.catalog.*;
import com.makeup.platform.service.catalog.impl.MasterTaxonomyServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MasterTaxonomyServiceTest {
    @Mock MasterCategoryRepository categories;
    @Mock MakeupStyleRepository styles;
    @Spy MasterTaxonomyMapper mapper = new MasterTaxonomyMapper();
    @InjectMocks MasterTaxonomyServiceImpl service;
    @Test void categoryCodeAndNameAreNormalized() {
        when(categories.save(any())).thenAnswer(i -> i.getArgument(0));
        var req = new MasterCategoryReq(); req.setCategoryCode(" bridal "); req.setCategoryName(" Bridal "); req.setIsActive(true);
        var result = service.createCategory(req);
        assertEquals("BRIDAL", result.getCategoryCode()); assertEquals("Bridal", result.getCategoryName());
    }
    @Test void duplicateCategoryIsRejected() {
        var req = new MasterCategoryReq(); req.setCategoryCode("BRIDAL");
        when(categories.existsByCategoryCode("BRIDAL")).thenReturn(true);
        assertThrows(CustomBusinessException.class, () -> service.createCategory(req)); verify(categories, never()).save(any());
    }
    @Test void duplicateStyleIsRejected() {
        var req = new MakeupStyleReq(); req.setStyleCode("NATURAL");
        when(styles.existsByStyleCode("NATURAL")).thenReturn(true);
        assertThrows(CustomBusinessException.class, () -> service.createStyle(req)); verify(styles, never()).save(any());
    }
    @Test void unknownCategoryAndStyleCannotBeUpdatedOrToggled() {
        assertThrows(CustomBusinessException.class, () -> service.updateCategory(99, new MasterCategoryReq()));
        assertThrows(CustomBusinessException.class, () -> service.toggleCategoryStatus(99, true));
        assertThrows(CustomBusinessException.class, () -> service.updateStyle(99, new MakeupStyleReq()));
        assertThrows(CustomBusinessException.class, () -> service.toggleStyleStatus(99, true));
    }
    @Test void togglingStylePreservesCodeAndName() {
        var style = MakeupStyleEntity.builder().styleCode("NATURAL").styleName("Natural").isActive(true).build();
        when(styles.findById(1)).thenReturn(Optional.of(style)); when(styles.save(style)).thenReturn(style);
        service.toggleStyleStatus(1, false);
        assertFalse(style.getIsActive()); assertEquals("NATURAL", style.getStyleCode()); assertEquals("Natural", style.getStyleName());
    }
}
