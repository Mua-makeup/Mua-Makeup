package com.makeup.platform.entity.mua;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MuaStyleId implements Serializable {

    @Column(name = "mua_id")
    private Long muaId;

    @Column(name = "style_id")
    private Integer styleId;
}
