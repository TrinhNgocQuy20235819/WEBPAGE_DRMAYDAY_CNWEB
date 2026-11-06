package com.drmayday.backend.modules.auth;

import jakarta.validation.constraints.*;

public record LoginRequest(@NotBlank @Pattern(regexp = "[0-9+]{8,15}") String phone,
                           @NotBlank @Size(max = 72) String password) {
    @Override
    public String toString() {
        return "LoginRequest[phone=" + phone + ", password=[PROTECTED]]";
    }
}
